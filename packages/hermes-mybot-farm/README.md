# mybot.farm → Hermes

Native [Hermes Agent](https://hermes-agent.nousresearch.com/docs/user-guide/features/plugins) plugin that searches [mybot.farm](https://mybot.farm) and plants Hermes packs into **profiles + team dirs** (not OpenClaw farm workspaces).

Install page: [https://mybot.farm/install/hermes](https://mybot.farm/install/hermes)

## What it does

| Tool | Purpose |
|------|---------|
| `farm_search` | `GET /api/stalls?q=` — matching stalls (slug, kind, title, URLs) |
| `farm_get_pack` | `GET /api/packs/{slug}` — GAF JSON: members, skills, `shared.gettingStarted` |
| `farm_get_stall` | `GET /api/stalls/{slug}` — stall metadata **including member tarball hrefs** |
| `farm_plant` | Download + `hermes profile import`. Teams: member tarballs, `~/.hermes/teams/<slug>`, TEAM.md/WORK.md/cron, kanban board if gettingStarted says so |
| `farm_reinstall` | GAP 2 clean path: clear `~/.hermes/profiles/.deleted/<name>` tombstones, optionally wipe old profiles/team/board, then plant again and verify `hermes profile list` |

Default is **safe**. Live profiles are never deleted unless `force` is true. Team dir and kanban board are never wiped unless `clean` is true. Tombstones (leftover delete markers, not live agents) are always cleared before import.

## Install (from a checkout)

`hermes plugins install` takes a Git URL or `owner/repo[/subdir]`, not a local folder. From this repo:

```bash
mkdir -p ~/.hermes/plugins
ln -sfn "$(pwd)/packages/hermes-mybot-farm" ~/.hermes/plugins/mybot-farm
hermes plugins enable mybot-farm
```

GitHub (private repo needs your git credentials). Subdir is required — this plugin is not at the repo root:

```bash
hermes plugins install okita-io/mybot-farm/packages/hermes-mybot-farm --enable
```

Validate. Current Hermes git has `hermes plugins validate <dir>`. PyPI `hermes-agent` 0.19.0 does not (only install/list/enable/disable):

```bash
hermes plugins validate ./packages/hermes-mybot-farm
python3 -m unittest discover -s packages/hermes-mybot-farm/tests -v
```

## CLI smoke (no agent loop)

```bash
python3 packages/hermes-mybot-farm/bin/farm-plant search workbench
python3 packages/hermes-mybot-farm/bin/farm-plant get scholastic-research
python3 packages/hermes-mybot-farm/bin/farm-plant stall workbench
python3 packages/hermes-mybot-farm/bin/farm-plant plant scholastic-research --dry-run
python3 packages/hermes-mybot-farm/bin/farm-plant clear-tombstones
```

A full import of Scholastic Research (one profile) or Workbench (three + board) needs `hermes` on PATH. Prefer `--dry-run` first.

Env: `MYBOT_FARM_URL`, `HERMES_HOME`, `HERMES_BIN`.

## GAP 2

After `hermes profile delete <name>`, Hermes leaves `~/.hermes/profiles/.deleted/<name>`. Import of the same name extracts files and prints success, but the profile stays off `hermes profile list` / non-spawnable. This plugin clears matching tombstones before every import (and after `force` deletes, which create new ones). Standalone:

```bash
python3 packages/hermes-mybot-farm/scripts/clear-tombstones.py workbench-spec
```

## License

MIT. Pack content keeps upstream attribution from each GAF manifest.
