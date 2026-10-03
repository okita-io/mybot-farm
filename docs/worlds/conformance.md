# Worlds conformance

**Fixture:** `neon-harbor` — `web/public/packs/worlds/neon-harbor.json` planted
into a temp `HERMES_HOME` (and the KiroCrew equivalent when that adapter is
tested).

**Goal:** assert the same **engine behaviors** on Hermes and KiroCrew, not
identical pixels. Render checks are tiered (pane mounted, widget HTML, transcript
line). Engine checks are pass/fail.

Portable spec context: [portability-spec.md](./portability-spec.md) §11.8,
[exchange-spec.md](./exchange-spec.md) §7.

---

## Assertions

| # | Assertion | Phase | Hermes | Test (planned / existing) |
|---|-----------|-------|--------|---------------------------|
| 1 | `initState(neon-harbor)` places cast at homes / `present` when a pack cast exists; empty cast + empty roster → empty stage | 1 | partial | `plugin_api_test.py` default state; roster overlay tests TBD |
| 2 | `moveCharacter` persists; both panes reflect within one 15s poll; crash mid-write does not corrupt file | 1 | no | Desktop `state.json.tmp` + `renamePath`; gateway re-read |
| 3 | `nextSpeaker` round-robin cycles dock-present cast in `cast[]` order | 2 | no | Director module + fixture |
| 4 | `defer` → `nextSpeaker` returns null; pane stays hands-off | 2 | yes (display) | Manual / pane copy; no second messaging stack |
| 5 | Plant does not add tools from `cast[].capabilities`; `WORLD.md` calls them advisory | 3 | partial | `test_world_doc.py`; negative plant test TBD |
| 6 | Ambient off on install; enable schedules exactly one routine per cast member, tagged `world:<id>` | 4 | no | Plant + cron tag tests |
| 7 | Private skin = that profile's `MEMORY.md`; shared scene text = `WORLD.md` / `state.json` | 5 | partial | `world_doc.py` skin; state writer TBD |
| 8 | Export → re-import round-trips `world.json` + state on the lossless subset | 5 | no | `packages/world-exchange/` (future) |

---

## Director mirror

Keep pure state logic in one module mirrored in JS (desktop) and Python
(dashboard), so the fixture is a single proof both surfaces agree:

- `initState(world, cast, roster?)`
- `applyPatch(state, { place?, move?, event? })`
- `nextSpeaker(world, state)` — returns null when `rules.turnModel === "defer"`

See [hermes/parity-roadmap.md](./hermes/parity-roadmap.md) Phase 1 (T1.1).

---

## Round trip (exchange)

From [exchange-spec.md](./exchange-spec.md) §7:

1. Author `neon-harbor.world` by hand (`exportedFrom: author`).
2. Import `--dry-run` for each runtime; assert loss ledger + lossless subset.
3. Apply on Hermes + KiroCrew in a temp home; export again; diff lossless fields.
4. A field that fails to round-trip on the lossless subset is a bug; known loss
   is a ledger line.

---

## What to run today

```bash
# Hermes gateway helpers
cd packages/hermes-worlds
python3 -m unittest dashboard.plugin_api_test -v

# GAF validation (empty cast)
cd web && npm test -- src/lib/gaf-pack.test.ts src/lib/world-card.test.ts

# Hermes plant
cd .. && python3 -m unittest discover -s packages/hermes-mybot-farm/tests -v
```

Add fixture-driven tests under `packages/hermes-worlds/fixtures/` as each
conformance row ships.
