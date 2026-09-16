# mybot-farm

Enabled. Next:

```bash
hermes plugins validate ~/.hermes/plugins/mybot-farm   # git Hermes; missing on PyPI 0.19.0
python3 ~/.hermes/plugins/mybot-farm/bin/farm-plant search workbench
python3 ~/.hermes/plugins/mybot-farm/bin/farm-plant plant scholastic-research --dry-run
```

Ask the agent to call `farm_search`, `farm_get_stall`, `farm_plant`, or `farm_reinstall`.

Reinstall / GAP 2: `farm_reinstall` clears `~/.hermes/profiles/.deleted/<name>` before import. `--force` deletes live profiles of those names. `--clean` also wipes the team dir and kanban board. Default is safe.

Docs: https://mybot.farm/install/hermes

After Plugin Catalog admission: `hermes plugins install mybot-farm` then `hermes plugins enable mybot-farm`.
