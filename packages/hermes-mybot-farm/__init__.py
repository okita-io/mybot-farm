"""mybot.farm Hermes plugin — register farm_* tools, /farm slash command, hermes farm CLI."""

from __future__ import annotations

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
    ctx.register_tool(
        name="farm_post",
        toolset=toolset,
        schema=schemas.FARM_POST,
        handler=farm_tools.farm_post,
    )
    ctx.register_tool(
        name="farm_update",
        toolset=toolset,
        schema=schemas.FARM_UPDATE,
        handler=farm_tools.farm_update,
    )
    ctx.register_cli_command(
        name="farm",
        help="Search, plant, or post mybot.farm stalls from Hermes",
        setup_fn=setup_farm_cli,
        handler_fn=handle_farm_cli,
    )
    ctx.register_command(
        "farm",
        _slash_farm,
        description="Search, plant, or post mybot.farm stalls (search <q> | plant <slug> | reinstall <slug> | post … | update --slug …)",
        args_hint="search <query> | plant <slug> | reinstall <slug> | post --kind agent --name … --pack file.json | update --slug …",
    )


def _slash_farm(raw_args: str) -> str:
    from .cli import run_argv

    parts = (raw_args or "").split()
    if not parts:
        return (
            "Usage: /farm search <query> | /farm plant <slug> | /farm reinstall <slug> "
            "[--force] [--clean] | /farm post --kind agent --name NAME --title TITLE "
            "--description DESC --category LABEL --price-cents 0 --pack pack.json [--slug SLUG] [--dry-run] "
            "| /farm update --slug SLUG --kind agent --name NAME --title TITLE "
            "--description DESC --category LABEL --price-cents 0 --pack pack.json [--dry-run]"
        )
    try:
        return run_argv(parts, as_text=True)
    except SystemExit as exc:
        return f"/farm exited {exc.code}"
    except Exception as exc:  # noqa: BLE001 — slash commands must not crash the session
        return f"/farm error: {exc}"
