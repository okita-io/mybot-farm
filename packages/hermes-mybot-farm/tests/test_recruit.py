from __future__ import annotations

import json
import tempfile
import unittest
from contextlib import contextmanager
from pathlib import Path
from unittest.mock import patch

import plugin_import  # noqa: F401

from hermes_mybot_farm.cli import _parse_flags  # noqa: E402
from hermes_mybot_farm.farm_tools import _plant_args, _plant_text, farm_plant  # noqa: E402
from hermes_mybot_farm.plant import PlantResult, plant, reinstall  # noqa: E402
from hermes_mybot_farm.schemas import FARM_PLANT, FARM_REINSTALL  # noqa: E402
from hermes_mybot_farm.yamlutil import atomic_yaml_write, load_yaml_dict  # noqa: E402

AGENT_STALL = {
    "kind": "agent",
    "slug": "scholastic-research",
    "name": "Scholastic Research",
    "downloadHref": "/packs/agents/scholastic-research.hermes.tar.gz",
    "packUrl": "https://mybot.farm/packs/agents/scholastic-research.hermes.tar.gz",
    "pageUrl": "https://mybot.farm/agents/scholastic-research",
}

AGENT_PACK = {
    "format": "mybot.farm/agent-pack",
    "runtime": ["hermes"],
    "slug": "scholastic-research",
    "manifest": {"homepage": "https://mybot.farm/agents/scholastic-research"},
}

TEAM_STALL = {
    "kind": "team",
    "slug": "smoke-crew",
    "name": "Smoke Crew",
    "members": [
        {"name": "patch", "href": "/packs/agents/patch.hermes.tar.gz"},
        {"name": "probe", "href": "/packs/agents/probe.hermes.tar.gz"},
    ],
}

TEAM_PACK = {
    "format": "mybot.farm/team-pack",
    "slug": "smoke-crew",
    "runtime": ["hermes"],
    "members": [
        {"role": "programmer", "summary": "Implements.", "pack": "agents/patch.json"},
        {"role": "debugger", "summary": "Verifies.", "pack": "agents/probe.json"},
    ],
    "shared": {"gettingStarted": "Install Patch and Probe."},
}


@contextmanager
def planted_home(stall: dict, pack: dict, *, write_profile: bool = True):
    with tempfile.TemporaryDirectory() as raw:
        home = Path(raw)
        listed: list[str] = []

        def fake_import(_archive: str, name: str) -> str:
            if write_profile:
                dest = home / "profiles" / name
                dest.mkdir(parents=True, exist_ok=True)
                atomic_yaml_write(dest / "profile.yaml", {"model": {"provider": "test"}})
            if name not in listed:
                listed.append(name)
            return name

        def fake_download(_url: str, dest: Path, **_kwargs) -> None:
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(b"fake-tarball")

        with (
            patch("hermes_mybot_farm.plant.get_stall", return_value=stall),
            patch("hermes_mybot_farm.plant.get_pack", return_value=pack),
            patch("hermes_mybot_farm.plant.hermes_home", return_value=home),
            patch("hermes_mybot_farm.plant.list_profiles", side_effect=lambda: list(listed)),
            patch("hermes_mybot_farm.plant.import_profile", side_effect=fake_import),
            patch("hermes_mybot_farm.plant._download", side_effect=fake_download),
            patch("hermes_mybot_farm.team_plant.gateway_looks_running", return_value=False),
        ):
            yield home


class RecruitPlantTests(unittest.TestCase):
    def test_plain_plant_does_not_stamp_bot_marker(self) -> None:
        with planted_home(AGENT_STALL, AGENT_PACK) as home:
            result = plant("scholastic-research")
            self.assertTrue(result.ok)
            self.assertEqual(result.recruited, [])
            cfg = load_yaml_dict(home / "profiles" / "scholastic-research" / "profile.yaml")
            self.assertNotIn("ui_meta", cfg)
            self.assertEqual(cfg["model"], {"provider": "test"})

    def test_recruit_stamps_bot_marker_and_reports_roster(self) -> None:
        with planted_home(AGENT_STALL, AGENT_PACK) as home:
            result = plant("scholastic-research", recruit=True)
            self.assertTrue(result.ok)
            self.assertEqual(result.recruited, ["scholastic-research"])
            cfg = load_yaml_dict(home / "profiles" / "scholastic-research" / "profile.yaml")
            bot = cfg["ui_meta"]["hermes-bots"]
            self.assertTrue(bot["custom"])
            self.assertEqual(bot["title"], "Scholastic Research")
            self.assertFalse(bot.get("groups"))
            self.assertEqual(cfg["model"], {"provider": "test"})
            joined = "\n".join(result.notes)
            self.assertIn("Recruit:", joined)
            self.assertIn("scholastic-research", joined)

    def test_recruit_uses_name_override(self) -> None:
        with planted_home(AGENT_STALL, AGENT_PACK) as home:
            result = plant("scholastic-research", name="solo-scholar", recruit=True)
            self.assertEqual(result.recruited, ["solo-scholar"])
            self.assertTrue(
                (home / "profiles" / "solo-scholar" / "profile.yaml").is_file()
            )

    def test_recruit_dry_run_does_not_write_profile(self) -> None:
        with planted_home(AGENT_STALL, AGENT_PACK) as home:
            result = plant("scholastic-research", recruit=True, dry_run=True)
            self.assertTrue(result.ok)
            self.assertTrue(result.dry_run)
            self.assertEqual(result.recruited, [])
            self.assertFalse((home / "profiles").exists())
            self.assertIn("Desktop Bots roster", "\n".join(result.notes))

    def test_recruit_fails_when_profile_dir_missing(self) -> None:
        with planted_home(AGENT_STALL, AGENT_PACK, write_profile=False):
            result = plant("scholastic-research", recruit=True)
            self.assertFalse(result.ok)
            self.assertEqual(result.recruited, [])
            self.assertIn("could not write its profile.yaml", result.error or "")

    def test_team_plant_ignores_recruit_flag(self) -> None:
        with planted_home(TEAM_STALL, TEAM_PACK) as home:
            with patch("hermes_mybot_farm.team_plant.recruit_agent_bot") as recruit_solo:
                result = plant("smoke-crew", recruit=True)
            recruit_solo.assert_not_called()
            self.assertTrue(result.ok)
            self.assertEqual(result.recruited, [])
            for name in ("patch", "probe"):
                bot = load_yaml_dict(home / "profiles" / name / "profile.yaml")["ui_meta"][
                    "hermes-bots"
                ]
                self.assertIn("smoke-crew", bot["groups"])

    def test_reinstall_forwards_recruit(self) -> None:
        with planted_home(AGENT_STALL, AGENT_PACK) as home:
            result = reinstall("scholastic-research", recruit=True)
            self.assertTrue(result.ok)
            self.assertEqual(result.recruited, ["scholastic-research"])
            self.assertIn("reinstall path", "\n".join(result.notes))
            bot = load_yaml_dict(
                home / "profiles" / "scholastic-research" / "profile.yaml"
            )["ui_meta"]["hermes-bots"]
            self.assertTrue(bot["custom"])


class RecruitWiringTests(unittest.TestCase):
    def test_plant_args_and_tool_text(self) -> None:
        self.assertEqual(
            _plant_args({"slug": "x", "recruit": True}),
            {
                "name": None,
                "force": False,
                "clean": False,
                "dry_run": False,
                "recruit": True,
            },
        )
        text = _plant_text(
            PlantResult(
                ok=True,
                slug="scholastic-research",
                kind="agent",
                profiles=["scholastic-research"],
                recruited=["scholastic-research"],
            )
        )
        self.assertIn("Recruited into the Bots roster: scholastic-research", text)

    def test_farm_plant_passes_recruit(self) -> None:
        fake = PlantResult(
            ok=True,
            slug="scholastic-research",
            kind="agent",
            profiles=["scholastic-research"],
            recruited=["scholastic-research"],
        )
        with patch("hermes_mybot_farm.farm_tools.plant", return_value=fake) as planted:
            raw = farm_plant({"slug": "scholastic-research", "recruit": True})
        planted.assert_called_once()
        self.assertTrue(planted.call_args.kwargs["recruit"])
        payload = json.loads(raw)
        self.assertTrue(payload["ok"])
        self.assertEqual(payload["recruited"], ["scholastic-research"])
        self.assertIn("Recruited into the Bots roster", payload["text"])

    def test_cli_parses_recruit_flag(self) -> None:
        rest, flags = _parse_flags(["scholastic-research", "--recruit", "--dry-run"])
        self.assertEqual(rest, ["scholastic-research"])
        self.assertTrue(flags["recruit"])
        self.assertTrue(flags["dry_run"])

    def test_tool_schemas_declare_recruit(self) -> None:
        self.assertIn("recruit", FARM_PLANT["parameters"]["properties"])
        self.assertIn("recruit", FARM_REINSTALL["parameters"]["properties"])
        self.assertIn("recruit=true", FARM_PLANT["description"])


if __name__ == "__main__":
    unittest.main()
