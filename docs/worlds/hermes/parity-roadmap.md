# hermes-worlds → KiroCrew Worlds engine: parity roadmap

**What this is.** The current `hermes-worlds` plugin is a **read-only scene
viewer** — it ingests planted `world.json` / `state.json` and *draws* a world
(places, cast, theme) in the dashboard and the Desktop pane. KiroCrew Worlds
(worlds-portability-spec §7.1, "full fidelity") is the live **engine** that
*runs* a world: it routes turns, moves characters between places, writes state,
scopes memory, schedules ambient life, and creates the characters in the first
place.

This doc is the task list to grow the viewer into an engine on Hermes. It is
scoped to Hermes primitives the specs already name — **Bot Mode**, **group
chats / `@mention`**, **routines (cron)**, per-profile memory + Memory Graph,
and the **Desktop Plugin SDK** — so each task maps to something Hermes actually
exposes, not an invented API.

The capability letters (C1–C10) are from worlds-portability-spec §2. The
checklist Hermes should implement, including the click-to-chat bubble, is
[implementation-todos.md](implementation-todos.md).

> **Confirm before you build.** Code hints below name SDK/host symbols from the
> specs and the existing `desktop/plugin.js` (`@hermes/plugin-sdk`, `host`,
> `window.hermesDesktop`). The spec warns: *"No `@hermes/plugin-sdk` types
> invented beyond what a running Desktop build actually exports. If an import
> fails, drop that symbol."* Treat every new `host.*` / bridge call as a
> **probe first, then build** — log what the running build exposes, don't assume.

---

## Architecture: where the engine lives

The viewer is a renderer with no writer and no scheduler. An engine needs a
component that *acts*. On Hermes there is no single sandboxed `ctx` DSL like
KiroCrew's workflows, so the **Director** (spec §5) is split across the two
hosts Hermes gives you:

```
┌───────────────────────────────────────────────────────────────┐
│ Director (new) — the runtime-agnostic turn/state/ambient logic  │
│   pure functions: nextSpeaker(state, rules), applyHandoff(...),  │
│   moveCharacter(state, role, place), appendEvent(state, evt)     │
│   NO Hermes calls inside — unit-testable, mirrors the KiroCrew   │
│   adapter so the conformance fixture (neon-harbor) runs on both. │
└───────────────┬───────────────────────────────┬─────────────────┘
                │ dashboard gateway (Python)      │ desktop (ESM)
                ▼                                 ▼
   writes $HERMES_HOME/worlds/<id>/state.json   drives Bot Mode via host.*
   (FastAPI route, the only fs writer)          (@mention, routines, nav)
```

Key decision: **the desktop page is the only writer of `roster.json` and, once
moves exist, of `state.json`.** The dashboard reads both. One writer, so the
two panes do not race. The gateway does not grow a `POST /state` route.

The desktop renderer is **not** same-origin with the dashboard. `fetch` to
`127.0.0.1:9119` is blocked by CORS (`file://` is a null origin; `app://hermes`
is not on the allowlist). Do not call `window.hermesDesktop.api`. The preload
can write: `writeTextFile` is `hermes:fs:writeText` (resolved path, parent
must exist, 1 MB cap, in-place `writeFile`). The Worlds page already uses it
for `roster.json`. A `state.json` write uses that call for a sibling
`state.json.tmp`, then `renamePath`, because the in-place write is not
atomic. The dashboard stays a reader. Do not add a `POST /state` the desktop
page cannot call.

---

## Phase 1 — State is written, not just derived (C5)

Today `state.json` is read and a default is derived when missing
(`_default_state` / `_load_state`), but **nothing ever writes it**. The engine's
first job is to own presence + events.

### T1.1 — Director state module (pure, shared shape)
New `director/state.mjs` (ESM, importable by the desktop pane) **and** a Python
mirror `dashboard/director.py` (importable by the gateway). Keep them in lockstep
— the conformance fixture asserts identical output.

On-disk state is used only when `schema` is exactly `worlds/state/v1`. The
derived fallback from `_default_state` has **no** `schema` field. A writer
that omits it is ignored and the pane keeps deriving presence. Current
readers do not cap `recent` (they pass the array through). A cap of 50 would
be new. `_default_state` also does not set `updatedAt`.

```js
// director/state.mjs — no Hermes calls, pure
export const STATE_SCHEMA = 'worlds/state/v1'

export function initState(world) {
  // mirror _default_state(): entry place + where{} from cast.home / present[]
  const placeIds = (world.places || []).map(p => p.id)
  const where = {}
  for (const c of (world.cast || [])) {
    const role = c.role || c.id
    if (c.home && placeIds.includes(c.home)) where[role] = c.home
    else {
      const p = (world.places || []).find(p => (p.present || []).includes(role))
      if (p) where[role] = p.id
    }
  }
  const entry = (world.entrypoint || {}).place
  return {
    schema: STATE_SCHEMA,
    place: placeIds.includes(entry) ? entry : (placeIds[0] || null),
    where,
    recent: [],         // ring buffer of events, newest last
    updatedAt: new Date().toISOString(),
  }
}

export function moveCharacter(state, role, placeId) {
  const next = { ...state, where: { ...state.where, [role]: placeId } }
  return appendEvent(next, { kind: 'move', role, to: placeId })
}

export function appendEvent(state, evt, cap = 50) {
  const recent = [...(state.recent || []), { ...evt, at: new Date().toISOString() }]
  return { ...state, recent: recent.slice(-cap), updatedAt: new Date().toISOString() }
}
```

### T1.2 — No gateway write route
The desktop page writes `state.json` (todo 3 in
`implementation-todos.md`): `writeTextFile` of `state.json.tmp`, then
`renamePath`. The dashboard does not gain `POST /worlds/{id}/state`. The
sketch below is the atomic shape, not a route to add.

```python
import os, tempfile
from pydantic import BaseModel

class StatePatch(BaseModel):
    place: str | None = None
    move: dict | None = None   # {"role": "...", "placeId": "..."}
    event: dict | None = None  # {"kind": "...", ...}

@router.post("/worlds/{world_id}/state")
async def write_state(world_id: str, patch: StatePatch) -> dict:
    _safe_world_id(world_id)
    world_dir = _world_dir(world_id)
    world = _load_json(world_dir / "world.json")
    # load current (or derive default), apply the patch via the Python Director
    state = _load_state(world_dir, world_id, _default_state(world, _normalize_cast(world), world_id))
    state = apply_patch(state, patch)          # director.py — mirrors state.mjs
    _atomic_write_json(world_dir / "state.json", state)
    return state

def _atomic_write_json(path, obj):
    fd, tmp = tempfile.mkstemp(dir=path.parent, suffix=".tmp")
    with os.fdopen(fd, "w", encoding="utf-8") as fh:
        json.dump(obj, fh, indent=2)
    os.replace(tmp, path)   # atomic on POSIX
```

The dashboard stays read-only for `world.json`, `state.json`, and
`profile.yaml`.

### T1.3 — Desktop pane: optimistic move + persist
The pane already computes on-stage cast from `state.where`. Make a place-tab
click (or a sprite drag, later) *move* a character instead of only changing the
view. Persist with `writeTextFile` + `renamePath` as in the architecture
section (not a renderer `fetch` to port 9119). Re-poll `state.json` to confirm.

**Acceptance:** moving a character on one surface shows up on the other within
one 15s poll; `state.json` on disk reflects the move; a crash mid-write never
corrupts the file (atomic replace).

---

## Phase 2 — Turn routing / the Director (C4)

Today `rules.turnModel` is displayed; when it's `defer` the pane even says *"Bot
Mode owns turns; this pane only draws."* That deferral is the honest v1 — Phase 2
is where the plugin *becomes* an owner for the non-`defer` models.

### T2.1 — `nextSpeaker` in the Director (pure)
```js
// director/turns.mjs
export function nextSpeaker(state, world, lastSpeaker) {
  const present = Object.entries(state.where || {})
    .filter(([, place]) => place === state.place).map(([role]) => role)
  const model = (world.rules || {}).turnModel || 'defer'
  if (model === 'defer') return null                       // Bot Mode decides
  if (model === 'round-robin') {
    const i = present.indexOf(lastSpeaker)
    return present[(i + 1) % present.length] ?? present[0]
  }
  if (model === 'director') {
    // deterministic: greeter opens, then whoever an @mention addressed
    return (world.entrypoint || {}).greeter ?? present[0] ?? null
  }
  return null // free-for-all: no forced next speaker
}
```

### T2.2 — Drive a turn through Bot Mode (the Hermes-specific half)
A character is a Hermes **bot/profile**. The spec (§7.2) says bots message each
other with `@mention` and the backend teaches the protocol via
`agent.bot_mode_protocol`. So "character speaks" = post into the world's **group
chat** addressing the next speaker.

```js
// desktop or a headless gateway worker — PROBE host first
// e.g. host.botMode?.send({ chat: worldChatId, text: `@${nextRole} ${prompt}` })
// or the dashboard gateway shelling the documented Bot Mode send path.
```

Open questions to resolve by probing a running Hermes (do NOT guess):
- Does `host` expose a Bot Mode send, or must the gateway call a Hermes CLI/RPC?
- Is there a stable **group chat id** per world? (Map `world.id` → one room; the
  install step in Phase 5 should create it.)
- `agent.bot_mode_protocol` — is it auto-injected, or must the Director prime
  each bot with the handoff rule?

### T2.3 — `@mention` handoff
On an inbound group-chat message mentioning a role, the Director records the
handoff (`appendEvent({kind:'handoff', from, to})`) and lets Bot Mode deliver.
`rules.handoff === 'mention'` is the common case; keep `defer` as "don't route."

**Acceptance:** with `turnModel: round-robin`, posting in the world chat causes
the next cast member (by presence + order) to be addressed; with `defer`, the
plugin stays hands-off exactly as today.

---

## Phase 3 — Character creation & the cast→profile join write side (C1/C2)

Today the dashboard *reads* `profiles/` to **display** which cast member maps to
an existing bot (`_resolve_profile`). It never **creates** a bot. KiroCrew's
adapter has `createCharacter`.

### T3.1 — Keep creation in the plant step, not the viewer
Creation belongs to `farm_plant` (`packages/hermes-mybot-farm`, same repo).
It already imports each member profile, writes `world.json`, writes a readable
`WORLD.md`, copies relative scene assets, and appends a character skin to each
member `MEMORY.md` (character name, home place **name**, greeter line).

Group chat is partly done. `configure_planted_team` calls `groups.create`
when `HERMES_GATEWAY_RPC_URL` is set, and stamps
`ui_meta.hermes-bots.groups` with **one** group: the world slug, not one
group per place. It does **not** write `chatId` into `state.json`. That id
is the remaining plant task, so Phase 2 can find the room without guessing.

### T3.2 — Capabilities stay advisory (safety, spec §11.3)
A world's `cast[].capabilities` is documentation. KiroCrew enforces that with
`DEFAULT_TOOLS` (read/search/web only). Hermes does **not** have that
allow-list. A planted profile keeps the tools in its `.hermes.tar.gz`. Plant
already says so in `WORLD.md` and the memory skin: capabilities do not add
tools, and `ambient` does not schedule routines.

The panes do **not** render that list. Desktop keeps `capabilities` on the
cast object and draws a name plus a greeter star. The dashboard tile tooltip
shows role, profile, pulse, home, and greeter — not capabilities. Do not
describe the viewer as already rendering them as advisory.

There is no Hermes test that a world bot lacks `execute_bash` because of
`capabilities: ["files"]`. Seller tarballs may already include shell. The
honest assertion is: plant does not *add* tools from `cast[].capabilities`.

---

## Phase 4 — Ambient autonomy (C7)

`rules.ambient` is read but never acted on. KiroCrew arms characters with cron.
Hermes has **routines** (Bot Mode routines are cron-backed, spec §7.2).

### T4.1 — Map ambient to routines, opt-in
```
if (world.rules.ambient === true) {
  // DO NOT auto-schedule on install (spec §11.3 + §7.3 "routines documented
  // until opt-in"). Surface a one-click "Enable ambient life" that registers
  // a routine per cast member: a low-frequency prompt that nudges the
  // character to act in-world (post a line, move a place) via Phase 2.
}
```
Routine body is a short in-world prompt; the schedule is the user's choice. On
teardown, remove exactly the routines this world created (tag them
`world:<id>`).

**Acceptance:** ambient is **off** after plant; enabling it schedules one tagged
routine per character; disabling removes exactly those.

---

## Phase 5 — Memory scope (C3) & lifecycle

### T5.1 — Honor `memoryScope`
`private` is the character's own profile memory. Plant already appends the
world skin to that profile's `MEMORY.md`. Spec §11.4 corrects §7.2: built-in
`MEMORY.md` is small and a frozen snapshot until the next session, and a
second profile's `MEMORY.md` is not a shared store the cast can read. The
Memory Graph (`/journey`) is a viewer of skills and memory nodes, not the
world store. Shared scene text belongs in `WORLD.md` / `state.json` (files
the gateway serves), not in another profile. The panes keep `memoryScope` on
the cast object and do not display it.

### T5.2 — Export back to a bundle (round-trip)
README lists `world-export hermes` as *future*. Implement the reverse of plant:
read `~/.hermes/worlds/<id>/{world.json,state.json}` + member profiles → a
`world-exchange` bundle. Keep it in the farm plugin; the viewer links to it.

---

## Phase 6 — UI embodiment depth (C6) — stretch

The scene stage is already the right shape (backdrop + place art + sprites +
greeter). To approach KiroCrew's live `<mcwidget>` feel without overreach:

- **Activity pulse.** The **dashboard** pane already draws a cosmetic
  working/idle dot from `GET /api/sessions`, scoped to cast profiles joined
  by `_resolve_profile`, and it skips that pulse when `turnModel` is `defer`.
  The **desktop** pane has no pulse and does not join profiles. Do not add a
  desktop pulse from `/api/profiles` or from a renderer `fetch` to port 9119.
  A desktop dot needs an existing `host` event (`host.onEvent`), probed first.
  `host.botMode` is not on the current Desktop SDK surface in
  `apps/desktop/src/sdk/index.ts`. Never store message text in `state.json`.
- **Live speech bubble** on the sprite when its bot posts in the world chat
  (Phase 2 gives you the event). Text is ephemeral UI, not persisted to state.
- Keep `scenePanel`/`showBackdrop` hints honored; keep it one canvas, not a
  realm importer (explicitly out of scope per the desktop spec).

---

## Conformance (ties it together)

Spec §9.5: the `neon-harbor` fixture must run on KiroCrew **and** Hermes and
assert the same engine behaviors. Add `fixtures/`-driven tests:

| Assertion | Phase |
|---|---|
| `initState(neon-harbor)` places Probe at dock, Patch at workshop | 1 |
| `moveCharacter` persists + both panes reflect it within one poll | 1 |
| `nextSpeaker` round-robin cycles dock-present cast in `cast[]` order | 2 |
| `defer` → `nextSpeaker` returns null, pane stays hands-off | 2 |
| plant does not add tools from `capabilities`; `WORLD.md` calls them advisory | 3 |
| ambient off on install; enable schedules exactly one routine per cast | 4 |
| `private` skin is that profile's `MEMORY.md`; `shared` scene text is `WORLD.md` / `state.json`, not another profile's memory | 5 |
| export → re-import round-trips `world.json` + state | 5 |

Keep the Director pure and mirrored (JS + Python) so this fixture is the single
proof both the KiroCrew engine and the Hermes engine agree.

---

## Suggested commit / branch order

1. `feat(director): pure state module + Python mirror + fixture` (Phase 1 core)
2. `feat(desktop): move-character + persist via preload write` (Phase 1)
3. `test(worlds): neon-harbor conformance fixture` (Phase 1)
4. `feat(director): turn routing (round-robin/director), defer unchanged` (Phase 2)
5. `feat(botmode): drive a turn / @mention handoff` (Phase 2 — after probing host)
6. farm-plugin PRs: world group chat on plant, deny-by-default test, memoryScope bind, export (Phases 3/5)
7. `feat(ambient): opt-in routine scheduling, tagged teardown` (Phase 4)
8. `feat(ui): activity pulse + speech bubble from host events` (Phase 6)

Each phase is independently shippable; the viewer keeps working throughout —
every new writer/driver is additive, exactly as the KiroCrew side kept team
installs byte-identical while adding worlds.
