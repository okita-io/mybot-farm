// index.ts
import { Type } from "typebox";
import { defineToolPlugin } from "openclaw/plugin-sdk/tool-plugin";

// src/farm-api.mjs
var DEFAULT_BASE = "https://mybot.farm";
var DEFAULT_WORKSPACE_ROOT = "~/.openclaw/farm";
function resolveFarmConfig(pluginConfig) {
  const envUrl = typeof process.env.MYBOT_FARM_URL === "string" ? process.env.MYBOT_FARM_URL.trim() : "";
  const cfg = pluginConfig ?? {};
  const baseUrl = (envUrl || (typeof cfg.baseUrl === "string" ? cfg.baseUrl.trim() : "") || DEFAULT_BASE).replace(/\/+$/, "");
  const workspaceRoot = typeof cfg.workspaceRoot === "string" && cfg.workspaceRoot.trim() || DEFAULT_WORKSPACE_ROOT;
  return { baseUrl, workspaceRoot };
}
async function farmFetch(baseUrl, path2) {
  const url = `${baseUrl}${path2.startsWith("/") ? path2 : `/${path2}`}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" }
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`mybot.farm ${res.status} for ${url}${body ? `: ${body.slice(0, 240)}` : ""}`);
  }
  return await res.json();
}
async function searchStalls(baseUrl, query, limit) {
  const q = encodeURIComponent(query);
  const data = await farmFetch(baseUrl, `/api/stalls?q=${q}`);
  let stalls = Array.isArray(data.stalls) ? data.stalls : [];
  if (typeof limit === "number" && Number.isFinite(limit) && limit > 0) {
    stalls = stalls.slice(0, Math.floor(limit));
  }
  return {
    stalls,
    count: typeof data.count === "number" ? data.count : stalls.length,
    query: data.query ?? query
  };
}
async function getPack(baseUrl, slug) {
  const clean = slug.trim().replace(/^\/+|\/+$/g, "");
  if (!clean) throw new Error("slug required");
  const pack = await farmFetch(baseUrl, `/api/packs/${encodeURIComponent(clean)}`);
  if (!pack || typeof pack !== "object") throw new Error(`empty pack for ${clean}`);
  if (!pack.slug) pack.slug = clean;
  return pack;
}
function stallSummary(stall) {
  return {
    slug: stall.slug,
    name: stall.name ?? stall.slug,
    title: stall.title ?? "",
    pageUrl: stall.pageUrl ?? `https://mybot.farm/agents/${stall.slug}`,
    packUrl: stall.packUrl ?? "",
    description: stall.description ?? "",
    category: stall.category ?? ""
  };
}
function packSummary(pack) {
  const skills = Array.isArray(pack.skills) ? pack.skills : [];
  const manifest = pack.manifest ?? {};
  return {
    slug: pack.slug,
    format: pack.format,
    version: pack.version,
    profile: pack.profile ?? {},
    skillNames: skills.map((s) => s.name).filter(Boolean),
    skillCount: skills.length,
    memoryCount: Array.isArray(pack.memory) ? pack.memory.length : 0,
    attribution: manifest.attribution ?? "",
    sourceNote: manifest.sourceNote ?? "",
    sourceRepo: manifest.sourceRepo ?? "",
    license: manifest.license ?? "",
    homepage: manifest.homepage ?? `https://mybot.farm/agents/${pack.slug}`
  };
}

// src/plant.mjs
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
function expandHome(p) {
  if (!p) return p;
  if (p === "~") return os.homedir();
  if (p.startsWith("~/")) return path.join(os.homedir(), p.slice(2));
  return p;
}
function slugifyAgentId(raw) {
  return raw.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64) || "farm-agent";
}
function skillDirName(name) {
  return name.trim().toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "skill";
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
      stdio: ["ignore", "pipe", "pipe"]
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
      { env: process.env, stdio: ["ignore", "pipe", "pipe"] }
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
  const clipped = body.length > 1200 ? `${body.slice(0, 1197).trimEnd()}\u2026` : body;
  return `# SOUL.md - ${name}

${clipped}
`;
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
      const clipped = content.length > 400 ? `${content.slice(0, 397)}\u2026` : content;
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
    lines.push(`- **Avatar:** ${avatar} (farm geometric avatar \u2014 not a runtime asset)`);
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
    `- **Format:** ${pack.format ?? "mybot.farm/agent-pack"} ${pack.version ?? ""}`.trimEnd(),
    `- **Homepage:** ${m.homepage ?? `https://mybot.farm/agents/${pack.slug}`}`
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
  lines.push("");
  return lines.join("\n");
}
function buildSkillMd(skill) {
  const name = skill.name?.trim() || "skill";
  const description = (skill.description ?? "").trim() || `Skill ${name}`;
  const content = (skill.content ?? "").trim();
  return ["---", `name: ${name}`, `description: ${description}`, "---", "", content, ""].join("\n");
}
async function writePackWorkspace(pack, workspace) {
  await fs.mkdir(workspace, { recursive: true });
  const installedAt = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  await fs.writeFile(path.join(workspace, "IDENTITY.md"), buildIdentity(pack, installedAt), "utf8");
  await fs.writeFile(path.join(workspace, "SOUL.md"), buildSoul(pack), "utf8");
  await fs.writeFile(path.join(workspace, "MEMORY.md"), buildMemory(pack), "utf8");
  await fs.writeFile(path.join(workspace, "FARM.md"), buildFarmMd(pack, installedAt), "utf8");
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
async function plantPack(opts) {
  const pack = await getPack(opts.config.baseUrl, opts.slug);
  const agentId = slugifyAgentId(opts.agentId || pack.slug);
  const workspaceRoot = expandHome(opts.config.workspaceRoot);
  const workspace = expandHome(opts.workspace?.trim() || path.join(workspaceRoot, agentId));
  const exists = await agentExists(agentId);
  if (exists && !opts.force) {
    throw new Error(
      `Agent "${agentId}" already exists. Pass force: true to overwrite workspace files (agent id is kept).`
    );
  }
  if (!opts.force && await pathExists(path.join(workspace, "IDENTITY.md")) && !exists) {
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
    createdAgent
  };
}

// index.ts
function textResult(text, details) {
  return {
    content: [{ type: "text", text }],
    details
  };
}
var index_default = defineToolPlugin({
  id: "mybot-farm",
  name: "mybot.farm",
  description: "Search mybot.farm stalls and plant GAF agent packs into OpenClaw.",
  configSchema: Type.Object(
    {
      baseUrl: Type.Optional(
        Type.String({
          default: "https://mybot.farm",
          description: "mybot.farm API origin (env MYBOT_FARM_URL overrides)."
        })
      ),
      workspaceRoot: Type.Optional(
        Type.String({
          default: "~/.openclaw/farm",
          description: "Default parent dir for planted workspaces."
        })
      )
    },
    { additionalProperties: false }
  ),
  tools: (tool) => [
    tool({
      name: "farm_search",
      label: "Farm Search",
      description: "Search mybot.farm agent stalls by query. Returns slug, name, title, pageUrl, packUrl.",
      parameters: Type.Object({
        query: Type.String({ description: "Search query (e.g. frontend, music, legal)." }),
        limit: Type.Optional(Type.Number({ description: "Max stalls to return (optional)." }))
      }),
      async execute(params, config) {
        const farm = resolveFarmConfig(config);
        const query = String(params.query ?? "").trim();
        if (!query) throw new Error("query required");
        const limit = typeof params.limit === "number" && Number.isFinite(params.limit) ? params.limit : void 0;
        const { stalls, count } = await searchStalls(farm.baseUrl, query, limit);
        const list = stalls.map(stallSummary);
        const lines = [
          `mybot.farm search "${query}" \u2014 ${list.length} of ${count} stall(s)`,
          "",
          ...list.map(
            (s, i) => `${i + 1}. ${s.name} (\`${s.slug}\`)
   ${s.title}
   ${s.pageUrl}`
          )
        ];
        return textResult(lines.join("\n"), { query, count, stalls: list, baseUrl: farm.baseUrl });
      }
    }),
    tool({
      name: "farm_get_pack",
      label: "Farm Get Pack",
      description: "Download a mybot.farm GAF agent pack by slug and return profile, skill names, attribution.",
      parameters: Type.Object({
        slug: Type.String({ description: "Pack / stall slug (e.g. frontend-developer)." })
      }),
      async execute(params, config) {
        const farm = resolveFarmConfig(config);
        const slug = String(params.slug ?? "").trim();
        if (!slug) throw new Error("slug required");
        const pack = await getPack(farm.baseUrl, slug);
        const summary = packSummary(pack);
        const skillBodies = (pack.skills ?? []).map((s) => ({
          name: s.name,
          description: s.description ?? "",
          contentPreview: (s.content ?? "").slice(0, 280),
          contentLength: (s.content ?? "").length
        }));
        const lines = [
          `Pack: ${summary.profile?.name ?? summary.slug} (\`${summary.slug}\`)`,
          `Title: ${summary.profile?.title ?? ""}`,
          `Skills (${summary.skillCount}): ${summary.skillNames.join(", ") || "(none)"}`,
          `Attribution: ${summary.attribution || "(none)"}`,
          `Source: ${summary.homepage}`
        ];
        return textResult(lines.join("\n"), {
          summary,
          skillBodies,
          memory: pack.memory ?? [],
          manifest: pack.manifest ?? {},
          profile: pack.profile ?? {}
        });
      }
    }),
    tool({
      name: "farm_plant",
      label: "Farm Plant",
      description: "Fetch a mybot.farm GAF pack and plant it into OpenClaw (agents add + IDENTITY/SOUL/MEMORY/skills).",
      parameters: Type.Object({
        slug: Type.String({ description: "Pack slug to plant (e.g. frontend-developer)." }),
        agentId: Type.Optional(
          Type.String({ description: "Override agent id (default: slugified pack.slug)." })
        ),
        workspace: Type.Optional(
          Type.String({
            description: "Override workspace path (default: ~/.openclaw/farm/<agentId>)."
          })
        ),
        force: Type.Optional(
          Type.Boolean({
            description: "Overwrite workspace files if agent already exists (default false)."
          })
        )
      }),
      async execute(params, config) {
        const farm = resolveFarmConfig(config);
        const slug = String(params.slug ?? "").trim();
        if (!slug) throw new Error("slug required");
        const result = await plantPack({
          slug,
          agentId: typeof params.agentId === "string" ? params.agentId : void 0,
          workspace: typeof params.workspace === "string" ? params.workspace : void 0,
          force: Boolean(params.force),
          config: farm
        });
        const lines = [
          `Planted \`${result.packSlug}\` as agent \`${result.agentId}\``,
          `Workspace: ${result.workspace}`,
          `Skills: ${result.skillsInstalled.join(", ") || "(none)"}`,
          result.attribution ? `Attribution: ${result.attribution}` : ""
        ].filter(Boolean);
        return textResult(lines.join("\n"), result);
      }
    })
  ]
});
export {
  index_default as default
};
