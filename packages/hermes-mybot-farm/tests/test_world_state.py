"""Tests for _write_world_state (todo 4): stamping the group-chat id into
state.json with a field-preserving merge (G7). Run:

    cd ~/.hermes/plugins/mybot-farm   # or packages/hermes-mybot-farm
    ~/.hermes/hermes-agent/venv/bin/python tests/test_world_state.py -v
"""

import json
import tempfile
import unittest
from pathlib import Path

import plugin_import  # noqa: F401

from hermes_mybot_farm.plant import _write_world_state, STATE_SCHEMA  # noqa: E402


class WriteWorldStateTests(unittest.TestCase):
    def _world_path(self, tmp: str) -> Path:
        wdir = Path(tmp) / "worlds" / "neon-harbor"
        wdir.mkdir(parents=True)
        return wdir / "world.json"

    def test_no_room_id_writes_nothing(self) -> None:
        # No HERMES_GATEWAY_RPC_URL -> result.room is None -> no state.json.
        with tempfile.TemporaryDirectory() as tmp:
            wp = self._world_path(tmp)
            self.assertIsNone(_write_world_state(wp, None))
            self.assertFalse((wp.parent / "state.json").exists())

    def test_creates_state_with_chat_id_and_schema(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            wp = self._world_path(tmp)
            out = _write_world_state(wp, "neon-harbor")
            self.assertIsNotNone(out)
            data = json.loads(Path(out).read_text())
            self.assertEqual(data["chatId"], "neon-harbor")
            self.assertEqual(data["schema"], STATE_SCHEMA)

    def test_preserves_existing_fields(self) -> None:
        # An existing state.json (e.g. written by the pane) keeps place/where/
        # recent; only chatId + schema are set.
        with tempfile.TemporaryDirectory() as tmp:
            wp = self._world_path(tmp)
            sp = wp.parent / "state.json"
            sp.write_text(json.dumps({
                "schema": STATE_SCHEMA,
                "place": "dock",
                "where": {"patch": "workshop"},
                "recent": [{"kind": "move", "who": "patch"}],
            }))
            _write_world_state(wp, "room-xyz")
            data = json.loads(sp.read_text())
            self.assertEqual(data["chatId"], "room-xyz")
            self.assertEqual(data["place"], "dock")
            self.assertEqual(data["where"], {"patch": "workshop"})
            self.assertEqual(data["recent"], [{"kind": "move", "who": "patch"}])

    def test_idempotent_when_already_current(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            wp = self._world_path(tmp)
            sp = wp.parent / "state.json"
            _write_world_state(wp, "room-1")
            before = sp.read_text()
            self.assertEqual(_write_world_state(wp, "room-1"), str(sp))
            self.assertEqual(sp.read_text(), before)  # unchanged

    def test_updates_stale_chat_id(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            wp = self._world_path(tmp)
            sp = wp.parent / "state.json"
            _write_world_state(wp, "room-old")
            _write_world_state(wp, "room-new")
            self.assertEqual(json.loads(sp.read_text())["chatId"], "room-new")

    def test_corrupt_state_file_is_replaced_not_crashed(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            wp = self._world_path(tmp)
            sp = wp.parent / "state.json"
            sp.write_text("{ not json")
            out = _write_world_state(wp, "room-ok")
            data = json.loads(Path(out).read_text())
            self.assertEqual(data["chatId"], "room-ok")
            self.assertEqual(data["schema"], STATE_SCHEMA)


class StageSpritePacksTests(unittest.TestCase):
    def test_stages_bundled_packs_into_world_assets(self) -> None:
        from hermes_mybot_farm.plant import stage_sprite_packs, SPRITE_PACKS_DIR
        # The vendored library ships with the plugin.
        self.assertTrue(SPRITE_PACKS_DIR.is_dir(), "sprite-packs library missing from the plugin")
        n_packs = len(list(SPRITE_PACKS_DIR.glob("*.sheet.json")))
        self.assertGreaterEqual(n_packs, 8)
        with tempfile.TemporaryDirectory() as tmp:
            wdir = Path(tmp) / "worlds" / "neon-harbor"
            wdir.mkdir(parents=True)
            wp = wdir / "world.json"
            notes = stage_sprite_packs(wp)
            dest = wdir / "assets" / "sprite-packs"
            staged = sorted(p.name for p in dest.glob("*.sheet.json"))
            self.assertEqual(len(staged), n_packs)
            # Each manifest has a sibling PNG staged too.
            for man in staged:
                png = dest / man.replace(".sheet.json", ".sheet.png")
                self.assertTrue(png.is_file(), f"missing sibling PNG for {man}")
            self.assertTrue(any("sprite-pack" in n for n in notes))
            # Idempotent: a second run copies nothing new.
            notes2 = stage_sprite_packs(wp)
            self.assertEqual(notes2, [])


if __name__ == "__main__":
    unittest.main()



