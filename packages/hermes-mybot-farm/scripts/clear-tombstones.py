#!/usr/bin/env python3
"""Clear Hermes profile-delete tombstones (GAP 2).

After `hermes profile delete <name>`, Hermes leaves
~/.hermes/profiles/.deleted/<name>. `hermes profile import --name <same>` then
extracts files and prints success, but the profile stays invisible until this
directory entry is removed.

  python3 scripts/clear-tombstones.py
  python3 scripts/clear-tombstones.py workbench-spec workbench-scaffold workbench-smoke
"""

from __future__ import annotations

import importlib.util
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
_spec = importlib.util.spec_from_file_location(
    "hermes_mybot_farm_plugin_loader",
    ROOT / "plugin_loader.py",
)
assert _spec and _spec.loader
_loader = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_loader)
_loader.ensure_plugin_package()

from hermes_mybot_farm.tombstones import (  # noqa: E402
    clear_tombstones,
    deleted_dir,
    hermes_home,
    list_tombstones,
)


def main(argv: list[str] | None = None) -> int:
    names = argv if argv is not None else sys.argv[1:]
    home = hermes_home()
    found = list_tombstones(names or None, home)
    cleared = clear_tombstones(found, home)
    print(
        json.dumps(
            {
                "ok": True,
                "hermes_home": str(home),
                "deleted_dir": str(deleted_dir(home)),
                "found": found,
                "cleared": cleared,
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
