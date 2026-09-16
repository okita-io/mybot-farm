"""mybot.farm Hermes plugin — register farm_* tools, /farm slash command, hermes farm CLI."""

from __future__ import annotations

import sys
from pathlib import Path

# Hermes loads this as a package; the CLI adds this dir to sys.path. Do both.
_ROOT = Path(__file__).resolve().parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from . import farm_tools, schemas
from .cli import handle_farm_cli, setup_farm_cli


def register(ctx):
    toolset = "mybot_farm"
    ctx.register_tool(
        name="farm_search",
        toolset=toolset,
        schema=schemas.FARM_SEARCH,
        handler=farm_tools.farm_search,
    )
    ctx.register_tool(
        name="farm_get_pack",
        toolset=toolset,
        schema=schemas.FARM_GET_PACK,
        handler=farm_tools.farm_get_pack,
    )
    ctx.register_tool(
        name="farm_get_stall",
        toolset=toolset,
        schema=schemas.FARM_GET_STALL,
        handler=farm_tools.farm_get_stall,
    )
    ctx.register_tool(
        name="farm_plant",
        toolset=toolset,
        schema=schemas.FARM_PLANT,
        handler=farm_tools.farm_plant,
    )
    ctx.register_tool(
        name="farm_reinstall",
        toolset=toolset,
        schema=schemas.FARM_REINSTALL,
        handler=farm_tools.farm_reinstall,
    )
    ctx.register_cli_command(
        name="farm",
        help="Search and plant mybot.farm stalls into Hermes",
        setup_fn=setup_farm_cli,
        handler_fn=handle_farm_cli,
    )
    ctx.register_command(
        "farm",
        _slash_farm,
        description="Search or plant mybot.farm stalls (search <q> | plant <slug> | reinstall <slug>)",
        args_hint="search <query> | plant <slug> | reinstall <slug>",
    )


def _slash_farm(raw_args: str) -> str:
    from .cli import run_argv

    parts = (raw_args or "").split()
    if not parts:
        return "Usage: /farm search <query> | /farm plant <slug> | /farm reinstall <slug> [--force] [--clean]"
    try:
        return run_argv(parts, as_text=True)
    except SystemExit as exc:
        return f"/farm exited {exc.code}"
    except Exception as exc:  # noqa: BLE001 — slash commands must not crash the session
        return f"/farm error: {exc}"
