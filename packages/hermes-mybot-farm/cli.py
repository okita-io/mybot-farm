"""CLI for humans and `hermes farm` / `/farm` — no agent loop required."""

from __future__ import annotations

import argparse
import json
import sys
from typing import Any

from farm_api import FarmError
from hermes_bin import HermesCliError
from plant import PlantError
from farm_tools import (
    clear_named_tombstones,
    farm_get_pack,
    farm_get_stall,
    farm_plant,
    farm_reinstall,
    farm_search,
)


def _print_json(payload: str) -> int:
    data = json.loads(payload)
    print(json.dumps(data, indent=2))
    return 0 if data.get("ok", True) else 1


def _print_text(payload: str) -> int:
    data = json.loads(payload)
    text = data.get("text")
    if text:
        print(text)
    else:
        print(json.dumps(data, indent=2))
    return 0 if data.get("ok", True) else 1


def setup_farm_cli(subparser) -> None:
    subparser.add_argument(
        "farm_command",
        nargs="?",
        choices=["search", "get", "stall", "plant", "reinstall", "clear-tombstones"],
        help="farm subcommand",
    )
    subparser.add_argument("rest", nargs=argparse.REMAINDER, help="command arguments")
    subparser.set_defaults(func=handle_farm_cli)


def handle_farm_cli(args) -> None:
    cmd = getattr(args, "farm_command", None)
    rest = list(getattr(args, "rest", None) or [])
    argv = ([cmd] if cmd else []) + rest
    code = _dispatch(argv, as_text=False)
    if code:
        raise SystemExit(code)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="farm-plant",
        description="Search and plant mybot.farm Hermes stalls (no agent loop).",
    )
    parser.add_argument(
        "command",
        choices=["search", "get", "stall", "plant", "reinstall", "clear-tombstones"],
        nargs="?",
    )
    parser.add_argument("rest", nargs=argparse.REMAINDER)
    return parser


def _parse_flags(rest: list[str]) -> tuple[list[str], dict[str, Any]]:
    flags: dict[str, Any] = {}
    positional: list[str] = []
    i = 0
    while i < len(rest):
        tok = rest[i]
        if tok in {"--force"}:
            flags["force"] = True
        elif tok in {"--clean"}:
            flags["clean"] = True
        elif tok in {"--dry-run", "--dry_run"}:
            flags["dry_run"] = True
        elif tok in {"--limit"}:
            i += 1
            flags["limit"] = int(rest[i])
        elif tok in {"--name"}:
            i += 1
            flags["name"] = rest[i]
        elif tok in {"--help", "-h"}:
            flags["help"] = True
        else:
            positional.append(tok)
        i += 1
    return positional, flags


def usage() -> str:
    return """Usage:
  farm-plant search <query> [--limit N]
  farm-plant get <slug>
  farm-plant stall <slug>
  farm-plant plant <slug> [--name NAME] [--force] [--clean] [--dry-run]
  farm-plant reinstall <slug> [--force] [--clean] [--dry-run]
  farm-plant clear-tombstones [name ...]

Env:
  MYBOT_FARM_URL   override API origin (default https://mybot.farm)
  HERMES_HOME      override Hermes home (default ~/.hermes)
  HERMES_BIN       override hermes executable
"""


def _dispatch(argv: list[str], *, as_text: bool) -> int:
    printer = _print_text if as_text else _print_json
    if not argv or argv[0] in {"-h", "--help"}:
        print(usage())
        return 0 if argv else 1
    cmd, *rest_raw = argv
    rest, flags = _parse_flags(rest_raw)
    if flags.get("help"):
        print(usage())
        return 0

    if cmd == "search":
        query = " ".join(rest).strip()
        if not query:
            print("search requires a query", file=sys.stderr)
            return 1
        args = {"query": query}
        if "limit" in flags:
            args["limit"] = flags["limit"]
        return printer(farm_search(args))

    if cmd == "get":
        if not rest:
            print("get requires a slug", file=sys.stderr)
            return 1
        return printer(farm_get_pack({"slug": rest[0]}))

    if cmd == "stall":
        if not rest:
            print("stall requires a slug", file=sys.stderr)
            return 1
        return printer(farm_get_stall({"slug": rest[0]}))

    if cmd == "plant":
        if not rest:
            print("plant requires a slug", file=sys.stderr)
            return 1
        args = {"slug": rest[0], **{k: flags[k] for k in ("force", "clean", "dry_run", "name") if k in flags}}
        return printer(farm_plant(args))

    if cmd == "reinstall":
        if not rest:
            print("reinstall requires a slug", file=sys.stderr)
            return 1
        args = {"slug": rest[0], **{k: flags[k] for k in ("force", "clean", "dry_run", "name") if k in flags}}
        return printer(farm_reinstall(args))

    if cmd in {"clear-tombstones", "clear_tombstones"}:
        payload = clear_named_tombstones(rest or None)
        if as_text:
            cleared = payload.get("cleared") or []
            print(
                f"cleared {len(cleared)} tombstone(s) in {payload.get('dir')}: "
                + (", ".join(cleared) or "(none)")
            )
        else:
            print(json.dumps(payload, indent=2))
        return 0

    print(usage(), file=sys.stderr)
    print(f"unknown command: {cmd}", file=sys.stderr)
    return 1


def run_argv(argv: list[str], *, as_text: bool = False) -> str:
    """Used by the /farm slash command; returns captured output as text."""
    import io
    from contextlib import redirect_stderr, redirect_stdout

    buf = io.StringIO()
    err = io.StringIO()
    with redirect_stdout(buf), redirect_stderr(err):
        code = _dispatch(argv, as_text=True)
    out = buf.getvalue() + err.getvalue()
    if code and not out.strip():
        return f"farm command failed ({code})"
    return out.strip() or "(ok)"


def main(argv: list[str] | None = None) -> int:
    args = argv if argv is not None else sys.argv[1:]
    try:
        return _dispatch(args, as_text=False)
    except (FarmError, PlantError, HermesCliError) as exc:
        print(str(exc), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
