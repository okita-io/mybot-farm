# Hermes plant plugin

Plant mybot.farm Hermes stalls into [Hermes Agent](https://hermes-agent.nousresearch.com/docs/user-guide/features/plugins) with the native `mybot-farm` plugin, and post GAF listings with a seller API key.

It calls live `https://mybot.farm/api/stalls` and `/api/packs/{slug}`, then `hermes profile import`. Team packs also recreate `~/.hermes/teams/<slug>`, fetch TEAM.md / WORK.md / cron, and create a kanban board when `shared.gettingStarted` says so. `farm_post` calls `POST /api/listings` with `Authorization: Bearer mbf_…`.

This is the Hermes-side twin of [`packages/openclaw-mybot-farm`](../packages/openclaw-mybot-farm). OpenClaw writes `~/.openclaw/farm/<slug>`. Hermes writes **profiles + team dirs**. OpenClaw `farm_post` is **not** in this PR — follow-up later.

Install page: [https://mybot.farm/install/hermes](https://mybot.farm/install/hermes)

## In short

- Plugin name: `mybot-farm` (`plugin.yaml`)
- Tools: `farm_search`, `farm_get_pack`, `farm_get_stall`, `farm_plant`, `farm_reinstall`, `farm_post`
- Also: `hermes farm …` and `/farm`
- Does not email, spend money, invent pack fields, or delete live profiles unless `force` is true
- Plugins are opt-in: `hermes plugins enable mybot-farm`
- **GAP 2** (import looks successful, profile stays invisible): the plugin clears `~/.hermes/profiles/.deleted/<name>` before every import
- **Post** publishes GAF JSON (not a Hermes tarball). Plant still imports `.tar.gz`. Seller key: `MYBOT_FARM_API_KEY` (see [api-keys.md](./api-keys.md)).

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

You should see tools: `farm_search`, `farm_get_pack`, `farm_get_stall`, `farm_plant`, `farm_reinstall`, `farm_post`.

## Install from GitHub

The plugin is a subdirectory of the farm repo:

```bash
hermes plugins install okita-io/mybot-farm/packages/hermes-mybot-farm --enable
```

`--enable` skips the Enable now? prompt. Private clone uses your existing git credentials.

## Install from the Plugin Catalog (after admission)

Once `plugin-catalog/mybot-farm.yaml` is merged into [NousResearch/hermes-agent](https://github.com/NousResearch/hermes-agent/blob/main/plugin-catalog/README.md), current Hermes installs by catalog name (SHA-pinned):

```bash
hermes plugins install mybot-farm
hermes plugins enable mybot-farm
```

That PR is **not** opened from this repo. Draft entry + GitHub Release checklist: [`packages/hermes-mybot-farm/catalog/`](../packages/hermes-mybot-farm/catalog/). Gates: public `https://` clone, tag/release `hermes-mybot-farm-v0.2.0`, paste the 40-hex SHA, `hermes plugins validate` clean, capabilities match `plugin.yaml`. Catalog `requires_hermes: ">=0.21"`.

## Install from the public zip

`https://mybot.farm/downloads/hermes-mybot-farm-0.2.0.zip` is the plugin directory packed. Unzip into `~/.hermes/plugins/mybot-farm`, then enable:

```bash
mkdir -p ~/.hermes/plugins/mybot-farm
unzip hermes-mybot-farm-0.2.0.zip -d ~/.hermes/plugins/mybot-farm
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
python3 packages/hermes-mybot-farm/bin/farm-plant post --kind agent --name "Smoke Bot" \
  --title "API key smoke listing" --description "Minimal free GAF listing." \
  --category Experimental --price-cents 0 --pack ./smoke.gaf.json --dry-run
```

Confirm:

```bash
hermes profile list
```

Team plant (Workbench) imports three profiles, writes `~/.hermes/teams/workbench`, fetches team files, and runs `hermes kanban boards create workbench --name "Workbench team"` when the board is missing.

Env: `MYBOT_FARM_URL`, `MYBOT_FARM_API_KEY`, `HERMES_HOME`, `HERMES_BIN`.

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

## Post a listing (`farm_post`)

Publish a stall with a seller API key from [https://mybot.farm/sell](https://mybot.farm/sell). Env `MYBOT_FARM_API_KEY` wins over plugin config `apiKey`. Optional tool/CLI `apiKey` is a per-call override. Never commit or log the key. Contract: [api-keys.md](./api-keys.md).

`farm_post` expects **GAF JSON** (`pack` object or `packPath` / `--pack` to a `.json` file). It does not translate a Hermes profile directory or scrubbed tarball. Scrub with `scripts/scrub.py` before sharing an archive; convert to GAF elsewhere (`docs/generic-agent-format.md` / `toGAF`). Plant remains the Hermes-tarball import path.

```bash
export MYBOT_FARM_API_KEY=mbf_YOUR_KEY
python3 packages/hermes-mybot-farm/bin/farm-plant post \
  --kind agent --name "Smoke Bot" --title "API key smoke listing" \
  --description "Minimal free GAF listing posted with a seller API key." \
  --category Experimental --price-cents 0 --pack ./smoke.gaf.json --dry-run
python3 packages/hermes-mybot-farm/bin/farm-plant post \
  --kind agent --name "Smoke Bot" --title "API key smoke listing" \
  --description "Minimal free GAF listing posted with a seller API key." \
  --category Experimental --price-cents 0 --pack ./smoke.gaf.json
```

Human-readable success prints the slug and `https://mybot.farm{pagePath}`. `--json` prints the machine payload. `--dry-run` validates locally (category/price/pack) and redacts the key.

Free listings (`priceCents: 0`) skip Stripe Connect. Paid (`200`–`999900`) need Connect transfers active (`403 connect_required` otherwise). `category` is an exact taxonomy **label** (`Lifestyle`, `Coding`, `Experimental`, `Personal finance`, `Ops / admin`, …).

## Agent tools

Ask Hermes to call:

- `farm_search` with `{ "query": "workbench" }`
- `farm_get_stall` with `{ "slug": "workbench" }`
- `farm_get_pack` with `{ "slug": "workbench" }`
- `farm_plant` with `{ "slug": "scholastic-research" }` (optional `force`, `clean`, `dry_run`, `name`)
- `farm_reinstall` with `{ "slug": "workbench" }`
- `farm_post` with `{ "kind", "name", "title", "description", "category", "priceCents", "pack" | "packPath" }` (optional `dryRun`, `apiKey`)

## Test notes

Non-destructive (no Hermes import):

```bash
python3 -m unittest discover -s packages/hermes-mybot-farm/tests -v
python3 packages/hermes-mybot-farm/bin/farm-plant search workbench
python3 packages/hermes-mybot-farm/bin/farm-plant get workbench
python3 packages/hermes-mybot-farm/bin/farm-plant plant scholastic-research --dry-run
python3 packages/hermes-mybot-farm/bin/farm-plant plant workbench --dry-run
python3 packages/hermes-mybot-farm/bin/farm-plant post --kind agent --name "Smoke Bot" \
  --title "API key smoke listing" --description "Minimal free GAF listing." \
  --category Experimental --price-cents 0 --pack ./smoke.gaf.json --dry-run
```

A live plant of Scholastic Research is the small single-profile smoke (`hermes` on PATH). Workbench is the team smoke — three tarball imports + workspace + kanban. Prefer dry-run unless you mean to import.

If `hermes` is installed and new enough for `plugins validate`:

```bash
hermes plugins validate ./packages/hermes-mybot-farm
```

PyPI 0.19.0: skip that; the unittest probe above is the admission check (`register(ctx)` plus declared tools).

## Notes

- Source: [`packages/hermes-mybot-farm`](../packages/hermes-mybot-farm).
- Catalog draft (NousResearch/hermes-agent, after tag): [`packages/hermes-mybot-farm/catalog/`](../packages/hermes-mybot-farm/catalog/).
- Package copy: [`packages/hermes-mybot-farm/INSTALL.md`](../packages/hermes-mybot-farm/INSTALL.md).
- Team stall contract: [`hermes-team-stall-bundle.md`](./hermes-team-stall-bundle.md).
- Seller keys / write API: [`api-keys.md`](./api-keys.md).
- GAF JSON plant (into a workspace) stays on the OpenClaw plugin / Grok Bot path. Hermes `farm_post` *publishes* GAF to the farm; OpenClaw `farm_post` is a follow-up.
