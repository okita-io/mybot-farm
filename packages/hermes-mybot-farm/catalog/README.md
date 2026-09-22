# Hermes Plugin Catalog submission (do not send from this PR)

Alex submits a PR to **NousResearch/hermes-agent** adding
`plugin-catalog/mybot-farm.yaml` after this farm PR merges and a public SHA exists.
Do **not** open that PR from the farm repo. Open catalog PR:
https://github.com/NousResearch/hermes-agent/pull/116414 — retarget `sha` +
`version: "0.3.0"` after tag `hermes-mybot-farm-v0.3.0`.

**Option A (this package):** keep `packages/hermes-mybot-farm` in okita-io/mybot-farm
and pin `subdir: packages/hermes-mybot-farm`. Catalog already supports subdir
(see `hermes-office.yaml`). A standalone public repo (Option B) is only needed
if the farm repo cannot be cloned over `https://`.

No self-updating code in this plugin. Updates are SHA-bump PRs on hermes-agent.

## GitHub Release checklist

After the farm PR merges to `main`:

```bash
git checkout main && git pull
git tag hermes-mybot-farm-v0.3.0
git push origin hermes-mybot-farm-v0.3.0
git rev-parse hermes-mybot-farm-v0.3.0
# → 40-hex; paste into sha: in mybot-farm.yaml (branches/tags are rejected)

# GitHub Release on that tag (catalog wants a real release, not only default branch):
gh release create hermes-mybot-farm-v0.3.0 \
  --title "hermes-mybot-farm 0.3.0" \
  --notes "Hermes mybot-farm plugin v0.3.0 — Desktop browse + one-click Recruit into the Bots roster; CLI search/plant/reinstall plus farm_post."
```

Then:

1. Confirm `https://github.com/okita-io/mybot-farm` is a public https clone.
2. Copy [mybot-farm.yaml](./mybot-farm.yaml), replace `sha` with the tag's 40-hex.
3. `hermes plugins validate packages/hermes-mybot-farm` at that pin (git Hermes; PyPI 0.19.0 has no `validate`).
4. Update NousResearch/hermes-agent PR #116414: `plugin-catalog/mybot-farm.yaml` only (`version: "0.3.0"`, new `sha`). Capabilities must match `plugin.yaml` / `register(ctx)`.

After that PR merges, users install:

```bash
hermes plugins install mybot-farm
hermes plugins enable mybot-farm
```

Then open Hermes Desktop → **Farm** → browse → **Recruit**.
