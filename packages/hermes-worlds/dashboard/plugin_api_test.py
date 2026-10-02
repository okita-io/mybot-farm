"""Gateway tests for hermes-worlds (fix-handoff Fix 4).

Covers the pure helpers in plugin_api.py: cast normalization, default state
derivation, state loading, world-id/asset path confinement, and the schema
gate. Uses the Neon Harbor fixtures as the contract.

Run (documented entry point — the package layout has no __init__.py, so the
module-level import form is a script run with dashboard/ on sys.path):

    cd ~/.hermes/plugins/hermes-worlds
    python3 dashboard/plugin_api_test.py -v

Run with the Hermes venv interpreter (fastapi is required to import
plugin_api):

    ~/.hermes/hermes-agent/venv/bin/python dashboard/plugin_api_test.py -v

The plain `python3 -m unittest dashboard.plugin_api_test -v` form also works
when the repo root is on sys.path and fastapi is importable (Hermes venv).

No running dashboard is required: filesystem tests point HERMES_HOME at a
tempdir (restored in tearDown); pure-helper tests need no filesystem at all.
"""

from __future__ import annotations

import json
import os
import shutil
import sys
import tempfile
import unittest
from pathlib import Path

# Allow running as a script: `python3 dashboard/plugin_api_test.py`.
sys.path.insert(0, str(Path(__file__).resolve().parent))

from fastapi import HTTPException  # noqa: E402

import plugin_api as pa  # noqa: E402

REPO = Path(__file__).resolve().parent.parent
FIXTURES = REPO / "fixtures"
WORLD_FIXTURE = FIXTURES / "neon-harbor-world.json"
STATE_FIXTURE = FIXTURES / "neon-harbor-state.json"


def _http_code(exc: HTTPException) -> int:
    return int(exc.status_code)


class WorldHelpersTests(unittest.TestCase):
    """Pure-helper tests — no filesystem access needed."""

    def setUp(self) -> None:
        self.world = json.loads(WORLD_FIXTURE.read_text(encoding="utf-8"))

    # 1. Normalize cast from the fixture.
    def test_normalize_cast_fixture(self) -> None:
        rows = pa._normalize_cast(self.world)
        self.assertEqual(len(rows), 2)
        by_id = {r["id"]: r for r in rows}
        self.assertEqual(set(by_id), {"harbor-engineer", "night-watch"})
        self.assertEqual(by_id["harbor-engineer"]["name"], "Patch")
        self.assertEqual(by_id["night-watch"]["name"], "Probe")
        for r in rows:
            self.assertEqual(r["id"], r["role"])

    # 2. characters[] form (no cast key) still normalizes.
    def test_normalize_cast_characters_form(self) -> None:
        doc = {
            "characters": [
                {"id": "c1", "name": "Ann", "role": "sailor"},
                {"id": "c2", "name": "Ben"},  # no role -> id from id
            ]
        }
        rows = pa._normalize_cast(doc)
        self.assertEqual([r["id"] for r in rows], ["sailor", "c2"])
        self.assertEqual(rows[0]["name"], "Ann")
        self.assertEqual(rows[1]["name"], "Ben")

    def test_normalize_cast_empty(self) -> None:
        self.assertEqual(pa._normalize_cast({}), [])

    # 3. Default state: entrypoint + home wins.
    def test_default_state_fixture(self) -> None:
        cast = pa._normalize_cast(self.world)
        st = pa._default_state(self.world, cast, "neon-harbor")
        self.assertEqual(st["place"], "dock")
        self.assertEqual(st["where"], {
            "harbor-engineer": "workshop",
            "night-watch": "dock",
        })
        self.assertEqual(st["recent"], [])

    # 6. Schema gate.
    def test_build_view_rejects_bad_schema(self) -> None:
        with self.assertRaises(HTTPException) as ctx:
            pa._build_view("x", {"schema": "worlds/v0", "title": "x"})
        self.assertEqual(_http_code(ctx.exception), 409)

    def test_build_view_rejects_missing_title(self) -> None:
        with self.assertRaises(HTTPException) as ctx:
            pa._build_view("x", {"schema": "worlds/v1"})
        self.assertEqual(_http_code(ctx.exception), 409)

    # 5a. World-id traversal.
    def test_safe_world_id_rejects_traversal(self) -> None:
        for bad in ("..", ".", "a/b", "a\\b", "", "\x00", ".hidden"):
            with self.assertRaises(HTTPException, msg=bad) as ctx:
                pa._safe_world_id(bad)
            self.assertEqual(_http_code(ctx.exception), 400)
        self.assertEqual(pa._safe_world_id("neon-harbor"), "neon-harbor")


class FilesystemTests(unittest.TestCase):
    """Tests that need $HERMES_HOME; point it at a tempdir per test."""

    def setUp(self) -> None:
        self._tmp = tempfile.TemporaryDirectory(prefix="hw-worlds-test-")
        self.home = Path(self._tmp.name)
        self._saved_home = os.environ.get("HERMES_HOME")
        os.environ["HERMES_HOME"] = str(self.home)
        self.world_dir = self.home / "worlds" / "neon-harbor"
        self.world_dir.mkdir(parents=True)
        shutil.copy(WORLD_FIXTURE, self.world_dir / "world.json")

    def tearDown(self) -> None:
        if self._saved_home is None:
            os.environ.pop("HERMES_HOME", None)
        else:
            os.environ["HERMES_HOME"] = self._saved_home
        self._tmp.cleanup()

    # 4a. Load state from state.json.
    def test_load_state_from_file(self) -> None:
        shutil.copy(STATE_FIXTURE, self.world_dir / "state.json")
        fallback = pa._default_state(
            json.loads((self.world_dir / "world.json").read_text()),
            pa._normalize_cast(json.loads((self.world_dir / "world.json").read_text())),
            "neon-harbor",
        )
        st = pa._load_state(self.world_dir, "neon-harbor", fallback)
        self.assertEqual(st["place"], "dock")
        self.assertEqual(st["where"], {
            "harbor-engineer": "workshop",
            "night-watch": "dock",
        })

    # 4b. Wrong schema in state.json -> fallback.
    def test_load_state_wrong_schema_falls_back(self) -> None:
        bad = json.loads(STATE_FIXTURE.read_text(encoding="utf-8"))
        bad["schema"] = "worlds/state/v0"
        (self.world_dir / "state.json").write_text(
            json.dumps(bad), encoding="utf-8")
        fallback = {"place": "dock", "where": {}, "recent": []}
        st = pa._load_state(self.world_dir, "neon-harbor", fallback)
        self.assertEqual(st, fallback)

    # 4c. No state.json -> default.
    def test_load_state_missing_file_uses_fallback(self) -> None:
        fallback = {"place": "dock", "where": {}, "recent": []}
        st = pa._load_state(self.world_dir, "neon-harbor", fallback)
        self.assertEqual(st, fallback)

    # 5b. Asset path confinement.
    def test_confine_asset(self) -> None:
        assets = self.world_dir / "assets"
        assets.mkdir()
        dock = assets / "dock.webp"
        dock.write_bytes(b"webp-bytes")
        # Accept an existing in-bounds path.
        got = pa._confine_asset(self.world_dir, "assets/dock.webp")
        self.assertEqual(got, dock.resolve())
        # Reject traversal.
        with self.assertRaises(HTTPException):
            pa._confine_asset(self.world_dir, "../secret")
        # Reject absolute path.
        with self.assertRaises(HTTPException):
            pa._confine_asset(self.world_dir, "/etc/hosts")
        # Missing file -> 404.
        with self.assertRaises(HTTPException) as ctx:
            pa._confine_asset(self.world_dir, "assets/nope.webp")
        self.assertEqual(_http_code(ctx.exception), 404)

    # 5c. _world_dir traversal -> 404.
    def test_world_dir_traversal(self) -> None:
        with self.assertRaises(HTTPException) as ctx:
            pa._world_dir("..")
        self.assertEqual(_http_code(ctx.exception), 404)
        with self.assertRaises(HTTPException) as ctx:
            pa._world_dir("does-not-exist")
        self.assertEqual(_http_code(ctx.exception), 404)

    # Fix 2 acceptance: title-based join via hermes-bots. The profile dir
    # intentionally matches NEITHER cast.name ("Patch") nor cast.role, so the
    # hermes-bots title is the only possible join path.
    def test_build_view_profile_join_via_title(self) -> None:
        world = json.loads((self.world_dir / "world.json").read_text())
        prof = self.home / "profiles" / "harbor-engineer-agent"
        prof.mkdir(parents=True)
        (prof / "profile.yaml").write_text(
            "ui_meta:\n  hermes-bots:\n    title: harbor-engineer\n"
            "    groups: [neon-harbor]\n",
            encoding="utf-8",
        )
        view = pa._build_view("neon-harbor", world)
        by_name = {c["name"]: c for c in view["cast"]}
        # Title == cast.role joins to the agent dir.
        self.assertEqual(by_name["Patch"]["profileName"], "harbor-engineer-agent")
        # Neither role nor name matches -> unjoined.
        self.assertIsNone(by_name["Probe"]["profileName"])

    def test_build_view_profile_join_dir_name_wins(self) -> None:
        world = json.loads((self.world_dir / "world.json").read_text())
        # A dir named Probe (case-insensitive match on cast.name) must win
        # over a title match on the same profile.
        (self.home / "profiles" / "Probe").mkdir(parents=True)
        view = pa._build_view("neon-harbor", world)
        by_name = {c["name"]: c for c in view["cast"]}
        self.assertEqual(by_name["Probe"]["profileName"], "Probe")

    def test_full_view_shape(self) -> None:
        view = pa._build_view(
            "neon-harbor",
            json.loads((self.world_dir / "world.json").read_text()),
        )
        self.assertEqual(view["id"], "neon-harbor")
        self.assertEqual(view["title"], "Neon Harbor")
        self.assertEqual(view["entrypoint"], {"place": "dock", "greeter": "night-watch"})
        self.assertEqual(view["state"]["place"], "dock")
        self.assertTrue(view["cast"][0]["isGreeter"] in (True, False))
        self.assertEqual(
            [c["id"] for c in view["cast"]], ["harbor-engineer", "night-watch"])
        self.assertEqual(view["rules"]["turnModel"], "defer")


if __name__ == "__main__":
    unittest.main(verbosity=2)
