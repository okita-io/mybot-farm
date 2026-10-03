"""Tests for export_world (todo 9): planted world -> world-exchange bundle.

Run:  ~/.hermes/hermes-agent/venv/bin/python tests/test_export_world.py -v
"""

import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import plugin_import  # noqa: F401

from hermes_mybot_farm.export_world import (  # noqa: E402
    EXCHANGE_SCHEMA,
    ExportError,
    build_portable_world,
    export_world,
    scrub_state,
    world_to_exchange_characters,
)
from hermes_mybot_farm.farm_tools import farm_export_world  # noqa: E402

WORLD = {
    "schema": "worlds/v1",
    "title": "Neon Harbor",
    "thumbnail": "/packs/worlds/neon-harbor.webp",
    "theme": {"mood": "cyberpunk-cozy", "backdrop": "assets/harbor-night.webp"},
    "places": [
        {"id": "dock", "name": "The Docks", "art": "assets/dock.webp",
         "connects": ["workshop"], "present": ["harbor-engineer", "night-watch"]},
        {"id": "workshop", "name": "The Workshop", "connects": ["dock"], "present": ["harbor-engineer"]},
    ],
    "cast": [
        {"role": "harbor-engineer", "name": "Patch", "home": "workshop",
         "avatar": "assets/patch.webp", "memoryScope": "private",
         # includes a non-v1 raw capability that must be dropped + ledgered
         "capabilities": ["web", "files", "execute_bash"],
         "relationships": {"night-watch": "trusted partner"},
         "sprite": "assets/harbor-engineer.sheet.json"},
        {"role": "night-watch", "name": "Probe", "home": "dock", "capabilities": ["web"]},
    ],
    "rules": {"turnModel": "defer", "handoff": "mention", "ambient": False, "maxPresent": 6},
    "entrypoint": {"place": "dock", "greeter": "night-watch"},
    "render": {"theme": "cyberpunk-cozy"},
}


class ExportTests(unittest.TestCase):
    def test_cast_maps_to_characters_with_pack_pointer(self) -> None:
        chars, loss = world_to_exchange_characters(WORLD)
        patch = next(c for c in chars if c["id"] == "harbor-engineer")
        self.assertEqual(patch["role"], "harbor-engineer")
        self.assertEqual(patch["name"], "Patch")
        self.assertEqual(patch["pack"], "characters/harbor-engineer.json")
        self.assertEqual(patch["home"], "workshop")
        self.assertEqual(patch["sprite"], "assets/harbor-engineer.sheet.json")

    def test_capabilities_scrubbed_to_v1_and_loss_ledgered(self) -> None:
        chars, loss = world_to_exchange_characters(WORLD)
        patch = next(c for c in chars if c["id"] == "harbor-engineer")
        self.assertEqual(patch["capabilities"], ["web", "files"])  # execute_bash dropped
        self.assertTrue(any(l["path"] == "characters.harbor-engineer.capabilities"
                            and l["action"] == "dropped" for l in loss))

    def test_portable_world_shape(self) -> None:
        portable, _ = build_portable_world(WORLD)
        self.assertEqual(portable["schema"], "worlds/v1")
        self.assertEqual(portable["title"], "Neon Harbor")
        self.assertNotIn("render", portable)       # render dropped
        self.assertNotIn("thumbnail", portable)     # thumbnail dropped
        self.assertEqual(portable["rules"]["turnModel"], "defer")
        self.assertEqual(len(portable["characters"]), 2)

    def test_build_rejects_wrong_schema(self) -> None:
        with self.assertRaises(ExportError):
            build_portable_world({"schema": "nope", "title": "x"})

    def test_scrub_state_caps_recent(self) -> None:
        state = {"schema": "worlds/state/v1", "place": "dock",
                 "where": {"harbor-engineer": "workshop"},
                 "recent": [{"i": i} for i in range(50)], "chatId": "room-1"}
        out = scrub_state(state, "neon-harbor")
        self.assertEqual(len(out["recent"]), 20)
        self.assertEqual(out["recent"][-1]["i"], 49)   # newest kept
        self.assertEqual(out["chatId"], "room-1")       # unrelated field preserved
        self.assertEqual(out["worldId"], "neon-harbor")

    def test_scrub_state_rejects_wrong_schema(self) -> None:
        self.assertIsNone(scrub_state({"schema": "x"}, "neon-harbor"))
        self.assertIsNone(scrub_state(None, "neon-harbor"))

    def test_export_world_writes_full_bundle(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            wdir = root / "worlds" / "neon-harbor"
            (wdir / "assets").mkdir(parents=True)
            wdir.joinpath("world.json").write_text(json.dumps(WORLD))
            wdir.joinpath("assets", "dock.webp").write_bytes(b"\x89PNG fake")
            wdir.joinpath("state.json").write_text(json.dumps({
                "schema": "worlds/state/v1", "place": "dock",
                "where": {"harbor-engineer": "workshop"}, "recent": [], "chatId": "r1",
            }))
            out = root / "out"
            env = export_world("neon-harbor", root / "worlds", out)

            bundle = out / "neon-harbor.world"
            self.assertTrue((bundle / "exchange.json").is_file())
            self.assertTrue((bundle / "world.json").is_file())
            self.assertTrue((bundle / "assets" / "dock.webp").is_file())
            self.assertTrue((bundle / "characters" / "harbor-engineer.json").is_file())
            self.assertTrue((bundle / "characters" / "night-watch.json").is_file())
            self.assertTrue((bundle / "state.json").is_file())

            self.assertEqual(env["schema"], EXCHANGE_SCHEMA)
            self.assertEqual(env["exportedFrom"], "hermes")
            self.assertEqual(sorted(env["characters"]), ["harbor-engineer", "night-watch"])
            self.assertTrue(env["lossy"])  # execute_bash dropped
            self.assertEqual(Path(env["bundlePath"]).resolve(), bundle.resolve())
            # state snapshot carried + scrubbed
            snap = json.loads((bundle / "state.json").read_text())
            self.assertEqual(snap["chatId"], "r1")

    def test_export_missing_world_raises(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            with self.assertRaises(ExportError):
                export_world("ghost", Path(tmp) / "worlds", Path(tmp) / "out")

    def test_export_rejects_traversal_world_id(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            with self.assertRaises(ExportError):
                export_world("../etc", root / "worlds", root / "out")

class ExportToolTests(unittest.TestCase):
    def test_farm_export_world_writes_bundle(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            home = Path(tmp) / "hermes"
            worlds = home / "worlds" / "neon-harbor"
            worlds.mkdir(parents=True)
            worlds.joinpath("world.json").write_text(json.dumps(WORLD))
            with patch("hermes_mybot_farm.farm_tools.hermes_home", return_value=home):
                raw = farm_export_world({"worldId": "neon-harbor"})
            payload = json.loads(raw)
            self.assertTrue(payload["ok"])
            bundle = Path(payload["bundlePath"])
            self.assertTrue(bundle.is_dir())
            self.assertTrue((bundle / "exchange.json").is_file())
            self.assertEqual(bundle.parent.resolve(), (home / "farm" / "exports").resolve())

    def test_farm_export_world_requires_id(self) -> None:
        payload = json.loads(farm_export_world({}))
        self.assertFalse(payload["ok"])
        self.assertIn("worldId required", payload["error"])


if __name__ == "__main__":
    unittest.main()
