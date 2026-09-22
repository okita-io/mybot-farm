from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

import plugin_import  # noqa: F401

from hermes_mybot_farm.tombstones import (  # noqa: E402
    clear_tombstones,
    deleted_dir,
    hermes_home,
    list_tombstones,
)


class TombstoneTests(unittest.TestCase):
    def test_list_and_clear(self) -> None:
        with tempfile.TemporaryDirectory() as raw:
            home = Path(raw)
            gone = deleted_dir(home)
            gone.mkdir(parents=True)
            (gone / "workbench-spec").mkdir()
            (gone / "workbench-scaffold").write_text("tombstone", encoding="utf-8")
            (gone / "other").mkdir()

            found = list_tombstones(["workbench-spec", "workbench-scaffold"], home)
            self.assertEqual(found, ["workbench-scaffold", "workbench-spec"])

            cleared = clear_tombstones(found, home)
            self.assertEqual(sorted(cleared), ["workbench-scaffold", "workbench-spec"])
            self.assertTrue((gone / "other").exists())
            self.assertFalse((gone / "workbench-spec").exists())
            self.assertFalse((gone / "workbench-scaffold").exists())

    def test_refuses_path_escape(self) -> None:
        with tempfile.TemporaryDirectory() as raw:
            home = Path(raw)
            deleted_dir(home).mkdir(parents=True)
            self.assertEqual(clear_tombstones(["../etc"], home), [])
            self.assertEqual(clear_tombstones(["default"], home), [])

    def test_hermes_home_env(self) -> None:
        with tempfile.TemporaryDirectory() as raw:
            self.assertEqual(hermes_home(raw), Path(raw))


if __name__ == "__main__":
    unittest.main()
