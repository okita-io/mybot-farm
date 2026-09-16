# Install mybot.farm → Hermes

Plant Hermes packs from [mybot.farm](https://mybot.farm) and post GAF listings with the `mybot-farm` plugin (v0.2.0).

You need [Hermes Agent](https://hermes-agent.nousresearch.com/docs/getting-started/installation) so `hermes profile import` exists.

## 1. Install the plugin

### From a repo checkout (recommended)

`hermes plugins install` does **not** take a local directory path. Symlink into the user plugin dir, then enable (plugins are opt-in):

```bash
mkdir -p ~/.hermes/plugins
ln -sfn /path/to/mybot-farm/packages/hermes-mybot-farm ~/.hermes/plugins/mybot-farm
hermes plugins enable mybot-farm
```

Or copy the folder instead of linking.

### From GitHub

This plugin lives in a subdirectory of the farm repo:

```bash
hermes plugins install okita-io/mybot-farm/packages/hermes-mybot-farm --enable
```

`--enable` skips the Enable now? prompt. Omit it to leave the plugin disabled.

A zip of the plugin dir is at `https://mybot.farm/downloads/hermes-mybot-farm-0.2.0.zip`. Unzip into `~/.hermes/plugins/mybot-farm`, then `hermes plugins enable mybot-farm`.

### From the Plugin Catalog (after admission)

```bash
hermes plugins install mybot-farm
hermes plugins enable mybot-farm
```

Needs a merged `plugin-catalog/mybot-farm.yaml` in hermes-agent. Draft + tag checklist: `catalog/` in this package. The farm repo must be public `https://` cloneable; pin `subdir: packages/hermes-mybot-farm`.

## 2. Validate

Current Hermes git:

```bash
hermes plugins validate /path/to/mybot-farm/packages/hermes-mybot-farm
```

PyPI `hermes-agent` 0.19.0 has no `validate` subcommand. Use the unittest probe instead:

```bash
python3 -m unittest discover -s /path/to/mybot-farm/packages/hermes-mybot-farm/tests -v
```

You should see tools: `farm_search`, `farm_get_pack`, `farm_get_stall`, `farm_plant`, `farm_reinstall`, `farm_post`, `farm_update`.

## 3. Plant (CLI, no agent loop)

```bash
python3 /path/to/mybot-farm/packages/hermes-mybot-farm/bin/farm-plant search scholastic
python3 /path/to/mybot-farm/packages/hermes-mybot-farm/bin/farm-plant plant scholastic-research --dry-run
python3 /path/to/mybot-farm/packages/hermes-mybot-farm/bin/farm-plant plant scholastic-research
```

Confirm: `hermes profile list` shows `scholastic-research`.

Team smoke (Workbench): dry-run first. A live plant imports three profiles, writes `~/.hermes/teams/workbench`, fetches TEAM.md/WORK.md/cron, and runs `hermes kanban boards create workbench --name "Workbench team"` when missing.

Plant imports **Hermes tarballs**. Posting to the farm uses **GAF JSON** (next section).

## 4. Post a listing

Create a seller API key at [https://mybot.farm/sell](https://mybot.farm/sell). Prefer env `MYBOT_FARM_API_KEY` (plugin config `apiKey` is the fallback). Never commit the key. Details: [`docs/api-keys.md`](../../docs/api-keys.md).

```bash
export MYBOT_FARM_API_KEY=mbf_YOUR_KEY
python3 /path/to/mybot-farm/packages/hermes-mybot-farm/bin/farm-plant post \
  --kind agent --name "Smoke Bot" --title "API key smoke listing" \
  --description "Minimal free GAF listing posted with a seller API key." \
  --category Experimental --price-cents 0 --pack ./smoke.gaf.json --dry-run
python3 /path/to/mybot-farm/packages/hermes-mybot-farm/bin/farm-plant post \
  --kind agent --name "Smoke Bot" --title "API key smoke listing" \
  --description "Minimal free GAF listing posted with a seller API key." \
  --category Experimental --price-cents 0 --pack ./smoke.gaf.json
```

`--pack` is a `.json` GAF file. Free listings (`priceCents` / `--price-cents 0`) do not need Stripe Connect. Paid listings (`200`–`999900`) return `403 connect_required` until payouts are active. Category is an exact farm label (`Lifestyle`, `Coding`, `Experimental`, …).

This plugin does not convert a Hermes profile tarball into GAF. Scrub archives with `scripts/scrub.py` before sharing; `farm_post` still expects GAF JSON (export/convert elsewhere).

## 5. Reinstall / GAP 2

```bash
python3 /path/to/mybot-farm/packages/hermes-mybot-farm/bin/farm-plant reinstall workbench
# existing live profiles: add --force (deletes those names, then clears tombstones, then imports)
# also wipe team dir + board: add --clean
python3 /path/to/mybot-farm/packages/hermes-mybot-farm/scripts/clear-tombstones.py
```

`--force` and `--clean` are destructive. Default is safe.

## 6. Use from an agent

Ask Hermes to call:

- `farm_search` with `{ "query": "workbench" }`
- `farm_get_stall` with `{ "slug": "workbench" }`
- `farm_get_pack` with `{ "slug": "workbench" }`
- `farm_plant` with `{ "slug": "scholastic-research" }` or `{ "slug": "workbench" }`
- `farm_reinstall` with `{ "slug": "workbench", "force": true }` when upgrading
- `farm_post` with listing fields + `pack` or `packPath` (optional `slug`, `packVersion`, `dryRun`, `apiKey`)
- `farm_update` with the same fields plus required `slug`

Also: `hermes farm search workbench`, `/farm plant scholastic-research`, `/farm post --kind agent … --pack pack.json`.

## Notes

- Does not email, spend money, or invent pack fields.
- Does not plant GAF JSON into Hermes (OpenClaw / Grok Bot packs stay on the OpenClaw plugin). `farm_post` *publishes* GAF to the farm.
- Override API origin with `MYBOT_FARM_URL`. Seller key: `MYBOT_FARM_API_KEY`.
- OpenClaw `farm_post` is not in this plugin; that is a later follow-up.
