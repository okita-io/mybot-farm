# Worlds specification

Central documentation for **mybot.farm Worlds**: GAF world-packs, the portable
`worlds/v1` schema, Hermes on-disk layout, cross-runtime portability, and the
conformance suite that proves two adapters agree on engine behavior.

Start here. Plugin packages link back to this tree instead of carrying their
own copies of the spec.

---

## Document map

| Document | What it defines |
|----------|-----------------|
| [exchange-spec.md](./exchange-spec.md) | Hub bundle layout, `worlds/v1`, export/import per runtime, round-trip rules |
| [portability-spec.md](./portability-spec.md) | Capability map (C1–C10), Director model, Hermes §11.4, KiroCrew baseline |
| [conformance.md](./conformance.md) | Acceptance tests on the `neon-harbor` fixture — pass/fail engine behaviors |
| [hermes/data-contract.md](./hermes/data-contract.md) | Hermes layers: `world.json`, `roster.json`, `state.json`, profiles, view model |
| [hermes/implementation-todos.md](./hermes/implementation-todos.md) | **Active task list** for `packages/hermes-worlds` and `hermes-mybot-farm` |
| [hermes/parity-roadmap.md](./hermes/parity-roadmap.md) | Phased engine plan (Director, turns, ambient, UI depth) |
| [hermes/desktop-file-handoff.md](./hermes/desktop-file-handoff.md) | Desktop preload bridge: reads, allowed writes (`roster.json`, `state.json`) |
| [hermes/desktop-cors.md](./hermes/desktop-cors.md) | Why the Desktop page must not `fetch` port 9119 |
| [hermes/desktop-plugin-spec.md](./hermes/desktop-plugin-spec.md) | Superseded sketch; see file-handoff |
| [hermes/fix-handoff.md](./hermes/fix-handoff.md) | Historical post-`f706166` dashboard fixes (reference) |

**Code and fixtures (not prose):**

| Path | Role |
|------|------|
| [web/public/packs/worlds/neon-harbor.json](../../web/public/packs/worlds/neon-harbor.json) | Reference world-pack (empty cast) |
| [web/src/lib/gaf-pack.ts](../../web/src/lib/gaf-pack.ts) | `validateWorldBlock`, seller POST rules (`MIN_WORLD_CAST = 0`) |
| [packages/hermes-mybot-farm/plant.py](../../packages/hermes-mybot-farm/plant.py) | `farm_plant` → `world.json`, `WORLD.md`, assets |
| [packages/hermes-worlds/](../../packages/hermes-worlds/) | Dashboard gateway + Desktop scene pane |
| [packages/kirocrew-mybot-farm/](../../packages/kirocrew-mybot-farm/) | KiroCrew world plant (`_world.md`, skins) |
| [docs/hermes-plugin.md](../hermes-plugin.md) | Hermes farm plugin ops + 0.3.0 worlds review notes |

---

## Architecture (three layers)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 1. GAF world-pack (catalog)                                             │
│    format: "mybot.farm/world-pack"                                      │
│    /packs/worlds/<slug>.json on mybot.farm                              │
│    places + art + mood; cast may be empty                               │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ farm_plant / plantTeam
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 2. Runtime on disk (Hermes example)                                     │
│    ~/.hermes/worlds/<id>/world.json    worlds/v1 stage                  │
│    ~/.hermes/worlds/<id>/roster.json   worlds/roster/v1 (owner's cast)  │
│    ~/.hermes/worlds/<id>/state.json    worlds/state/v1 (presence, TBD)  │
│    ~/.hermes/worlds/<id>/WORLD.md, assets/                              │
│    ~/.hermes/profiles/<name>/          owner's existing agents          │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ world-export (future)
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 3. Exchange bundle (<id>.world.zip)                                     │
│    exchange.json + world.json + characters/*.json + assets/             │
└─────────────────────────────────────────────────────────────────────────┘
```

**Unpopulated worlds:** the reference pack ships no cast. The downloader adds
agents they already have via `roster.json` (Desktop writes; dashboard reads).
Re-plant updates `world.json` / assets and leaves `roster.json` alone.

**Writers:** Desktop owns `roster.json` and, when moves land, `state.json`
(`writeTextFile` + `renamePath`). The dashboard gateway is read-only for those
files. Do not add a `POST /state` the Desktop renderer cannot call.

---

## Implementation status (Hermes)

| Area | Spec | Shipped |
|------|------|---------|
| Empty world-pack + validation | exchange §2.1, gaf-pack | yes |
| Plant scene (`world.json`, `WORLD.md`, assets) | data-contract | yes |
| Dashboard + Desktop scene panes | data-contract view model | yes |
| User roster (`worlds/roster/v1`) | data-contract Layer 2b+ | yes |
| `state.json` moves | conformance row 2 | no — [todo 3](./hermes/implementation-todos.md) |
| Click-to-chat bubble | todo 2 | no |
| `chatId` in state from plant | todo 4 | no |
| Turn routing beyond `defer` | parity Phase 2 | no |
| Ambient opt-in | parity Phase 4 | no |
| Export bundle | exchange §7 | no |

Work the task list in [hermes/implementation-todos.md](./hermes/implementation-todos.md).
Prove completion with [conformance.md](./conformance.md).

---

## Related marketplace docs

- [../teams.md](../teams.md) — team packs (world-packs are a superset)
- [../hermes-plugin.md](../hermes-plugin.md) — Hermes `mybot-farm` plant/post
- [../kirocrew-plugin-spec.md](../kirocrew-plugin-spec.md) — KiroCrew runtime
