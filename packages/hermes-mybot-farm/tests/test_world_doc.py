from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

import plugin_import  # noqa: F401

from hermes_mybot_farm.plant import build_plant_plan  # noqa: E402
from hermes_mybot_farm.world_doc import (  # noqa: E402
    append_world_memory,
    compose_world_doc,
    world_skin_block,
)

WORLD = {
    "schema": "worlds/v1",
    "title": "Neon Harbor",
    "thumbnail": "/packs/worlds/neon-harbor.webp",
    "theme": {"mood": "rain on the docks"},
    "places": [
        {"id": "dock", "name": "The Dock", "present": ["night-watch", "harbor-engineer"], "connects": ["workshop"]},
        {"id": "workshop", "name": "The Workshop", "present": ["harbor-engineer"], "connects": ["dock"]},
    ],
    "cast": [
        {
            "role": "harbor-engineer",
            "name": "Patch",
            "home": "workshop",
            "capabilities": ["files", "execute_bash"],
            "relationships": {"night-watch": "trusts the watch"},
        },
        {"role": "night-watch", "name": "Probe", "home": "dock"},
    ],
    "rules": {"turnModel": "defer", "ambient": True},
    "entrypoint": {"place": "dock", "greeter": "night-watch"},
}


class WorldDocTests(unittest.TestCase):
    def test_compose_names_places_and_keeps_capabilities_advisory(self) -> None:
        doc = compose_world_doc(WORLD, "neon-harbor")
        self.assertIn("# Neon Harbor — world", doc)
        self.assertIn("The Workshop (workshop)", doc)
        self.assertIn("**Entry:** scene opens in The Dock (dock)", doc)
        self.assertIn("the **night-watch** greets first", doc)
        self.assertIn("capabilities (advisory only): files", doc)
        self.assertNotIn("execute_bash", doc)
        self.assertIn("routines are NOT scheduled", doc)
        self.assertIn("does not add tools", doc)

    def test_skin_uses_place_name_and_greeter(self) -> None:
        patch = world_skin_block(
            WORLD, "neon-harbor", role="harbor-engineer", profile_name="patch", world_doc_path="/tmp/WORLD.md"
        )
        probe = world_skin_block(
            WORLD, "neon-harbor", role="night-watch", profile_name="probe", world_doc_path="/tmp/WORLD.md"
        )
        self.assertIn("You are **Patch**", patch)
        self.assertIn("You live in **The Workshop**.", patch)
        self.assertNotIn("You live in **workshop**", patch)
        self.assertNotIn("greet newcomers", patch)
        self.assertIn("You greet newcomers when the scene opens.", probe)
        self.assertIn("advisory only", patch)

    def test_append_replaces_the_same_world_block(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            profile = Path(tmp) / "patch"
            (profile / "memories").mkdir(parents=True)
            (profile / "memories" / "MEMORY.md").write_text("existing\n", encoding="utf-8")
            first = world_skin_block(
                WORLD, "neon-harbor", role="harbor-engineer", profile_name="patch", world_doc_path="WORLD.md"
            )
            self.assertTrue(append_world_memory(profile, "neon-harbor", first))
            second = first.replace("The Workshop", "The Drydock")
            self.assertTrue(append_world_memory(profile, "neon-harbor", second))
            text = (profile / "memories" / "MEMORY.md").read_text(encoding="utf-8")
            self.assertEqual(text.count("<!-- mybot.farm world:neon-harbor -->"), 1)
            self.assertIn("existing", text)
            self.assertIn("The Drydock", text)
            self.assertNotIn("The Workshop", text)

    def test_world_plan_includes_scene_doc(self) -> None:
        stall = {"kind": "world", "slug": "neon-harbor", "members": []}
        pack = {
            "format": "mybot.farm/world-pack",
            "slug": "neon-harbor",
            "members": [{"role": "harbor-engineer", "summary": "Patch", "pack": "agents/patch.json"}],
            "world": WORLD,
        }
        plan = build_plant_plan(stall, pack, "https://mybot.farm")
        self.assertTrue(str(plan.world_doc).endswith("/worlds/neon-harbor/WORLD.md"))


if __name__ == "__main__":
    unittest.main()
