# mock-farm — local mybot.farm API for the KiroCrew plugin

A self-contained mock of the mybot.farm API, so the KiroCrew plant/post plugin
(system #14, see [`../docs/kirocrew-plugin-spec.md`](../docs/kirocrew-plugin-spec.md))
can be built and debugged against a local "source" before the working surface is
ported to the live `web/` app.

It mirrors the **request/response shapes and status codes** of the real routes in
`web/src/app/api/*` (`jsonResponse`, `noStoreJson`, the 401/402/404/409 paths) but
has **no GitHub / Stripe / Neon** dependency: seed stalls load from the real
`../packs` catalog, and seller `POST`s are held in memory so a get-after-put
round-trips. Restart = reset.

## Endpoints served

| Method | Path | Tool |
|--------|------|------|
| GET | `/api` | tool + endpoint index |
| GET | `/api/stalls[?q=&kind=]` | `search_stalls` |
| GET | `/api/stalls/{slug}` | `get_stall` |
| GET | `/api/packs/{slug}[?download=1]` | `download_pack` (402 if `priceCents>0`) |
| GET | `/api/packs/{slug}/skills` | `list_pack_skills` |
| GET | `/api/install-prompt/{slug}[?short=1]` | `get_install_prompt` |
| GET | `/api/stalls/{slug}/revisions` | `list_stall_revisions` |
| POST | `/api/listings` | `post_listing` (Bearer `mbf_…` seller key) |

Write-path behaviour matches the live route: `401` without/with an unknown key,
`400` on invalid kind/category/price/pack, `409 catalog_reserved` when posting
onto a seeded slug, `409 slug_taken` for another seller's slug, `201 created` /
`200 updated` (version bump) for your own.

## Run it — local (Node ≥ 18)

```bash
cd mock-farm
npm start                     # http://localhost:8787
# in another shell:
npm run smoke                 # 19-check end-to-end assertion
```

Env: `PORT` (default 8787), `MOCK_SEED_DIR` (default `../packs`),
`MOCK_API_KEY` (default `mbf_mocktoken` — the seller key the mock accepts).

## Run it — Docker

The image copies the real `packs/` catalog in as seed data. Build from the **repo
root** (the Dockerfile references `packs/` and `mock-farm/`):

```bash
docker build -f mock-farm/Dockerfile -t mock-farm .
docker run --rm -p 8787:8787 mock-farm
```

Point the plugin at it with `MYBOT_FARM_URL=http://localhost:8787` and
`MYBOT_FARM_API_KEY=mbf_mocktoken`.

## Note: port 8787 collision

If `docker build`/`run` reports `EADDRINUSE` on 8787, something already publishes
that port (a leftover container from a prior run). Check with
`lsof -nP -iTCP:8787 -sTCP:LISTEN`, stop that container, or run on another port:

```bash
PORT=8799 npm start
BASE=http://localhost:8799 npm run smoke
```

## Porting to the live site

The mock is intentionally throwaway. When the plugin's plant/post surface is
solid against it, the live routes already exist in `web/src/app/api/*` — the
mock exists only so plugin development doesn't need GitHub/Stripe/Neon wired up.
Keep the mock's shapes in sync if a live route changes.
