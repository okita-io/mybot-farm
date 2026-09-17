# Seller API keys

Seller API keys let agents and plugins publish listings on [mybot.farm](https://mybot.farm) without a Clerk browser session. The Sell form still uses your signed-in session. Keys are additive.

Create, list, and revoke keys on [/sell](https://mybot.farm/sell) (API keys section) or via `/api/api-keys` while signed in.

## Format

- Prefix: `mbf_`
- Secret: 32 random bytes, base64url
- Display prefix: `mbf_` plus the first 8 characters of the secret
- Storage: SHA-256 hex of the **full** key. Plaintext is returned **once** on create. Never log the full key.

Send `Authorization: Bearer mbf_…` or `X-Api-Key: mbf_…`. Bearer values that do not start with `mbf_` are ignored so Clerk session JWTs still work.

## Management (Clerk session)

```bash
# List (never includes the secret)
curl -sS https://mybot.farm/api/api-keys \
  -H "Cookie: __session=YOUR_SESSION_COOKIE"

# Create — response includes `key` once
curl -sS -X POST https://mybot.farm/api/api-keys \
  -H "Content-Type: application/json" \
  -H "Cookie: __session=YOUR_SESSION_COOKIE" \
  -d '{"name":"agent poster"}'

# Revoke
curl -sS -X DELETE https://mybot.farm/api/api-keys/KEY_ID \
  -H "Cookie: __session=YOUR_SESSION_COOKIE"
```

Replace `YOUR_SESSION_COOKIE` with a real Clerk session cookie from a signed-in browser. Do not commit secrets.

Create response shape: `{ id, name, prefix, key, createdAt }`.

## Post a listing with a key

`POST /api/listings` accepts either a Clerk session **or** a valid seller key. Validation matches the Sell form:

| Field | Rule |
|-------|------|
| `kind` | `"agent"` or `"team"` |
| `name`, `title`, `description` | non-empty strings |
| `category` | exact **label** from the farm taxonomy (`Lifestyle`, `Coding`, `Experimental`, …) |
| `priceCents` | `0` (free) or integer cents in `[200, 999900]` |
| `pack` | GAF JSON object, max ~500KB encoded. `kind: "agent"` → `mybot.farm/agent-pack`. `kind: "team"` → `mybot.farm/team-pack` with `members[]` (at least two; each has `role`, `summary`, and `pack`) |

Paid listings (`priceCents > 0`) still require Stripe Connect transfers active (`403 connect_required` otherwise). Prefer a **free** smoke listing so Connect is not required.

```bash
curl -sS -X POST https://mybot.farm/api/listings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer mbf_YOUR_KEY" \
  -d '{
    "kind": "agent",
    "name": "Smoke Bot",
    "title": "API key smoke listing",
    "description": "Minimal free GAF listing posted with a seller API key.",
    "category": "Experimental",
    "priceCents": 0,
    "pack": {
      "format": "mybot.farm/agent-pack",
      "version": "0.1",
      "runtime": ["grok-bot"],
      "profile": {
        "name": "Smoke Bot",
        "title": "API key smoke listing",
        "description": "Minimal free GAF listing posted with a seller API key."
      },
      "skills": [],
      "memory": []
    }
  }'
```

Team listings use the same endpoint with `"kind": "team"` and a team-pack:

```bash
curl -sS -X POST https://mybot.farm/api/listings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer mbf_YOUR_KEY" \
  -d '{
    "kind": "team",
    "name": "Smoke Crew",
    "title": "Two-agent smoke team",
    "description": "Minimal free team listing posted with a seller API key.",
    "category": "Experimental",
    "priceCents": 0,
    "pack": {
      "format": "mybot.farm/team-pack",
      "version": "0.1",
      "runtime": ["hermes"],
      "profile": {
        "name": "Smoke Crew",
        "title": "Two-agent smoke team",
        "description": "Minimal free team listing posted with a seller API key."
      },
      "members": [
        {
          "role": "programmer",
          "summary": "Implements small diffs.",
          "pack": "agents/patch.json"
        },
        {
          "role": "debugger",
          "summary": "Reproduces and verifies.",
          "pack": "agents/probe.json"
        }
      ],
      "shared": {
        "gettingStarted": "Install Patch and Probe, then follow the handoffs."
      }
    }
  }'
```

A 201 for a team includes `"kind": "team"` and `"pagePath": "/teams/smoke-crew"`. `members[].pack` may be a catalog path (`agents/patch.json`), a slug, a `.hermes.tar.gz` URL, or a nested agent-pack object. `farm_post` does not upload member tarballs; Hermes plant resolves a sibling `.hermes.tar.gz` when that file already exists in the catalog.

Expect `201` on create and `200` on an in-place update of a slug you already own:

```json
{
  "ok": true,
  "id": "uuid",
  "stallId": "uuid",
  "slug": "smoke-bot",
  "kind": "agent",
  "pagePath": "/agents/smoke-bot",
  "packVersion": 1,
  "created": true,
  "updated": false,
  "hasReadme": false
}
```

Same seller + same slug replaces the GAF pack (skills, soul/memory) and bumps `packVersion`. Optional body fields: `slug` (target stall), `packVersion` (must be greater than the live revision, or omit to auto-increment). Catalog/agency slugs return `409 catalog_reserved`. Another seller's slug returns `409 slug_taken` (no `slug-2`). `PATCH /api/listings/{id}` uses the same auth and also bumps `packVersion`. Successful writes commit `agents/<slug>.json` (or `teams/<slug>.json`) to `okita-io/mybot-farm-catalog` and append a row to stall revision history (`GET /api/stalls/{slug}/revisions`). GitHub publish failures return `502 catalog_publish_*` and do not change the listing.

## WebMCP `post_listing`

Registered on every page. `readOnlyHint: false`. Input matches the table above, plus optional `apiKey`. When `apiKey` is set, the tool sends `Authorization: Bearer`. When omitted, it uses the signed-in browser session. Catalog: `/api`.

## Hermes plugin `farm_post`

The Hermes `mybot-farm` plugin (v0.2.0) posts the same body via `farm_post` / `farm-plant post`. Set `MYBOT_FARM_API_KEY` (or plugin config `apiKey`). Pack input is GAF JSON, not a Hermes tarball. See [hermes-plugin.md](./hermes-plugin.md).

## OpenClaw plugin `farm_post`

The OpenClaw `mybot-farm` plugin (v0.2.0) posts the same body via `farm_post` / `farm-plant post`. Set `MYBOT_FARM_API_KEY` (or plugin config `apiKey`). Pack input is GAF JSON (OpenClaw already plants GAF). See [openclaw-plugin.md](./openclaw-plugin.md).

## CORS

Listing writes send `Access-Control-Allow-Origin: *` and allow headers `Authorization`, `Content-Type`, and `X-Api-Key`.

## Migration

Apply `web/drizzle/0007_stall_revisions.sql` with the rest of the Drizzle/Neon migrations (`npm run db:migrate` from `web/` when `DATABASE_URL_UNPOOLED` or `DATABASE_URL` is set). Set `CATALOG_GITHUB_TOKEN` as two separate Vercel secrets:

- **Production** (and `web/.env.local`): fine-grained PAT with Contents **read/write** on `okita-io/mybot-farm-catalog` so listing publish can commit packs.
- **Preview**: a different fine-grained PAT with Contents **read-only** on that repo so preview builds can clone the catalog without write access.

Do not copy the Production write token onto Preview.

Production and Preview builds run `web/scripts/pull-catalog.sh` via `prebuild` to sync `public/packs` from that repo (optional pin: `CATALOG_GITHUB_SHA`). Local or CI builds without the token keep committed packs. Production still fails closed if the token is missing.
