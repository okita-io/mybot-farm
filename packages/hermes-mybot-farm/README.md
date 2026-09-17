# mybot.farm → Hermes

Native [Hermes Agent](https://hermes-agent.nousresearch.com/docs/user-guide/features/plugins) plugin that searches [mybot.farm](https://mybot.farm), plants Hermes packs into **profiles + team dirs**, and posts **GAF** listings with a seller API key.

Install page: [https://mybot.farm/install/hermes](https://mybot.farm/install/hermes)

## What it does

| Tool | Purpose |
|------|---------|
| `farm_search` | `GET /api/stalls?q=` — matching stalls (slug, kind, title, URLs) |
| `farm_get_pack` | `GET /api/packs/{slug}` — GAF JSON: members, skills, `shared.gettingStarted` |
| `farm_get_stall` | `GET /api/stalls/{slug}` — stall metadata **including member tarball hrefs** |
| `farm_plant` | Download + `hermes profile import`. Teams: member tarballs, `~/.hermes/teams/<slug>`, TEAM.md/WORK.md/cron, kanban board if gettingStarted says so |
| `farm_reinstall` | GAP 2 clean path: clear `~/.hermes/profiles/.deleted/<name>` tombstones, optionally wipe old profiles/team/board, then plant again and verify `hermes profile list` |
| `farm_post` | `POST /api/listings` — publish or update a GAF stall (seller API key). Same slug owned by you bumps `packVersion` and records revision history. Not a Hermes tarball. |
| `farm_update` | Same as `farm_post` with required `slug` — in-place GAF update (skills, soul/memory). Omit packVersion to auto-increment. |

Default plant is **safe**. Live profiles are never deleted unless `force` is true. Team dir and kanban board are never wiped unless `clean` is true. Tombstones (leftover delete markers, not live agents) are always cleared before import.

**Plant vs post:** `farm_plant` still imports Hermes `.tar.gz` profiles. `farm_post` publishes **GAF JSON** to the farm. There is no client-side Hermes-tarball→GAF translator in this plugin — export/convert elsewhere (see `scripts/README.md` / `toGAF`). Scrub with `scripts/scrub.py` before you share an archive; posting still expects a GAF object.

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

After catalog admission (SHA-pinned, public clone):

```bash
hermes plugins install mybot-farm
hermes plugins enable mybot-farm
```

Draft catalog YAML + tag checklist: [`catalog/`](./catalog/).

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
python3 packages/hermes-mybot-farm/bin/farm-plant post --kind agent --name "Smoke Bot" \
  --title "API key smoke listing" --description "Minimal free GAF listing." \
  --category Experimental --price-cents 0 --pack ./smoke.gaf.json --dry-run
python3 packages/hermes-mybot-farm/bin/farm-plant post --kind team --name "Smoke Crew" \
  --title "Two-agent smoke team" --description "Minimal free team listing." \
  --category Experimental --price-cents 0 --pack ./smoke-crew.gaf.json --dry-run
python3 packages/hermes-mybot-farm/bin/farm-plant clear-tombstones
```

A full import of Scholastic Research (one profile) or Workbench (three + board) needs `hermes` on PATH. Prefer `--dry-run` first.

Env: `MYBOT_FARM_URL`, `MYBOT_FARM_API_KEY` (seller key from [https://mybot.farm/sell](https://mybot.farm/sell); see [`docs/api-keys.md`](../../docs/api-keys.md)), `HERMES_HOME`, `HERMES_BIN`. Plugin config `apiKey` is the fallback when the env var is unset.

## Post a listing (`farm_post`)

Create a seller key on [https://mybot.farm/sell](https://mybot.farm/sell). Prefer `MYBOT_FARM_API_KEY` for unattended use (never commit it).

```bash
export MYBOT_FARM_API_KEY=mbf_YOUR_KEY
python3 packages/hermes-mybot-farm/bin/farm-plant post \
  --kind agent --name "Smoke Bot" --title "API key smoke listing" \
  --description "Minimal free GAF listing posted with a seller API key." \
  --category Experimental --price-cents 0 --pack ./smoke.gaf.json
```

`--json` prints machine-readable JSON. `--dry-run` validates locally and prints a payload summary (key redacted) without POSTing.

- **Free** (`--price-cents 0`): no Stripe Connect required.
- **Paid** (`200`–`999900` cents): seller account must have Connect transfers active, else `403 connect_required`.
- `category` is an exact farm **label** (`Lifestyle`, `Coding`, `Experimental`, `Personal finance`, `Ops / admin`, …) — not the slug.
- Pack is GAF JSON (object or `--pack` path). Hermes tarballs are for plant, not post.
- Teams: `--kind team` plus a `mybot.farm/team-pack` with at least two `members[]` (`role`, `summary`, `pack`).

Ask the agent to call `farm_post` with the same fields (`pack` object or `packPath`). Optional `apiKey` overrides env/config for that call. For a team, pass `kind: "team"` and a `mybot.farm/team-pack` with `members[]` (at least two).

## GAP 2

After `hermes profile delete <name>`, Hermes leaves `~/.hermes/profiles/.deleted/<name>`. Import of the same name extracts files and prints success, but the profile stays off `hermes profile list` / non-spawnable. This plugin clears matching tombstones before every import (and after `force` deletes, which create new ones). Standalone:

```bash
python3 packages/hermes-mybot-farm/scripts/clear-tombstones.py workbench-spec
```

## License

MIT. Pack content keeps upstream attribution from each GAF manifest.
