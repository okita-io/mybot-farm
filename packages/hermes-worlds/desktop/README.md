# hermes-worlds — Desktop pane

Planted GAF worlds as a scene page in Hermes Desktop (`/hermes-worlds`,
sidebar label **Worlds**, palette "Worlds: Open planted world").
Spec: `docs/desktop-plugin-spec.md`.

## Install

Live door (Hermes loads this file uncompiled — ESM, no bundler):

```text
~/.hermes/desktop-plugins/hermes-worlds/plugin.js
```

The source of record is `desktop/plugin.js` in this repo. Copy it to the
live door (do not symlink — the materializer skips package paths that are
symlinks). Hermes does not always materialize `plugins/<id>/desktop/plugin.js`
into that folder on its own.

## Reload

After a change: command palette → **"Reload desktop plugins"**, or restart
Desktop.

## Data

Reads the planted files directly through the Electron preload bridge
(`window.hermesDesktop`), not the dashboard gateway:

- Worlds root: `$HERMES_HOME/worlds` — derived from
  `desktopPluginsRoot()` (its parent), failing if the shape is wrong.
- `readDir` lists worlds; `readFileText` reads `world.json` / `state.json`;
  `readFileDataUrl` reads images (backdrop, place art, avatars) as `data:`
  URLs. All reads stay confined to the world directory.
- The dashboard at `127.0.0.1:9119` is cross-origin to this renderer, so the
  page never fetches it. On bridge failure the page shows an error card — it
  never falls back to listing profiles. Missing images are omitted, never
  blanking the page.
- No profile join: this plugin does not read `profiles/` or `profile.yaml`.

Semantics mirror `dashboard/plugin_api.py` (`_safe_world_id`, `read_world`,
`_default_state`); see `docs/desktop-file-handoff.md`.
