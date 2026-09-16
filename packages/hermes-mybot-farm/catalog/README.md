# Hermes Plugin Catalog submission (do not send from this PR)

Alex submits a PR to **NousResearch/hermes-agent** adding
`plugin-catalog/mybot-farm.yaml` after this farm PR merges and a public SHA exists.
Do **not** open that PR from the farm repo.

Layout: keep the plugin at `packages/hermes-mybot-farm` (catalog `subdir`). A
standalone public repo is only needed if the farm repo cannot be cloned over
`https://` (catalog admission requires a public clone).

## Release checklist

```bash
git checkout main && git pull
git tag hermes-mybot-farm-v0.1.0
git push origin hermes-mybot-farm-v0.1.0
git rev-parse hermes-mybot-farm-v0.1.0   # paste 40-hex into sha:
```

Confirm `https://github.com/okita-io/mybot-farm` is public, copy
[mybot-farm.yaml](./mybot-farm.yaml), replace `sha`, run `hermes plugins validate`
at that pin if the CLI has `validate`, then PR the YAML to hermes-agent.

After merge, users install:

```bash
hermes plugins install mybot-farm
hermes plugins enable mybot-farm
```
