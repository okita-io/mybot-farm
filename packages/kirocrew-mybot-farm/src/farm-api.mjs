// Farm API client — talks to mybot.farm (or the local mock). No KiroCrew deps.
// Env: MYBOT_FARM_URL (default https://mybot.farm), MYBOT_FARM_API_KEY (mbf_…).

const DEFAULT_URL = "https://mybot.farm";

export function farmBase() {
  return (process.env.MYBOT_FARM_URL ?? DEFAULT_URL).replace(/\/+$/, "");
}
export function farmKey() {
  return process.env.MYBOT_FARM_API_KEY ?? "";
}

async function getJson(path) {
  const r = await fetch(farmBase() + path, { headers: { Accept: "application/json" } });
  let body = null;
  try { body = await r.json(); } catch { /* non-json */ }
  return { status: r.status, body };
}

export function searchStalls(query, kind) {
  const p = new URLSearchParams();
  if (query) p.set("q", query);
  if (kind) p.set("kind", kind);
  const qs = p.toString();
  return getJson(qs ? `/api/stalls?${qs}` : "/api/stalls");
}
export const getStall = (slug) => getJson(`/api/stalls/${encodeURIComponent(slug)}`);
export const getPack = (slug) => getJson(`/api/packs/${encodeURIComponent(slug)}`);
export const getPackSkills = (slug) => getJson(`/api/packs/${encodeURIComponent(slug)}/skills`);
export const getInstallPrompt = (slug, short) =>
  getJson(`/api/install-prompt/${encodeURIComponent(slug)}${short ? "?short=1" : ""}`);

/** POST /api/listings with the seller key. body = { kind,name,title,description,category,priceCents,pack,slug? }. */
export async function postListing(body) {
  const key = farmKey();
  if (!key) return { status: 0, body: { error: "no_api_key", message: "Set MYBOT_FARM_API_KEY (mbf_…) to post." } };
  const r = await fetch(farmBase() + "/api/listings", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}`, Accept: "application/json" },
    body: JSON.stringify(body),
  });
  let out = null;
  try { out = await r.json(); } catch { /* non-json */ }
  return { status: r.status, body: out };
}
