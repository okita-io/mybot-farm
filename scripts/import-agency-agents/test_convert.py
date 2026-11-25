#!/usr/bin/env python3
"""Smoke-test the Agency Agents converter against a tiny fixture."""

from __future__ import annotations

import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
CONVERT = HERE / "convert.py"
FIXTURES = HERE / "fixtures"


def main() -> int:
    if not FIXTURES.is_dir():
        print("missing fixtures/", file=sys.stderr)
        return 2

    with tempfile.TemporaryDirectory() as tmp:
        source = Path(tmp) / "src"
        source.mkdir()
        (source / "divisions.json").write_text(
            json.dumps(
                {
                    "divisions": {
                        "engineering": {
                            "label": "Engineering",
                            "icon": "Code",
                            "color": "#3B82F6",
                        }
                    }
                }
            ),
            encoding="utf-8",
        )
        dest = source / "engineering"
        dest.mkdir()
        shutil.copy(
            FIXTURES / "engineering" / "engineering-fixture-gardener.md",
            dest / "engineering-fixture-gardener.md",
        )

        out = Path(tmp) / "out"
        public = Path(tmp) / "public"
        catalog = Path(tmp) / "catalog.json"
        proc = subprocess.run(
            [
                sys.executable,
                str(CONVERT),
                "--source",
                str(source),
                "--out",
                str(out),
                "--public",
                str(public),
                "--catalog",
                str(catalog),
            ],
            check=False,
        )
        if proc.returncode != 0:
            return proc.returncode

        pack = json.loads((out / "fixture-gardener.json").read_text(encoding="utf-8"))
        assert pack["format"] == "mybot.farm/agent-pack"
        assert pack["slug"] == "fixture-gardener"
        assert pack["profile"]["name"] == "Fixture Gardener"
        assert pack["manifest"]["license"] == "MIT"
        assert "AgentLand Contributors" in pack["manifest"]["attribution"]
        assert pack["manifest"]["sourcePath"].endswith("engineering-fixture-gardener.md")
        assert any("agency-agents" in (m.get("content") or "") for m in pack["memory"])
        assert pack["skills"]
        assert all(s["description"].lower().startswith("use ") for s in pack["skills"])
        # Regression guards (2026-11-24 audit): no emoji remnants, no mid-word titles,
        # and the first sub-heading inside a skill keeps its heading marker.
        assert "\ufe0f" not in json.dumps(pack, ensure_ascii=False)
        sys.path.insert(0, str(HERE))
        import convert  # noqa: E402

        assert convert.strip_emoji("\u2699\ufe0f Core Tools") == "Core Tools"
        long_desc = "Expert bookkeeper and controller specializing in day-to-day accounting operations, month-end close, and controls."
        title = convert.title_from({"description": long_desc}, "x")
        assert long_desc.startswith(title) and long_desc[len(title)] == " ", title
        body = convert.skill_body("## Rules", "### Data Integrity\n- a\n\n### Cartography\n- b")
        assert body.startswith("# Rules\n\n### Data Integrity"), body
        catalog_data = json.loads(catalog.read_text(encoding="utf-8"))
        assert catalog_data["totalPacks"] == 1
        assert catalog_data["stalls"][0]["slug"] == "fixture-gardener"
        print("fixture-gardener pack OK")
        return 0


if __name__ == "__main__":
    raise SystemExit(main())
