// Smoke test for the mock farm — exercises the exact surface the KiroCrew
// plant/post plugin will use. Run the server first (npm start), then: npm run smoke
// Override target with BASE (e.g. BASE=http://localhost:8787).

const BASE = process.env.BASE ?? "http://localhost:8787";
const KEY = process.env.MOCK_API_KEY ?? "mbf_mocktoken";

let pass = 0, fail = 0;
function ok(name, cond, detail = "") {
  if (cond) { pass++; console.log(`  ok  ${name}`); }
  else { fail++; console.log(`FAIL  ${name}${detail ? " — " + detail : ""}`); }
}
async function j(path, init) {
  const r = await fetch(BASE + path, init);
  let body = null;
  try { body = await r.json(); } catch { /* non-json */ }
  return { status: r.status, body };
}

console.log(`[smoke] target ${BASE}`);

// index
let r = await j("/api");
ok("GET /api → 200 + tools[]", r.status === 200 && Array.isArray(r.body?.tools));

// search
r = await j("/api/stalls");
ok("GET /api/stalls → 200 + count", r.status === 200 && typeof r.body?.count === "number" && r.body.count > 0);
const firstSlug = r.body?.stalls?.[0]?.slug;
ok("search stall has api paths", Boolean(r.body?.stalls?.[0]?.api?.download_pack));

r = await j("/api/stalls?kind=team");
ok("GET /api/stalls?kind=team → only teams", r.status === 200 && r.body.stalls.every((s) => s.kind === "team"));

r = await j("/api/stalls?kind=bogus");
ok("GET /api/stalls?kind=bogus → 400", r.status === 400 && r.body?.error === "invalid_kind");

// get_stall (use a known seed if present, else the first)
const probeSlug = "probe";
r = await j(`/api/stalls/${probeSlug}`);
const stallSlug = r.status === 200 ? probeSlug : firstSlug;
r = await j(`/api/stalls/${stallSlug}`);
ok("GET /api/stalls/{slug} → 200 + pack summary", r.status === 200 && r.body?.pack && typeof r.body.pack.skillCount === "number");

// download_pack
r = await j(`/api/packs/${stallSlug}`);
ok("GET /api/packs/{slug} → 200 + GAF format", r.status === 200 && typeof r.body?.format === "string");

// skills
r = await j(`/api/packs/${stallSlug}/skills`);
ok("GET /api/packs/{slug}/skills → 200 + skills[]", r.status === 200 && Array.isArray(r.body?.skills));

// install-prompt
r = await j(`/api/install-prompt/${stallSlug}`);
ok("GET /api/install-prompt/{slug} → 200 + prompt", r.status === 200 && typeof r.body?.prompt === "string");

// revisions
r = await j(`/api/stalls/${stallSlug}/revisions`);
ok("GET /api/stalls/{slug}/revisions → 200 + revisions[]", r.status === 200 && Array.isArray(r.body?.revisions));

// 404
r = await j("/api/stalls/does-not-exist-xyz");
ok("GET unknown stall → 404 stall_not_found", r.status === 404 && r.body?.error === "stall_not_found");

// ---- write path (post_listing) ----
const agentPack = {
  format: "mybot.farm/agent-pack",
  profile: { name: "Mock Bot", title: "Smoke test agent", description: "Posted by the smoke test." },
  skills: [{ name: "demo", description: "d", content: "do the thing" }],
};
const postBody = {
  kind: "agent", name: "Mock Bot", title: "Smoke test agent",
  description: "Posted by the smoke test.", category: "Experimental",
  priceCents: 0, pack: agentPack,
};

// no auth
r = await j("/api/listings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(postBody) });
ok("POST /api/listings no key → 401", r.status === 401 && r.body?.error === "unauthorized");

// wrong key
r = await j("/api/listings", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer mbf_wrong" }, body: JSON.stringify(postBody) });
ok("POST /api/listings bad key → 401", r.status === 401);

// bad category
r = await j("/api/listings", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` }, body: JSON.stringify({ ...postBody, category: "Nope" }) });
ok("POST bad category → 400 invalid_category", r.status === 400 && r.body?.error === "invalid_category");

// reserved (seed) slug
r = await j("/api/listings", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` }, body: JSON.stringify({ ...postBody, slug: stallSlug }) });
ok("POST onto seed slug → 409 catalog_reserved", r.status === 409 && r.body?.error === "catalog_reserved");

// create
r = await j("/api/listings", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` }, body: JSON.stringify(postBody) });
ok("POST new listing → 201 created", r.status === 201 && r.body?.created === true, `status=${r.status}`);
const newSlug = r.body?.slug;

// get-after-put round-trip
r = await j(`/api/packs/${newSlug}`);
ok("GET posted pack → 200 round-trip", r.status === 200 && r.body?.profile?.name === "Mock Bot");

// update (same owner) bumps version
r = await j("/api/listings", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` }, body: JSON.stringify({ ...postBody, slug: newSlug, description: "Updated." }) });
ok("POST update own listing → 200 updated + version bump", r.status === 200 && r.body?.updated === true && r.body?.packVersion >= 2, `v=${r.body?.packVersion}`);

// team validation
r = await j("/api/listings", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` }, body: JSON.stringify({ kind: "team", name: "Bad Team", title: "t", description: "d", category: "Coding", priceCents: 0, pack: { format: "mybot.farm/team-pack", members: [{ role: "solo", summary: "s", pack: "agents/patch.json" }] } }) });
ok("POST team with 1 member → 400", r.status === 400 && r.body?.error === "invalid_pack");

console.log(`\n[smoke] ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
