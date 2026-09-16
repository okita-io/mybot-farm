import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { getPack } from "./farm-api.mjs";

function expandHome(p) {
  if (!p) return p;
  if (p === "~") return os.homedir();
  if (p.startsWith("~/")) return path.join(os.homedir(), p.slice(2));
  return p;
}

export function slugifyAgentId(raw) {
  return (
    raw
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 64) || "farm-agent"
  );
}

function skillDirName(name) {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "skill"
  );
}

async function pathExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function listAgentsJson() {
  return new Promise((resolve) => {
    const child = spawn("openclaw", ["agents", "list", "--json"], {
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let out = "";
    child.stdout.on("data", (c) => {
      out += String(c);
    });
    child.on("close", () => {
      try {
        const parsed = JSON.parse(out);
        const list = Array.isArray(parsed) ? parsed : parsed?.agents ?? parsed?.items ?? [];
        resolve(Array.isArray(list) ? list : []);
      } catch {
        resolve([]);
      }
    });
    child.on("error", () => resolve([]));
  });
}

async function agentExists(agentId) {
  const agents = await listAgentsJson();
  return agents.some((a) => a.id === agentId);
}

function runOpenclawAgentsAdd(agentId, workspace) {
  return new Promise((resolve) => {
    const child = spawn(
      "openclaw",
      ["agents", "add", agentId, "--workspace", workspace, "--non-interactive", "--json"],
      { env: process.env, stdio: ["ignore", "pipe", "pipe"] },
    );
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (c) => {
      stdout += String(c);
    });
    child.stderr.on("data", (c) => {
      stderr += String(c);
    });
    child.on("close", (code) => {
      resolve({ ok: code === 0, stdout, stderr });
    });
    child.on("error", (err) => {
      resolve({ ok: false, stdout, stderr: String(err) });
    });
  });
}

function firstProfileMemory(memory) {
  if (!Array.isArray(memory)) return "";
  const hit = memory.find((m) => (m.kind ?? "").toLowerCase() === "profile" && m.content?.trim());
  return hit?.content?.trim() ?? "";
}

function buildSoul(pack) {
  const name = pack.profile?.name ?? pack.slug;
  const fromMemory = firstProfileMemory(pack.memory);
  const desc = pack.profile?.description?.trim() ?? "";
  const body = (fromMemory || desc || `${name} agent planted from mybot.farm.`).trim();
  const clipped = body.length > 1200 ? `${body.slice(0, 1197).trimEnd()}…` : body;
  return `# SOUL.md - ${name}\n\n${clipped}\n`;
}

function buildMemory(pack) {
  const name = pack.profile?.name ?? pack.slug;
  const lines = [`# MEMORY.md - ${name}`, "", "## Pack memory", ""];
  const entries = Array.isArray(pack.memory) ? pack.memory : [];
  if (entries.length === 0) {
    lines.push("- (no memory entries in pack)");
  } else {
    for (const m of entries) {
      const kind = (m.kind ?? "note").trim() || "note";
      const content = (m.content ?? "").trim().replace(/\s+/g, " ");
      const clipped = content.length > 400 ? `${content.slice(0, 397)}…` : content;
      lines.push(`- [${kind}] ${clipped}`);
    }
  }
  lines.push("");
  return lines.join("\n");
}

function buildIdentity(pack, installedAt) {
  const name = pack.profile?.name ?? pack.slug;
  const title = pack.profile?.title ?? "";
  const avatar = pack.profile?.avatar ? JSON.stringify(pack.profile.avatar) : "";
  const sourceUrl = `https://mybot.farm/agents/${pack.slug}`;
  const attribution = pack.manifest?.attribution ?? "";
  const lines = ["# IDENTITY.md", "", `- **Name:** ${name}`];
  if (title) lines.push(`- **Title:** ${title}`);
  if (avatar) {
    lines.push(`- **Avatar:** ${avatar} (farm geometric avatar — not a runtime asset)`);
  }
  lines.push(`- **Farm slug:** ${pack.slug}`);
  lines.push(`- **Source URL:** ${sourceUrl}`);
  lines.push(`- **Source:** mybot.farm GAF agent pack, installed ${installedAt}`);
  if (attribution) lines.push(`- **Attribution:** ${attribution}`);
  lines.push("");
  return lines.join("\n");
}

function buildFarmMd(pack, installedAt) {
  const m = pack.manifest ?? {};
  const lines = [
    "# FARM.md",
    "",
    `Planted from [mybot.farm](https://mybot.farm) on ${installedAt}.`,
    "",
    `- **Slug:** ${pack.slug}`,
    `- **Pack version:** ${pack.packVersion ?? 1}`,
    `- **Format:** ${pack.format ?? "mybot.farm/agent-pack"} ${pack.version ?? ""}`.trimEnd(),
    `- **Homepage:** ${m.homepage ?? `https://mybot.farm/agents/${pack.slug}`}`,
  ];
  if (m.author) lines.push(`- **Author:** ${m.author}`);
  if (m.license) lines.push(`- **License:** ${m.license}`);
  if (m.sourceRepo) lines.push(`- **Source repo:** ${m.sourceRepo}`);
  if (m.sourcePath) lines.push(`- **Source path:** ${m.sourcePath}`);
  if (m.sourceNote) {
    lines.push("", "## Source note", "", m.sourceNote);
  }
  if (m.attribution) {
    lines.push("", "## Attribution", "", m.attribution);
  }

  const gettingStarted = pack.gettingStarted?.skill?.trim();
  if (gettingStarted) {
    lines.push(
      "",
      "## Getting started",
      "",
      `First-run skill: \`${gettingStarted}\` (must match a planted skill name).`,
    );
  }

  const plugins = Array.isArray(pack.plugins) ? pack.plugins.filter((p) => p?.pluginId) : [];
  if (plugins.length) {
    lines.push(
      "",
      "## Marketplace plugins",
      "",
      "These are marketplace plugin ids only. Do not auto-install arbitrary MCP.",
      "",
    );
    for (const plugin of plugins) {
      const label = plugin.name?.trim() ? ` — ${plugin.name.trim()}` : "";
      const desc = plugin.description?.trim() ? ` — ${plugin.description.trim()}` : "";
      lines.push(`- \`${plugin.pluginId}\`${label}${desc}`);
    }
  }

  lines.push("");
  return lines.join("\n");
}

function buildRoutinesMd(pack) {
  const routines = Array.isArray(pack.routines) ? pack.routines : [];
  const blocks = [];
  for (const routine of routines) {
    const slug = routine?.slug?.trim();
    if (!slug) continue;
    const title = (routine.name ?? slug).trim();
    const parts = [`## ${slug}`, "", `**${title}**`];
    if (routine.description?.trim()) {
      parts.push("", routine.description.trim());
    }
    if (routine.content?.trim()) {
      parts.push("", routine.content.trim());
    }
    blocks.push(parts.join("\n"));
  }
  if (blocks.length === 0) {
    return null;
  }

  const name = pack.profile?.name ?? pack.slug;
  return [
    `# ROUTINES.md - ${name}`,
    "",
    "Intention prose from the mybot.farm pack. These are not live schedules — confirm any cron or automation with the user. Never copy automation.json.",
    "",
    blocks.join("\n\n"),
    "",
  ].join("\n");
}

function buildSkillMd(skill) {
  const name = skill.name?.trim() || "skill";
  const description = (skill.description ?? "").trim() || `Skill ${name}`;
  const content = (skill.content ?? "").trim();
  return ["---", `name: ${name}`, `description: ${description}`, "---", "", content, ""].join("\n");
}

export async function writePackWorkspace(pack, workspace) {
  await fs.mkdir(workspace, { recursive: true });
  const installedAt = new Date().toISOString().slice(0, 10);
  await fs.writeFile(path.join(workspace, "IDENTITY.md"), buildIdentity(pack, installedAt), "utf8");
  await fs.writeFile(path.join(workspace, "SOUL.md"), buildSoul(pack), "utf8");
  await fs.writeFile(path.join(workspace, "MEMORY.md"), buildMemory(pack), "utf8");
  await fs.writeFile(path.join(workspace, "FARM.md"), buildFarmMd(pack, installedAt), "utf8");
  const routinesMd = buildRoutinesMd(pack);
  if (routinesMd) {
    await fs.writeFile(path.join(workspace, "ROUTINES.md"), routinesMd, "utf8");
  }

  const skillsDir = path.join(workspace, "skills");
  await fs.mkdir(skillsDir, { recursive: true });
  const installed = [];
  for (const skill of pack.skills ?? []) {
    if (!skill?.name) continue;
    const dir = path.join(skillsDir, skillDirName(skill.name));
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, "SKILL.md"), buildSkillMd(skill), "utf8");
    installed.push(skill.name);
  }
  return installed;
}

export async function plantPack(opts) {
  const pack = await getPack(opts.config.baseUrl, opts.slug);
  const agentId = slugifyAgentId(opts.agentId || pack.slug);
  const workspaceRoot = expandHome(opts.config.workspaceRoot);
  const workspace = expandHome(opts.workspace?.trim() || path.join(workspaceRoot, agentId));

  const exists = await agentExists(agentId);
  if (exists && !opts.force) {
    throw new Error(
      `Agent "${agentId}" already exists. Pass force: true to overwrite workspace files (agent id is kept).`,
    );
  }

  if (!opts.force && (await pathExists(path.join(workspace, "IDENTITY.md"))) && !exists) {
    const skillsPath = path.join(workspace, "skills");
    if (await pathExists(skillsPath)) {
      throw new Error(`Workspace already has content at ${workspace}. Pass force: true to overwrite.`);
    }
  }

  let createdAgent = false;
  if (!opts.skipAgentsAdd) {
    if (!exists) {
      await fs.mkdir(workspace, { recursive: true });
      const add = await runOpenclawAgentsAdd(agentId, workspace);
      if (!add.ok) {
        const nowExists = await agentExists(agentId);
        if (!nowExists) {
          throw new Error(`openclaw agents add failed: ${add.stderr || add.stdout || "unknown error"}`);
        }
      } else {
        createdAgent = true;
      }
    }
  }

  const skillsInstalled = await writePackWorkspace(pack, workspace);
  return {
    agentId,
    workspace,
    skillsInstalled,
    attribution: pack.manifest?.attribution ?? "",
    sourceNote: pack.manifest?.sourceNote ?? "",
    packSlug: pack.slug,
    createdAgent,
  };
}
