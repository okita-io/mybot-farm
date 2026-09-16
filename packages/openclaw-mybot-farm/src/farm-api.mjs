/**
 * Live mybot.farm API helpers (stalls search + GAF pack download + listing create).
 */

const DEFAULT_BASE = "https://mybot.farm";
const DEFAULT_WORKSPACE_ROOT = "~/.openclaw/farm";
export const USER_AGENT = "openclaw-mybot-farm/0.2.0";
export const DEFAULT_BASE_URL = DEFAULT_BASE;

// Exact category *labels* from web/src/lib/site.ts `categories[].label`.
export const CATEGORY_LABELS = Object.freeze([
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
  "Experimental",
]);

const CATEGORY_SET = new Set(CATEGORY_LABELS);
export const LISTING_KINDS = Object.freeze(["agent", "team"]);
const LISTING_KIND_SET = new Set(LISTING_KINDS);
export const MIN_PAID_PRICE_CENTS = 200;
export const MAX_PRICE_CENTS = 999_900;
export const MAX_PACK_CHARS = 500_000;
export const PRICE_HINT = "Choose Free, or a price between $2.00 and $9,999.00.";

export class FarmError extends Error {
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
}

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

/**
 * Seller key: per-call override, else env MYBOT_FARM_API_KEY, else config apiKey.
 * Never log the returned value.
 */
export function resolveApiKey(pluginConfig, override) {
  if (typeof override === "string" && override.trim()) {
    return override.trim();
  }
  const env =
    typeof process.env.MYBOT_FARM_API_KEY === "string" ? process.env.MYBOT_FARM_API_KEY.trim() : "";
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
    ...(headers ?? {}),
  };
  let res;
  try {
    res = await fetch(url, {
      method: method ?? (data != null ? "POST" : "GET"),
      headers: reqHeaders,
      body: data,
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
      res.status,
    );
  }
  return Buffer.from(await res.arrayBuffer());
}

async function farmFetch(baseUrl, path) {
  const url = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
  const raw = await farmRequest(url);
  try {
    return JSON.parse(raw.toString("utf8"));
  } catch (err) {
    throw new FarmError(`non-JSON from ${url}: ${err instanceof Error ? err.message : String(err)}`);
  }
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
  if (!clean) throw new FarmError("slug required");
  const pack = await farmFetch(baseUrl, `/api/packs/${encodeURIComponent(clean)}`);
  if (!pack || typeof pack !== "object") throw new FarmError(`empty pack for ${clean}`);
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
    stallId: stall.stallId ?? stall.listingId ?? "",
    packVersion: stall.packVersion ?? null,
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
    packVersion: pack.packVersion,
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

/** Match web/src/lib/listings.ts parsePriceCents (plus string ints for CLI). */
export function parsePriceCents(value) {
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

export function parseListingKind(value) {
  if (typeof value === "string" && LISTING_KIND_SET.has(value.trim())) {
    return value.trim();
  }
  return null;
}

export function parsePackObject(value) {
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

export function buildListingPayload({
  kind,
  name,
  title,
  description,
  category,
  priceCents,
  pack,
  slug,
  packVersion,
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
  const payload = {
    kind: parsedKind,
    name: parsedName,
    title: parsedTitle,
    description: parsedDescription,
    category: parsedCategory,
    priceCents: parsedPrice,
    pack: parsedPack,
  };
  if (typeof slug === "string" && slug.trim()) {
    payload.slug = slug.trim().toLowerCase();
  }
  if (packVersion != null && packVersion !== "") {
    payload.packVersion = packVersion;
  }
  return payload;
}

export function listingPayloadSummary(payload) {
  const pack = payload.pack && typeof payload.pack === "object" ? payload.pack : {};
  const skills = Array.isArray(pack.skills) ? pack.skills : [];
  const encoded = JSON.stringify(pack);
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
      encodedChars: encoded.length,
    },
  };
}

export function listingPageUrl(baseUrl, pagePath) {
  const path = pagePath.startsWith("/") ? pagePath : `/${pagePath}`;
  return `${baseUrl.replace(/\/+$/, "")}${path}`;
}

export async function createListing(baseUrl, payload, apiKey) {
  const key = typeof apiKey === "string" ? apiKey.trim() : "";
  if (!key) {
    throw new FarmError(
      "seller API key required (env MYBOT_FARM_API_KEY or plugin config apiKey)",
    );
  }
  const url = `${baseUrl.replace(/\/+$/, "")}/api/listings`;
  const body = JSON.stringify(payload);
  const raw = await farmRequest(url, {
    data: body,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
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
