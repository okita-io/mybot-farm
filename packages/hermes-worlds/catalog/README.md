# Hermes Plugin Catalog submission (do not send until the tag exists)

Alex submits a PR to **NousResearch/hermes-agent** adding
`plugin-catalog/hermes-worlds.yaml` after this package is on public `main`
and tag `hermes-worlds-v1.1.0` exists. Do **not** open that PR from the farm
repo, and do not retarget the merged mybot-farm catalog PR
(#116414). This is a new entry, same shape as
[pixel-worlds](https://github.com/NousResearch/hermes-agent/blob/main/plugin-catalog/pixel-worlds.yaml):
`category: desktop`, no tools.

**Layout:** `packages/hermes-worlds` stays in okita-io/mybot-farm with
`subdir: packages/hermes-worlds`.

No self-updating code. Updates are SHA-bump PRs on hermes-agent.

## GitHub Release checklist

After the farm changes are on `main`:

```bash
git checkout main && git pull
git tag hermes-worlds-v1.1.0
git push origin hermes-worlds-v1.1.0
git rev-parse hermes-worlds-v1.1.0
# → 40-hex; paste into sha: in hermes-worlds.yaml (branches/tags are rejected)

gh release create hermes-worlds-v1.1.0 \
  --title "hermes-worlds 1.1.0" \
  --notes "Hermes worlds scene v1.1.0 — dashboard pane and Desktop page for planted mybot.farm worlds. No tools."
```

Then:

1. Confirm `https://github.com/okita-io/mybot-farm` is a public https clone.
2. Copy [hermes-worlds.yaml](./hermes-worlds.yaml), replace the placeholder `sha` with the tag's 40-hex.
3. `hermes plugins validate packages/hermes-worlds` at that pin.
4. Open a PR on NousResearch/hermes-agent that adds only `plugin-catalog/hermes-worlds.yaml`. Capabilities must stay empty, matching `register()`.

After that PR merges, users install:

```bash
hermes plugins install hermes-worlds
```

The dashboard still discovers `dashboard/manifest.json`. Rescan, then copy or
link `desktop/plugin.js` into `~/.hermes/desktop-plugins/hermes-worlds/`.
A package path that is a symlink is not auto-materialized into that door.
