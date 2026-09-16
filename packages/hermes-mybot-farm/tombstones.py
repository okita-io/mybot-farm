"""GAP 2: Hermes leaves ~/.hermes/profiles/.deleted/<name> after profile delete.

`hermes profile import --name <same>` then extracts files and prints success, but
the profile stays invisible / non-spawnable until the tombstone is removed.
"""

from __future__ import annotations

import os
import shutil
from pathlib import Path


def hermes_home(override: str | None = None) -> Path:
    raw = (override or os.environ.get("HERMES_HOME") or "").strip()
    if raw:
        return Path(raw).expanduser()
    return Path.home() / ".hermes"


def profiles_dir(home: Path | None = None) -> Path:
    return (home or hermes_home()) / "profiles"


def deleted_dir(home: Path | None = None) -> Path:
    return profiles_dir(home) / ".deleted"


def tombstone_path(name: str, home: Path | None = None) -> Path:
    return deleted_dir(home) / name


def list_tombstones(names: list[str] | None = None, home: Path | None = None) -> list[str]:
    root = deleted_dir(home)
    if not root.is_dir():
        return []
    wanted = set(names) if names else None
    found: list[str] = []
    for entry in sorted(root.iterdir(), key=lambda p: p.name):
        if entry.name.startswith("."):
            continue
        if wanted is not None and entry.name not in wanted:
            continue
        found.append(entry.name)
    return found


def clear_tombstones(names: list[str], home: Path | None = None) -> list[str]:
    """Remove matching .deleted/<name> entries. Never touches live profiles."""
    removed: list[str] = []
    for name in names:
        if not name or name in {".", "..", "default"} or "/" in name or "\\" in name:
            continue
        path = tombstone_path(name, home)
        if not path.exists():
            continue
        if path.is_dir() and not path.is_symlink():
            shutil.rmtree(path)
        else:
            path.unlink()
        removed.append(name)
    return removed
