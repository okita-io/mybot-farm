# Hermes plant plugin

Plant mybot.farm Hermes stalls into [Hermes Agent](https://hermes-agent.nousresearch.com/docs/user-guide/features/plugins) with the native `mybot-farm` plugin (v0.3.0). Headline path: **enable the plugin → open Hermes Desktop → browse → Recruit** into the Bots roster. CLI still plants, reinstalls, and posts GAF listings with a seller API key.

It calls live `https://mybot.farm/api/stalls` and `/api/packs/{slug}`, then `hermes profile import`. Team packs also recreate `~/.hermes/teams/<slug>`, fetch TEAM.md / WORK.md / cron, mark members as Bots (`ui_meta.hermes-bots`), install the team-rules skill, and create a group chat when a gateway RPC URL is set. `farm_post` calls `POST /api/listings` with `Authorization: Bearer mbf_…`.

This is the Hermes-side twin of [`packages/openclaw-mybot-farm`](../packages/openclaw-mybot-farm). OpenClaw writes `~/.openclaw/farm/<slug>`. Hermes writes **profiles + team dirs**. Both plugins implement `farm_post` (GAF + seller API key).

Install page: [https://mybot.farm/install/hermes](https://mybot.farm/install/hermes)

## In short

- Plugin name: `mybot-farm` (`plugin.yaml` **0.3.0**)
- Headline: Hermes Desktop sidebar **Farm** (⌘K `mybot.farm: Open catalog`) → browse stalls → **Recruit**
- Solo Recruit stamps `ui_meta.hermes-bots` so the agent lands in the Desktop **Bots roster**. Teams plant as Bots as usual.
- Tools: `farm_search`, `farm_get_pack`, `farm_get_stall`, `farm_plant`, `farm_reinstall`, `farm_post`, `farm_update`
- Also: `hermes farm …` and `/farm`
- Does not email, spend money, invent pack fields, or delete live profiles unless `force` is true
- Plugins are opt-in: `hermes plugins enable mybot-farm`
- **GAP 2** (import looks successful, profile stays invisible): the plugin clears `~/.hermes/profiles/.deleted/<name>` before every import
- **Post** publishes GAF JSON (not a Hermes tarball). Plant still imports `.tar.gz`. Seller key: `MYBOT_FARM_API_KEY` (see [api-keys.md](./api-keys.md)).
- **Worlds ship unpopulated** (`MIN_WORLD_CAST = 0`): `farm_plant` installs a `world-pack` as an empty stage — places + art, no cast. The downloader populates it with their own agents via `roster.json` (`worlds/roster/v1`), written by the Hermes Desktop Worlds page; the dashboard is read-only for it. See [Worlds scene](#worlds-scene).

## Install from a checkout

`hermes plugins install` takes a Git URL or `owner/repo[/subdir]`. It does **not** accept `./packages/hermes-mybot-farm` as a local path. From this repo:

```bash
mkdir -p ~/.hermes/plugins
ln -sfn "$(pwd)/packages/hermes-mybot-farm" ~/.hermes/plugins/mybot-farm
hermes plugins enable mybot-farm
```

Then open Hermes Desktop → **Farm** → browse → **Recruit**. Copy the folder instead of linking if you want Desktop to auto-materialize `desktop/plugin.js`; a symlink needs `~/.hermes/desktop-plugins/mybot-farm/plugin.js`.

Validate (current Hermes git has this subcommand; **PyPI `hermes-agent` 0.19.0 does not** — that CLI only has install/update/remove/list/enable/disable):

```bash
hermes plugins validate ./packages/hermes-mybot-farm
# if validate is missing:
python3 -m unittest discover -s packages/hermes-mybot-farm/tests -v
```

You should see tools: `farm_search`, `farm_get_pack`, `farm_get_stall`, `farm_plant`, `farm_reinstall`, `farm_post`, `farm_update`.

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

That PR is **not** opened from this repo. Draft entry + GitHub Release checklist: [`packages/hermes-mybot-farm/catalog/`](../packages/hermes-mybot-farm/catalog/). Gates: public `https://` clone, tag/release `hermes-mybot-farm-v0.3.0`, paste the 40-hex SHA, `hermes plugins validate` clean, capabilities match `plugin.yaml`. Catalog `requires_hermes: ">=0.21"`. Open catalog PR #116414 — retarget `sha` + `version: "0.3.0"` after the tag.

## Install from the public zip

`https://mybot.farm/downloads/hermes-mybot-farm-0.3.0.zip` is the plugin directory packed after the v0.3.0 tag (not in-tree). Unzip into `~/.hermes/plugins/mybot-farm`, then enable:

```bash
mkdir -p ~/.hermes/plugins/mybot-farm
unzip hermes-mybot-farm-0.3.0.zip -d ~/.hermes/plugins/mybot-farm
hermes plugins enable mybot-farm
```

## Recruit from Hermes Desktop

Headline path after enable: sidebar **Farm** (or ⌘K → `mybot.farm: Open catalog`). Search, filter All / Agents / Teams, open a stall, **Recruit**. Solo agents pass `recruit: true` to `farm_plant` and land in the Desktop Bots roster. Teams plant as Bots as usual. **Page** opens the listing on the farm. Plant-as-plain-profile and Replant stay on the CLI / tools.

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

Publish a stall with a seller API key from [https://mybot.farm/sell](https://mybot.farm/sell). Env `MYBOT_FARM_API_KEY` wins over plugin config `apiKey`. Never pass a key in tool arguments (the model cannot supply `apiKey`). Never commit or log the key. Contract: [api-keys.md](./api-keys.md).

`farm_post` expects **GAF JSON** (`pack` object or `packPath` / `--pack` to a `.json` file). It does not translate a Hermes profile directory or scrubbed tarball. Scrub with `scripts/scrub.py` before sharing an archive; convert to GAF elsewhere (`docs/generic-agent-format.md` / `toGAF`). Plant remains the Hermes-tarball import path.

```bash
export MYBOT_FARM_API_KEY=mbf_YOUR_KEY
python3 packages/hermes-mybot-farm/bin/farm-plant post \
  --kind agent --name "Smoke Bot" --title "API key smoke listing" \
  --description "Minimal free GAF listing posted with a seller API key." \
  --category Experimental --price-cents 0 --pack ./smoke.gaf.json --dry-run
python3 packages/hermes-mybot-farm/bin/farm-plant post \
  --kind team --name "Smoke Crew" --title "Two-agent smoke team" \
  --description "Minimal free team listing posted with a seller API key." \
  --category Experimental --price-cents 0 --pack ./smoke-crew.gaf.json --dry-run
python3 packages/hermes-mybot-farm/bin/farm-plant post \
  --kind agent --name "Smoke Bot" --title "API key smoke listing" \
  --description "Minimal free GAF listing posted with a seller API key." \
  --category Experimental --price-cents 0 --pack ./smoke.gaf.json
```

Human-readable success prints the slug and `https://mybot.farm{pagePath}` (`/agents/…` or `/teams/…`). `--json` prints the machine payload (`id`, `stallId`, `packVersion`, `updated`). `--dry-run` validates locally (category/price/pack, including team `members[]`) and redacts the key.

`kind: "team"` requires `format: "mybot.farm/team-pack"` and at least two `members[]`. Each member needs `role`, `summary`, and `pack` (catalog path such as `agents/patch.json`, a slug, a `.hermes.tar.gz` URL, or a nested agent-pack). Hermes plant of a posted team works when those member refs resolve to existing catalog tarballs. The plugin does not upload binaries.

If you already own that slug, `farm_post` **updates the same stall** (skills, soul/memory, other GAF fields) and bumps `packVersion`. Omit `packVersion` to auto-increment. The farm commits the pack to `okita-io/mybot-farm-catalog` and appends a revision (`GET /api/stalls/{slug}/revisions`). Pass `--slug` / `slug` to target it, or `farm_update` which requires the slug. Catalog stalls cannot be overwritten (`409 catalog_reserved`).

Free listings (`priceCents: 0`) skip Stripe Connect. Paid (`200`–`999900`) need Connect transfers active (`403 connect_required` otherwise). `category` is an exact taxonomy **label** (`Lifestyle`, `Coding`, `Experimental`, `Personal finance`, `Ops / admin`, …).

## Agent tools

Ask Hermes to call:

- `farm_search` with `{ "query": "workbench" }`
- `farm_get_stall` with `{ "slug": "workbench" }`
- `farm_get_pack` with `{ "slug": "workbench" }`
- `farm_plant` with `{ "slug": "scholastic-research" }` (optional `force`, `clean`, `dry_run`, `name`, `recruit`)
- `farm_reinstall` with `{ "slug": "workbench" }`
- `farm_post` with `{ "kind", "name", "title", "description", "category", "priceCents", "pack" | "packPath" }` (optional `slug`, `packVersion`, `dryRun`; auth is env/config only)
- `farm_update` with the same fields as `farm_post` plus required `slug`

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
python3 packages/hermes-mybot-farm/bin/farm-plant post --kind team --name "Smoke Crew" \
  --title "Two-agent smoke team" --description "Minimal free team listing." \
  --category Experimental --price-cents 0 --pack ./smoke-crew.gaf.json --dry-run
```

A live plant of Scholastic Research is the small single-profile smoke (`hermes` on PATH). Workbench is the team smoke — three tarball imports + workspace + kanban. Prefer dry-run unless you mean to import.

If `hermes` is installed and new enough for `plugins validate`:

```bash
hermes plugins validate ./packages/hermes-mybot-farm
```

PyPI 0.19.0: skip that; the unittest probe above is the admission check (`register(ctx)` plus declared tools).

## Worlds scene

`packages/hermes-worlds` draws a planted world. It is not part of the `mybot-farm` tool plugin. `plugin.yaml` exists so the catalog can list it; `register()` adds no tools. `farm_plant` writes `~/.hermes/worlds/<slug>/world.json` + `WORLD.md` + same-origin `assets/**`; this package reads them.

**Worlds ship unpopulated.** The reference pack (`neon-harbor`) has places + art but an empty cast; the downloader fills the stage with their own agents. Population is per-owner in `~/.hermes/worlds/<slug>/roster.json` (`worlds/roster/v1`), written only by the Hermes Desktop Worlds page (Electron `writeTextFile` bridge, capped at `rules.maxPresent`); the dashboard `plugin_api.py` applies it (`_apply_roster`, `rosterOwned: true`) but is read-only. When `roster.json` is valid it is authoritative — pack cast is not shown, `state.where` derives from the roster. Re-planting updates `world.json`/assets but never touches `roster.json`. See `packages/hermes-worlds/README.md` (Layer 2b+) for the data model.

A checkout stays live by linking the package into the Hermes plugins dir:

```bash
ln -sfn "$(pwd)/packages/hermes-worlds" ~/.hermes/plugins/hermes-worlds
ln -sfn "$(pwd)/packages/hermes-worlds/desktop/plugin.js" \
  ~/.hermes/desktop-plugins/hermes-worlds/plugin.js
```

Catalog draft (submit after tag `hermes-worlds-v1.1.0`): [`packages/hermes-worlds/catalog/`](../packages/hermes-worlds/catalog/).

Zip: `https://mybot.farm/downloads/hermes-worlds-1.1.0.zip`. Unzip into `~/.hermes/plugins/hermes-worlds`, rescan dashboard plugins, and copy `desktop/plugin.js` to `~/.hermes/desktop-plugins/hermes-worlds/plugin.js`. Steps: [`packages/hermes-worlds/INSTALL.md`](../packages/hermes-worlds/INSTALL.md).

## Review (0.3.0, 2026-10-02)

Findings from a full pass over the world-pack work (commits `a3a7c89`,
`70d64df`, `7c2eef4`, `ec058c4` + the uncommitted roster layer). All three
items below are resolved in this commit.

**Verified sound:**
- World plant writes `world.json` + `WORLD.md` + same-origin `assets/**` into
  `$HERMES_HOME/worlds/<slug>/`; remote / off-site asset URLs are skipped
  (`test_world_asset_rels_skip_site_and_remote_paths`).
- Desktop write-door is hardened: `writeTextFile` → Electron `fs-ipc.ts`
  (resolved path + parent-must-exist + 1 MB cap) → `roster.json`;
  `writeRoster` passes the absolute path the handler expects.
- World pack ships **empty-cast** and validates: `validateGafPack(neon-harbor.json)`
  → `{ok: true}`; `MIN_WORLD_CAST = 0`.
- Test suites green: `hermes-mybot-farm` plan 26/26, post 24/24,
  world-doc 4/4, `gaf-pack.test.ts` 31/31, dashboard `plugin_api_test` 15/15,
  `node --check` on the desktop plugin clean.
- `web/public/packs/worlds/neon-harbor.webp` is the generated `harbor-night`
  backdrop, byte-identical.

**Fixed:**
1. `tests/test_world_doc.py` ran **0 tests** when executed directly — it had no
   `if __name__ == "__main__": unittest.main()` block, so
   `python tests/test_world_doc.py` exited 0 silently (green-but-empty). Added
   the main block to match the other test files; now 4 tests run and pass.
2. Stale doc in `web/src/lib/gaf-pack.ts`: the `WORLD_PACK_FORMAT` comment still
   described the world as a cast-bearing team superset. Rewritten to describe
   the unpopulated-world model (places + art, no cast, `MIN_WORLD_CAST = 0`).
3. Roster re-plant caveat was undocumented. Now stated in
   `packages/hermes-worlds/README.md` (Layer 2b+) and
   `packages/hermes-mybot-farm/README.md` (Worlds): re-planting updates
   `world.json`/assets but never touches `roster.json`.

**Open (not blockers):**
- KiroCrew world plant claims parity with the Hermes `_world.md` + skins path
  but is **unverified end-to-end** here (no `KIRO_HOME` fixture / CLI run).
- `catalog/` draft defers the SHA until tag `hermes-worlds-v1.1.0` exists; the
  zip URL `hermes-worlds-1.1.0.zip` is aspirational until that tag is cut.
- Dashboard is read-only for `roster.json` — dashboard users see their roster
  but can't edit it (intended; editing is a desktop action).

## Notes

- Source: [`packages/hermes-mybot-farm`](../packages/hermes-mybot-farm).
- Catalog draft (NousResearch/hermes-agent, after tag): [`packages/hermes-mybot-farm/catalog/`](../packages/hermes-mybot-farm/catalog/).
- Package copy: [`packages/hermes-mybot-farm/INSTALL.md`](../packages/hermes-mybot-farm/INSTALL.md).
- Team stall contract: [`hermes-team-stall-bundle.md`](./hermes-team-stall-bundle.md).
- Seller keys / write API: [`api-keys.md`](./api-keys.md).
- GAF JSON plant (into a workspace) stays on the OpenClaw plugin / Grok Bot path. Both Hermes and OpenClaw `farm_post` *publish* GAF to the farm. See [openclaw-plugin.md](./openclaw-plugin.md).
