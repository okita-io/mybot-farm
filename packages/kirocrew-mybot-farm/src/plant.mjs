// Plant a GAF pack into KiroCrew: write ~/.kiro/agents/<name>.json + steering
// files, then (optionally) bind a Crew Member via `kirocrew agent create`.
// Per D1: the CLI binds members but does NOT author template content, so the
// template file is written directly here.

import { mkdir, writeFile, access } from "node:fs/promises";
import { constants } from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";
import { gafToKirocrewAgent } from "./gaf-to-kirocrew.mjs";

export function kiroHome() {
  return process.env.KIRO_HOME ?? join(homedir(), ".kiro");
}

async function exists(p) {
  try { await access(p, constants.F_OK); return true; } catch { return false; }
}

/**
 * @param {object} pack  GAF agent-pack
 * @param {object} opts  { name?, force?, dryRun? }
 * @returns plan or result: { name, agentPath, steeringPaths[], withheldTools, notes, wrote, skippedExisting }
 */
export async function plantAgent(pack, opts = {}) {
  const home = kiroHome();
  const mapped = gafToKirocrewAgent(pack, { name: opts.name });
  const agentPath = join(home, "agents", `${mapped.name}.json`);
  const steering = mapped.steeringFiles.map((f) => ({ ...f, abs: join(home, f.path.replace(/^\.kiro\//, "")) }));

  const plan = {
    name: mapped.name,
    slug: mapped.slug,
    agentPath,
    steeringPaths: steering.map((s) => s.abs),
    withheldTools: mapped.withheldTools,
    notes: mapped.notes,
    wrote: false,
    skippedExisting: false,
  };

  if (opts.dryRun) return plan;

  const already = await exists(agentPath);
  if (already && !opts.force) {
    plan.skippedExisting = true;
    plan.notes.push(`Agent ${mapped.name} already exists at ${agentPath}; pass force to overwrite.`);
    return plan;
  }

  await mkdir(dirname(agentPath), { recursive: true });
  await writeFile(agentPath, JSON.stringify(mapped.template, null, 2) + "\n", "utf8");
  for (const s of steering) {
    await mkdir(dirname(s.abs), { recursive: true });
    await writeFile(s.abs, s.content, "utf8");
  }
  plan.wrote = true;
  return plan;
}
