from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from plant import MemberPlan, PlantPlan, build_plant_plan
from team_md import render_team_md_for_pack, sample_request_from_pack
from team_plant import (
    append_team_memory,
    configure_planted_team,
    ensure_team_md,
    install_team_rules_skill,
    mark_member_bot,
    recruit_agent_bot,
    try_create_group_chat,
    warm_bot_note,
)
from yamlutil import atomic_yaml_write, load_yaml_dict

GODOT = json.loads(
    (Path(__file__).resolve().parents[3] / "packs" / "teams" / "godot-studio.json").read_text(
        encoding="utf-8"
    )
)


def _plan(**kwargs) -> PlantPlan:
    members = kwargs.pop(
        "members",
        [
            MemberPlan("game-designer", "x", role="design-lead", summary="Game Designer — design-lead."),
            MemberPlan("level-designer", "x", role="levels", summary="Level Designer — levels."),
        ],
    )
    return PlantPlan(
        slug=kwargs.get("slug", "godot-studio"),
        kind="team",
        profile_name=None,
        members=members,
        team_dirs=[],
        team_files=["TEAM.md"],
        pack_dir_url="https://mybot.farm/packs/teams/godot-studio/",
        kanban=None,
        getting_started="",
        endpoint_note="SET_YOUR_ENDPOINT",
        homepage="",
        title=kwargs.get("title", "Godot Game Studio"),
        sample_request=kwargs.get(
            "sample_request",
            "Design and build a 5-room 2D roguelike prototype in Godot with one multiplayer co-op mode",
        ),
        topology_kind="pipeline",
        handoffs=["User request → design-lead → levels → human"],
        skills=kwargs.get(
            "skills",
            [
                {
                    "name": "godot-studio-team-rules",
                    "description": "Standing rules",
                    "content": "Stay in lane. Human ships.",
                }
            ],
        ),
    )


class TeamMdTests(unittest.TestCase):
    def test_godot_pack_renders_roster_and_sample(self) -> None:
        text = render_team_md_for_pack(GODOT)
        self.assertIn("# Godot Game Studio", text)
        self.assertIn("`@game-designer`", text)
        self.assertIn("design-lead", text)
        self.assertIn("5-room 2D roguelike", text)
        self.assertIn("nobody ships", text.lower())
        self.assertIn(sample_request_from_pack(GODOT).split()[0], text)

    def test_build_plan_carries_team_protocol(self) -> None:
        stall = {
            "kind": "team",
            "slug": "godot-studio",
            "members": [
                {"name": "Game Designer", "href": "/packs/agents/game-designer.hermes.tar.gz"},
                {"name": "Level Designer", "href": "/packs/agents/level-designer.hermes.tar.gz"},
            ],
        }
        plan = build_plant_plan(stall, GODOT, "https://mybot.farm")
        self.assertEqual(plan.title, "Godot Game Studio")
        self.assertIn("roguelike", plan.sample_request.lower())
        self.assertEqual(plan.members[0].role, "design-lead")
        self.assertTrue(plan.members[0].summary)
        self.assertEqual(plan.skills[0]["name"], "godot-studio-team-rules")


class TeamPlantTests(unittest.TestCase):
    def test_recruit_stamps_bot_marker_on_missing_profile(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            profile_dir = Path(tmp) / "profiles" / "solo-agent"
            profile_dir.mkdir(parents=True)
            self.assertTrue(recruit_agent_bot(profile_dir, title="Solo Agent"))
            cfg = load_yaml_dict(profile_dir / "profile.yaml")
            self.assertIsNotNone(cfg)
            bot = cfg["ui_meta"]["hermes-bots"]
            # Roster / DM-eligibility contract: the marker must satisfy
            # hermes's _is_bot_managed (ui_meta.hermes-bots present).
            self.assertTrue(bot.get("custom"))
            self.assertEqual(bot.get("title"), "Solo Agent")
            self.assertFalse(bot.get("groups"))

    def test_recruit_idempotent_no_duplicate_markers(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            profile_dir = Path(tmp) / "profiles" / "solo-agent"
            profile_dir.mkdir(parents=True)
            recruit_agent_bot(profile_dir, title="Solo Agent")
            recruit_agent_bot(profile_dir, title="Solo Agent")
            cfg = load_yaml_dict(profile_dir / "profile.yaml")
            bot = cfg["ui_meta"]["hermes-bots"]
            self.assertTrue(bot["custom"])
            self.assertEqual(bot["title"], "Solo Agent")
            # Exactly one marker block: the second occurrence of the key lives in
            # hermes's internal _ui_meta_revisions ledger, not a duplicated block.
            raw = (profile_dir / "profile.yaml").read_text(encoding="utf-8")
            self.assertEqual(raw.count("custom: true"), 1)
            self.assertEqual(raw.count("created:"), 1)

    def test_recruit_preserves_existing_profile_config(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            profile_dir = Path(tmp) / "profiles" / "solo-agent"
            profile_dir.mkdir(parents=True)
            atomic_yaml_write(
                profile_dir / "profile.yaml",
                {"model": {"provider": "custom"}, "plugins": {"enabled": ["x"]}},
            )
            recruit_agent_bot(profile_dir, title="Solo Agent")
            cfg = load_yaml_dict(profile_dir / "profile.yaml")
            self.assertEqual(cfg["model"], {"provider": "custom"})
            self.assertEqual(cfg["plugins"], {"enabled": ["x"]})
            self.assertTrue(cfg["ui_meta"]["hermes-bots"]["custom"])

    def test_mark_bot_and_merge_groups(self) -> None:
        with tempfile.TemporaryDirectory() as raw:
            home = Path(raw)
            profile = home / "profiles" / "game-designer"
            profile.mkdir(parents=True)
            atomic_yaml_write(
                profile / "profile.yaml",
                {"ui_meta": {"hermes-bots": {"title": "Existing", "groups": ["other"]}}},
            )
            self.assertTrue(
                mark_member_bot(profile, title="Game Designer", team_slug="godot-studio")
            )
            data = load_yaml_dict(profile / "profile.yaml")
            bots = data["ui_meta"]["hermes-bots"]
            self.assertEqual(bots["title"], "Existing")
            self.assertIn("godot-studio", bots["groups"])
            self.assertIn("other", bots["groups"])
            self.assertTrue(bots.get("custom"))

    def test_memory_and_skill_idempotent(self) -> None:
        with tempfile.TemporaryDirectory() as raw:
            home = Path(raw)
            profile = home / "profiles" / "game-designer"
            profile.mkdir(parents=True)
            team_root = home / "teams" / "godot-studio"
            team_root.mkdir(parents=True)
            plan = _plan()
            self.assertTrue(append_team_memory(profile, plan, team_root))
            self.assertTrue(append_team_memory(profile, plan, team_root))
            text = (profile / "memories" / "MEMORY.md").read_text(encoding="utf-8")
            self.assertEqual(text.count("## Team: Godot Game Studio"), 1)
            self.assertIn("TEAM.md", text)
            self.assertTrue(install_team_rules_skill(profile, plan))
            skill = profile / "skills" / "godot-studio-team-rules" / "SKILL.md"
            self.assertTrue(skill.is_file())
            self.assertIn("Stay in lane", skill.read_text(encoding="utf-8"))

    def test_ensure_team_md_fallback(self) -> None:
        with tempfile.TemporaryDirectory() as raw:
            team_root = Path(raw)
            installed = ensure_team_md(_plan(), team_root, [])
            self.assertIn("TEAM.md", installed)
            text = (team_root / "TEAM.md").read_text(encoding="utf-8")
            self.assertIn("Godot Game Studio", text)
            self.assertIn("@game-designer", text)

    def test_configure_without_gateway_notes_desktop_step(self) -> None:
        with tempfile.TemporaryDirectory() as raw:
            home = Path(raw)
            for name in ("game-designer", "level-designer"):
                (home / "profiles" / name).mkdir(parents=True)
            team_root = home / "teams" / "godot-studio"
            team_root.mkdir(parents=True)
            notes: list[str] = []
            plan = _plan(
                members=[
                    MemberPlan("game-designer", "x", role="design-lead", summary="Game Designer"),
                    MemberPlan("level-designer", "x", role="levels", summary="Level Designer"),
                    MemberPlan("godot-gameplay-scripter", "x", role="gameplay", summary="Scripter"),
                    MemberPlan("godot-shader-developer", "x", role="visuals", summary="Shaders"),
                ]
            )
            (home / "profiles" / "godot-gameplay-scripter").mkdir(parents=True)
            (home / "profiles" / "godot-shader-developer").mkdir(parents=True)
            room = configure_planted_team(
                plan, home, team_root=team_root, notes=notes, gateway_up=False
            )
            self.assertIsNone(room)
            joined = "\n".join(notes)
            self.assertIn("New Group Chat", joined)
            self.assertIn("Warm Bot Backends", joined)
            yaml_text = (home / "profiles" / "game-designer" / "profile.yaml").read_text(
                encoding="utf-8"
            )
            self.assertIn("hermes-bots", yaml_text)
            self.assertIn("godot-studio", yaml_text)

    def test_group_create_when_rpc_works(self) -> None:
        calls: list[tuple[str, dict]] = []

        def rpc(method: str, params: dict) -> dict:
            calls.append((method, params))
            if method == "groups.create":
                return {"room": {"room_id": params["room_id"]}}
            return {}

        room, notes = try_create_group_chat(_plan(), rpc=rpc, gateway_up=True)
        self.assertEqual(room, "godot-studio")
        self.assertEqual(calls[0][0], "groups.create")
        self.assertEqual(calls[1][0], "groups.send")
        self.assertIn("created group chat", notes[0])

    def test_warm_bot_threshold(self) -> None:
        self.assertIsNone(warm_bot_note(3))
        self.assertIn("4", warm_bot_note(4) or "")

    def test_seed_team_md_files_ship(self) -> None:
        repo = Path(__file__).resolve().parents[3]
        seeds = [
            p.stem
            for p in (repo / "packs" / "teams").glob("*.json")
            if p.stem not in {"workbench", "pair-bench", "road-crew"}
        ]
        self.assertEqual(len(seeds), 39)
        for slug in seeds:
            path = repo / "packs" / "teams" / slug / "TEAM.md"
            mirror = repo / "web" / "public" / "packs" / "teams" / slug / "TEAM.md"
            self.assertTrue(path.is_file(), path)
            self.assertTrue(mirror.is_file(), mirror)
            text = path.read_text(encoding="utf-8")
            self.assertIn("## Roster", text)
            self.assertIn("## Handoffs", text)
            self.assertEqual(text, mirror.read_text(encoding="utf-8"))


if __name__ == "__main__":
    unittest.main()
