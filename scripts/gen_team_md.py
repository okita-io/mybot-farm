#!/usr/bin/env python3
"""Emit packs/teams/<slug>/TEAM.md (and the web/public mirror) from GAF team-packs."""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PLUGIN = ROOT / "packages" / "hermes-mybot-farm"
if str(PLUGIN) not in sys.path:
    sys.path.insert(0, str(PLUGIN))

from team_md import HANDMADE_TEAM_SLUGS, render_team_md_for_pack  # noqa: E402

PACK_DIRS = [
    ROOT / "packs" / "teams",
    ROOT / "web" / "public" / "packs" / "teams",
]


def main() -> int:
    source = ROOT / "packs" / "teams"
    written = 0
    for path in sorted(source.glob("*.json")):
        slug = path.stem
        if slug in HANDMADE_TEAM_SLUGS:
            continue
        pack = json.loads(path.read_text(encoding="utf-8"))
        text = render_team_md_for_pack(pack)
        for dest_root in PACK_DIRS:
            dest = dest_root / slug / "TEAM.md"
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_text(text, encoding="utf-8")
        written += 1
        print(dest.relative_to(ROOT))
    print(f"wrote TEAM.md for {written} teams × {len(PACK_DIRS)} trees")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
