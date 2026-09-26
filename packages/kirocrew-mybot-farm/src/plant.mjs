// Plant a GAF pack into KiroCrew: write ~/.kiro/agents/<name>.json + steering
// files, then (optionally) bind a Crew Member via `kirocrew agent create`.
// Per D1: the CLI binds members but does NOT author template content, so the
// template file is written directly here.

import { mkdir, writeFile, access, readFile, rm, readdir } from "node:fs/promises";
import { constants } from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";
import { gafToKirocrewAgent, gafTeamToKirocrewCrew, slugifyName } from "./gaf-to-kirocrew.mjs";

export function kiroHome() {
  return process.env.KIRO_HOME ?? join(homedir(), ".kiro");
}

async function exists(p) {
  try { await access(p, constants.F_OK); return true; } catch { return false; }
}

/** Path to the plugin's install marker for a planted slug. */
function metaPath(home, slug) {
  return join(home, "steering", "farm", slug, ".farm-meta.json");
}

async function readMeta(home, slug) {
  try { return JSON.parse(await readFile(metaPath(home, slug), "utf8")); } catch { return null; }
}

/**
 * Remove a slug's steering dir (farm/<slug>) so a re-plant to a new version
 * does not leave orphaned skill files behind. Scoped to .kiro/steering/farm/<slug>
 * only — never touches the user's own steering. Returns removed file count.
 */
async function cleanSteeringDir(home, slug) {
  const dir = join(home, "steering", "farm", slugifyName(slug));
  if (!(await exists(dir))) return 0;
  let count = 0;
  try {
    for (const f of await readdir(dir)) count += 1;
  } catch { /* ignore */ }
  await rm(dir, { recursive: true, force: true });
  return count;
}

/**
 * @param {object} pack  GAF agent-pack
 * @param {object} opts  { name?, force?, dryRun?, reinstall?, clean? }
 *   force     — overwrite an existing template
 *   reinstall — treat an existing install as an update (implies overwrite of
 *               the template + steering for THIS slug), version-aware
 *   clean     — with reinstall, remove the slug's steering dir first so a
 *               removed skill does not orphan a stale file
 * @returns plan or result
 */
export async function plantAgent(pack, opts = {}) {
  const home = kiroHome();
  const mapped = gafToKirocrewAgent(pack, { name: opts.name });
  const agentPath = join(home, "agents", `${mapped.name}.json`);
  const steering = mapped.steeringFiles.map((f) => ({ ...f, abs: join(home, f.path.replace(/^\.kiro\//, "")) }));
  const packVersion = typeof pack.packVersion === "number" ? pack.packVersion : 1;
  const prior = await readMeta(home, mapped.slug);

  const overwrite = Boolean(opts.force || opts.reinstall);
  const plan = {
    name: mapped.name,
    slug: mapped.slug,
    agentPath,
    steeringPaths: steering.map((s) => s.abs),
    withheldTools: mapped.withheldTools,
    notes: mapped.notes,
    packVersion,
    priorVersion: prior?.packVersion ?? null,
    wrote: false,
    skippedExisting: false,
    cleanedFiles: 0,
  };

  if (prior && prior.packVersion !== packVersion) {
    plan.notes.push(`Updating ${mapped.slug} v${prior.packVersion} → v${packVersion}.`);
  }

  if (opts.dryRun) return plan;

  const already = await exists(agentPath);
  if (already && !overwrite) {
    plan.skippedExisting = true;
    plan.notes.push(`Agent ${mapped.name} already exists; pass reinstall/force to update.`);
    return plan;
  }

  // Version-safe update: clean stale steering so a removed skill does not orphan.
  if (opts.reinstall && (opts.clean || (prior && prior.packVersion !== packVersion))) {
    plan.cleanedFiles = await cleanSteeringDir(home, mapped.slug);
  }

  await mkdir(dirname(agentPath), { recursive: true });
  await writeFile(agentPath, JSON.stringify(mapped.template, null, 2) + "\n", "utf8");
  for (const s of steering) {
    await mkdir(dirname(s.abs), { recursive: true });
    await writeFile(s.abs, s.content, "utf8");
  }
  // Record the install marker for version-aware future reinstalls.
  await mkdir(dirname(metaPath(home, mapped.slug)), { recursive: true });
  await writeFile(
    metaPath(home, mapped.slug),
    JSON.stringify({ slug: mapped.slug, name: mapped.name, packVersion, plantedAt: new Date().toISOString() }, null, 2) + "\n",
    "utf8",
  );
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

  const overwrite = Boolean(opts.force || opts.reinstall);
  for (const m of crew.members) {
    const agentPath = join(home, "agents", `${m.name}.json`);
    if ((await exists(agentPath)) && !overwrite) {
      plan.notes.push(`member ${m.name} exists; pass reinstall/force to update — skipped.`);
      continue;
    }
    // Version-safe: on reinstall/clean, drop the member's stale steering first.
    if (opts.reinstall && opts.clean) {
      await cleanSteeringDir(home, m.slug);
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
