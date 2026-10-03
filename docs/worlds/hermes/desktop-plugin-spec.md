# Desktop plugin spec

Build a **Hermes Desktop** page for planted GAF worlds. The web dashboard pane
stays. This is a second surface, not a rewrite of `dashboard/dist/index.js`.

Branch: `feat/desktop-plugin`.

Repo: `~/.hermes/plugins/hermes-worlds`.

Visual benchmark: [pd-pixel-worlds](https://github.com/cygnostik/pd-pixel-worlds)
(a drawn room with characters standing in it). Data benchmark: this repo’s
README (“Data contract”) and `dashboard/plugin_api.py` (`WorldView`).

Do not implement `.pwrealm.json`, a 12-station cap, or “every observed Hermes
agent.” Membership is the world’s cast.

---

## Why a new file

Desktop and the web dashboard do not share code.

| | Dashboard (exists) | Desktop (this spec) |
|---|---|---|
| Entry | `dashboard/manifest.json` + IIFE `dist/index.js` | ESM `plugin.js` |
| SDK | `window.__HERMES_PLUGIN_SDK__` | `@hermes/plugin-sdk` |
| UI | `React.createElement` inside an IIFE | `jsx` / `jsxs` from `react/jsx-runtime` |
| Install | `~/.hermes/plugins/hermes-worlds/dashboard/` | `~/.hermes/desktop-plugins/hermes-worlds/plugin.js` |

Allowed imports in the Desktop file, matching the farm catalog plugin:

```js
import { PALETTE_AREA, ROUTES_AREA, SIDEBAR_NAV_AREA, host } from '@hermes/plugin-sdk'
import { jsx, jsxs } from 'react/jsx-runtime'
import { useEffect, useState } from 'react'
```

No `fs`, no `node:fs`, no Python, no dashboard IIFE, no `@hermes/plugin-sdk`
types invented beyond what a running Desktop build actually exports. If an
import fails, drop that symbol. Do not add a bundler for v1: Hermes loads the
file uncompiled.

---

## Install

Write the source at:

```text
desktop/plugin.js
```

Copy (or symlink) it to the live door:

```text
~/.hermes/desktop-plugins/hermes-worlds/plugin.js
```

Hermes does not always materialize `plugins/<id>/desktop/plugin.js` into that
folder. A package path that is a symlink is skipped. After a change, reload
Desktop plugins (command palette: “Reload desktop plugins”) or restart Desktop.

Plugin id: `hermes-worlds`. Do not reuse `pixel-worlds` or `mybot-farm`.

---

## What the page shows

Route: `/hermes-worlds`.

Sidebar label: **Worlds**. Command palette: “Worlds: Open planted world”.

One planted world at a time:

1. World picker (buttons). Remember the last id in component state across polls.
2. Place tabs from `places[]`. Default place is `state.place`, else `entrypoint.place`.
3. A **scene stage**: backdrop (or palette color), the active place’s art, and the cast who are at that place.
4. Offstage cast listed under the stage, not as extra people in the picture.
5. Greeter mark on `entrypoint.greeter`.
6. One line when `rules.turnModel === "defer"`: Bot Mode owns turns; this pane only draws.
7. Empty state when the list is empty: “No worlds planted. farm_plant a world-pack.”

Switching worlds clears the place override.

Do not write `world.json`, `state.json`, or `profile.yaml`.

---

## Data

Superseded by [desktop-file-handoff.md](desktop-file-handoff.md). Do not
`fetch` `http://127.0.0.1:9119`. The Desktop renderer is a different origin
from the dashboard, and that call is blocked by CORS. Read
`$HERMES_HOME/worlds/<id>/` through `window.hermesDesktop`.

Poll the directory every 15 seconds. If the selected id is still present,
reload that world. If a read is in flight and the user picks another world,
ignore the stale response (compare the requested id to the current selection
before `setState`).

`widgetHints.showBackdrop === false` skips the backdrop. `scenePanel: false`
does not hide the page.

---

## Scene stage (the benchmark slice)

This is the part that should feel like Pixel Worlds: a picture with people in
it, not a grid of cards. v1 is a single canvas (or one absolutely positioned
stage). Do not port their realm importer, ship layout, or event bridge.

Stage size: the pane’s content width, height about 300px, pixelated
(`image-rendering: pixelated` on the backdrop and sprites).

Layers, back to front:

1. Fill `theme.palette.bg` (fallback: the Desktop surface color).
2. World backdrop image if allowed and loaded.
3. Active place `artUrl` if loaded, covering the stage.
4. Cast sprites for roles whose `state.where[role]` equals the active place id.
   If `where` is empty, use that place’s `present[]`.

Sprite placement: `worlds/v1` has no anchors. Lay on-stage cast along the lower
third, left to right, stable order by `cast` array order. Cap the row at
`rules.maxPresent` when that value is a positive integer; extra people stay in
the offstage list and the stage shows a “+N offstage” note.

Each sprite:

- Avatar image when `avatarUrl` loaded, else a circle with the initial.
- Name under the sprite.
- A small greeter mark when `isGreeter`.

Clicking a sprite does not start a chat and does not send a message. v1 has no
session navigation.

Palette `accent` is only the active place-tab color (`--hw-accent` on the page
root). Do not restyle the whole Desktop theme.

---

## Activity pulse

Not required for the first commit. If it is easy with an API that already
exists on `host` (`onEvent` or a sessions query), show a dot on the sprite:
working or idle. Do not store message text, tool arguments, or tool results.
If `turnModel` is `defer`, the dot is cosmetic.

If no such API is obvious, ship the scene without a pulse. Do not call
`/api/profiles` to invent a roster.

---

## Files to add

```text
desktop/plugin.js          # register() + page + stage
desktop/README.md          # install path and reload command only
```

Keep `dashboard/` as it is. Do not move `plugin_api.py`.

`desktop/plugin.js` shape:

```js
const ID = 'hermes-worlds'
const ROUTE = '/hermes-worlds'

export default {
  id: ID,
  name: 'Worlds',
  description: 'Planted GAF worlds: places and cast in a scene.',
  register(ctx) {
    ctx.register({
      id: 'page',
      area: ROUTES_AREA,
      data: { path: ROUTE },
      render: () => jsx(WorldsPage, {})
    })
    ctx.register({
      id: 'nav',
      area: SIDEBAR_NAV_AREA,
      order: 45,
      data: { codicon: 'globe', label: 'Worlds', path: ROUTE }
    })
    ctx.register({
      id: 'open',
      area: PALETTE_AREA,
      data: {
        id: 'hermes-worlds.open',
        label: 'Worlds: Open planted world',
        keywords: ['world', 'hermes-worlds', 'cast', 'place'],
        run: () => host.navigate(ROUTE)
      }
    })
  }
}
```

`SIDEBAR_NAV_AREA` / `codicon` must match the installed SDK. If `codicon` is
rejected, omit it rather than crashing `register`.

---

## Acceptance

1. Desktop sidebar shows **Worlds**. The command palette opens `/hermes-worlds`.
2. With the dashboard process stopped and `fixtures/neon-harbor-world.json` copied to
   `~/.hermes/worlds/neon-harbor/world.json`, the page shows **Neon Harbor**,
   tabs **The Docks** and **The Workshop**, and Probe marked as greeter.
   DevTools shows no request to `127.0.0.1:9119`.
3. On The Docks, only cast whose `where` (or `present`) is `dock` stand in the
   picture. The other character is under Offstage.
4. Choosing The Workshop moves the picture’s occupants. It does not write
   `state.json`.
5. A second world directory can be selected and stays selected across two polls.
6. Dashboard down: the page still renders planted worlds. A missing
   `window.hermesDesktop` bridge shows an error, not a list of all profiles.
7. Missing images do not blank the page.
8. `pixel-worlds` and `mybot-farm` Desktop plugins still load.

---

## Out of scope

- Replacing or restyling the dashboard tab
- Pixel Worlds realm packages, Office/Café/TNG art, or their host event bridge
- `farm_plant` writing `state.json` or copying assets (mybot-farm repo)
- Export, Desktop display-mode chrome, chat handoff, Director turns
- Mutating world files from the pane

---

## Commits

```text
feat: add Hermes Desktop page for planted worlds
```

One commit is enough. Note in the message that the live copy is
`~/.hermes/desktop-plugins/hermes-worlds/plugin.js`.
