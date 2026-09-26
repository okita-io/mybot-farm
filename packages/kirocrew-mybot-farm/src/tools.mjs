// KiroCrew plugin tool handlers for mybot-farm. Each handler is a plain async
// function returning a JSON-serialisable result, so they are unit-testable
// without a live KiroCrew host. A thin `register(ctx)` adapter binds them to the
// host's tool registry when loaded as a plugin.
//
// Auth for writes is env-only (MYBOT_FARM_API_KEY) — the model never supplies a
// key as a tool argument (matches the Hermes/OpenClaw plugins).

import {
  searchStalls, getStall, getPack, postListing, farmBase, farmKey,
} from "./farm-api.mjs";
import { plantAgent, plantTeam, kiroHome } from "./plant.mjs";

async function farm_search(args = {}) {
  const { status, body } = await searchStalls(args.query, args.kind);
  if (status !== 200) return { ok: false, status, error: body?.error ?? "search_failed" };
  return { ok: true, count: body.count, stalls: body.stalls };
}

async function farm_get_stall(args = {}) {
  if (!args.slug) return { ok: false, error: "slug_required" };
  const { status, body } = await getStall(args.slug);
  if (status !== 200) return { ok: false, status, error: body?.error ?? "not_found" };
  return { ok: true, stall: body };
}

async function farm_get_pack(args = {}) {
  if (!args.slug) return { ok: false, error: "slug_required" };
  const { status, body } = await getPack(args.slug);
  if (status === 402) return { ok: false, status, error: "purchase_required", slug: args.slug };
  if (status !== 200) return { ok: false, status, error: body?.error ?? "not_found" };
  return { ok: true, pack: body };
}

async function resolveMembers(pack) {
  const memberPacks = {};
  for (const ref of pack.members ?? []) {
    const slug = typeof ref.pack === "string"
      ? ref.pack.split("/").pop().replace(/\.(json|hermes\.tar\.gz|tar\.gz)$/i, "") : null;
    if (!slug) continue;
    const r = await getPack(slug);
    if (r.status === 200) memberPacks[slug] = r.body;
  }
  return memberPacks;
}

async function farm_plant(args = {}) {
  if (!args.slug) return { ok: false, error: "slug_required" };
  const { status, body } = await getPack(args.slug);
  if (status === 402) return { ok: false, status, error: "purchase_required", slug: args.slug };
  if (status !== 200) return { ok: false, status, error: body?.error ?? "not_found" };

  const opts = { name: args.name, workspace: args.workspace, force: Boolean(args.force), reinstall: Boolean(args.reinstall), clean: Boolean(args.clean), dryRun: Boolean(args.dryRun) };
  if (body.format === "mybot.farm/team-pack") {
    const memberPacks = await resolveMembers(body);
    const plan = await plantTeam(body, memberPacks, opts);
    return { ok: true, kind: "team", kiroHome: kiroHome(), members: plan.memberNames, ...plan };
  }
  const plan = await plantAgent(body, opts);
  return { ok: true, kind: "agent", kiroHome: kiroHome(), ...plan };
}

function farm_reinstall(args = {}) {
  return farm_plant({ ...args, reinstall: true, force: true, clean: args.clean !== false });
}

async function farm_post(args = {}) {
  if (!farmKey()) return { ok: false, error: "no_api_key", message: "Set MYBOT_FARM_API_KEY (mbf_…) to post." };
  const required = ["kind", "name", "title", "description", "category", "pack"];
  for (const k of required) if (args[k] === undefined) return { ok: false, error: "missing_field", field: k };
  const body = {
    kind: args.kind, name: args.name, title: args.title, description: args.description,
    category: args.category, priceCents: Number(args.priceCents ?? 0), pack: args.pack,
    ...(args.slug ? { slug: args.slug } : {}),
  };
  if (args.dryRun) return { ok: true, action: "dry-run", target: farmBase(), body: { ...body, pack: "<omitted>" } };
  const { status, body: resp } = await postListing(body);
  if (status !== 200 && status !== 201) return { ok: false, status, error: resp?.error ?? "post_failed", message: resp?.message };
  return { ok: true, action: resp.created ? "created" : "updated", ...resp };
}

function farm_update(args = {}) {
  if (!args.slug) return { ok: false, error: "slug_required", message: "farm_update requires slug" };
  return farm_post(args);
}

export const tools = {
  farm_search, farm_get_stall, farm_get_pack, farm_plant, farm_reinstall, farm_post, farm_update,
};

/** Bind handlers to a KiroCrew host tool registry. Best-effort: host API may vary. */
export function register(ctx) {
  if (!ctx || typeof ctx.registerTool !== "function") return;
  for (const [name, execute] of Object.entries(tools)) {
    const writable = name === "farm_post" || name === "farm_update";
    ctx.registerTool({
      name,
      readOnly: !writable && name !== "farm_plant" && name !== "farm_reinstall",
      execute,
    });
  }
}
