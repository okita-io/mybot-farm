# Hermes on-disk data contract

Hermes Worlds reads planted files under `$HERMES_HOME/worlds/<id>/`. This
document is the runtime contract for the dashboard gateway and the Desktop
page. Cross-runtime portability and exchange are in
[exchange-spec.md](../exchange-spec.md) and [portability-spec.md](../portability-spec.md).

## Data contract (read this first)

Three representations of the same world. The plugin **ingests** layers 2–3 on disk;
it **may** read layer 1 only when implementing export back to a bundle.

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 1. GAF world-pack (catalog / download)                                  │
│    format: "mybot.farm/world-pack"                                      │
│    URL: https://mybot.farm/packs/worlds/<slug>.json                     │
│    Contains: members[] + world{} + team fields (topology, shared, …)    │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ farm_plant (Hermes mybot-farm plugin)
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 2. Hermes on-disk (what this plugin reads)                              │
│    ~/.hermes/worlds/<id>/world.json   ← worlds/v1 block only            │
│    ~/.hermes/worlds/<id>/state.json   ← worlds/state/v1 (plant: TBD)    │
│    ~/.hermes/worlds/<id>/roster.json  ← worlds/roster/v1 (Desktop page) │
│    ~/.hermes/worlds/<id>/assets/…      ← bundle images (plant writes)   │
│    ~/.hermes/worlds/<id>/WORLD.md      ← readable scene doc (plant)     │
│    ~/.hermes/profiles/<name>/           ← the owner's agents            │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ world-export hermes (future CLI)
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ 3. Exchange bundle (portable zip)                                       │
│    neon-harbor.world/world.json       ← worlds/v1 with characters[]      │
│    neon-harbor.world/characters/*.json ← GAF agent-packs                 │
│    neon-harbor.world/state.json       ← optional snapshot               │
│    neon-harbor.world/exchange.json     ← loss ledger                      │
└─────────────────────────────────────────────────────────────────────────┘
```

`HERMES_HOME` overrides `~/.hermes` when set.

---

### Layer 1 — GAF world-pack (catalog file)

A **world listing** on mybot.farm is a JSON file with `format:
"mybot.farm/world-pack"`. It is a **team-pack superset**: the cast installs as
ordinary team members; the extra `world` object is scene data for runtimes that
understand it.

**Top-level envelope** (ingestion cares about `members` + `world`; other keys are
for plant/install, not for the scene pane):

| Field | Required | Purpose |
|-------|----------|---------|
| `format` | yes | Must be `"mybot.farm/world-pack"` |
| `members[]` | yes (may be `[]`) | Cast that plants as Hermes profiles. Empty = unpopulated stage; user fills via `roster.json`. |
| `members[].role` | yes | Stable id; **must match** `world.cast[].role` |
| `members[].summary` | yes | Human blurb; used in install prompts |
| `members[].pack` | yes | Path to nested GAF agent-pack (`agents/patch.json`) or `.hermes.tar.gz` |
| `world` | yes | `worlds/v1` block (see below) |
| `profile` | no | Listing card metadata (world title/description on the farm) |
| `shared`, `topology`, `runtime`, `slug` | no | Team install / handoffs; not the scene graph |

**Reference file:** `neon-harbor.json` in mybot-farm
(`web/public/packs/worlds/neon-harbor.json`).

**Important:** `farm_plant` does **not** copy the full world-pack to disk. It
writes **only** the `world` object to `world.json` (see Layer 2).

---

### Layer 2a — `world.json` on disk (`worlds/v1`)

**Path:** `$HERMES_HOME/worlds/<id>/world.json`

**Written by:** `packages/hermes-mybot-farm/plant.py` — serializes `pack.world`
verbatim (pretty-printed JSON). `<id>` is the stall slug (e.g. `neon-harbor`).

**Consumed by:** `hermes-worlds` gateway (`plugin_api.py`) → dashboard view model.

This file is the **portable world manifest**. Required shape:

```json
{
  "schema": "worlds/v1",
  "title": "Neon Harbor",
  "theme": {
    "palette": { "bg": "#0b1020", "fg": "#e6f1ff", "accent": "#36e0c0" },
    "backdrop": "assets/harbor-night.webp",
    "mood": "cyberpunk-cozy"
  },
  "places": [
    {
      "id": "dock",
      "name": "The Docks",
      "art": "assets/dock.webp",
      "connects": ["workshop"],
      "present": ["harbor-engineer", "night-watch"]
    }
  ],
  "cast": [
    {
      "role": "harbor-engineer",
      "name": "Patch",
      "home": "workshop",
      "avatar": "assets/patch-harbor.webp",
      "memoryScope": "private",
      "capabilities": ["web", "files"],
      "relationships": { "night-watch": "trusted partner", "user": "harbor-master" }
    }
  ],
  "rules": {
    "turnModel": "defer",
    "handoff": "mention",
    "ambient": false,
    "maxPresent": 6
  },
  "entrypoint": { "place": "dock", "greeter": "night-watch" },
  "render": {
    "theme": "cyberpunk-cozy",
    "widgetHints": { "scenePanel": true, "showBackdrop": true }
  }
}
```

#### Field reference (`worlds/v1`)

| Field | Required | Type | Plugin use |
|-------|----------|------|------------|
| `schema` | yes | `"worlds/v1"` | Reject unknown versions |
| `id` | no* | string | World id; *farm may omit; default directory name (`neon-harbor`) |
| `title` | yes | string | Header, world picker label |
| `thumbnail` | no | string | Card image on farm; site path `/…` or bundle-relative `assets/…` |
| `theme.palette` | no | `{ bg, fg, accent }` | CSS variables on scene root |
| `theme.backdrop` | no | relative path | Full-scene background image |
| `theme.mood` | no | string | Label / filter hint |
| `places[]` | yes (≥1) | array | Scene locations |
| `places[].id` | yes | string | Stable key; used in `entrypoint`, `connects`, `state.where` |
| `places[].name` | yes | string | Display name |
| `places[].art` | no | relative path | Place backdrop |
| `places[].connects` | no | place id[] | Navigation between places |
| `places[].present` | no | role[] | Cast **roles** on stage at this place (not profile names) |
| `cast[]` **or** `characters[]` | no** | array | Character skins; GAF uses `cast`, exchange uses `characters` |
| `cast[].role` | yes | string | **Join key** → `members[].role`, `entrypoint.greeter`, `present[]` |
| `cast[].name` | no | string | Display name; usually matches Hermes profile dir (`Patch`) |
| `cast[].home` | no | place id | Default location when offstage |
| `cast[].avatar` | no | relative path | Tile image |
| `cast[].memoryScope` | no | `private` \| `shared` \| `substrate` | Export/metadata; not rendered in v1 |
| `cast[].capabilities` | no | `web` \| `files` \| `schedule` | Closed set |
| `cast[].relationships` | no | object | Export / persona addendum |
| `rules.turnModel` | no | see below | **`defer`** → do not run a Director in the plugin |
| `rules.handoff` | no | e.g. `mention` | Bot Mode owns handoff when `defer` |
| `rules.ambient` | no | boolean | Cron/autonomy; default false |
| `rules.maxPresent` | no | int | Cap on `places[].present` length (default 6) |
| `entrypoint.place` | yes | place id | Initial scene |
| `entrypoint.greeter` | when members exist | role | Greeter badge; must be a `members[].role`. Omit when `members` is empty. |
| `render.widgetHints` | no | object | Feature flags for pane (`scenePanel`, `showBackdrop`) |

**`cast[]` vs `characters[]` (normalization required):**

| GAF `world.cast[]` | Exchange `world.characters[]` |
|--------------------|-------------------------------|
| `role` | `id` (and optional `role` label) |
| `name` | `name` |
| — | `pack` (path to GAF agent-pack in bundle) |

Plugin code must accept **either** array. Normalized internal shape:

```javascript
{ id: string, name: string, role: string, home?, avatar?, ... }
// id = cast.role || characters.id
```

**Asset paths** in `world.json` are **relative to** `$HERMES_HOME/worlds/<id>/`
(not the farm URL). Resolve:

```
assets/dock.webp  →  $HERMES_HOME/worlds/neon-harbor/assets/dock.webp
```

`farm_plant` copies same-origin `assets/**` from the farm URL when present;
missing files → placeholder UI (not a hard error).

---

### Layer 2b — `state.json` on disk (`worlds/state/v1`)

**Path:** `$HERMES_HOME/worlds/<id>/state.json`

**Written by:** Not yet by `farm_plant` (planned). Seed on plant from `entrypoint`
+ cast `home` / `present`. Runtime/Director may update later.

**Consumed by:** Plugin for “who is where now” and optional scene log.

```json
{
  "schema": "worlds/state/v1",
  "worldId": "neon-harbor",
  "place": "dock",
  "where": {
    "harbor-engineer": "workshop",
    "night-watch": "dock"
  },
  "recent": [
    {
      "at": "2026-10-01T16:00:00Z",
      "kind": "speech",
      "actor": "night-watch",
      "text": "Tide's in."
    }
  ]
}
```

| Field | Purpose |
|-------|---------|
| `place` | Viewer’s current place id (default `entrypoint.place` if file missing) |
| `where` | Map **role** → place id (dynamic positions) |
| `recent` | Scene log; cap 20 on export; actors are **roles**, not profile names |

If `state.json` is absent, derive defaults:

- `place` = `world.entrypoint.place`
- `where` = each cast member’s `home`, or first place that lists them in `present`
- `recent` = `[]`

---

### Layer 2b+ — `roster.json` on disk (`worlds/roster/v1`)

**Path:** `$HERMES_HOME/worlds/<id>/roster.json`

**Written by:** The Hermes Desktop Worlds page (via the Electron
`writeTextFile` bridge), not by `farm_plant`. The dashboard is read-only
for it.

**Semantics:** Worlds ship **unpopulated** — the pack declares places and
art but no cast. `roster.json` is the owner's cast: which of their existing
agents stand in which place. When the file exists and is valid, it is
authoritative: the pack cast (if any) is not shown, and `state.where` is
derived from it. The Desktop page offers Add/Remove per place, capped at
`rules.maxPresent`.

```json
{
  "schema": "worlds/roster/v1",
  "members": [
    { "profile": "my-agent", "place": "dock" }
  ]
}
```

| Field | Purpose |
|-------|---------|
| `members[].profile` | Profile directory name under `$HERMES_HOME/profiles/` (the owner's existing agent) |
| `members[].place` | Place id from `world.json` (validated against the place set) |

Both surfaces mirror this: the dashboard `plugin_api.py` applies the roster
in `_apply_roster` and sets `rosterOwned: true`; the desktop `plugin.js`
applies the same rule and writes the file on Add/Remove/Clear.

**Caveat:** re-planting the world pack overwrites `world.json` but does not
touch `roster.json` — the owner's roster survives a re-plant. A fresh world
directory starts empty.

---

### Layer 2c — Hermes profiles (cast agents)

Each `members[].pack` imports a **GAF agent-pack** into:

```
$HERMES_HOME/profiles/<profileName>/
  SOUL.md
  profile.yaml          # ui_meta.hermes-bots for Bot Mode
  memories/MEMORY.md
  skills/…
```

**Joining cast → profile** (use in this order):

| Step | Match | Example (Neon Harbor) |
|------|-------|------------------------|
| 1 | `cast[].name` === profile directory name | `Patch` ↔ `profiles/patch/` or `profiles/Patch/` |
| 2 | `ui_meta.hermes-bots.title` or member role | `harbor-engineer` |
| 3 | `members[].role` from plant plan (not on disk in world.json) | fallback only |

**Bot Mode metadata** (`profile.yaml`):

```yaml
ui_meta:
  hermes-bots:
    custom: true
    title: <role or summary-derived title>
    groups: [<teamSlug>]    # today: one group per world slug, not per place (gap)
```

- `groups` → maps to **places** in the exchange spec (one group id per place).
  Farm plant currently stamps the **world slug** only (`neon-harbor`), not
  `dock` / `workshop`. The plugin should prefer `world.places[].present` for
  stage layout until per-place groups land.

**Do not** enumerate every profile on the machine. Only profiles that resolve to
a `cast[]` / `characters[]` row belong in the scene.

---

### Layer 2d — Sessions API (optional overlay only)

| Endpoint | v0 misuse | Correct use |
|----------|-----------|-------------|
| `GET /api/profiles` | Roster of all tiles | Join helper after cast is known |
| `GET /api/sessions?profile=<name>` | Primary “who exists” | **Activity pulse** on cast tiles |

Pulse states (display-only, do not define cast membership):

| Status | Condition |
|--------|-----------|
| working | Active session or touched &lt; 5 min |
| fresh | 5–30 min |
| idle | 30 min – 3 h |
| asleep | &gt; 3 h or no recent session |

When `rules.turnModel === "defer"`, pulse is **cosmetic** — Bot Mode owns turns
in group chats.

---

## Ingestion: how data arrives on disk

End-to-end path from mybot.farm to what this plugin reads.

### Step A — Publish (farm catalog)

Seller or seed publishes a listing with `kind: "world"` and pack
`format: "mybot.farm/world-pack"`. Validated by `validateListingPack` +
`validateWorldBlock` in mybot-farm (`gaf-pack.ts`).

### Step B — Download / install prompt

User or agent obtains the pack JSON (e.g. `GET /packs/worlds/neon-harbor.json`)
and runs Hermes **`farm_plant`** (mybot-farm plugin tool or CLI).

### Step C — `farm_plant` (Hermes)

For `kind: world`, `build_plant_plan` in `plant.py`:

1. When `members[]` is non-empty: imports each `members[].pack` as a Hermes profile
   and runs `configure_planted_team` (Bot markers, optional `groups.create` for the
   world slug).
2. When `members[]` is empty: writes only the scene (`world.json`, `WORLD.md`,
   assets) — no profile import.
3. Writes **`$HERMES_HOME/worlds/<slug>/world.json`**, **`WORLD.md`**, and
   same-origin **`assets/**`** from the farm.

**Does not yet:**

- Write `state.json` or `chatId` (see [implementation-todos.md](implementation-todos.md))
- Add `world.id` inside the planted block (use directory name)

### Step D — Plugin discovery

`plugin_api.py` scans `$HERMES_HOME/worlds/*/world.json`. Each directory with a
valid `schema: "worlds/v1"` file is one **installed world**.

### Step E — Dashboard consumption

Browser calls gateway routes (not raw filesystem). Gateway returns a **view model**
(see [API sketch](#api-sketch-step-1)) merging `world.json`, `state.json`, and
resolved asset URLs. Dashboard renders places + cast; optionally fetches sessions
for pulse.

---

## Consumption: how the plugin should read data

### Read order

1. **List worlds** — scan `worlds/*/world.json` (via gateway)
2. **Load world** — parse `worlds/v1`; normalize `cast` / `characters`
3. **Load state** — `state.json` or defaults from `entrypoint` + `cast`
4. **Resolve cast → profiles** — match `cast[].name` to `profiles/<name>`
5. **Build place view** — active `state.place` or `entrypoint.place`; stage =
   `places[].present` merged with `state.where`
6. **Optional pulse** — sessions for resolved profile names only

### View model (internal)

The dashboard should not parse raw files. Gateway returns:

```typescript
type WorldView = {
  id: string;                    // directory name or world.id
  title: string;
  entrypoint: { place: string; greeter: string };
  theme?: { palette?, backdrop?, mood? };
  places: Array<{
    id: string;
    name: string;
    artUrl?: string;             // gateway-resolved
    connects: string[];
    present: string[];           // role ids on stage
  }>;
  cast: Array<{
    id: string;                  // role
    name: string;
    home?: string;
    avatarUrl?: string;
    profileName?: string;        // joined Hermes profile dir
    isGreeter: boolean;
  }>;
  state: {
    place: string;
    where: Record<string, string>;
    recent: Array<{ at: string; kind: string; actor: string; text: string }>;
  };
  rules: {
    turnModel?: string;
    handoff?: string;
    maxPresent?: number;
  };
  widgetHints?: { scenePanel?: boolean; showBackdrop?: boolean };
};
```

### What v0 did wrong

| v0 behavior | Spec-correct behavior |
|-------------|------------------------|
| All profiles → tiles | Only `cast[]` rows → tiles |
| Session age → identity | `places` + `present` + `state.where` → who is on stage |
| No `world.json` | Primary source is `$HERMES_HOME/worlds/<id>/world.json` |
| Flat grid | Place-centric layout with `entrypoint` default |

---

## Export: how data leaves Hermes (future)

Export is **not** implemented in this plugin yet. Spec:
[exchange-spec.md](../exchange-spec.md) §4.2 (Hermes reader) and §5.2 (import plan inverse).

When `world-export hermes` exists, it reads native layout and writes a
**`.world` bundle`**. This plugin (or `plugin_api.py`) should expose the same
facts the exporter needs.

### Hermes native → bundle mapping

| Native (read) | Bundle field |
|---------------|--------------|
| `$HERMES_HOME/worlds/<id>/world.json` | `world.json` (prefer; convert `cast[]` → `characters[]` for exchange) |
| `$HERMES_HOME/worlds/<id>/state.json` | `state.json` |
| `$HERMES_HOME/profiles/<name>/` | One `characters/<id>.json` GAF agent-pack |
| `SOUL.md` | `profile.description` |
| `profile.yaml` `ui_meta.hermes-bots.title` | `characters[].role` |
| `ui_meta.hermes-bots.groups` | `places[]` (group id → place; members → `present`) |
| `memories/MEMORY.md`, `USER.md` | `memory[]` (clip to 2200 / 1375 chars; ledger `clipped`) |
| `skills/*/SKILL.md` | `skills[]` |
| Cron on profile | `routines[]` prose only |
| Assets under `worlds/<id>/assets/` | `assets/` in bundle |

### Export transforms the plugin must understand

**`cast[]` → `characters[]`** when writing exchange `world.json`:

```javascript
characters: cast.map(c => ({
  id: c.role,
  name: c.name,
  role: c.role,
  pack: `characters/${slugify(c.name)}.json`,
  home: c.home,
  avatar: c.avatar,
  memoryScope: c.memoryScope,
  capabilities: c.capabilities,
  relationships: c.relationships,
}))
```

**`places[]` from Bot groups** when `world.json` was hand-edited or missing:

- Each distinct `ui_meta.hermes-bots.groups` entry → a place `id`
- Profiles listing that group → `present` role ids

**Loss ledger** (`exchange.json` `loss[]`): record clipped memory, dropped cron
ids, image-only avatars, etc. Export must not fail on recoverable loss.

### Export API sketch (gateway, future)

```
POST /api/plugins/hermes-worlds/worlds/:id/export
→ streams <id>.world.zip or writes to operator-provided path

GET /api/plugins/hermes-worlds/worlds/:id/export/preview
→ { exchange: {...}, loss: [...], characterCount, placeCount }
```

Read-only v1 dashboard does **not** call export. Implement in `plugin_api.py` when
the exchange CLI lands.

