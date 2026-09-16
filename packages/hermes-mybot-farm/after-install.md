# mybot-farm

Enabled. Next:

```bash
hermes plugins validate ~/.hermes/plugins/mybot-farm   # git Hermes; missing on PyPI 0.19.0
python3 ~/.hermes/plugins/mybot-farm/bin/farm-plant search workbench
python3 ~/.hermes/plugins/mybot-farm/bin/farm-plant plant scholastic-research --dry-run
```

Ask the agent to call `farm_search`, `farm_get_stall`, `farm_plant`, `farm_reinstall`, `farm_post`, or `farm_update`.

Reinstall / GAP 2: `farm_reinstall` clears `~/.hermes/profiles/.deleted/<name>` before import. `--force` deletes live profiles of those names. `--clean` also wipes the team dir and kanban board. Default is safe.

Post a listing: set `MYBOT_FARM_API_KEY` (key from https://mybot.farm/sell) and call `farm_post` with GAF JSON (`pack` or `packPath`). Plant still imports Hermes tarballs; post publishes GAF. `--dry-run` validates without POSTing. Free `priceCents: 0` does not need Stripe Connect.

Docs: https://mybot.farm/install/hermes

After Plugin Catalog admission: `hermes plugins install mybot-farm` then `hermes plugins enable mybot-farm`.
