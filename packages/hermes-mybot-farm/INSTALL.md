# Install mybot.farm → Hermes

Plant Hermes packs from [mybot.farm](https://mybot.farm) with the `mybot-farm` plugin.

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

A zip of the plugin dir is at `https://mybot.farm/downloads/hermes-mybot-farm-0.1.0.zip`. Unzip into `~/.hermes/plugins/mybot-farm`, then `hermes plugins enable mybot-farm`.

## 2. Validate

Current Hermes git:

```bash
hermes plugins validate /path/to/mybot-farm/packages/hermes-mybot-farm
```

PyPI `hermes-agent` 0.19.0 has no `validate` subcommand. Use the unittest probe instead:

```bash
python3 -m unittest discover -s /path/to/mybot-farm/packages/hermes-mybot-farm/tests -v
```

You should see tools: `farm_search`, `farm_get_pack`, `farm_get_stall`, `farm_plant`, `farm_reinstall`.

## 3. Plant (CLI, no agent loop)

```bash
python3 /path/to/mybot-farm/packages/hermes-mybot-farm/bin/farm-plant search scholastic
python3 /path/to/mybot-farm/packages/hermes-mybot-farm/bin/farm-plant plant scholastic-research --dry-run
python3 /path/to/mybot-farm/packages/hermes-mybot-farm/bin/farm-plant plant scholastic-research
```

Confirm: `hermes profile list` shows `scholastic-research`.

Team smoke (Workbench): dry-run first. A live plant imports three profiles, writes `~/.hermes/teams/workbench`, fetches TEAM.md/WORK.md/cron, and runs `hermes kanban boards create workbench --name "Workbench team"` when missing.

## 4. Reinstall / GAP 2

```bash
python3 /path/to/mybot-farm/packages/hermes-mybot-farm/bin/farm-plant reinstall workbench
# existing live profiles: add --force (deletes those names, then clears tombstones, then imports)
# also wipe team dir + board: add --clean
python3 /path/to/mybot-farm/packages/hermes-mybot-farm/scripts/clear-tombstones.py
```

`--force` and `--clean` are destructive. Default is safe.

## 5. Use from an agent

Ask Hermes to call:

- `farm_search` with `{ "query": "workbench" }`
- `farm_get_stall` with `{ "slug": "workbench" }`
- `farm_get_pack` with `{ "slug": "workbench" }`
- `farm_plant` with `{ "slug": "scholastic-research" }` or `{ "slug": "workbench" }`
- `farm_reinstall` with `{ "slug": "workbench", "force": true }` when upgrading

Also: `hermes farm search workbench` and `/farm plant scholastic-research`.

## Notes

- Does not email, spend money, or invent pack fields.
- Does not plant GAF JSON (OpenClaw / Grok Bot packs). Those stay on the OpenClaw plugin.
- Override API origin with `MYBOT_FARM_URL`.
