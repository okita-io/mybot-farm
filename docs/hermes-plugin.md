# Hermes plant plugin

Plant mybot.farm Hermes stalls into [Hermes Agent](https://hermes-agent.nousresearch.com/docs/user-guide/features/plugins) with the native `mybot-farm` plugin.

It calls live `https://mybot.farm/api/stalls` and `/api/packs/{slug}`, then `hermes profile import`. Team packs also recreate `~/.hermes/teams/<slug>`, fetch TEAM.md / WORK.md / cron, and create a kanban board when `shared.gettingStarted` says so.

This is the Hermes-side twin of [`packages/openclaw-mybot-farm`](../packages/openclaw-mybot-farm). OpenClaw writes `~/.openclaw/farm/<slug>`. Hermes writes **profiles + team dirs**.

Install page: [https://mybot.farm/install/hermes](https://mybot.farm/install/hermes)

## In short

- Plugin name: `mybot-farm` (`plugin.yaml`)
- Tools: `farm_search`, `farm_get_pack`, `farm_get_stall`, `farm_plant`, `farm_reinstall`
- Also: `hermes farm …` and `/farm`
- Does not email, spend money, invent pack fields, or delete live profiles unless `force` is true
- Plugins are opt-in: `hermes plugins enable mybot-farm`
- **GAP 2** (import looks successful, profile stays invisible): the plugin clears `~/.hermes/profiles/.deleted/<name>` before every import

## Install from a checkout

`hermes plugins install` takes a Git URL or `owner/repo[/subdir]`. It does **not** accept `./packages/hermes-mybot-farm` as a local path. From this repo:

```bash
mkdir -p ~/.hermes/plugins
ln -sfn "$(pwd)/packages/hermes-mybot-farm" ~/.hermes/plugins/mybot-farm
hermes plugins enable mybot-farm
```

Validate (current Hermes git has this subcommand; **PyPI `hermes-agent` 0.19.0 does not** — that CLI only has install/update/remove/list/enable/disable):

```bash
hermes plugins validate ./packages/hermes-mybot-farm
# if validate is missing:
python3 -m unittest discover -s packages/hermes-mybot-farm/tests -v
```

You should see tools: `farm_search`, `farm_get_pack`, `farm_get_stall`, `farm_plant`, `farm_reinstall`.

## Install from GitHub

The plugin is a subdirectory of the farm repo:

```bash
hermes plugins install okita-io/mybot-farm/packages/hermes-mybot-farm --enable
```

`--enable` skips the Enable now? prompt. Private clone uses your existing git credentials.

## Install from the public zip

`https://mybot.farm/downloads/hermes-mybot-farm-0.1.0.zip` is the plugin directory packed. Unzip into `~/.hermes/plugins/mybot-farm`, then enable:

```bash
mkdir -p ~/.hermes/plugins/mybot-farm
unzip hermes-mybot-farm-0.1.0.zip -d ~/.hermes/plugins/mybot-farm
hermes plugins enable mybot-farm
```

## Plant from CLI

No agent loop required:

```bash
python3 packages/hermes-mybot-farm/bin/farm-plant search workbench
python3 packages/hermes-mybot-farm/bin/farm-plant get scholastic-research
python3 packages/hermes-mybot-farm/bin/farm-plant stall workbench
python3 packages/hermes-mybot-farm/bin/farm-plant plant scholastic-research --dry-run
python3 packages/hermes-mybot-farm/bin/farm-plant plant scholastic-research
```

Confirm:

```bash
hermes profile list
```

Team plant (Workbench) imports three profiles, writes `~/.hermes/teams/workbench`, fetches team files, and runs `hermes kanban boards create workbench --name "Workbench team"` when the board is missing.

Env: `MYBOT_FARM_URL`, `HERMES_HOME`, `HERMES_BIN`.

## Reinstall and GAP 2

Hermes records profile deletion as `~/.hermes/profiles/.deleted/<name>`. `hermes profile import --name <same>` extracts files and prints success, but the profile stays off `profile list` and is not spawnable. Upstream import does not clear the tombstone.

This plugin always removes matching tombstones before import. After `force` deletes (which create new tombstones), it clears those too, then imports, then checks `hermes profile list`.

```bash
python3 packages/hermes-mybot-farm/bin/farm-plant reinstall workbench
python3 packages/hermes-mybot-farm/bin/farm-plant reinstall workbench --force          # delete live profiles of those names
python3 packages/hermes-mybot-farm/bin/farm-plant reinstall workbench --force --clean  # also wipe team dir + board
python3 packages/hermes-mybot-farm/scripts/clear-tombstones.py workbench-spec
```

`--force` and `--clean` are destructive. Default is safe: no live profile delete, no team/board wipe.

## Agent tools

Ask Hermes to call:

- `farm_search` with `{ "query": "workbench" }`
- `farm_get_stall` with `{ "slug": "workbench" }`
- `farm_get_pack` with `{ "slug": "workbench" }`
- `farm_plant` with `{ "slug": "scholastic-research" }` (optional `force`, `clean`, `dry_run`, `name`)
- `farm_reinstall` with `{ "slug": "workbench" }`

## Test notes

Non-destructive (no Hermes import):

```bash
python3 -m unittest discover -s packages/hermes-mybot-farm/tests -v
python3 packages/hermes-mybot-farm/bin/farm-plant search workbench
python3 packages/hermes-mybot-farm/bin/farm-plant get workbench
python3 packages/hermes-mybot-farm/bin/farm-plant plant scholastic-research --dry-run
python3 packages/hermes-mybot-farm/bin/farm-plant plant workbench --dry-run
```

A live plant of Scholastic Research is the small single-profile smoke (`hermes` on PATH). Workbench is the team smoke — three tarball imports + workspace + kanban. Prefer dry-run unless you mean to import.

If `hermes` is installed and new enough for `plugins validate`:

```bash
hermes plugins validate ./packages/hermes-mybot-farm
```

PyPI 0.19.0: skip that; the unittest probe above is the admission check (`register(ctx)` plus declared tools).

## Notes

- Source: [`packages/hermes-mybot-farm`](../packages/hermes-mybot-farm).
- Package copy: [`packages/hermes-mybot-farm/INSTALL.md`](../packages/hermes-mybot-farm/INSTALL.md).
- Team stall contract: [`hermes-team-stall-bundle.md`](./hermes-team-stall-bundle.md).
- GAF JSON packs stay on the OpenClaw plugin / Grok Bot path.
