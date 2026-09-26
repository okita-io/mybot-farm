// Plant a GAF pack into KiroCrew: write ~/.kiro/agents/<name>.json + steering
// files, then (optionally) bind a Crew Member via `kirocrew agent create`.
// Per D1: the CLI binds members but does NOT author template content, so the
// template file is written directly here.

import { mkdir, writeFile, access } from "node:fs/promises";
import { constants } from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";
import { gafToKirocrewAgent, gafTeamToKirocrewCrew } from "./gaf-to-kirocrew.mjs";

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

/**
 * Plant a GAF team-pack as a KiroCrew crew.
 * @param {object} teamPack   GAF team-pack (has members[])
 * @param {object} memberPacks map memberSlug -> resolved GAF agent-pack
 * @param {object} opts       { workspace?, force?, dryRun? }
 * @returns { teamSlug, workspace, memberNames[], agentPaths[], steeringPaths[],
 *            sharedSteeringPath, topologyDocPath, bindCommands[], notes, wrote }
 */
export async function plantTeam(teamPack, memberPacks, opts = {}) {
  const home = kiroHome();
  const crew = gafTeamToKirocrewCrew(teamPack, memberPacks, { workspace: opts.workspace });

  const agentPaths = [];
  const steeringPaths = [];
  const topologyDocPath = join(home, "steering", "farm", crew.teamSlug, "_crew.md");
  const sharedSteeringPath = crew.sharedSteering
    ? join(home, crew.sharedSteering.path.replace(/^\.kiro\//, "")) : null;

  const plan = {
    teamSlug: crew.teamSlug,
    workspace: crew.workspace,
    memberNames: crew.members.map((m) => m.name),
    agentPaths: [],
    steeringPaths: [],
    sharedSteeringPath,
    topologyDocPath,
    bindCommands: crew.bindCommands,
    notes: crew.notes,
    wrote: false,
  };

  // compute planned paths
  for (const m of crew.members) {
    agentPaths.push(join(home, "agents", `${m.name}.json`));
    for (const f of m.steeringFiles) steeringPaths.push(join(home, f.path.replace(/^\.kiro\//, "")));
  }
  plan.agentPaths = agentPaths;
  plan.steeringPaths = steeringPaths;

  if (opts.dryRun) return plan;

  for (const m of crew.members) {
    const agentPath = join(home, "agents", `${m.name}.json`);
    if ((await exists(agentPath)) && !opts.force) {
      plan.notes.push(`member ${m.name} exists; pass force to overwrite — skipped.`);
      continue;
    }
    await mkdir(dirname(agentPath), { recursive: true });
    await writeFile(agentPath, JSON.stringify(m.template, null, 2) + "\n", "utf8");
    for (const f of m.steeringFiles) {
      const abs = join(home, f.path.replace(/^\.kiro\//, ""));
      await mkdir(dirname(abs), { recursive: true });
      await writeFile(abs, f.content, "utf8");
    }
  }
  if (crew.sharedSteering && sharedSteeringPath) {
    await mkdir(dirname(sharedSteeringPath), { recursive: true });
    await writeFile(sharedSteeringPath, crew.sharedSteering.content, "utf8");
  }
  await mkdir(dirname(topologyDocPath), { recursive: true });
  await writeFile(topologyDocPath, crew.topologyDoc, "utf8");

  plan.wrote = true;
  return plan;
}
