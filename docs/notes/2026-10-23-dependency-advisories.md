# Dependency advisory handoff (2026-10-23 sweep)

**Status:** upgraded on 2026-10-23. `web/` pins `next` and `eslint-config-next` at 16.4.3 (`sharp` 0.35.5), `sanitize-html` 2.18.1, `hono` 4.13.13, and overrides `ip-address` 10.7.4 plus `@modelcontextprotocol/sdk` 1.32.2. OpenClaw optionalDependency is SDK 1.32.2 with the same `ip-address` and `hono` overrides. Nested `openclaw` still ships its own SDK 1.30.0. `web` tests (121), lint, and production build passed; OpenClaw tests (16) passed. Target GHSA packages are absent from `npm audit`.  
**Reviewed:** 2026-10-24 against `web/package-lock.json` and `packages/openclaw-mybot-farm/package-lock.json` on `main` (`7c85553`).  
**Method:** version matching, reading this repo, OSV lookups, and one production header check. **Nothing was exploited against production.**  
**Live site:** [mybot.farm](https://mybot.farm) on Vercel (`web/`).

This note verifies Probe’s nightly sweep of 2026-10-23 (Next.js advisories ingested by OSV on 2026-10-22; vendor Next.js GHSAs dated 2026-10-14) and the still-open Oct 21 items. Each claim is marked **confirmed**, **downgraded**, or **hypothesis**.

## Confirmed lockfile pins

| Package | Where | Locked | Sweep said |
|---------|-------|--------|------------|
| `next` | `web/package.json` + lockfile | **16.3.4** | 16.3.4 |
| `eslint-config-next` | `web/` | **16.3.4** | (not mentioned) |
| `sharp` | `web/` optional dep of `next` | **0.35.4** | 0.35.4 |
| `ip-address` | `web/` transitive | **10.7.0** | 10.7.0 |
| `ip-address` | `packages/openclaw-mybot-farm/` transitive | **10.7.2** | (not mentioned; still vulnerable) |
| `sanitize-html` | `web/` direct | **2.17.7** | 2.17.7 |
| `hono` | `web/` direct; also OpenClaw lockfile | **4.13.8** | 4.13.8 |
| `@modelcontextprotocol/sdk` | OpenClaw optionalDependency; also `web/` via `shadcn` | **1.30.0** | 1.30.0 |

## Verdict table

| ID | Severity | Sweep claim | This review |
|----|----------|-------------|-------------|
| [GHSA-p3m5-59mp-jv5r](https://github.com/vercel/next.js/security/advisories/GHSA-p3m5-59mp-jv5r) | HIGH (8.2) | Likely applies; Server Actions DoS; only fix is upgrade | **Confirmed: likely applies.** App Router + a live `"use server"` action. No workaround. |
| [GHSA-2464-fhr4-w9xw](https://github.com/vercel/next.js/security/advisories/GHSA-2464-fhr4-w9xw) | CRITICAL (9.5) | Probably unreachable; Vercel image service, not app `sharp` | **Confirmed version-vulnerable. Production reachability: probably unreachable (hypothesis, with supporting evidence).** No custom loader / `unoptimized`. Self-hosted `next start` would still be in scope. |
| [GHSA-673q-mjm6-r5xr](https://github.com/vercel/next.js/security/advisories/GHSA-673q-mjm6-r5xr) | CRITICAL (9.5) | Probably not applicable; needs Cache Components | **Confirmed: not applicable** to current config. Vendor still says upgrade even without similar functions. |
| [GHSA-h694-7cp9-m8p3](https://github.com/vercel/next.js/security/advisories/GHSA-h694-7cp9-m8p3) | MODERATE | Version-vulnerable; fixed in 16.3.8 | **Downgraded to not applicable.** 16.3.4 is in the affected range, but the advisory requires `cacheComponents: true`. |
| [GHSA-rxp7-6hxx-x8q5](https://github.com/advisories/GHSA-rxp7-6hxx-x8q5) | MODERATE | `ip-address` 10.7.0; fixed in 10.7.4 | **Confirmed version-vulnerable, reachability unverified.** Transitive only; no app import. OpenClaw lockfile is 10.7.2 (also affected). |
| [GHSA-46jr-4wx8-v453](https://github.com/advisories/GHSA-46jr-4wx8-v453) + [GHSA-22jm-h49p-29qw](https://github.com/advisories/GHSA-22jm-h49p-29qw) | HIGH | MCP SDK 1.30.0, two HIGH, fixed in 1.32.0 | **Confirmed versions. Applicability downgraded.** Those two HIGHs are HTTP validation / experimental task-store isolation. This repo’s MCP code is stdio-only and does not use bearer auth. |
| [GHSA-rvq5-wwqv-78pq](https://github.com/advisories/GHSA-rvq5-wwqv-78pq) | MODERATE (scanners often say HIGH) | (folded into “MCP + bearer”) | **Confirmed: not applicable.** Needs `requireBearerAuth()` / `verifyBearerToken()`. |
| [GHSA-6qxp-vccf-f47h](https://github.com/advisories/GHSA-6qxp-vccf-f47h) | HIGH | (sometimes counted as one of the MCP HIGHs) | **Confirmed: not applicable.** HTTP OAuth *client* issue; advisory says stdio clients and SDK servers are not affected. Fixed in 1.31.0, not 1.32.0. |
| sanitize-html trio (below) | LOW / MODERATE | Three XSS bypasses, fixed in 2.18.0 | **Confirmed version-vulnerable and on a real HTML path. Published bypasses likely not reachable with the current allowlist (downgrade).** Still upgrade. |
| [GHSA-5r4p-p66f-jhc7](https://github.com/honojs/hono/security/advisories/GHSA-5r4p-p66f-jhc7) | MODERATE | Hono `serveStatic` bypass, fixed in 4.13.11 | **Confirmed: not applicable.** No `serveStatic` usage. |

**Next.js target version:** the sweep’s “16.4.1 fixes all the Next items” is **confirmed as the official patched 16.x**. There is no 16.3.x patch for the October DoS/RCE pair. Practical pin: **`next@16.4.3`** (npm `latest` on 2026-10-24), which includes 16.4.1. Also bump `eslint-config-next` in lockstep. After install, confirm `sharp` resolves to **≥ 0.35.5**.

---

## 1. GHSA-p3m5-59mp-jv5r — Server Actions DoS

- **Severity:** HIGH. CVE-2026-94482. OSV published 2026-10-22; Next.js GHSA dated 2026-10-14.
- **Affected:** `next` 13.0.0–15.5.27 and 16.0.0–16.4.0. **Fixed:** 15.5.28 / **16.4.1**.
- **Impact (vendor):** a crafted request to an App Router app that defines at least one Server Action can burn CPU and block other requests in the same process. No workaround.
- **Applicability:** **likely applies (confirmed).**
  - Confirmed App Router: `web/src/app/` exists; no `pages/` router.
  - Confirmed Server Action: `web/src/app/catalog/actions.ts` starts with `"use server"` and exports `loadCatalogChunk`.
  - Confirmed client caller: `web/src/components/catalog-infinite.tsx` imports and calls that action (catalog infinite scroll).
- **Hypothesis:** on Vercel this is one serverless isolate rather than a long-lived Node process, so blast radius may be per-instance cost/latency rather than whole-site downtime. That does **not** change the vendor “upgrade only” guidance.

### Verify

1. Confirm the advisory and patched versions:
   ```bash
   curl -sS 'https://api.osv.dev/v1/vulns/GHSA-p3m5-59mp-jv5r' | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d["summary"]); print(d["published"]); print([(a["package"]["name"], a["ranges"]) for a in d["affected"]])'
   ```
2. Confirm the lockfile pin:
   ```bash
   python3 -c 'import json; print(json.load(open("web/package-lock.json"))["packages"]["node_modules/next"]["version"])'
   ```
3. Confirm a Server Action exists:
   ```bash
   rg -n '"use server"' web/src --glob '*.{ts,tsx}'
   ```

---

## 2. GHSA-2464-fhr4-w9xw — Image Optimization RCE via `sharp` / librsvg

- **Severity:** CRITICAL. Upstream `sharp` issue is CVE-2026-96889 / [GHSA-wq5f-xc86-pv6w](https://github.com/advisories/GHSA-wq5f-xc86-pv6w) (`sharp` < 0.35.5).
- **Affected `next`:** 10.0.0–15.5.27 and 16.0.0–16.4.0. **Fixed:** 15.5.28 / **16.4.1** (pulls `sharp` ≥ 0.35.5 on a fresh 16.4.1 resolve).
- **Impact (vendor):** memory bug in librsvg can become RCE when Next.js Image Optimization processes SVG on glibc Linux.
- **Applicability:** **version-vulnerable, production reachability probably not via app `sharp`.**
  - **Confirmed:** `web/package-lock.json` has `node_modules/sharp` **0.35.4**, `optional: true`, required by `next` as `sharp@^0.35.4`.
  - **Confirmed:** `web/next.config.ts` sets `images.remotePatterns` for `img.clerk.com` and `images.clerk.dev` only. It does **not** set `images.loader`, `loaderFile`, `unoptimized`, or `dangerouslyAllowSVG`.
  - **Confirmed:** `next/image` is used for local `/hero.png` (`web/src/components/home/hero.tsx`) and remote Clerk avatars (`web/src/app/authors/[username]/page.tsx`, `web/src/components/stall-comments.tsx`).
  - **Confirmed:** this repo does not self-host an image optimizer and has no `output: "standalone"` / Docker image server.
  - **Confirmed (production headers, 2026-10-24):** `/_next/image` on mybot.farm is answered by Vercel, not a raw Node `next start`:
    - Dummy Clerk URL → `404`, `server: Vercel`, `x-vercel-error: NOT_FOUND`, optimizer CSP `script-src 'none'; frame-src 'none'; sandbox;`.
    - Local `/hero.png` through `/_next/image` → `200 image/png` with the same optimizer CSP and `server: Vercel`.
  - **Hypothesis (strong, vendor-documented):** Vercel’s managed Image Optimization Service handles `/_next/image` on this deployment, so the **app lockfile’s** `sharp@0.35.4` is not the optimizer. Vercel’s own write-up of an earlier sharp/libheif RCE states that Next.js image requests on Vercel go through a central service, not the customer function. Whether that service is already patched for this SVG/librsvg bug is **not verified here**.
  - **Confirmed residual risk:** `next start` / any non-Vercel host that uses the default loader would load lockfile `sharp@0.35.4` and **would** be in scope.

### Verify

1. OSV:
   ```bash
   curl -sS 'https://api.osv.dev/v1/vulns/GHSA-2464-fhr4-w9xw' | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d["summary"]); print(d.get("published"))'
   ```
2. Lockfile + config:
   ```bash
   python3 -c 'import json; p=json.load(open("web/package-lock.json"))["packages"]; print("sharp", p["node_modules/sharp"]["version"], "optional", p["node_modules/sharp"].get("optional"))'
   rg -n 'loader|unoptimized|dangerouslyAllowSVG|remotePatterns' web/next.config.ts
   ```
3. Production optimizer headers (safe; missing remote file):
   ```bash
   curl -sD - -o /dev/null 'https://mybot.farm/_next/image?url=https%3A%2F%2Fimg.clerk.com%2Fx&w=64&q=75'
   ```
   Expect `server: Vercel` and `x-vercel-error: NOT_FOUND`.
4. After a later upgrade PR: `npm ls sharp` in `web/` must show **≥ 0.35.5**. Do not assume `npm install next@16.4.1` moved it if the lockfile still pins 0.35.4.

---

## 3. GHSA-673q-mjm6-r5xr — `use cache` RCE

- **Severity:** CRITICAL.
- **Affected:** `next` 16.0.0–16.4.0. **Fixed:** **16.4.1** only (no 15.x / 16.3.x patch).
- **Impact (vendor):** App Router + Cache Components + a `'use cache'` function that returns multiple typed arrays → unauthenticated RCE. Vendor: no workaround; upgrade even if the app has no such functions.
- **Applicability:** **not applicable (confirmed config).**
  - **Confirmed:** `web/next.config.ts` does not set `cacheComponents` or `experimental.useCache`.
  - **Confirmed:** repo-wide search finds no `'use cache'`, `cacheLife`, `cacheTag`, or `cacheComponents`.
- **Hypothesis:** a future PR that turns on Cache Components on 16.3.4 would put this in scope immediately. That is why the upgrade still matters even though today’s tree is not reachable.

---

## 4. GHSA-h694-7cp9-m8p3 — nested `'use cache'` leak

- **Severity:** MODERATE. CVE-2026-103004. Fixed in **16.3.8** (September 16.3 line), also covered by jumping to 16.4.1+.
- **Affected:** `next` 16.3.0 through 16.3.7. **16.3.4 matches.**
- **Impact (vendor):** with `cacheComponents: true`, nested `'use cache'` functions can omit a root param from the outer cache key and serve one param’s content for another.
- **Applicability:** **version-vulnerable, not applicable without Cache Components (downgrade).** Same evidence as §3: Cache Components is off and there are no `'use cache'` functions.
- Sweep was right about the version and the 16.3.8 fix. It did not spell out that the leak **requires** Cache Components, so treat it as a lockfile finding, not a live leak.

---

## 5. GHSA-rxp7-6hxx-x8q5 — `ip-address` ReDoS

- **Severity:** MODERATE. CVE-2026-111997. **Fixed:** 10.7.4.
- **Affected:** ≤ 10.7.3 (includes web 10.7.0 and OpenClaw 10.7.2).
- **Impact (vendor):** `Address6` / `Address6.isValid()` can stall the event loop on a long string of `%` plus a line terminator.
- **Applicability:** **version-vulnerable; production reachability unverified.**
  - **Confirmed:** `web/package-lock.json` → `ip-address@10.7.0` via `express-rate-limit` (MCP SDK) and `socks` (`shadcn` CLI).
  - **Correction:** `packages/openclaw-mybot-farm/package-lock.json` has **10.7.2**, not 10.7.0. Still affected.
  - **Confirmed:** no application import of `ip-address` / `Address6`. `shadcn` is a `web/` dependency but is not imported from `web/src`.
- **Hypothesis:** nothing on the Next.js request path parses attacker-controlled text with `Address6`. Treat as transitive hygiene unless a later audit finds a caller.

---

## 6. Oct 21 leftovers (unverified production exposure)

These were already on the board. They are **not** Next 16.4.1 items.

### 6a. `@modelcontextprotocol/sdk@1.30.0`

Sweep: “two HIGH, fixed in 1.32.0” and “check whether the code runs an MCP server with bearer auth.”

**Correction:** the two HIGHs *fixed in 1.32.0* are not the bearer-auth bug.

| ID | Severity | Fixed | What it actually is | This repo |
|----|----------|-------|---------------------|-----------|
| [GHSA-46jr-4wx8-v453](https://github.com/advisories/GHSA-46jr-4wx8-v453) | HIGH | 1.32.0 | One HTTP request can exhaust memory during validation | No HTTP MCP server |
| [GHSA-22jm-h49p-29qw](https://github.com/advisories/GHSA-22jm-h49p-29qw) | HIGH | 1.32.0 | Experimental tasks not bound to the creating session | No `taskStore` / HTTP sessions |
| [GHSA-rvq5-wwqv-78pq](https://github.com/advisories/GHSA-rvq5-wwqv-78pq) | MODERATE | 1.32.0 | Bearer middleware accepted another service’s token | No `requireBearerAuth` / `verifyBearerToken` |
| [GHSA-6qxp-vccf-f47h](https://github.com/advisories/GHSA-6qxp-vccf-f47h) | HIGH | **1.31.0** | OAuth *client* sent credentials to a server-chosen issuer | Advisory: stdio clients and SDK servers **not affected** |

**Confirmed usage:**

- `packages/openclaw-mybot-farm/package.json` lists `@modelcontextprotocol/sdk@^1.30.0` as an **optionalDependency**.
- `packages/openclaw-mybot-farm/mcp/server.mjs` builds a farm MCP bridge with `StdioServerTransport` only (search / get pack / plant / post / update). No HTTP transport, no bearer middleware.
- `web/` does not import the SDK. The 1.30.0 copy in `web/package-lock.json` comes from the `shadcn` CLI (and `mppx` lists the SDK as an optional peer).
- Seller `Authorization: Bearer mbf_…` on `POST /api/listings` is **farm API-key auth**, not MCP `requireBearerAuth()`.

**Applicability:** **not applicable to production mybot.farm; OpenClaw stdio bridge is out of the HIGH/bearer shapes above.** Still bump the optionalDependency to ≥ 1.32.0 when convenient so scanners go quiet.

### 6b. `sanitize-html@2.17.7` — three XSS bypasses, fixed in 2.18.0

| ID | Severity | Bypass shape | Current farm config |
|----|----------|--------------|---------------------|
| [GHSA-374f-7chj-9948](https://github.com/advisories/GHSA-374f-7chj-9948) | LOW | Prefixed SMIL (`svg:animate`) retargets `href` | `ALLOWED_TAGS` has no `svg` / `animate*` |
| [GHSA-x3q4-9hxx-gx8m](https://github.com/advisories/GHSA-x3q4-9hxx-gx8m) | MODERATE | Implied close ends a `nonTextTags` discard early (`<noscript>`) | No `noscript` in the allowlist; leftover tags still pass `allowedTags` + `allowedSchemes` |
| [GHSA-cv27-6wvh-8x7j](https://github.com/advisories/GHSA-cv27-6wvh-8x7j) | MODERATE | `meta http-equiv=refresh` `content` skips scheme checks | No `meta` in the allowlist |

**Confirmed the library is on a real user-content path (do not treat as unused):**

- `web/src/lib/readme.ts` wraps `sanitize-html` with a tight markdown allowlist (`h1–h6`, `p`, lists, `a`, emphasis, `code`/`pre`, tables, …). Allowed schemes: `http`, `https`, `mailto`. No SVG, no `meta`, no event-handler attributes.
- Listings call `parseStallReadme` (`web/src/app/api/listings/route.ts`, `…/readme/route.ts`).
- Stall pages render the sanitized HTML with `dangerouslySetInnerHTML` (`web/src/components/stall-readme-card.tsx`).

**Applicability:** **library version is vulnerable; the three published 2.18.0 bypasses look unreachable with this allowlist (downgrade).** Upgrade anyway: seller-controlled HTML is rendered to other users, and allowlists change.

### 6c. `hono@4.13.8` — `serveStatic` middleware bypass

- **ID:** [GHSA-5r4p-p66f-jhc7](https://github.com/honojs/hono/security/advisories/GHSA-5r4p-p66f-jhc7) (CVE-2026-111757 / CVE-2026-109955). **Fixed:** 4.13.11. Affected 4.12.4–4.13.10.
- **Impact (vendor):** `serveStatic` double-decodes the path so prefix middleware (for example auth) may not run. Files stay inside the configured root. Apps that only serve public files are not affected.
- **Applicability:** **not applicable (confirmed).**
  - Repo-wide search: no `serveStatic` / `hono/serve-static` import.
  - `web/` uses Hono only in `web/mpp/server.ts` (local MPP fixture: CORS, JSON/text routes, `mppx` discovery). That process is not the Vercel Next.js app.
  - `web/src/` has no `hono` imports. Production catalog/API routes are Next.js App Router.

---

## Suggested upgrade plan (later PR; not this one)

Do **not** mix this with product work. One focused dependency PR (or two: `web/` then OpenClaw).

1. **`web/` — Next.js (required for the HIGH Server Actions DoS)**
   - Pin `next` and `eslint-config-next` to **16.4.3** (or at least **16.4.1**).
   - Reinstall and confirm:
     ```bash
     cd web && npm ls next sharp
     ```
     `sharp` must be **≥ 0.35.5**. If the lockfile keeps 0.35.4, run `npm update sharp` (do not add `sharp` to `package.json` unless you want it direct).
2. **`web/` — sanitizer (recommended; real HTML path)**
   - `sanitize-html` → **≥ 2.18.0**.
3. **`web/` — Hono / ip-address (hygiene)**
   - `hono` → **≥ 4.13.11** (4.13.13 was current stable at review).
   - `npm update ip-address` (or an `overrides` field) so both lockfiles show **≥ 10.7.4**.
4. **`packages/openclaw-mybot-farm/`**
   - optionalDependency `@modelcontextprotocol/sdk` → **≥ 1.32.0**.
   - Confirm transitive `hono` / `ip-address` moved with it.

### After the bump, verify

- `cd web && npm test && npm run lint && npm run build`.
- Catalog `/catalog`: infinite scroll still loads the next chunk (`loadCatalogChunk`).
- An author page and a stall comment still show Clerk avatars (`next/image` → `/_next/image`).
- A stall README with basic markdown, a link, and a table still renders; disallowed tags still strip.
- `npm run mpp` still serves the local fixture if you rely on it.
- Optional OpenClaw: `mcp/server.mjs` still starts over stdio (`farm_search` list-tools).
- Re-query OSV / `npm audit` for the IDs above; they should disappear from the lockfiles.

### What this note does not do

- Does not change `package.json` or lockfiles.
- Does not include exploit payloads or Server Action / SVG / sanitizer PoCs.
- Does not claim production was probed beyond the `/_next/image` header check.

---

## Appendix — OSV query used for this review

```bash
for id in \
  GHSA-p3m5-59mp-jv5r GHSA-2464-fhr4-w9xw GHSA-673q-mjm6-r5xr \
  GHSA-h694-7cp9-m8p3 GHSA-rxp7-6hxx-x8q5 GHSA-5r4p-p66f-jhc7 \
  GHSA-374f-7chj-9948 GHSA-x3q4-9hxx-gx8m GHSA-cv27-6wvh-8x7j \
  GHSA-rvq5-wwqv-78pq GHSA-6qxp-vccf-f47h GHSA-46jr-4wx8-v453 \
  GHSA-22jm-h49p-29qw
do
  echo "== $id =="
  curl -sS "https://api.osv.dev/v1/vulns/$id" \
    | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d.get("summary")); print(d.get("published")); print(d.get("database_specific",{}).get("severity"))'
done
```
