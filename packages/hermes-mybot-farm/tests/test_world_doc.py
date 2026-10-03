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

    def test_shared_text_in_files_skin_is_per_member(self) -> None:
        # Task 7: the shared scene lives in WORLD.md (a file); each member's
        # OWN MEMORY.md gets its character skin. The cast must NOT be made to
        # read a SEPARATE profile's MEMORY.md (portability spec §11.4 — that
        # file is small and frozen). So: a skin lands in each member profile,
        # the WORLD.md scene is shared, and no extra "world"/"shared" profile
        # dir is created to hold shared text.
        with tempfile.TemporaryDirectory() as tmp:
            home = Path(tmp)
            profiles = home / "profiles"
            # Only the two cast members exist as profiles.
            for name in ("patch", "probe"):
                (profiles / name / "memories").mkdir(parents=True)

            members = {"harbor-engineer": "patch", "night-watch": "probe"}
            for role, prof in members.items():
                block = world_skin_block(
                    WORLD, "neon-harbor", role=role, profile_name=prof,
                    world_doc_path="../../worlds/neon-harbor/WORLD.md",
                )
                self.assertTrue(append_world_memory(profiles / prof, "neon-harbor", block))

            # (a) Each member got ITS OWN skin in ITS OWN MEMORY.md.
            patch_mem = (profiles / "patch" / "memories" / "MEMORY.md").read_text()
            probe_mem = (profiles / "probe" / "memories" / "MEMORY.md").read_text()
            self.assertIn("You are **Patch**", patch_mem)
            self.assertIn("You are **Probe**", probe_mem)
            self.assertNotIn("You are **Probe**", patch_mem)  # not cross-contaminated

            # (b) Shared scene text is the WORLD.md FILE, pointed at from the
            #     skin — not duplicated into a profile's memory.
            self.assertIn("worlds/neon-harbor/WORLD.md", patch_mem)
            doc = compose_world_doc(WORLD, "neon-harbor")
            self.assertIn("# Neon Harbor — world", doc)

            # (c) NO separate "world"/"shared" profile was created to hold the
            #     shared text — only the real cast members exist.
            created = sorted(p.name for p in profiles.iterdir() if p.is_dir())
            self.assertEqual(created, ["patch", "probe"])
            for stray in ("world", "shared", "neon-harbor", "_world"):
                self.assertFalse((profiles / stray).exists(),
                                 f"unexpected shared profile '{stray}' was created")


if __name__ == "__main__":
    unittest.main()
