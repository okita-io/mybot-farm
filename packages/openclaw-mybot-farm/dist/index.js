// index.ts
import { Type } from "typebox";
import { defineToolPlugin } from "openclaw/plugin-sdk/tool-plugin";

// src/farm-api.mjs
var DEFAULT_BASE = "https://mybot.farm";
var DEFAULT_WORKSPACE_ROOT = "~/.openclaw/farm";
var USER_AGENT = "openclaw-mybot-farm/0.2.0";
var CATEGORY_LABELS = Object.freeze([
  "Lifestyle",
  "Productivity",
  "Coding",
  "Writing",
  "Marketing",
  "Sales",
  "Research",
  "Personal finance",
  "Creative",
  "Music",
  "Education",
  "Ops / admin",
  "Experimental"
]);
var CATEGORY_SET = new Set(CATEGORY_LABELS);
var LISTING_KINDS = Object.freeze(["agent", "team"]);
var LISTING_KIND_SET = new Set(LISTING_KINDS);
var TEAM_PACK_FORMAT = "mybot.farm/team-pack";
var MIN_TEAM_MEMBERS = 2;
var MIN_PAID_PRICE_CENTS = 200;
var MAX_PRICE_CENTS = 999900;
var MAX_PACK_CHARS = 5e5;
var PRICE_HINT = "Choose Free, or a price between $2.00 and $9,999.00.";
var FarmError = class extends Error {
  /**
   * HTTP or pack-shape error from mybot.farm.
   * @param {string} message
   * @param {number | undefined} [status]
   */
  constructor(message, status) {
    super(message);
    this.name = "FarmError";
    this.status = status;
  }
};
function resolveFarmConfig(pluginConfig) {
  const envUrl = typeof process.env.MYBOT_FARM_URL === "string" ? process.env.MYBOT_FARM_URL.trim() : "";
  const cfg = pluginConfig ?? {};
  const baseUrl = (envUrl || (typeof cfg.baseUrl === "string" ? cfg.baseUrl.trim() : "") || DEFAULT_BASE).replace(/\/+$/, "");
  const workspaceRoot = typeof cfg.workspaceRoot === "string" && cfg.workspaceRoot.trim() || DEFAULT_WORKSPACE_ROOT;
  return { baseUrl, workspaceRoot };
}
function resolveApiKey(pluginConfig) {
  const env = typeof process.env.MYBOT_FARM_API_KEY === "string" ? process.env.MYBOT_FARM_API_KEY.trim() : "";
  if (env) return env;
  const cfg = pluginConfig ?? {};
  const fromCfg = cfg.apiKey ?? cfg.api_key;
  return typeof fromCfg === "string" ? fromCfg.trim() : "";
}
function shortErrorBody(raw) {
  const text = (raw || "").trim();
  if (!text) return "";
  try {
    const data = JSON.parse(text);
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return text.slice(0, 200);
    }
    const parts = [];
    for (const key of ["error", "message"]) {
      const value = data[key];
      if (typeof value === "string" && value.trim()) parts.push(value.trim());
    }
    return parts.length ? parts.join(": ").slice(0, 200) : text.slice(0, 200);
  } catch {
    return text.slice(0, 200);
  }
}
async function farmRequest(url, { accept = "application/json", data, headers, method } = {}) {
  const reqHeaders = {
    Accept: accept,
    "User-Agent": USER_AGENT,
    ...headers ?? {}
  };
  let res;
  try {
    res = await fetch(url, {
      method: method ?? (data != null ? "POST" : "GET"),
      headers: reqHeaders,
      body: data
    });
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new FarmError(`mybot.farm unreachable for ${url}: ${reason}`);
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    const short = shortErrorBody(body);
    throw new FarmError(
      `mybot.farm ${res.status} for ${url}${short ? `: ${short}` : ""}`,
      res.status
    );
  }
  return Buffer.from(await res.arrayBuffer());
}
async function farmFetch(baseUrl, path3) {
  const url = `${baseUrl}${path3.startsWith("/") ? path3 : `/${path3}`}`;
  const raw = await farmRequest(url);
  try {
    return JSON.parse(raw.toString("utf8"));
  } catch (err) {
    throw new FarmError(`non-JSON from ${url}: ${err instanceof Error ? err.message : String(err)}`);
  }
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
  if (!clean) throw new FarmError("slug required");
  const pack = await farmFetch(baseUrl, `/api/packs/${encodeURIComponent(clean)}`);
  if (!pack || typeof pack !== "object") throw new FarmError(`empty pack for ${clean}`);
  if (!pack.slug) pack.slug = clean;
  return pack;
}
function stallSummary(stall) {
  return {
    slug: stall.slug,
    stallId: stall.stallId ?? stall.listingId ?? "",
    packVersion: stall.packVersion ?? null,
    name: stall.name ?? stall.slug,
    title: stall.title ?? "",
    pageUrl: stall.pageUrl ?? `https://mybot.farm/agents/${stall.slug}`,
    packUrl: stall.packUrl ?? "",
    hermesHref: stall.hermesHref ?? stall.hermesUrl ?? "",
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
    packVersion: pack.packVersion,
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
function parsePriceCents(value) {
  if (typeof value === "boolean") return null;
  if (typeof value === "string") {
    const text = value.trim();
    if (!text) return null;
    const parsed = text.includes(".") ? Number(text) : Number.parseInt(text, 10);
    if (!Number.isFinite(parsed)) return null;
    value = parsed;
  }
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const cents = Math.round(value);
  if (cents === 0) return 0;
  if (cents < MIN_PAID_PRICE_CENTS || cents > MAX_PRICE_CENTS) return null;
  return cents;
}
function parseListingKind(value) {
  if (typeof value === "string" && LISTING_KIND_SET.has(value.trim())) {
    return value.trim();
  }
  return null;
}
function parsePackObject(value) {
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      throw new FarmError("Pack JSON must be an object.");
    }
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new FarmError("Pack JSON must be an object.");
  }
  const encoded = JSON.stringify(value);
  if (encoded.length > MAX_PACK_CHARS) {
    throw new FarmError("Pack JSON is too large (max 500 KB).");
  }
  return value;
}
function memberPackError(index, pack) {
  if (typeof pack === "string") {
    return pack.trim() ? null : `members[${index}].pack must be a catalog path, slug, tarball URL, or nested agent-pack object`;
  }
  if (!pack || typeof pack !== "object" || Array.isArray(pack)) {
    return `members[${index}].pack must be a catalog path, slug, tarball URL, or nested agent-pack object`;
  }
  if (pack.format === TEAM_PACK_FORMAT) {
    return `members[${index}].pack nested object cannot be a team-pack`;
  }
  return null;
}
function validateListingPack(kind, pack) {
  const fmt = typeof pack?.format === "string" ? pack.format.trim() : "";
  if (kind === "team") {
    if (fmt !== TEAM_PACK_FORMAT) {
      throw new FarmError(`kind "team" requires pack.format "${TEAM_PACK_FORMAT}"`);
    }
    const members = pack.members;
    if (!Array.isArray(members) || members.length < MIN_TEAM_MEMBERS) {
      throw new FarmError(
        `kind "team" requires members[] with at least ${MIN_TEAM_MEMBERS} agents`
      );
    }
    for (let i = 0; i < members.length; i += 1) {
      const member = members[i];
      if (!member || typeof member !== "object" || Array.isArray(member)) {
        throw new FarmError(`members[${i}] must be an object with role, summary, and pack`);
      }
      const role = typeof member.role === "string" ? member.role.trim() : "";
      const summary = typeof member.summary === "string" ? member.summary.trim() : "";
      if (!role) throw new FarmError(`members[${i}].role is required`);
      if (!summary) throw new FarmError(`members[${i}].summary is required`);
      const packError = memberPackError(i, member.pack);
      if (packError) throw new FarmError(packError);
    }
    if (pack.shared !== void 0) {
      if (!pack.shared || typeof pack.shared !== "object" || Array.isArray(pack.shared)) {
        throw new FarmError("shared must be an object.");
      }
      if (pack.shared.gettingStarted !== void 0 && typeof pack.shared.gettingStarted !== "string") {
        throw new FarmError("shared.gettingStarted must be a string (Hermes install steps).");
      }
    }
    return;
  }
  if (fmt === TEAM_PACK_FORMAT) {
    throw new FarmError(`kind "agent" cannot use pack.format "${TEAM_PACK_FORMAT}"`);
  }
  if (Array.isArray(pack.members) && pack.members.length > 0) {
    throw new FarmError('kind "agent" listings cannot include members[] \u2014 use kind "team"');
  }
}
function buildListingPayload({
  kind,
  name,
  title,
  description,
  category,
  priceCents,
  pack,
  slug,
  packVersion
}) {
  const parsedKind = parseListingKind(kind);
  if (!parsedKind) {
    throw new FarmError('kind must be "agent" or "team"');
  }
  const parsedName = typeof name === "string" ? name.trim() : "";
  const parsedTitle = typeof title === "string" ? title.trim() : "";
  const parsedDescription = typeof description === "string" ? description.trim() : "";
  if (!parsedName || !parsedTitle || !parsedDescription) {
    throw new FarmError("name, title, and description are required");
  }
  const parsedCategory = typeof category === "string" ? category.trim() : "";
  if (!CATEGORY_SET.has(parsedCategory)) {
    const labels = [...CATEGORY_LABELS].sort().join(", ");
    throw new FarmError(`category must be an exact farm label (${labels})`);
  }
  const parsedPrice = parsePriceCents(priceCents);
  if (parsedPrice === null) {
    throw new FarmError(PRICE_HINT);
  }
  const parsedPack = parsePackObject(pack);
  validateListingPack(parsedKind, parsedPack);
  const payload = {
    kind: parsedKind,
    name: parsedName,
    title: parsedTitle,
    description: parsedDescription,
    category: parsedCategory,
    priceCents: parsedPrice,
    pack: parsedPack
  };
  if (typeof slug === "string" && slug.trim()) {
    payload.slug = slug.trim().toLowerCase();
  }
  if (packVersion != null && packVersion !== "") {
    payload.packVersion = packVersion;
  }
  return payload;
}
function listingPayloadSummary(payload) {
  const pack = payload.pack && typeof payload.pack === "object" ? payload.pack : {};
  const skills = Array.isArray(pack.skills) ? pack.skills : [];
  const members = Array.isArray(pack.members) ? pack.members : [];
  const encoded = JSON.stringify(pack);
  const memberRoles = members.filter((m) => m && typeof m === "object" && typeof m.role === "string" && m.role.trim()).map((m) => m.role.trim());
  return {
    kind: payload.kind,
    name: payload.name,
    title: payload.title,
    category: payload.category,
    priceCents: payload.priceCents,
    slug: payload.slug,
    packVersion: payload.packVersion,
    pack: {
      format: pack.format,
      version: pack.version,
      packVersion: pack.packVersion,
      runtime: pack.runtime || [],
      skillCount: skills.length,
      memberCount: members.length,
      memberRoles,
      encodedChars: encoded.length
    }
  };
}
function listingPageUrl(baseUrl, pagePath) {
  const path3 = pagePath.startsWith("/") ? pagePath : `/${pagePath}`;
  return `${baseUrl.replace(/\/+$/, "")}${path3}`;
}
async function createListing(baseUrl, payload, apiKey) {
  const key = typeof apiKey === "string" ? apiKey.trim() : "";
  if (!key) {
    throw new FarmError(
      "seller API key required (env MYBOT_FARM_API_KEY or plugin config apiKey)"
    );
  }
  const url = `${baseUrl.replace(/\/+$/, "")}/api/listings`;
  const body = JSON.stringify(payload);
  const raw = await farmRequest(url, {
    data: body,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`
    }
  });
  let data;
  try {
    data = JSON.parse(raw.toString("utf8"));
  } catch (err) {
    throw new FarmError(`non-JSON from ${url}: ${err instanceof Error ? err.message : String(err)}`);
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new FarmError(`empty listing response from ${url}`);
  }
  return data;
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
function buildRoutinesMd(pack) {
  const routines = Array.isArray(pack.routines) ? pack.routines : [];
  if (routines.length === 0) {
    return null;
  }
  const lines = [
    "# ROUTINES.md",
    "",
    "Intention prose from the mybot.farm pack. Not live cron and not automation.json.",
    ""
  ];
  for (const routine of routines) {
    const name = routine.name ?? routine.slug ?? "routine";
    lines.push(`## ${name}`);
    if (routine.slug) {
      lines.push(`- **Slug:** ${routine.slug}`);
    }
    if (routine.description) {
      lines.push(`- **Description:** ${routine.description}`);
    }
    lines.push("", (routine.content ?? "").trim(), "");
  }
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
  const plugins = Array.isArray(pack.plugins) ? pack.plugins : [];
  if (plugins.length) {
    lines.push(
      "",
      "## Marketplace plugins",
      "",
      "Install these from the host marketplace. Do not add custom MCP URLs.",
      ""
    );
    for (const plugin of plugins) {
      const id = typeof plugin?.pluginId === "string" ? plugin.pluginId.trim() : "";
      if (!id) continue;
      const label = plugin.name ? ` \u2014 ${plugin.name}` : "";
      lines.push(`- \`${id}\`${label}`);
    }
  }
  const firstSkill = typeof pack.gettingStarted?.skill === "string" ? pack.gettingStarted.skill.trim() : "";
  if (firstSkill) {
    lines.push(
      "",
      "## Getting started",
      "",
      `First-run skill from the pack: \`${firstSkill}\`.`
    );
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

// src/post.mjs
import fs2 from "node:fs/promises";
import path2 from "node:path";
import os2 from "node:os";
function expandHome2(p) {
  if (!p) return p;
  if (p === "~") return os2.homedir();
  if (p.startsWith("~/")) return path2.join(os2.homedir(), p.slice(2));
  return p;
}
function truthy(value) {
  if (typeof value === "string") {
    return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
  }
  return Boolean(value);
}
async function loadPack(args) {
  const pack = args.pack;
  const pathArg = args.packPath ?? args.pack_path;
  const hasPack = pack != null && pack !== "";
  const hasPath = typeof pathArg === "string" && pathArg.trim();
  if (hasPack && hasPath) {
    throw new FarmError("provide pack or packPath, not both");
  }
  if (hasPath) {
    const filePath = expandHome2(path2.resolve(String(pathArg).trim()));
    let raw;
    try {
      raw = await fs2.readFile(filePath, "utf8");
    } catch (err) {
      if (err && typeof err === "object" && "code" in err && err.code === "ENOENT") {
        throw new FarmError(`pack file not found: ${filePath}`);
      }
      throw new FarmError(`cannot read pack file: ${err instanceof Error ? err.message : String(err)}`);
    }
    try {
      return JSON.parse(raw);
    } catch (err) {
      throw new FarmError(`pack file is not JSON: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  if (hasPack) return pack;
  throw new FarmError("pack (GAF JSON object) or packPath (path to a .json GAF file) required");
}
function errPayload(message, extra = {}) {
  return { ok: false, error: message, ...extra };
}
async function postListing({ args, pluginConfig } = { args: {} }) {
  const cfg = pluginConfig && typeof pluginConfig === "object" ? pluginConfig : {};
  const dryRun = truthy("dryRun" in args ? args.dryRun : args.dry_run);
  const apiKey = resolveApiKey(cfg);
  let payload;
  try {
    const pack = await loadPack(args);
    payload = buildListingPayload({
      kind: args.kind,
      name: args.name,
      title: args.title,
      description: args.description,
      category: args.category,
      priceCents: "priceCents" in args ? args.priceCents : args.price_cents,
      pack,
      slug: args.slug,
      packVersion: "packVersion" in args ? args.packVersion : args.pack_version
    });
  } catch (err) {
    if (err instanceof FarmError) return errPayload(err.message, err.status != null ? { status: err.status } : {});
    throw err;
  }
  const summary = listingPayloadSummary(payload);
  const { baseUrl } = resolveFarmConfig(cfg);
  if (dryRun) {
    const keyNote = apiKey ? "configured (redacted)" : "missing (POST would fail)";
    const lines2 = [
      "Dry-run: listing payload is valid (not posted)",
      `kind: ${payload.kind}`,
      `name: ${payload.name}`,
      `title: ${payload.title}`,
      `category: ${payload.category}`,
      `priceCents: ${payload.priceCents}`,
      `slug: ${payload.slug || "(from name)"}`,
      `packVersion: ${payload.packVersion != null ? payload.packVersion : "(auto)"}`,
      `pack format: ${summary.pack?.format || "(none)"}`,
      `pack skills: ${summary.pack?.skillCount}`,
      `pack members: ${summary.pack?.memberCount || 0}`,
      `pack encoded chars: ${summary.pack?.encodedChars}`,
      `POST ${baseUrl}/api/listings`,
      `apiKey: ${keyNote}`
    ];
    return {
      ok: true,
      dryRun: true,
      text: lines2.join("\n"),
      payload: summary,
      endpoint: `${baseUrl}/api/listings`,
      apiKey: keyNote
    };
  }
  if (!apiKey) {
    return errPayload(
      "seller API key required (set MYBOT_FARM_API_KEY or plugin config apiKey). Create a key at https://mybot.farm/sell \u2014 see docs/api-keys.md"
    );
  }
  let result;
  try {
    result = await createListing(baseUrl, payload, apiKey);
  } catch (err) {
    if (err instanceof FarmError) {
      return errPayload(err.message, err.status != null ? { status: err.status } : {});
    }
    throw err;
  }
  const slug = String(result.slug || "").trim();
  const kind = String(result.kind || payload.kind);
  const pagePath = String(result.pagePath || "");
  const pageUrl = pagePath ? listingPageUrl(baseUrl, pagePath) : `${baseUrl}/${kind}s/${slug}`;
  const listingId = String(result.id || result.stallId || "").trim();
  const packVersion = result.packVersion;
  const updated = Boolean(result.updated);
  const verb = updated ? "Updated" : "Posted";
  const lines = [`${verb} ${kind} \`${slug}\``, pageUrl];
  if (listingId) lines.push(`stall id: ${listingId}`);
  if (packVersion != null) lines.push(`pack version: ${packVersion}`);
  if (result.hasReadme) lines.push("README extracted from pack.");
  return {
    ok: true,
    text: lines.join("\n"),
    id: listingId || void 0,
    stallId: listingId || void 0,
    slug,
    kind,
    pagePath,
    pageUrl,
    packVersion,
    created: Boolean(result.created ?? !updated),
    updated,
    hasReadme: Boolean(result.hasReadme)
  };
}
async function updateListing({ args, pluginConfig } = { args: {} }) {
  const slug = typeof args.slug === "string" ? args.slug.trim() : "";
  if (!slug) {
    return errPayload("slug required");
  }
  return postListing({ args: { ...args, slug }, pluginConfig });
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
  description: "Search mybot.farm stalls, plant GAF packs into OpenClaw, and post listings.",
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
      ),
      apiKey: Type.Optional(
        Type.String({
          description: "Seller API key from https://mybot.farm/sell (prefer env MYBOT_FARM_API_KEY). Never commit the key."
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
    }),
    tool({
      name: "farm_post",
      label: "Farm Post",
      description: 'Publish a listing to mybot.farm (POST /api/listings) with a seller API key. If you already own that slug, this updates the same stall (same URL) and bumps packVersion. Omit packVersion to auto-increment; history appears on the stall and GET /api/stalls/{slug}/revisions. Auth: env MYBOT_FARM_API_KEY, else plugin config apiKey (never a tool argument). Create a key at https://mybot.farm/sell. Pack must be GAF JSON (object or packPath to a .json file). OpenClaw already plants GAF; posting publishes GAF (no tarball translator). kind "team" requires format mybot.farm/team-pack and members[] (at least two): each member needs role, summary, and pack (catalog path, slug, tarball URL, or nested agent-pack). kind "agent" uses mybot.farm/agent-pack and cannot include members[]. category is an exact farm label (Lifestyle, Coding, Experimental, \u2026). priceCents is 0 (free) or 200\u2013999900. Paid listings need Stripe Connect on the seller (403 connect_required). Prefer dryRun to validate without posting. Does not email or spend money. Catalog/agency slugs cannot be overwritten.',
      parameters: Type.Object({
        kind: Type.String({
          description: 'Listing kind: "agent" or "team". Teams land on /teams/{slug} and need a team-pack with members[].'
        }),
        name: Type.String({ description: "Listing name. Used to derive the slug on first publish." }),
        title: Type.String({ description: "Short stall title shown on the farm." }),
        description: Type.String({ description: "Stall description (non-empty)." }),
        category: Type.String({
          description: "Exact farm category label: Lifestyle, Productivity, Coding, Writing, Marketing, Sales, Research, Personal finance, Creative, Music, Education, Ops / admin, Experimental."
        }),
        priceCents: Type.Number({
          description: "0 for free, or integer cents in [200, 999900] ($2.00\u2013$9,999.00)."
        }),
        pack: Type.Optional(
          Type.Unknown({
            description: "GAF JSON object. Agents: mybot.farm/agent-pack. Teams: mybot.farm/team-pack with members[] (role, summary, pack). OpenClaw plants GAF; this posts GAF."
          })
        ),
        packPath: Type.Optional(
          Type.String({
            description: "Path to a .json GAF file. Use pack or packPath, not both."
          })
        ),
        dryRun: Type.Optional(
          Type.Boolean({
            description: "Validate and show a payload summary without POSTing. Redacts any key."
          })
        ),
        slug: Type.Optional(
          Type.String({
            description: "Existing stall slug to update in place. If omitted, derived from name. Same seller + same slug replaces GAF (skills, soul/memory) and bumps packVersion."
          })
        ),
        packVersion: Type.Optional(
          Type.Number({
            description: "Optional content revision. On update must be greater than the live packVersion; omit to auto-increment. Distinct from GAF format version."
          })
        )
      }),
      async execute(params, config) {
        const result = await postListing({
          args: params,
          pluginConfig: config
        });
        if (!result.ok) {
          throw new FarmError(result.error, result.status);
        }
        return textResult(result.text, result);
      }
    }),
    tool({
      name: "farm_update",
      label: "Farm Update",
      description: "Update a seller-owned stall in place (same slug). Same fields as farm_post plus required slug. Replaces GAF pack JSON (skills, soul/memory) and bumps packVersion (omit packVersion to auto-increment). The farm publishes the pack to the catalog repo. Catalog slugs are reserved.",
      parameters: Type.Object({
        kind: Type.String({
          description: 'Listing kind: "agent" or "team". Teams land on /teams/{slug} and need a team-pack with members[].'
        }),
        name: Type.String({ description: "Listing name." }),
        title: Type.String({ description: "Short stall title shown on the farm." }),
        description: Type.String({ description: "Stall description (non-empty)." }),
        category: Type.String({
          description: "Exact farm category label: Lifestyle, Productivity, Coding, Writing, Marketing, Sales, Research, Personal finance, Creative, Music, Education, Ops / admin, Experimental."
        }),
        priceCents: Type.Number({
          description: "0 for free, or integer cents in [200, 999900] ($2.00\u2013$9,999.00)."
        }),
        slug: Type.String({ description: "Existing stall slug to update." }),
        pack: Type.Optional(
          Type.Unknown({
            description: "GAF JSON object. Agents: mybot.farm/agent-pack. Teams: mybot.farm/team-pack with members[] (role, summary, pack). OpenClaw plants GAF; this posts GAF."
          })
        ),
        packPath: Type.Optional(
          Type.String({
            description: "Path to a .json GAF file. Use pack or packPath, not both."
          })
        ),
        packVersion: Type.Optional(
          Type.Number({
            description: "Optional content revision; omit to auto-increment."
          })
        ),
        dryRun: Type.Optional(
          Type.Boolean({
            description: "Validate without POSTing. Redacts any key."
          })
        )
      }),
      async execute(params, config) {
        const result = await updateListing({
          args: params,
          pluginConfig: config
        });
        if (!result.ok) {
          throw new FarmError(result.error, result.status);
        }
        return textResult(result.text, result);
      }
    })
  ]
});
export {
  index_default as default
};
