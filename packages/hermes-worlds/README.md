# hermes-worlds

Hermes plugin that renders **world-pack** listings as a living scene in the web
dashboard and in Hermes Desktop. Worlds ship as **empty stages**; the owner adds
agents they already have via `roster.json` on the Desktop page.

Install: [INSTALL.md](INSTALL.md). This tree is the plugin Hermes loads.
`~/.hermes/plugins/hermes-worlds` is a symlink to it. Catalog draft:
[catalog/](catalog/).

**Status:** Dashboard scene pane and Desktop page read planted
`$HERMES_HOME/worlds/<id>/` (`world.json`, optional `roster.json`, `state.json`,
assets). Desktop loads images through the Electron file bridge (`desktop/plugin.js`).
Do not treat `/api/profiles` as world membership.

---

## Specification

All Worlds documentation is centralized in the mybot-farm repo:

**[docs/worlds/README.md](../../docs/worlds/README.md)**

| Topic | Path |
|-------|------|
| Hub + status | [docs/worlds/README.md](../../docs/worlds/README.md) |
| Hermes on-disk contract | [docs/worlds/hermes/data-contract.md](../../docs/worlds/hermes/data-contract.md) |
| **Active task list** | [docs/worlds/hermes/implementation-todos.md](../../docs/worlds/hermes/implementation-todos.md) |
| Conformance suite | [docs/worlds/conformance.md](../../docs/worlds/conformance.md) |
| Exchange + portability | [docs/worlds/exchange-spec.md](../../docs/worlds/exchange-spec.md), [portability-spec.md](../../docs/worlds/portability-spec.md) |
| Desktop file bridge | [docs/worlds/hermes/desktop-file-handoff.md](../../docs/worlds/hermes/desktop-file-handoff.md) |

Legacy stubs under `docs/` in this package point at the central tree.

---

## Directory layout

```
packages/hermes-worlds/
├── README.md
├── catalog/
├── dashboard/
│   ├── manifest.json
│   ├── plugin_api.py
│   └── dist/
├── desktop/
│   └── plugin.js
├── docs/                 # stubs → ../../docs/worlds/hermes/
└── fixtures/
    ├── neon-harbor-world.json
    └── neon-harbor-state.json
```

---

## Development workflow

### Reload plugins

```bash
curl -X POST http://127.0.0.1:9119/api/dashboard/plugins/rescan
```

Reload desktop plugins after editing `desktop/plugin.js`.

### Tests

```bash
cd packages/hermes-worlds
python3 -m unittest dashboard.plugin_api_test -v
node --check desktop/plugin.js
```

### Seed Neon Harbor

1. `farm_plant` slug `neon-harbor` (or install from https://mybot.farm/worlds/neon-harbor)
2. Verify `$HERMES_HOME/worlds/neon-harbor/world.json` — `schema: "worlds/v1"`, empty cast
3. Add agents from the Desktop Worlds page (writes `roster.json`)

---

## Gateway routes

```
GET  /api/plugins/hermes-worlds/worlds
GET  /api/plugins/hermes-worlds/worlds/:id
GET  /api/plugins/hermes-worlds/worlds/:id/asset/<relative-path>
```

See [data-contract.md](../../docs/worlds/hermes/data-contract.md) for the `WorldView` shape.

---

## Related packages

- **mybot-farm** — GAF world-pack, validation, catalog
- **hermes-mybot-farm** — `farm_plant`, `WORLD.md`, assets, roster-friendly empty world plant
