# Plant from a share URL

**Product:** [mybot.farm](https://mybot.farm)
**Date:** 2026-09-11
**Status:** Design sketch + thin resolve/preview MVP
**One line:** Paste a farm share link → resolve to pack/GAF data you already publish → preview → later **Plant** into a buyer library (optional: list as their bot).

This is complementary to today’s **Copy install prompt** (paste into Grok Bot) and **WebMCP / `/api`** (agents fetch packs). Those put a copy in a runtime. Plant puts a copy on the **farm** — the buyer’s library — without inventing pack contents or fetching strangers’ servers.

---

## User flow

```text
Buyer has a share URL
        │
        ▼
Paste on landing install area or /plant
        │
        ▼
POST /api/resolve-share  (or GET ?url=)
        │
        ├─ ok → preview card (name, kind, blurb, skill/memory counts, install prompt)
        │         │
        │         ├─ [MVP] Copy install prompt / open bot / download GAF
        │         └─ [later] Plant into library ──► optional List my bot
        │
        └─ fail → specific error (bad host, unknown path, bot not found, raw GAF = v2)
```

1. **Paste URL.** A buyer (or an agent helping them) pastes a mybot.farm bot, pack, or API link. Bare slugs (`gift-day`) are a convenience, not a public share shape.
2. **Resolve.** The farm **parses** the URL and loads the matching listing + GAF from the same loaders as `/api/stalls/{slug}` and `/api/packs/{slug}`. It does **not** scrape HTML and does **not** invent fields.
3. **Preview card.** Show who it is, what kind, what’s in the crate (counts, scrubbed flag), and the existing install prompt. **No account required.** Anonymous visitors browse, copy the install prompt, and resolve/preview share URLs the same as signed-in ones.
4. **Plant into library (needs a plot).** Persisting a `UserLibraryItem` is **plot/library ownership**, not a landing wall. Sign-in (Clerk) is gated behind **Start a plot** / claim a listing / list agents / keep a personal library. That is a **copy reference** (slug + source URL + snapshot ref), not a live tether to the seller.
5. **List my bot (later, optional).** Also behind a plot. Separate publish step — planting does not auto-list or auto-outbound.

---

## Allowed sources (v1)

v1 accepts **mybot.farm URLs only** (plus localhost / the current request host so previews work). No outbound fetch.

| Shape | Example | Notes |
|-------|---------|--------|
| Bot page (**preferred share URL**) | `https://mybot.farm/agents/gift-day` · `https://mybot.farm/teams/pair-bench` | Same URLs the install prompt already cites |
| Pack file | `https://mybot.farm/packs/agents/gift-day.json` · `/packs/teams/pair-bench.json` | Public GAF; same bytes as `/api/packs/{slug}` |
| Read API | `/api/stalls/{slug}` · `/api/packs/{slug}` · `/api/packs/{slug}/skills` · `/api/install-prompt/{slug}` | CORS-open today; resolve maps them back to the bot |
| Plant deep link | `https://mybot.farm/plant?url={urlencoded}` | Unwrap **once**; then resolve the inner URL |
| Slug convenience | `gift-day` or `/plant?slug=gift-day` | Handy for the form; not a share contract |

**Canonical share shapes we define:**

1. **Bot page** — `https://mybot.farm/agents/{slug}` or `https://mybot.farm/teams/{slug}`
2. **Pack file** — `https://mybot.farm/packs/{agents\|teams}/{slug}.json`
3. **Plant carry URL** — `https://mybot.farm/plant?url=` + encodeURIComponent(shape 1 or 2)

Prefer (1) in human copy. Agents can keep using `/api/*`.

### v2 (not this sketch)

- **Raw GAF JSON URLs** on other HTTPS hosts — fetch with size limit + schema check. Rejected in v1 as `raw_gaf_not_supported`.
- Grok Bot public share links (`x.ai/bot/…`) — still the How-To “Add to Grok Bot” path; not a farm library plant until we decide.

`www.mybot.farm` is treated as the apex. Relative paths (`/agents/gift-day`) resolve against `https://mybot.farm`.

---

## URL resolution rules

Resolve is **parse + local lookup**. No HTML scrape. No `fetch` of the pasted URL.

### Host allowlist (SSRF / v1)

Accept only:

- `mybot.farm`, `www.mybot.farm`
- `localhost`, `127.0.0.1` (dev)
- the **request Host** (Vercel preview / local `next dev`)

Anything else: `host_not_allowed`. If the URL looks like a `.json` pack on a foreign host: `raw_gaf_not_supported` (v2).

### Path patterns

| Path | Slug source |
|------|-------------|
| `/agents/{slug}` | `{slug}` — expected kind `agent` |
| `/teams/{slug}` | `{slug}` — expected kind `team` |
| `/packs/agents/{slug}.json` | `{slug}` |
| `/packs/teams/{slug}.json` | `{slug}` |
| `/api/stalls/{slug}` | `{slug}` |
| `/api/packs/{slug}` | `{slug}` |
| `/api/packs/{slug}/skills` | `{slug}` |
| `/api/packs/{slug}/grok-template` | `{slug}` — agent recipe projection; teams 400 |
| `/api/install-prompt/{slug}` | `{slug}` — warning: this is a prompt URL, not the pack |
| `/plant` | `?url=` (unwrap once) or `?slug=` |

Trailing slashes are ignored. `{slug}` must match `^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$` (≤ 64 chars). Input URL ≤ **2048** characters.

Kind mismatch (e.g. `/teams/gift-day` when Gift Day is an agent) still resolves if the slug exists, and adds a **warning**. Missing slug → `stall_not_found`. Home, How-To, About, Privacy, `/api` catalog → `unsupported_path`.

### What gets loaded

Reuse `getStall` / `requireStallAndPack` / `installPromptPayload` in `web/src/lib/`. Pack summary is **counts + profile already on the listing**, never synthesized skills or memory.

---

## Auth / plot (constraint)

**No forced login on landing.** The home page, bot pages, Copy install prompt, How-To, and `/plant` resolve/preview are public. Do **not** add a login modal on home.

| Action | Auth |
|--------|------|
| Browse bots | Anonymous |
| Copy install prompt / download GAF | Anonymous |
| Paste share URL → resolve → preview | Anonymous (`GET\|POST /api/resolve-share`) |
| **Start a plot** / claim a listing / list agents | Clerk (later) |
| Persist personal library (`POST /api/library/plant`) | Clerk — framed as plot/library ownership |

Clerk is the intended vendor **only when someone starts a plot**. This sketch does **not** wire Clerk, sessions, or a sign-in UI. The plant stub returns `401` and tells the client to keep using preview.

---

## API shape

### `GET|POST /api/resolve-share` — preview (no auth)

Public, CORS open. **Preview-only. Always anonymous.** GET is the easy share; POST is the form.

```http
GET /api/resolve-share?url=https%3A%2F%2Fmybot.farm%2Fagents%2Fgift-day
GET /api/resolve-share?slug=gift-day

POST /api/resolve-share
Content-Type: application/json

{ "url": "https://mybot.farm/agents/gift-day" }
```

**Success**

```json
{
  "ok": true,
  "kind": "agent",
  "slug": "gift-day",
  "sourceUrl": "https://mybot.farm/agents/gift-day",
  "canonicalUrl": "https://mybot.farm/agents/gift-day",
  "stall": {
    "kind": "agent",
    "slug": "gift-day",
    "name": "Gift Day",
    "title": "Family gift & birthday remembrancer",
    "description": "…",
    "category": "Lifestyle",
    "pagePath": "/agents/gift-day",
    "pageUrl": "https://mybot.farm/agents/gift-day",
    "downloadHref": "/packs/agents/gift-day.json",
    "packUrl": "https://mybot.farm/packs/agents/gift-day.json",
    "api": {
      "get_stall": "/api/stalls/gift-day",
      "download_pack": "/api/packs/gift-day",
      "list_pack_skills": "/api/packs/gift-day/skills",
      "get_grok_template": "/api/packs/gift-day/grok-template",
      "get_install_prompt": "/api/install-prompt/gift-day"
    }
  },
  "packSummary": {
    "format": "mybot.farm/agent-pack",
    "version": "0.1",
    "profile": { "name": "Gift Day", "title": "…", "description": "…" },
    "skillCount": 2,
    "memoryCount": 3,
    "memberCount": 0,
    "scrubbed": true
  },
  "installPrompt": {
    "slug": "gift-day",
    "kind": "agent",
    "name": "Gift Day",
    "url": "https://mybot.farm/agents/gift-day",
    "prompt": "Install the mybot.farm agent pack…",
    "shortPrompt": "Install Gift Day from …"
  },
  "warnings": []
}
```

`stall` matches `stallRecord()` from the existing read APIs. `installPrompt` matches `/api/install-prompt/{slug}`.

**Failure** (`ok: false`)

| `error` | When |
|---------|------|
| `url_required` | Empty body / query |
| `url_too_long` | Over 2048 chars |
| `invalid_url` | Not a URL or slug |
| `host_not_allowed` | Off-allowlist host |
| `raw_gaf_not_supported` | Foreign `.json` URL (v2) |
| `unsupported_path` | On-farm URL we don’t map |
| `stall_not_found` | Slug not in the catalog |

HTTP: `400` for input problems, `404` for `stall_not_found`. Body always includes `warnings[]`.

### `POST /api/library/plant` — persist into a plot library

**Not persisted in this sketch.** This write is **plot/library ownership**, not a landing gate. When Clerk exists, require a signed-in plot owner. Until then the stub is `401` and `/plant` stays preview-only — no login modal.

Unauthenticated clients **keep using resolve** for preview. They can still Copy install prompt.

```http
POST /api/library/plant
Content-Type: application/json
Authorization: Bearer <later>

{ "url": "https://mybot.farm/agents/gift-day" }
```

Alternate body: `{ "slug": "gift-day", "sourceUrl": "https://mybot.farm/agents/gift-day" }`.

**Intended success (when auth + store exist)**

```json
{
  "ok": true,
  "item": {
    "userId": "user_…",
    "slug": "gift-day",
    "kind": "agent",
    "sourceUrl": "https://mybot.farm/agents/gift-day",
    "plantedAt": "2026-09-11T21:00:00.000Z",
    "gafSnapshotRef": "sha256:…"
  }
}
```

**MVP stub:** `401` + `error: "auth_required"`. Message should say persist needs a plot (Clerk later), not “log in to use the farm.” If a URL/slug was sent, include a `preview` object from resolve so the UI can keep showing the card. No write, no outbound, no sign-in redirect.

`List my bot` is **not** an API yet.

---

## Data model sketch

```text
UserLibraryItem
  userId            plot owner (Clerk user id, once Start a plot exists)
  slug              listing slug (catalog key)
  kind              agent | team
  sourceUrl         the URL they pasted (or the canonical bot URL)
  plantedAt         ISO-8601
  gafSnapshotRef    content-addressed pack (sha256 of canonical GAF JSON)
                    — or pack hash / object key once we store blobs
```

Notes:

- Plant is a **copy reference**. Seller edits do not mutate the buyer’s item unless we later add an explicit refresh.
- Prefer `gafSnapshotRef` over “whatever the listing is today” so a listing dispute has a byte-stable pack.
- Team plant = **one** library item for the team slug (members stay inside the team pack). Exploding members into N items is an open question.
- Do not store secrets; packs are already scrubbed public JSON.

No table is created in this PR.

---

## Security

| Rule | v1 behavior |
|------|-------------|
| **SSRF allowlist** | Parse mybot.farm (and local/request host) only. **Do not fetch** the pasted URL. |
| **No invented contents** | Preview fields come from existing pack/listing loaders. Missing profile/skills stay missing. |
| **Size limits** | URL ≤ 2048 chars; slug ≤ 64; `[a-z0-9-]`. v2 fetch should cap body (suggest 512 KiB) before JSON parse. |
| **No auto-outbound** | Resolve and plant must not email, ping Grok Bot, charge Stripe, or publish a bot. |
| **No HTML scrape** | Path + local JSON only. |
| **No landing login wall** | Home, bots, install prompt, and resolve/preview stay public. No modal. |
| **Plant persist** | `POST /api/library/plant` waits for a **plot** (Clerk). Preview stays public. |
| **CORS** | Resolve is public read (GET/POST). Plant persist is authenticated once plots exist. |

v2 raw-GAF fetch, if we add it: HTTPS only, block private/link-local IPs, redirect cap, content-type JSON, schema `format` prefix `mybot.farm/`, still no script execution.

---

## How this sits next to Copy install prompt + WebMCP

Three doors, one crate:

| Path | Who | What it does | Live today |
|------|-----|--------------|------------|
| **Copy install prompt** | Human in Grok Bot | Paste instructions; Bot downloads GAF and creates a **runtime copy** | Bot pages, How-To |
| **WebMCP + `/api`** | Agent | `search_stalls`, `get_stall`, `download_pack`, `list_pack_skills`, `get_install_prompt`, `post_listing` | Every page + CORS JSON. `post_listing` needs a seller API key or a signed-in session |
| **Plant from share** | Buyer on the farm | Resolve a share URL → preview → **library item** (later catalog listing) | Resolve + `/plant` preview; plant write is stubbed |

They compose:

- Preview on `/plant` can still offer **Copy install prompt** (same helper as bot pages).
- Agents can call `GET /api/resolve-share?url=` instead of guessing slugs. A `resolve_share` WebMCP tool is a later add — not registered in this sketch so the live catalog stays slug-based.
- Planting does **not** replace Grok Bot install. Library = farm collection; install prompt = runtime.

---

## Open questions

Research tone for what is still open. Auth **gating** is decided (above): no landing login; Clerk only on Start a plot / persist library. Do not invent Clerk or Stripe wiring in this PR.

- [ ] **Buyer library vs seller listing.** Is the library a private collection (shopping basket / “my copies”), or the draft queue for “my bots”? Same plot, two lists — or one?
- [ ] **Start a plot UX.** Where does the first Clerk prompt live (dedicated `/plot`, a button on `/plant`, claim-listing)? Must not interrupt browse/preview.
- [ ] **Stripe later.** Paid bots, tips, featured placement — does `plant` check an entitlement, or is money only on **List my bot** / download? Free seed packs should keep working without a wallet.
- [ ] **Grok Bot share links.** Do we ever resolve `x.ai/bot/…`, or do those stay on the official Add-to-Grok-Bot path ([How-To](/how-to#share))?
- [ ] **Raw GAF (v2).** Allowlist of hosts vs any HTTPS? Who is liable if the JSON is hostile or unscrubbed?
- [ ] **Install vs plant.** Should Plant also kick off a Grok Bot copy, or always leave that to the install prompt?
- [ ] **Updates.** Pin `gafSnapshotRef` forever, or offer “refresh from listing”?
- [ ] **Teams.** One library row vs N member rows?
- [ ] **WebMCP.** Add `resolve_share` to `document.modelContext`, or keep it HTTP-only?

---

## MVP in this repo

| Piece | What shipped |
|-------|----------------|
| This doc | Product + API sketch |
| `GET\|POST /api/resolve-share` | Parse URL, local listing/pack load, preview JSON |
| `POST /api/library/plant` | `401 auth_required` stub; optional `preview` |
| `/plant` | URL field + preview card; Plant button shows the stub |
| How-To | Short pointer at the flow |

No buyer table, no Clerk SDK, no login modal, no Stripe, no listing API.

---

## Related

- [positioning-farmers-market.md](./positioning-farmers-market.md) — copy on install; open bots
- [teams.md](./teams.md) — team packs
- [How-To](https://mybot.farm/how-to) — Grok Bot install + share
- Read APIs: `/api`, `/api/stalls`, `/api/packs/{slug}`, `/api/packs/{slug}/grok-template`, `/api/install-prompt/{slug}`
