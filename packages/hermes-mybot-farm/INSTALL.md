# Install mybot.farm → Hermes

Browse [mybot.farm](https://mybot.farm) in Hermes Desktop and one-click **Recruit** stalls into the Bots roster with the `mybot-farm` plugin (v0.3.0). CLI tools still plant, reinstall, and post GAF listings.

You need [Hermes Agent](https://hermes-agent.nousresearch.com/docs/getting-started/installation) (Desktop + `hermes profile import`).

## 1. Enable the plugin

Plugins are opt-in. Then open Hermes Desktop — that is the headline path.

### From a repo checkout (recommended)

`hermes plugins install` does **not** take a local directory path. Symlink into the user plugin dir, then enable:

```bash
mkdir -p ~/.hermes/plugins
ln -sfn /path/to/mybot-farm/packages/hermes-mybot-farm ~/.hermes/plugins/mybot-farm
hermes plugins enable mybot-farm
```

Or **copy** the folder instead of linking. A real directory is what Desktop uses to materialize `desktop/plugin.js`. A symlink install needs the standalone door in step 2.

### From GitHub

This plugin lives in a subdirectory of the farm repo:

```bash
hermes plugins install okita-io/mybot-farm/packages/hermes-mybot-farm --enable
```

`--enable` skips the Enable now? prompt. Omit it to leave the plugin disabled.

A zip of the plugin dir is at `https://mybot.farm/downloads/hermes-mybot-farm-0.3.0.zip` (pack after the `hermes-mybot-farm-v0.3.0` tag — not in-tree). Unzip into `~/.hermes/plugins/mybot-farm`, then `hermes plugins enable mybot-farm`.

### From the Plugin Catalog (after admission)

```bash
hermes plugins install mybot-farm
hermes plugins enable mybot-farm
```

Needs a merged `plugin-catalog/mybot-farm.yaml` in hermes-agent. Draft + tag checklist: `catalog/` in this package. The farm repo must be public `https://` cloneable; pin `subdir: packages/hermes-mybot-farm`.

## 2. Recruit from Hermes Desktop

Open **Hermes Desktop**. Sidebar **Farm** (or ⌘K → `mybot.farm: Open catalog`). Search, filter All / Agents / Teams, open a stall, **Recruit**.

- Solo agents: `farm_plant` with `recruit: true` stamps `ui_meta.hermes-bots` on the imported `profile.yaml` — same marker as Desktop’s create-bot dialog — so the agent lands in the **Bots roster**.
- Teams: members always land in the Bots roster. Team dir, TEAM.md, group-chat setup note as usual.
- **Page** opens the listing on the farm.

Plant-as-plain-profile and Replant stay on the CLI / tools. The desktop is for bringing stalls onto the Bots roster.

If Farm does not appear after enable: copy `desktop/plugin.js` to `~/.hermes/desktop-plugins/mybot-farm/plugin.js` (hot-reloads on save; fallback ⌘K → Reload desktop plugins). Electron’s materializer skips a **symlinked** `~/.hermes/plugins/mybot-farm`.

## 3. Validate (optional)

Current Hermes git:

```bash
hermes plugins validate /path/to/mybot-farm/packages/hermes-mybot-farm
```

PyPI `hermes-agent` 0.19.0 has no `validate` subcommand. Use the unittest probe instead:

```bash
python3 -m unittest discover -s /path/to/mybot-farm/packages/hermes-mybot-farm/tests -v
```

You should see tools: `farm_search`, `farm_get_pack`, `farm_get_stall`, `farm_plant`, `farm_reinstall`, `farm_post`, `farm_update`.

## 4. CLI plant (no agent loop)

Secondary to Desktop Recruit.

```bash
python3 /path/to/mybot-farm/packages/hermes-mybot-farm/bin/farm-plant search scholastic
python3 /path/to/mybot-farm/packages/hermes-mybot-farm/bin/farm-plant plant scholastic-research --dry-run
python3 /path/to/mybot-farm/packages/hermes-mybot-farm/bin/farm-plant plant scholastic-research
```

Confirm: `hermes profile list` shows `scholastic-research`.

Team smoke (Workbench): dry-run first. A live plant imports three profiles, writes `~/.hermes/teams/workbench`, fetches TEAM.md/WORK.md/cron, marks members as Bots, and runs `hermes kanban boards create workbench --name "Workbench team"` when missing. Generated teams also get TEAM.md, a team-rules skill on each member, and a Desktop group-chat fallback note when no gateway RPC is configured.

Plant imports **Hermes tarballs**. Posting to the farm uses **GAF JSON** (next section).

## 5. Post a listing

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

`--pack` is a `.json` GAF file. Free listings (`priceCents` / `--price-cents 0`) do not need Stripe Connect. Paid listings (`200`–`999900`) return `403 connect_required` until payouts are active. Category is an exact farm label (`Lifestyle`, `Coding`, `Experimental`, …). `--kind team` needs a `mybot.farm/team-pack` with at least two `members[]`.

This plugin does not convert a Hermes profile tarball into GAF. Scrub archives with `scripts/scrub.py` before sharing; `farm_post` still expects GAF JSON (export/convert elsewhere).

## 6. Reinstall / GAP 2

```bash
python3 /path/to/mybot-farm/packages/hermes-mybot-farm/bin/farm-plant reinstall workbench
# existing live profiles: add --force (deletes those names, then clears tombstones, then imports)
# also wipe team dir + board: add --clean
python3 /path/to/mybot-farm/packages/hermes-mybot-farm/scripts/clear-tombstones.py
```

`--force` and `--clean` are destructive. Default is safe.

## 7. Use from an agent

Ask Hermes to call:

- `farm_search` with `{ "query": "workbench" }`
- `farm_get_stall` with `{ "slug": "workbench" }`
- `farm_get_pack` with `{ "slug": "workbench" }`
- `farm_plant` with `{ "slug": "scholastic-research" }` or `{ "slug": "workbench" }` (solo Recruit: `recruit: true`)
- `farm_reinstall` with `{ "slug": "workbench", "force": true }` when upgrading
- `farm_post` with listing fields + `pack` or `packPath` (optional `slug`, `packVersion`, `dryRun`, `apiKey`)
- `farm_update` with the same fields plus required `slug`

Also: `hermes farm search workbench`, `/farm plant scholastic-research`, `/farm post --kind agent … --pack pack.json`.

## Notes

- Does not email, spend money, or invent pack fields.
- Does not plant GAF JSON into Hermes (OpenClaw / Grok Bot packs stay on the OpenClaw plugin). `farm_post` *publishes* GAF to the farm.
- Override API origin with `MYBOT_FARM_URL`. Seller key: `MYBOT_FARM_API_KEY`.
- OpenClaw `farm_post` is not in this plugin; that is a later follow-up.
