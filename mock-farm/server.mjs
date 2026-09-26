// Mock mybot.farm API — a local stand-in for the live site while the KiroCrew
// plant/post plugin is built. Serves the endpoint surface the plugin needs with
// byte-compatible shapes and status codes taken from web/src/app/api/*:
//
//   GET  /api                      → tool + endpoint index
//   GET  /api/stalls[?q=&kind=]    → search_stalls  { tool, count, stalls[] }
//   GET  /api/stalls/{slug}        → get_stall       (stallRecord + pack summary)
//   GET  /api/packs/{slug}         → download_pack   (full GAF pack; 402 if paid)
//   GET  /api/packs/{slug}/skills  → list_pack_skills
//   GET  /api/install-prompt/{slug}→ get_install_prompt
//   GET  /api/stalls/{slug}/revisions → list_stall_revisions
//   POST /api/listings             → post_listing (Bearer mbf_… seller key)
//
// Seed stalls come from ../packs (the real catalog). Seller POSTs are held in
// memory so a get-after-put round-trips — no GitHub/Stripe/Neon. Restart = reset.
//
// Env: PORT (default 8787), MOCK_SEED_DIR (default ../packs), MOCK_API_KEY
//   (default mbf_mocktoken — the seller key the mock accepts).

import { createServer } from "node:http";
import { readFile, readdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? 8787);
const SEED_DIR = process.env.MOCK_SEED_DIR ?? join(__dirname, "..", "packs");
const API_KEY = process.env.MOCK_API_KEY ?? "mbf_mocktoken";

const CATEGORY_LABELS = new Set([
  "Lifestyle", "Productivity", "Coding", "Writing", "Marketing", "Sales",
  "Research", "Personal finance", "Creative", "Music", "Education",
  "Ops / admin", "Experimental",
]);

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Authorization, Payment-Authorization, Content-Type, X-Api-Key, Accept",
  "Access-Control-Expose-Headers": "WWW-Authenticate, Payment-Receipt",
  "Access-Control-Max-Age": "86400",
};

const TOOLS = [
  "search_stalls", "get_stall", "download_pack", "list_pack_skills",
  "get_install_prompt", "list_stall_revisions", "post_listing",
];

// ---- in-memory state -------------------------------------------------------
/** slug -> { kind, slug, pack, name, title, description, category, priceCents, packVersion, revisions[] } */
const catalog = new Map();
/** slug -> owner api key (posted listings only) */
const owners = new Map();

function slugify(name) {
  return String(name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function packVersionOf(pack) {
  return typeof pack?.packVersion === "number" && pack.packVersion > 0 ? pack.packVersion : 1;
}

function soulOneLiner(text) {
  if (!text?.trim()) return null;
  const c = text.replace(/\s+/g, " ").trim();
  const end = c.search(/[.!?](?:\s|$)/);
  const line = end === -1 ? c : c.slice(0, end + 1);
  return line.length <= 140 ? line : line.slice(0, 139).trimEnd() + "…";
}

function stallRecord(s) {
  const pagePath = s.kind === "team" ? `/teams/${s.slug}` : `/agents/${s.slug}`;
  return {
    kind: s.kind, slug: s.slug, stallId: s.slug, packVersion: s.packVersion,
    name: s.name, title: s.title, description: s.description, category: s.category,
    pagePath, priceCents: s.priceCents ?? 0, currency: "usd",
    api: {
      get_stall: `/api/stalls/${s.slug}`,
      download_pack: `/api/packs/${s.slug}`,
      list_pack_skills: `/api/packs/${s.slug}/skills`,
      get_install_prompt: `/api/install-prompt/${s.slug}`,
      list_stall_revisions: `/api/stalls/${s.slug}/revisions`,
    },
  };
}

function packSummary(pack) {
  const skills = Array.isArray(pack.skills) ? pack.skills : [];
  const memory = Array.isArray(pack.memory) ? pack.memory : [];
  const members = Array.isArray(pack.members) ? pack.members : [];
  const memberSkills = members.reduce((n, m) => {
    const mp = typeof m.pack === "string" ? catalog.get(slugFromPath(m.pack)) : null;
    return n + (mp?.pack?.skills?.length ?? 0);
  }, 0);
  return {
    format: pack.format, version: pack.version, packVersion: packVersionOf(pack),
    runtime: Array.isArray(pack.runtime) ? pack.runtime : [],
    skillCount: skills.length + memberSkills,
    memoryCount: memory.length,
    memoryLineCount: memory.reduce((n, m) =>
      n + (m.content ? m.content.split(/\r?\n/).filter((l) => l.trim()).length : 0), 0),
    soulLine: soulOneLiner(pack.profile?.description),
    memberCount: members.length,
    scrubbed: pack.manifest?.scrubbed ?? true,
    homepage: pack.manifest?.homepage,
  };
}

function slugFromPath(p) {
  const f = String(p).split("/").pop()?.split("?")[0] ?? p;
  return f.replace(/\.hermes\.tar\.gz$/i, "").replace(/\.tar\.gz$/i, "").replace(/\.json$/i, "");
}

// ---- responses -------------------------------------------------------------
function send(res, status, data, extra = {}) {
  const body = JSON.stringify(data, null, 2);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...CORS, ...extra,
  });
  res.end(body);
}
const notFound = (res, slug) => send(res, 404, { error: "stall_not_found", ...(slug ? { slug } : {}) });

// ---- seed ------------------------------------------------------------------
async function seed() {
  for (const [kind, sub] of [["agent", "agents"], ["team", "teams"]]) {
    let files = [];
    try { files = await readdir(join(SEED_DIR, sub)); } catch { continue; }
    for (const f of files) {
      if (!f.endsWith(".json")) continue;
      const slug = f.replace(/\.json$/, "");
      try {
        const pack = JSON.parse(await readFile(join(SEED_DIR, sub, f), "utf8"));
        catalog.set(slug, {
          kind, slug, pack,
          name: pack.profile?.name ?? slug,
          title: pack.profile?.title ?? pack.profile?.name ?? slug,
          description: pack.profile?.description ?? "",
          category: pack.category ?? "Experimental",
          priceCents: 0,
          packVersion: packVersionOf(pack),
          revisions: [{ packVersion: packVersionOf(pack), source: "seed", summary: "seed", timestamp: new Date().toISOString() }],
        });
      } catch { /* skip malformed seed */ }
    }
  }
  console.log(`[mock-farm] seeded ${catalog.size} stalls from ${SEED_DIR}`);
}

// ---- listing validation (mirrors validateListingPack) ----------------------
function validateListing(body) {
  if (!body || typeof body !== "object") return { error: "invalid_body", message: "JSON object required", status: 400 };
  const { kind, name, title, description, category, priceCents, pack } = body;
  if (kind !== "agent" && kind !== "team") return { error: "invalid_kind", message: 'kind must be "agent" or "team"', status: 400 };
  for (const [k, v] of Object.entries({ name, title, description })) {
    if (typeof v !== "string" || !v.trim()) return { error: "invalid_field", message: `${k} must be a non-empty string`, status: 400 };
  }
  if (!CATEGORY_LABELS.has(category)) return { error: "invalid_category", message: `category must be one of the taxonomy labels`, status: 400 };
  const price = typeof priceCents === "number" ? priceCents : Number(priceCents);
  if (!Number.isInteger(price) || price < 0 || (price > 0 && (price < 200 || price > 999900)))
    return { error: "invalid_price", message: "priceCents must be 0 or 200..999900", status: 400 };
  if (!pack || typeof pack !== "object") return { error: "invalid_pack", message: "pack must be a GAF JSON object", status: 400 };
  if (kind === "team") {
    if (pack.format !== "mybot.farm/team-pack") return { error: "invalid_pack", message: 'team requires format "mybot.farm/team-pack"', status: 400 };
    if (!Array.isArray(pack.members) || pack.members.length < 2) return { error: "invalid_pack", message: "team requires members[] >= 2", status: 400 };
  } else if (Array.isArray(pack.members) && pack.members.length) {
    return { error: "invalid_pack", message: 'agent cannot include members[]', status: 400 };
  }
  return { ok: true, price };
}

// ---- router ----------------------------------------------------------------
async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  if (!chunks.length) return null;
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { return null; }
}

function bearer(req) {
  const h = req.headers["authorization"];
  return h?.startsWith("Bearer ") ? h.slice(7).trim() : null;
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname.replace(/\/+$/, "") || "/";
  const method = req.method;

  if (method === "OPTIONS") { res.writeHead(204, CORS); return res.end(); }

  // GET /api
  if (method === "GET" && path === "/api") {
    return send(res, 200, {
      name: "mybot.farm (mock)", readOnly: false, tools: TOOLS,
      endpoints: {
        search_stalls: "/api/stalls", get_stall: "/api/stalls/{slug}",
        download_pack: "/api/packs/{slug}", list_pack_skills: "/api/packs/{slug}/skills",
        get_install_prompt: "/api/install-prompt/{slug}",
        list_stall_revisions: "/api/stalls/{slug}/revisions", post_listing: "/api/listings",
      },
    });
  }

  // GET /api/stalls
  if (method === "GET" && path === "/api/stalls") {
    const q = (url.searchParams.get("q") ?? url.searchParams.get("query") ?? "").trim().toLowerCase();
    const kindParam = url.searchParams.get("kind");
    if (kindParam && kindParam !== "agent" && kindParam !== "team")
      return send(res, 400, { error: "invalid_kind", kind: kindParam, allowed: ["agent", "team"] });
    let list = [...catalog.values()];
    if (kindParam) list = list.filter((s) => s.kind === kindParam);
    if (q) list = list.filter((s) =>
      [s.slug, s.name, s.title, s.description, s.category, s.kind].filter(Boolean).join(" ").toLowerCase().includes(q));
    const stalls = list.map(stallRecord);
    return send(res, 200, { tool: "search_stalls", query: q || null, kind: kindParam ?? null, sort: "newest", count: stalls.length, stalls, tools: TOOLS }, { "Cache-Control": "public, max-age=60" });
  }

  // GET /api/stalls/{slug}/revisions
  let m = path.match(/^\/api\/stalls\/([^/]+)\/revisions$/);
  if (method === "GET" && m) {
    const s = catalog.get(decodeURIComponent(m[1]));
    if (!s) return notFound(res, m[1]);
    return send(res, 200, { tool: "list_stall_revisions", slug: s.slug, revisions: s.revisions });
  }

  // GET /api/stalls/{slug}
  m = path.match(/^\/api\/stalls\/([^/]+)$/);
  if (method === "GET" && m) {
    const s = catalog.get(decodeURIComponent(m[1]));
    if (!s) return notFound(res, m[1]);
    const summary = packSummary(s.pack);
    return send(res, 200, {
      tool: "get_stall", ...stallRecord(s),
      pack: {
        format: summary.format, version: summary.version, packVersion: summary.packVersion,
        profile: s.pack.profile, runtime: summary.runtime, skillCount: summary.skillCount,
        memoryCount: summary.memoryCount, memoryLineCount: summary.memoryLineCount,
        soulLine: summary.soulLine, memberCount: summary.memberCount,
        scrubbed: summary.scrubbed, homepage: summary.homepage,
        members: (s.pack.members ?? []).map((mm) => ({
          role: mm.role, summary: mm.summary, pack: mm.pack,
          slug: typeof mm.pack === "string" ? slugFromPath(mm.pack) : undefined, name: mm.role,
        })),
      },
    });
  }

  // GET /api/packs/{slug}/skills
  m = path.match(/^\/api\/packs\/([^/]+)\/skills$/);
  if (method === "GET" && m) {
    const s = catalog.get(decodeURIComponent(m[1]));
    if (!s) return notFound(res, m[1]);
    if ((s.priceCents ?? 0) > 0) return send(res, 402, { error: "purchase_required", slug: s.slug, priceCents: s.priceCents, hint: "Humans buy on the stall page. Agents retry with an MPP Payment credential." });
    return send(res, 200, {
      slug: s.slug, kind: s.kind, name: s.name, format: s.pack.format,
      skills: s.pack.skills ?? [], memory: s.pack.memory ?? [],
      sharedMemory: s.pack.shared?.memory ?? [],
      members: (s.pack.members ?? []).map((mm) => {
        const mp = typeof mm.pack === "string" ? catalog.get(slugFromPath(mm.pack)) : null;
        return { role: mm.role, summary: mm.summary, pack: mm.pack, slug: mp?.slug, name: mp?.name, skills: mp?.pack?.skills ?? [] };
      }),
    });
  }

  // GET /api/packs/{slug}
  m = path.match(/^\/api\/packs\/([^/]+)$/);
  if (method === "GET" && m) {
    const s = catalog.get(decodeURIComponent(m[1]));
    if (!s) return notFound(res, m[1]);
    if ((s.priceCents ?? 0) > 0) return send(res, 402, { error: "purchase_required", slug: s.slug, priceCents: s.priceCents, hint: "Humans buy on the stall page. Agents retry with an MPP Payment credential." });
    const asDownload = url.searchParams.get("download") === "1";
    return send(res, 200, s.pack, asDownload ? { "Content-Disposition": `attachment; filename="${s.slug}.json"` } : {});
  }

  // GET /api/install-prompt/{slug}
  m = path.match(/^\/api\/install-prompt\/([^/]+)$/);
  if (method === "GET" && m) {
    const s = catalog.get(decodeURIComponent(m[1]));
    if (!s) return notFound(res, m[1]);
    if ((s.priceCents ?? 0) > 0) return send(res, 402, { error: "purchase_required", slug: s.slug, priceCents: s.priceCents });
    const short = url.searchParams.get("short") === "1";
    const url_ = `http://localhost:${PORT}${s.kind === "team" ? "/teams/" : "/agents/"}${s.slug}`;
    const prompt = short
      ? `Install ${s.name} from ${url_}`
      : `Create a new agent named "${s.name}". ${s.description}\nSource: ${url_}`;
    return send(res, 200, { tool: "get_install_prompt", slug: s.slug, name: s.name, url: url_, prompt });
  }

  // POST /api/listings
  if (method === "POST" && path === "/api/listings") {
    const key = bearer(req);
    if (!key) return send(res, 401, { error: "unauthorized" });
    if (key !== API_KEY) return send(res, 401, { error: "unauthorized", message: "unknown seller key" });
    const body = await readJson(req);
    const v = validateListing(body);
    if (v.error) return send(res, v.status, { error: v.error, message: v.message });

    const slug = body.slug ? String(body.slug) : slugify(body.name);
    // reserved: any seeded (non-owned) slug stands in for the catalog-reserved set
    const existing = catalog.get(slug);
    if (existing && !owners.has(slug)) {
      return send(res, 409, { error: "catalog_reserved", message: "That slug is a farm catalog stall; seller keys cannot overwrite it.", slug });
    }
    if (existing && owners.get(slug) !== key) {
      return send(res, 409, { error: "slug_taken", message: "That slug already belongs to another seller.", slug });
    }

    const created = !existing;
    const nextVersion = created ? packVersionOf(body.pack) : existing.packVersion + 1;
    const pack = { ...body.pack, slug, packVersion: nextVersion };
    const rec = {
      kind: body.kind, slug, pack, name: body.name, title: body.title,
      description: body.description, category: body.category, priceCents: v.price,
      packVersion: nextVersion,
      revisions: [
        ...(existing?.revisions ?? []),
        { packVersion: nextVersion, source: "api_key", summary: created ? "created" : "updated", timestamp: new Date().toISOString() },
      ],
    };
    catalog.set(slug, rec);
    owners.set(slug, key);

    const pagePath = body.kind === "team" ? `/teams/${slug}` : `/agents/${slug}`;
    return send(res, created ? 201 : 200, {
      ok: true, id: slug, stallId: slug, slug, kind: body.kind,
      packVersion: nextVersion, created, updated: !created,
      pagePath, pageUrl: `http://localhost:${PORT}${pagePath}`,
      summary: created ? "created" : "updated",
    });
  }

  return notFound(res);
});

await seed();
server.listen(PORT, () => console.log(`[mock-farm] listening on http://localhost:${PORT} (seller key: ${API_KEY})`));
