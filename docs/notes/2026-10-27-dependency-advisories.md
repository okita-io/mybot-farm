# Dependency advisory handoff (2026-10-27 sweep)

**Status:** docs-only review for Alex. No code or lockfile changes in this note.  
**Reviewed:** 2026-10-28 against `web/package-lock.json` and `packages/openclaw-mybot-farm/package-lock.json` on `main` (`bdf8b24` — Merge PR #43, the Next.js / Oct 23 upgrade). There is **no** `pnpm-lock.yaml`; this repo uses npm lockfiles.  
**Prior notes:** [2026-10-23-dependency-advisories.md](./2026-10-23-dependency-advisories.md) (PR [#42](https://github.com/okita-io/mybot-farm/pull/42), merged). The Next.js items from that sweep were upgraded in PR [#43](https://github.com/okita-io/mybot-farm/pull/43) (`next` / `eslint-config-next` 16.4.3, `sharp` 0.35.5, `sanitize-html` 2.18.1, `hono` 4.13.13, overrides for `ip-address` 10.7.4 and `@modelcontextprotocol/sdk` 1.32.2).  
**Method:** version matching, reading this repo, and OSV queries. **Nothing was exploited against production.**  
**Live site:** [mybot.farm](https://mybot.farm) on Vercel (`web/`).

This note verifies Probe’s 2026-10-27 OSV scan (new advisories ingested that day; sweep said the farm’s vulnerable-package count is now 17). Each claim is marked **confirmed**, **downgraded**, or **hypothesis**. The “17” count is **unconfirmed** here — this review only re-read the three named packages and their parents.

## Confirmed lockfile pins

| Package | Where | Locked | Sweep said | `dev` in lockfile? |
|---------|-------|--------|------------|--------------------|
| `undici` | `web/` | **7.29.1** | 7.29.1 | no (prod tree) |
| `undici` | `packages/openclaw-mybot-farm/` | **8.10.2** (`peer: true`) | (not mentioned) | peer of nested OpenClaw |
| `qs` | `web/` | **6.16.0** | 6.16.0 | no (prod tree) |
| `qs` | `packages/openclaw-mybot-farm/` | **6.16.0** | (not mentioned) | via MCP SDK → express |
| `deepmerge` | `web/` | **4.3.1** | 4.3.1 | no (prod tree) |
| `deepmerge` | OpenClaw lockfile | **absent** | — | — |

`shadcn@4.21.0` is a **production** `dependencies` entry in `web/package.json` (not `devDependencies`). That is why `undici`, `@dotenvx/dotenvx`, `deepmerge`, and the MCP SDK / `express` / `qs` chain install in the prod tree even though nothing in `web/src` imports them.

## Verdict table

| ID | Severity | Sweep claim | This review |
|----|----------|-------------|-------------|
| [GHSA-2m5v-pch6-74hx](https://github.com/nodejs/undici/security/advisories/GHSA-2m5v-pch6-74hx) | HIGH | TLS certificate check bypass; `undici` 7.29.1; fixed in 7.30.1 | **Confirmed version-vulnerable.** This is the remaining *Agent* `tls` / `checkServerIdentity` drop, not the older BalancedPool bug (that one is already patched *in* 7.29.1). |
| [GHSA-4w7w-5xrc-9h26](https://github.com/nodejs/undici/security/advisories/GHSA-4w7w-5xrc-9h26) | HIGH | Cache poisoning through cross-origin redirects | **Confirmed version-vulnerable.** Needs an originless `Agent` + shared cache + `compose(redirect(), cache())`. |
| [GHSA-qrxm-fqhp-jwvm](https://github.com/nodejs/undici/security/advisories/GHSA-qrxm-fqhp-jwvm) | HIGH | TLS renegotiation DoS | **Confirmed version-vulnerable.** TLS 1.2 only. |
| [GHSA-55wc-3pg8-jfw6](https://github.com/nodejs/undici/security/advisories/GHSA-55wc-3pg8-jfw6) | MODERATE | 2 MODERATE on 7.29.1 | **Confirmed.** Decompress interceptor uncaught exception. |
| [GHSA-9fm3-97px-rjf6](https://github.com/nodejs/undici/security/advisories/GHSA-9fm3-97px-rjf6) | MODERATE | 2 MODERATE on 7.29.1 | **Confirmed.** WebSocket PONG buffering DoS. |
| [GHSA-6pq8-jhm2-2vcw](https://github.com/ljharb/qs/security/advisories/GHSA-6pq8-jhm2-2vcw) | MODERATE | `qs` 6.16.0; 1 MODERATE; fixed in 6.16.1 | **Confirmed version-vulnerable.** Needs `qs.stringify(..., { arrayFormat: 'comma' })`. |
| [GHSA-gcqx-w48m-w2h4](https://github.com/advisories/GHSA-gcqx-w48m-w2h4) | LOW | `deepmerge` 4.3.1; reached through shadcn; no fix yet | **Confirmed.** OSV first published 2026-09-18; GitHub reviewed / OSV modified **2026-10-27**. No patched release (`latest` still 4.3.1). |

**Applicability (all three packages):** **version-vulnerable, page-serving runtime likely not on the path (confirmed imports; production install is still prod-tree).** Sweep belief that these are CLI / build-time paths is **mostly confirmed**, with the nuance that they are **prod-installed** because `shadcn` sits in `dependencies`.

---

## 1. `undici@7.29.1` — 3 HIGH + 2 MODERATE (Oct 27)

OSV query of `undici@7.29.1` on 2026-10-28 returned **eight** advisories. The sweep’s “3 HIGH + 2 MODERATE published Oct 27” matches the five with `published` 2026-10-27T19:02Z. The other three (1 HIGH + 2 MODERATE) were ingested 2026-10-23 and are already on this same lockfile pin; 7.30.1 clears those too.

### Oct 27 set (sweep)

| ID | Sev | What | Fixed |
|----|-----|------|-------|
| GHSA-2m5v-pch6-74hx (CVE-2026-109383) | HIGH | `Agent` JSON-clones constructor options and drops function-valued `tls` / `checkServerIdentity` | **7.30.1** / 8.12.2 |
| GHSA-4w7w-5xrc-9h26 (CVE-2026-109829) | HIGH | Shared-cache + `compose(redirect(), cache())` stores a cross-origin redirect body under the original URL | **7.30.1** / 8.12.2 |
| GHSA-qrxm-fqhp-jwvm (CVE-2026-87018) | HIGH | TLS 1.2 renegotiation with a second hostname-mismatched cert crashes the process | **7.30.1** / 8.12.2 |
| GHSA-55wc-3pg8-jfw6 (CVE-2026-87029) | MODERATE | `decompress` interceptor: async throw from a downstream handler (e.g. `dump` `maxSize`) becomes an uncaught exception | **7.30.1** / 8.12.2 |
| GHSA-9fm3-97px-rjf6 (CVE-2026-109932) | MODERATE | WebSocket client ignores write backpressure on automatic PONGs → memory DoS | **7.30.1** / 8.12.2 |

**Correction:** “TLS certificate check bypass” on 7.29.1 is [GHSA-2m5v-pch6-74hx](https://github.com/nodejs/undici/security/advisories/GHSA-2m5v-pch6-74hx) (`Agent`). The earlier BalancedPool twin ([GHSA-w293-vg96-wgc3](https://github.com/nodejs/undici/security/advisories/GHSA-w293-vg96-wgc3)) is **already fixed in 7.29.1**, so it is not an open finding on this pin.

### Also on 7.29.1 (OSV ingested 2026-10-23; not in this sweep’s “new Oct 27” list)

- HIGH [GHSA-xjj6-f33q-929c](https://github.com/advisories/GHSA-xjj6-f33q-929c) — unhandled error on excessive `Content-Encoding`s (fixed 7.30.1).
- MODERATE [GHSA-4qv8-2p9j-2685](https://github.com/advisories/GHSA-4qv8-2p9j-2685) — EventSource parser unbounded memory.
- MODERATE [GHSA-f72v-6w45-q472](https://github.com/advisories/GHSA-f72v-6w45-q472) — SRI algorithm-token bypass.

OSV query of `undici@7.30.1` returned **no** vulns.

### Parents (confirmed)

`web/package-lock.json` has a single `node_modules/undici` at 7.29.1. Two parents declare it:

1. **`shadcn@4.21.0`** → `"undici": "^7.27.2"` (CLI: `shadcn` bin). Direct `web/` production dependency.
2. **`@dotenvx/dotenvx@1.75.1`** → `"undici": "^7.11.0"`. Pulled **only** as a dependency of `shadcn` (not a direct farm dep). `web/mpp/server.ts` uses the `dotenv` package, not `@dotenvx/dotenvx`.

`next@16.4.3` does **not** depend on the npm `undici` package. Node’s built-in `fetch` is a different, bundled copy.

**Correction / addition:** OpenClaw’s lockfile has `undici@8.10.2` (`peer: true`) via `@openclaw/proxyline` (`undici: ">=8.5.0 <9"`), not 7.29.1. OSV still flags 8.10.2 for the same Oct 27 HIGHs/MODERATEs until **8.12.2**. That is the OpenClaw *host* tree if the plugin is installed into OpenClaw; it is not the Vercel Next.js app.

### Runtime path?

- **Confirmed:** no `web/src` import of `undici`, `shadcn` (the npm CLI), or `@dotenvx/dotenvx`. The `shadcn` token in `web/src/app/layout.tsx` is `import { shadcn } from "@clerk/ui/themes"` — Clerk’s theme name, not the CLI package.
- **Confirmed:** `shadcn` is listed under `dependencies`, so npm prod installs still place `undici` in `node_modules`.
- **Hypothesis:** Vercel Next.js tracing does not ship the `shadcn` CLI into serverless functions, so page requests do not load this `undici`. Real-world exposure on mybot.farm is therefore **low**, matching the sweep. It would matter if someone ran `npx shadcn` / dotenvx against an attacker-controlled HTTPS endpoint, or if a future import pulled the CLI into a server module.

### Cleanest fix

**Lockfile override**, not a parent upgrade. Both parents already allow `^7.11.0` / `^7.27.2`, so 7.30.1 satisfies the declared ranges:

```json
"overrides": { "undici": "7.30.1" }
```

in `web/package.json` (alongside the existing `ip-address` / MCP SDK overrides). After `npm install`, `npm ls undici` in `web/` must show **7.30.1**. Do not jump `web/` to undici 8.x — `shadcn` asked for 7.x.

For OpenClaw, a later PR can override `undici` to **8.12.2** (or 8.12.3, npm `latest` on 2026-10-28) if the nested `openclaw` peer still resolves 8.10.2.

---

## 2. `qs@6.16.0` — 1 MODERATE

- **ID:** [GHSA-6pq8-jhm2-2vcw](https://github.com/ljharb/qs/security/advisories/GHSA-6pq8-jhm2-2vcw) (CVE-2026-110816). OSV published 2026-10-27.
- **Impact (vendor):** `qs.stringify(obj, { arrayFormat: 'comma' })` throws on an array element with a non-callable own `toString`, which can crash a worker if nothing catches it.
- **Fixed:** **6.16.1**. OSV query of 6.16.1 and 6.16.2 returned no vulns. npm `latest` is 6.17.0; dist-tag `v6.16-latest` is **6.16.2**.

**GitHub-only extra (not in OSV for 6.16.0 at review time):** [GHSA-w4cr-vjpx-p82q](https://github.com/ljharb/qs/security/advisories/GHSA-w4cr-vjpx-p82q) (LOW, published 2026-10-27) — `allowEmptyArrays` leaves empty-array keys unencoded. Affected `6.16.0 < 6.16.2`, patched **6.16.2**. Treat as **unconfirmed for the scanner count**; the sweep’s “1 MODERATE / 6.16.1” matches OSV.

### Parents (confirmed)

Chain in `web/package-lock.json`:

```
shadcn → @modelcontextprotocol/sdk@1.32.2 (also a web/ override)
  → express@5.2.1 → qs@^6.14.0
  → express → body-parser@2.3.0 → qs@^6.15.2
```

Sweep’s “express and the MCP SDK” is **confirmed**, with the extra hop **body-parser**. Same `qs@6.16.0` pin appears in `packages/openclaw-mybot-farm/package-lock.json` via the optional MCP SDK → express / body-parser.

No application file imports `qs` or `express`. The local MPP fixture uses Hono, not Express.

### Runtime path?

Same as undici: **prod-installed, not imported by page/API routes.** Express is not the mybot.farm HTTP server. **Hypothesis:** even if Express parsed a query, the advisory needs `stringify` + `arrayFormat: 'comma'`, which Express does not use for inbound query parsing by default.

### Cleanest fix

**Override to 6.16.2** (covers the OSV MODERATE and the GitHub LOW) in both lockfiles:

```json
"overrides": { "qs": "6.16.2" }
```

6.16.1 is enough for the sweep’s single OSV item. Waiting on `express` / `body-parser` to bump is slower and unnecessary; both already accept `^6.14.0` / `^6.15.2`.

---

## 3. `deepmerge@4.3.1` — 1 LOW, no fix

- **ID:** [GHSA-gcqx-w48m-w2h4](https://github.com/advisories/GHSA-gcqx-w48m-w2h4) (CVE-2026-93753). Prototype poisoning in `mergeObject()`. GitHub severity LOW (CVSS 2.7); some aggregators say Medium/High. **Confirmed: no patched version** (`npm view deepmerge version` → 4.3.1).
- **Publish nuance:** NVD/OSV originally **2026-09-18**; `github_reviewed_at` / OSV modified **2026-10-27**. The sweep listing it as an Oct 27 item is the advisory-database review, not a brand-new CVE.

### Parents (confirmed)

Only **`shadcn@4.21.0`** (`"deepmerge": "^4.3.1"`) in `web/package-lock.json`. `sanitize-html@2.18.1` **no longer** depends on `deepmerge` (that edge was true on older sanitizer pins; it is gone after PR #43). OpenClaw lockfile has no `deepmerge`.

### Runtime path?

**Confirmed:** no `web/src` import of `deepmerge`. Same CLI / unused-prod-dep story as undici. Prototype pollution would need attacker-controlled objects passed into `deepmerge()` inside the shadcn CLI.

### Cleanest fix

There is **no lockfile bump**. Options, in order:

1. **Do nothing for now** (LOW, CLI-only, no upstream release). Note it as accepted.
2. Move `shadcn` from `dependencies` to `devDependencies` so the CLI (and `deepmerge` / `undici` / dotenvx) drop out of the Vercel prod install. That is the hygiene fix for *all three* packages, but it is a `package.json` change — later PR, and confirm no build script invokes `shadcn`.
3. Wait for `shadcn` to drop or replace `deepmerge`. An `overrides` field cannot invent a patched tarball.

---

## Suggested upgrade plan (later PR; not this one)

Keep it dependency-only, separate from product work.

1. **`web/package.json` `overrides`:** `"undici": "7.30.1"`, `"qs": "6.16.2"`. Reinstall; `npm ls undici qs deepmerge`.
2. **Optional hygiene:** move `shadcn` to `devDependencies` if no production/build path needs the CLI.
3. **OpenClaw (optional):** override `qs` to 6.16.2; override `undici` to 8.12.2 if the nested peer still resolves 8.10.2.
4. **`deepmerge`:** no version to pin. Track TehShrike/deepmerge#273; do not pretend an override fixes it.

### After the bump, verify

- `cd web && npm ls undici qs` shows 7.30.1 and ≥ 6.16.1 (prefer 6.16.2).
- `cd web && npm test && npm run lint && npm run build`.
- Site still boots: catalog infinite scroll, Clerk avatars, stall README HTML.
- `npx shadcn --help` still runs if you use the CLI locally.
- Re-query OSV for the IDs above against the new lockfile pins.

### What this note does not do

- Does not change `package.json` or lockfiles.
- Does not include exploit payloads.
- Does not independently recount the sweep’s “17 vulnerable packages.”

---

## Appendix — OSV queries used for this review

```bash
# version match
python3 -c 'import json
p=json.load(open("web/package-lock.json"))["packages"]
for n in ("undici","qs","deepmerge","shadcn","@dotenvx/dotenvx","express","body-parser","@modelcontextprotocol/sdk"):
    m=p.get("node_modules/"+n) or {}
    print(n, m.get("version"), "dev="+str(m.get("dev")))'

# who requires them
python3 -c 'import json
p=json.load(open("web/package-lock.json"))["packages"]
want={"undici","qs","deepmerge"}
for k,m in p.items():
    deps=m.get("dependencies") or {}
    hit=[n for n in want if n in deps]
    if hit: print(k or "(root)", hit, {n:deps[n] for n in hit})'

# advisories on the locked versions
python3 - <<'PY'
import json, urllib.request
def q(name, ver):
    req=urllib.request.Request("https://api.osv.dev/v1/query",
        data=json.dumps({"package":{"name":name,"ecosystem":"npm"},"version":ver}).encode(),
        headers={"Content-Type":"application/json"})
    with urllib.request.urlopen(req) as r:
        return json.load(r).get("vulns") or []
for name, ver in [("undici","7.29.1"),("undici","7.30.1"),("qs","6.16.0"),("qs","6.16.1"),("deepmerge","4.3.1")]:
    print("==", name, ver, "==")
    for v in q(name, ver):
        print(v.get("id"), v.get("published"), (v.get("database_specific") or {}).get("severity"), (v.get("summary") or "")[:90])
PY
```
