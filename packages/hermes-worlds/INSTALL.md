# Install hermes-worlds

Shows a planted mybot.farm world as a scene: places, cast, backdrop, and
avatars. This is a separate plugin from the agent tools (`mybot-farm`).
Recruit and `farm_plant` still come from that plugin. This one only draws
worlds that are already on disk at `~/.hermes/worlds/<slug>/`.

Manifest version: **1.1.0** (`dashboard/manifest.json`).

You need [Hermes Agent](https://hermes-agent.nousresearch.com/docs/getting-started/installation) with the dashboard (and Hermes Desktop if you want the Worlds page).

## 1. Dashboard scene

`hermes plugins install` is for tool plugins that ship a `plugin.yaml`. This
package does not. The dashboard finds it by scanning
`~/.hermes/plugins/*/dashboard/manifest.json`.

From the public zip:

```bash
curl -LO https://mybot.farm/downloads/hermes-worlds-1.1.0.zip
mkdir -p ~/.hermes/plugins/hermes-worlds
unzip hermes-worlds-1.1.0.zip -d ~/.hermes/plugins/hermes-worlds
curl -X POST http://127.0.0.1:9119/api/dashboard/plugins/rescan
```

From a checkout of this repo:

```bash
mkdir -p ~/.hermes/plugins
ln -sfn "$(pwd)/packages/hermes-worlds" ~/.hermes/plugins/hermes-worlds
curl -X POST http://127.0.0.1:9119/api/dashboard/plugins/rescan
```

Open the dashboard tab **Crew Worlds** (`/hermes-worlds`). Restart the
dashboard process if the rescan does not pick up `plugin_api.py`.

## 2. Hermes Desktop page

Copy the desktop file to the live door. A symlink of the package folder is
not enough: Desktop skips materializing `desktop/plugin.js` when the package
path is a symlink.

```bash
mkdir -p ~/.hermes/desktop-plugins/hermes-worlds
cp packages/hermes-worlds/desktop/plugin.js ~/.hermes/desktop-plugins/hermes-worlds/plugin.js
```

If you installed from the zip, `packages/hermes-worlds/` above is
`~/.hermes/plugins/hermes-worlds/`.

Reload with ⌘K → **Reload desktop plugins**. Sidebar **Worlds**, or ⌘K →
**Worlds: Open planted world**.

The Desktop page reads `world.json`, `state.json`, and images through the
Electron file bridge. It does not call the dashboard on port 9119, so the
scene still draws when that process is stopped.

## 3. What it draws

Plant a world-pack with the `mybot-farm` plugin (`farm_plant`). That writes
`~/.hermes/worlds/<slug>/world.json`. This plugin does not write that file,
and place tabs do not write `state.json`.

Optional fixture:

```bash
mkdir -p ~/.hermes/worlds/neon-harbor
cp packages/hermes-worlds/fixtures/neon-harbor-world.json ~/.hermes/worlds/neon-harbor/world.json
```

Images are files next to `world.json` (usually `assets/`). A missing image is
left out of the picture. The page does not list Hermes profiles.
