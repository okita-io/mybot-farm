/**
 * Live mybot.farm API helpers (stalls search + GAF pack download).
 */

const DEFAULT_BASE = "https://mybot.farm";
const DEFAULT_WORKSPACE_ROOT = "~/.openclaw/farm";

export function resolveFarmConfig(pluginConfig) {
  const envUrl = typeof process.env.MYBOT_FARM_URL === "string" ? process.env.MYBOT_FARM_URL.trim() : "";
  const cfg = pluginConfig ?? {};
  const baseUrl = (
    envUrl ||
    (typeof cfg.baseUrl === "string" ? cfg.baseUrl.trim() : "") ||
    DEFAULT_BASE
  ).replace(/\/+$/, "");
  const workspaceRoot =
    (typeof cfg.workspaceRoot === "string" && cfg.workspaceRoot.trim()) || DEFAULT_WORKSPACE_ROOT;
  return { baseUrl, workspaceRoot };
}

async function farmFetch(baseUrl, path) {
  const url = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`mybot.farm ${res.status} for ${url}${body ? `: ${body.slice(0, 240)}` : ""}`);
  }
  return await res.json();
}

export async function searchStalls(baseUrl, query, limit) {
  const q = encodeURIComponent(query);
  const data = await farmFetch(baseUrl, `/api/stalls?q=${q}`);
  let stalls = Array.isArray(data.stalls) ? data.stalls : [];
  if (typeof limit === "number" && Number.isFinite(limit) && limit > 0) {
    stalls = stalls.slice(0, Math.floor(limit));
  }
  return {
    stalls,
    count: typeof data.count === "number" ? data.count : stalls.length,
    query: data.query ?? query,
  };
}

export async function getPack(baseUrl, slug) {
  const clean = slug.trim().replace(/^\/+|\/+$/g, "");
  if (!clean) throw new Error("slug required");
  const pack = await farmFetch(baseUrl, `/api/packs/${encodeURIComponent(clean)}`);
  if (!pack || typeof pack !== "object") throw new Error(`empty pack for ${clean}`);
  if (!pack.slug) pack.slug = clean;
  return pack;
}

export async function getInstallPrompt(baseUrl, slug) {
  const clean = slug.trim();
  return farmFetch(baseUrl, `/api/install-prompt/${encodeURIComponent(clean)}`);
}

export function stallSummary(stall) {
  return {
    slug: stall.slug,
    name: stall.name ?? stall.slug,
    title: stall.title ?? "",
    pageUrl: stall.pageUrl ?? `https://mybot.farm/agents/${stall.slug}`,
    packUrl: stall.packUrl ?? "",
    description: stall.description ?? "",
    category: stall.category ?? "",
  };
}

export function packSummary(pack) {
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
    homepage: manifest.homepage ?? `https://mybot.farm/agents/${pack.slug}`,
  };
}
