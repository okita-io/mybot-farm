# Handoff — draw the Desktop scene from planted files

The Worlds page in `desktop/plugin.js` calls `fetch('http://127.0.0.1:9119/...')`.
That fails with a CORS error. A session token does not fix it. The dashboard
tab works because it is already on the dashboard origin. The Desktop page is
an Electron window on a different origin (`file://`, or a small local HTTP
server that is not port 9119).

The Desktop app does not load its own data with page `fetch`. A preload
bridge, `window.hermesDesktop`, asks the Electron main process to read files.
That call never goes through browser CORS. `host.request` is JSON-RPC for
sessions, config, and skills. It does not serve `world.json`.

This handoff replaces the **Data** section of
[desktop-plugin-spec.md](desktop-plugin-spec.md). Keep the page, the stage,
and the install path in that spec. Keep `dashboard/` as it is.

Branch: `feat/desktop-plugin`.

Repo: `~/.hermes/plugins/hermes-worlds`.

---

## What to change

File: `desktop/plugin.js`.

Remove `DASH`, `apiList`, `apiView`, `assetSrc`, and the `fetch` inside
`useAsset`. Leave `WorldsPage`, the stage, the chips, and the place tabs.

After editing, copy the file to the live door:

```text
~/.hermes/desktop-plugins/hermes-worlds/plugin.js
```

Reload with the command palette: “Reload desktop plugins”.

Do not import `fs` or `node:fs`. The loader rejects those imports. `window`
is available: the plugin is evaluated as a blob module in the same renderer
that has the preload.

---

## Where the files are

```text
$HERMES_HOME/worlds/<id>/world.json    schema worlds/v1
$HERMES_HOME/worlds/<id>/state.json    schema worlds/state/v1, optional
$HERMES_HOME/worlds/<id>/assets/...    images, optional
```

`HERMES_HOME` is the parent of the desktop-plugins directory. Resolve it
like this, and fail if the shape is wrong:

```js
const pluginsRoot = await window.hermesDesktop.desktopPluginsRoot()
const norm = String(pluginsRoot).replace(/\\/g, '/').replace(/\/+$/, '')
if (!norm.endsWith('/desktop-plugins')) {
  throw new Error('desktop plugins root is not under HERMES_HOME')
}
const worldsRoot = norm.slice(0, -'/desktop-plugins'.length) + '/worlds'
```

If `window.hermesDesktop` or `desktopPluginsRoot` is missing, set the page
error to “Desktop file bridge unavailable”. Do not fall back to `fetch`.

---

## Reads

Use only these preload methods:

| Call | Result |
|---|---|
| `readDir(dir)` | `{ entries: [{ name, path, isDirectory }], error? }` |
| `readFileText(file)` | `{ text, truncated? }` or `{ ok: false, error, message }` |
| `readFileDataUrl(file)` | a `data:` URL string, or `{ ok: false, error, message }` |

`readFileText` is the preview reader. It truncates at 512 KiB. If `truncated`
is true, or `ok` is false, treat that world as unreadable and skip it in the
list. `world.json` and `state.json` are small; a truncated read means the
wrong file.

Do not call `trashPath`. Do not call `window.hermesDesktop.api` to hit
`/api/plugins/hermes-worlds`. That still needs the dashboard process.
`writeTextFile` is allowed only for `<worldDir>/roster.json` (in place) and,
when a move is persisted, for a sibling `state.json.tmp` followed by
`renamePath` onto `state.json`. Do not point either call at `world.json`
or `profile.yaml`.

### List

`readDir(worldsRoot)`. For each entry that `isDirectory` and whose `name`
does not start with `.`:

1. Reject the name if it is empty, longer than 128 characters, starts with
   `.`, or contains `/`, `\`, or a null byte. Same rule as
   `_safe_world_id` in `dashboard/plugin_api.py`.
2. `readFileText(entry.path + '/world.json')`.
3. `JSON.parse` the text. Keep the row only when `schema === "worlds/v1"`.
4. Return `{ worlds: [{ id: entry.name, title, entrypoint: { place, greeter } }] }`,
   sorted by id. `title` falls back to the directory name.

A missing `worlds` directory is an empty list, not an error. A single bad
`world.json` is skipped.

### One world

Build the same object `read_world` returns, in the page:

- `id`, `title` (required non-empty string; otherwise skip)
- `entrypoint`: `{ place, greeter }`
- `places[]`: `{ id, name, art, connects, present }`. Keep `art` as the
  path string from the file. Do not turn it into `/api/plugins/...`.
- `cast[]` from `cast[]`, or from `characters[]` when `cast` is absent.
  `id = role || characters.id`. `isGreeter` when `role` equals
  `entrypoint.greeter`. Copy `name`, `home`, `avatar`, `memoryScope`,
  `capabilities`, `relationships`.
- `theme`: `{ palette, backdrop, mood }`. `backdrop` stays a path string.
- `rules`: `{ turnModel, handoff, maxPresent }`
- `widgetHints` from `render.widgetHints`
- `state`: see below

Skip the profile join (`profileName`). The stage does not draw it, and this
plugin must not scan `profiles/` or read `profile.yaml`.

### State

If `state.json` exists, parses, and `schema === "worlds/state/v1"`:

```js
{ place: data.place || fallback.place, where: data.where || {}, recent: data.recent || [] }
```

`where` must be an object. `recent` must be an array. Otherwise use the
default, matching `_default_state` in `plugin_api.py`:

- `place` is `entrypoint.place` when that id exists, else the first place id.
- `where[role]` is `cast.home` when that home is a place id, else the first
  place whose `present` includes the role.

An unreadable `state.json` (parse error, or `ok: false`) shows an error for
that world: “state.json unreadable”. Do not invent a roster of profiles.

### Assets

`useAsset` takes a path from the world file, plus the world directory.

- No path: render nothing.
- `http://` or `https://`: use the URL as `<img src>`. Do not `fetch` it.
- Anything else must be a relative path with no leading `/`, no null byte,
  and no `..` segment. Join it onto the world directory
  (`<worldDir>/assets/...`). If the joined path is not under that world
  directory, omit the image.
- `readFileDataUrl(absolutePath)`. A string result is the `<img src>`.
  An `{ ok: false }` result omits the image. Cache by absolute path.
- Do not use `hermes-media://`. That protocol only streams audio and video.

`widgetHints.showBackdrop === false` still skips the backdrop.

---

## Poll

Keep the existing 15 s poll and `selRef` stale-response check. `poll` calls
the directory reader instead of `apiList`. `loadView` calls the world reader
instead of `apiView`.

---

## Acceptance

1. Sidebar **Worlds** and the palette command still open `/hermes-worlds`.
2. Stop the dashboard process. With `fixtures/neon-harbor-world.json` at
   `~/.hermes/worlds/neon-harbor/world.json`, the page shows **Neon Harbor**,
   tabs **The Docks** and **The Workshop**, and Probe marked as greeter.
3. DevTools has no request to `127.0.0.1:9119`.
4. On The Docks, only cast whose `where` (or `present`) is `dock` stand in
   the picture. The other character is under Offstage.
5. Choosing The Workshop moves the occupants. `state.json` is unchanged.
6. A second world directory stays selected across two polls.
7. Missing images do not blank the page.
8. `pixel-worlds` and `mybot-farm` still load.

---

## Out of scope

- CORS headers on the dashboard, or a session token on the page `fetch`
- Rewriting `dashboard/plugin_api.py` or `dashboard/dist/index.js`
- Reading `profiles/` or `/api/profiles`
- Writing `world.json`, `state.json`, or `profile.yaml`
- `farm_plant` copying assets (mybot-farm repo)

---

## Commit

```text
fix: read planted worlds through the Desktop file bridge
```

Note in the message that the live copy is
`~/.hermes/desktop-plugins/hermes-worlds/plugin.js`.
