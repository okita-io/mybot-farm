# Fix handoff — after `f706166`

Review of `feat: GAF worlds/v1 gateway + scene pane` (`f706166`). The gateway and
scene pane are the right architecture. Implement the fixes below **in this repo**
(`~/.hermes/plugins/hermes-worlds`). Do not rewrite `plugin_api.py` from scratch.

Branch suggestion: `fix/post-f706166-review`.

Commit style: conventional commits, one commit per numbered fix (or one commit
if the changes stay small). Reload after UI edits:

```bash
curl -X POST http://127.0.0.1:9119/api/dashboard/plugins/rescan
```

Gateway changes need a dashboard/gateway restart so `plugin_api.py` reloads.

Out of scope (do not do here):

- Farm plant writing `state.json` or copying assets (mybot-farm repo)
- Export preview / `cast` → `characters` endpoint
- Desktop pane (`desktop/plugin.js`)
- Mutating `state.json` from the UI

---

## Fix 1 — World picker and poll selection

### Problem

`useWorlds` in `dashboard/dist/index.js` starts a poll inside `useEffect(..., [])`.
The closure captures the initial `data` (`null`), so `kept = data && data.id` is
always empty. Every 15 s the pane reloads **worlds[0]** and drops any later choice.

Header chips are `<span>` elements. They show titles but do not change the
selected world.

### Files

- `dashboard/dist/index.js` — `useWorlds`, `CrewWorlds` header

### Implement

1. Keep the selected world id in **state** (or a ref updated on click), not only
   inside the poll closure.
2. Poll flow:
   - `GET /api/plugins/hermes-worlds/worlds`
   - If the current selection is still in the list, reload **that** id.
   - If the selection is missing, fall back to `worlds[0]`.
   - If the list is empty, clear the view.
3. Render each world chip as a `<button>`. `onClick` sets the selected id and
   fetches `GET /api/plugins/hermes-worlds/worlds/:id`.
4. Reset the client place override (`viewPlace` in `CrewWorlds`) when the world
   id changes, so a place tab from world A does not stick on world B.
5. Mark the active chip with `hw-chip-working` (already used).

### Acceptance

- Two directories under `$HERMES_HOME/worlds/` (copy `fixtures/neon-harbor-world.json`
  into `worlds/neon-harbor/world.json` and a second slug). Clicking the second
  chip loads that world and stays selected across at least two poll intervals.
- Place tab resets to the new world's `state.place` / `entrypoint.place`.

---

## Fix 2 — Profile join fallback

### Problem

`_build_view` in `dashboard/plugin_api.py` joins a cast row to a Hermes profile
only when `cast.name.lower()` equals a profile directory name:

```python
match = prof_names.get(c["name"].lower()) if c.get("name") else None
```

Planted profiles are often the **agent pack slug** (`patch`, `probe`), while
`cast[].name` is the display name (`Patch`, `Probe`). Case-folding covers that
pair. It does **not** cover a directory that does not match `name`, where Bot
Mode still stamps `profile.yaml`:

```yaml
ui_meta:
  hermes-bots:
    title: harbor-engineer   # or a human title
    groups: [neon-harbor]
```

README join order:

1. `cast[].name` === profile directory (case-insensitive) — already done
2. `ui_meta.hermes-bots.title` matches `cast.role` **or** `cast.name`
3. Leave `profileName` null if neither matches (do not attach unrelated profiles)

### Files

- `dashboard/plugin_api.py` — `_build_view` / new helper
- `dashboard/plugin_api_test.py` — see Fix 4

### Implement

1. Scan `$HERMES_HOME/profiles/<dir>/profile.yaml` (read-only).
2. Prefer PyYAML (`import yaml`) when importable — Hermes installs include it.
   If import fails, skip the YAML fallback and keep name matching only (do not
   add a new package dependency in this plugin).
3. Read `ui_meta.hermes-bots.title` as a string. Index it case-insensitively to
   the profile directory name.
4. For each cast row, resolve `profileName` in order:
   - directory name equals `cast.name` (case-insensitive)
   - bot `title` equals `cast.role`
   - bot `title` equals `cast.name`
5. Do not invent a match from `groups`.

### Acceptance

- Fixture world + a temp profile dir named `patch` with `title: harbor-engineer`
  and **no** directory named `Patch` still sets `cast[].profileName` to `patch`
  for role `harbor-engineer`.
- A profile whose title matches neither role nor name stays unjoined.

---

## Fix 3 — Backdrop, place art, widget hints

### Problem

The gateway already returns:

- `theme.backdropUrl`
- `places[].artUrl`
- `theme.palette` (`bg`, `fg`, `accent`)
- `widgetHints` (`scenePanel`, `showBackdrop`)

`SceneCard` only applies `palette.bg` / `palette.fg`. Backdrop and place art
never render. `showBackdrop: false` is ignored.

Missing files 404 from the asset route. The UI must degrade to the existing
gradient / letter tile (do not treat a 404 as a page error).

### Files

- `dashboard/dist/index.js` — `SceneCard`
- `dashboard/dist/style.css`

### Implement

1. If `widgetHints.showBackdrop !== false` and `theme.backdropUrl` is set, paint
   it as a background image on `.hw-scene-card` (cover, center). Keep palette
   `bg` as the fallback color behind the image.
2. On the active place, if `places[].artUrl` is set, show it in the stage header
   (a short banner above “On the stage”). `onError` hides the image.
3. Cast avatars already use `avatarUrl` with `onError`. Leave that path.
4. Map `palette.accent` onto a CSS variable on the scene card (for example
   `--hw-accent`) and use it for the active place tab border. Do not replace
   the dashboard theme globally.
5. If `widgetHints.scenePanel === false`, still render the scene (the hint is
   advisory). Do not hide the pane.

Asset URLs are already absolute dashboard paths:

```
/api/plugins/hermes-worlds/worlds/<id>/asset/<relative-path>
```

Use them as `<img src>` / CSS `url()`. Do not prefix another origin.

### Acceptance

- With `fixtures/neon-harbor-world.json` copied to
  `$HERMES_HOME/worlds/neon-harbor/world.json` and **no** asset files, the scene
  still renders (placeholders, no broken layout).
- Dropping a small `assets/dock.webp` under that world dir makes the dock tab
  show the image. Removing `showBackdrop` from the fixture (or setting it
  `false`) hides the world backdrop but keeps place art.

---

## Fix 4 — Gateway tests

### Problem

`plugin_api.py` has no tests. Normalization, confinement, and the Neon Harbor
fixture are the contract.

### Files

- `dashboard/plugin_api_test.py` (new)
- Uses `fixtures/neon-harbor-world.json` and `fixtures/neon-harbor-state.json`

### Implement

Call the pure helpers directly (`_normalize_cast`, `_default_state`, `_load_state`,
`_build_view`, `_safe_world_id`, `_confine_asset`). Do not require a running
dashboard. Point `HERMES_HOME` at a `tempfile.TemporaryDirectory` via
`os.environ` for filesystem tests, and restore it in `tearDown`.

Cases:

1. **Normalize cast** — `fixtures/neon-harbor-world.json` yields two rows,
   `id == role` (`harbor-engineer`, `night-watch`), names `Patch` and `Probe`.
2. **Normalize characters** — a dict with `characters: [{id, name, role}]` and
   no `cast` still produces rows (`id` from `role` when present, else `id`).
3. **Default state** — no `state.json`: `place == "dock"`, `where` maps
   `harbor-engineer` → `workshop` and `night-watch` → `dock` (home wins).
4. **Load state** — copy `fixtures/neon-harbor-state.json` beside a world dir;
   `_load_state` returns that `place` / `where`. A file with the wrong `schema`
   falls back to the default.
5. **Reject traversal** — `_safe_world_id("..")` and `_safe_world_id("a/b")`
   raise `HTTPException` 400. `_confine_asset` rejects `../secret` and accepts
   `assets/dock.webp` when that file exists under the world dir.
6. **Schema gate** — `_build_view` on `{"schema": "worlds/v0", "title": "x"}`
   raises 409.

Run:

```bash
cd ~/.hermes/plugins/hermes-worlds
python3 -m unittest dashboard.plugin_api_test -v
```

If the package layout makes that import fail, run the file as a script
(`python3 dashboard/plugin_api_test.py`) with `sys.path` inserting `dashboard/`.
Either entry point is fine; document the one that works in the test module
docstring.

### Acceptance

`python3 -m unittest` (or the documented command) exits 0.

---

## Fix 5 — Do not poll the fleet while a world is showing

### Problem

`CrewWorlds` always calls `useFleet()`, which hits `/api/profiles` and every
profile's `/api/sessions` even when a GAF scene is on screen. Fleet pulse is
only the empty-state fallback.

Hooks cannot be conditional. Keep `useFleet`, but **skip the network** unless
the caller asks for it.

### Files

- `dashboard/dist/index.js` — `useFleet`, `CrewWorlds`

### Implement

1. Change `useFleet(enabled)`.
2. When `enabled` is false, do not call `/api/profiles` or `/api/sessions`.
   Clear any previous roster.
3. Pass `enabled: !world` from `CrewWorlds` (no loaded world view).
4. Keep rendering `FleetGrid` only inside the empty card.

### Acceptance

With a world loaded, the browser does not request `/api/profiles` on the 15 s
tick. With zero worlds, the fleet grid still polls.

---

## Fix 6 — Manifest and README drift

### Problem

`dashboard/manifest.json` still describes a sessions-only fleet widget and
stays at `1.0.0`. The root README says `plugin_api.py` lives at the repo root;
the file is `dashboard/plugin_api.py` (correct for the dashboard plugin loader).

### Files

- `dashboard/manifest.json`
- `README.md` (short edits only)

### Implement

1. Bump `version` to `1.1.0`.
2. Replace `description` with something that names the planted world scene, for
   example: “Scene pane for planted GAF worlds (places, cast, theme) with an
   optional session pulse on cast profiles.”
3. In the README architecture tree, show `dashboard/plugin_api.py` (not the
   repo root). Mention the asset route as
   `/api/plugins/hermes-worlds/worlds/:id/asset/<path>` (singular `asset`,
   matching the code).
4. Point at this file from the README status block:

   `Fixes after f706166: docs/fix-handoff.md`

### Acceptance

Manifest version is `1.1.0`. README no longer tells a reader to create
`plugin_api.py` at the repository root.

---

## Optional (only if Fix 1–6 are done)

### Scene log

`view.state.recent` is loaded and unused. Under the stage, list up to 20
entries: time, `actor` (resolve to cast `name` when the actor is a role),
`text`. Empty `recent` renders nothing. Still read-only.

### `maxPresent`

If `rules.maxPresent` is a positive integer, slice the on-stage list to that
length and append a one-line note when truncated. Do not drop people from the
off-stage list.

### `connects`

On the active place tab, dim place tabs whose id is neither the current place
nor listed in `current.connects`. All tabs stay clickable.

---

## Suggested commit split

```
fix: keep the selected world across polls and make chips selectable
fix: join cast to profiles via hermes-bots title
feat: paint world backdrop and place art from asset urls
test: cover world view helpers and path confinement
fix: skip fleet polling while a world scene is open
docs: point the readme at dashboard/plugin_api.py
```

## Done when

- Fixes 1–6 meet the acceptance lines above.
- `dashboard/plugin_api_test.py` passes.
- A planted (or fixture-copied) Neon Harbor still shows The Docks / The Workshop,
  greeter on Probe, and the defer note.
- No writes to `world.json`, `state.json`, or `profile.yaml`.
