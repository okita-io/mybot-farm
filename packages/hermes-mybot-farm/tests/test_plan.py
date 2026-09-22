from __future__ import annotations

import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import plugin_import  # noqa: F401

from hermes_mybot_farm.plant import (  # noqa: E402
    PlantError,
    PlantPlan,
    _ensure_team_dirs,
    _fetch_team_files,
    build_plant_plan,
    confined_path,
    expand_braces,
    member_archive_href,
    parse_kanban,
    parse_pack_dir_url,
    parse_team_dirs,
    parse_team_files,
    plant,
    safe_slug,
    target_profile_names,
)

WORKBENCH_STALL = {
    "kind": "team",
    "slug": "workbench",
    "pageUrl": "https://mybot.farm/teams/workbench",
    "downloadHref": "/packs/teams/workbench.json",
    "packUrl": "https://mybot.farm/packs/teams/workbench.json",
    "members": [
        {"name": "Spec", "href": "/packs/teams/workbench/workbench-spec.hermes.tar.gz"},
        {"name": "Scaffold", "href": "/packs/teams/workbench/workbench-scaffold.hermes.tar.gz"},
        {"name": "Smoke", "href": "/packs/teams/workbench/workbench-smoke.hermes.tar.gz"},
    ],
}

WORKBENCH_PACK = {
    "format": "mybot.farm/team-pack",
    "version": "0.1",
    "runtime": ["hermes"],
    "slug": "workbench",
    "members": [
        {"role": "spec", "pack": "teams/workbench/workbench-spec.hermes.tar.gz", "slug": "workbench-spec"},
        {"role": "scaffold", "pack": "teams/workbench/workbench-scaffold.hermes.tar.gz"},
        {"role": "qa", "pack": "teams/workbench/workbench-smoke.hermes.tar.gz"},
    ],
    "shared": {
        "gettingStarted": (
            "Install order:\n"
            "1. Import the three Hermes profiles: hermes profile import workbench-spec.hermes.tar.gz "
            "--name workbench-spec (repeat for scaffold and smoke). Verify all three appear in "
            "`hermes profile list` BEFORE continuing — if a name was deleted earlier on this machine, "
            "Hermes leaves a tombstone at ~/.hermes/profiles/.deleted/<name> that import does not clear; "
            "remove the stale .deleted/<name> entries and re-check.\n"
            "2. Recreate the team workspace: mkdir -p ~/.hermes/teams/workbench/{reports,repos,state}.\n"
            "3. Download TEAM.md, WORK.md, and workbench_cron*.sh from https://mybot.farm/packs/teams/workbench/ "
            "and copy TEAM.md plus WORK.md into the workspace.\n"
            "4. Create the kanban board — v1.1's coordination substrate; the team's cron jobs and handoffs depend on it:\n"
            '   hermes kanban boards create workbench --name "Workbench team"  (idempotent: check `hermes kanban boards list` first)\n'
            "5. In each ~/.hermes/profiles/workbench-*/config.yaml, replace https://SET_YOUR_ENDPOINT/v1 with your LLM endpoint.\n"
        )
    },
    "manifest": {"homepage": "https://mybot.farm/teams/workbench"},
}

SCHOLASTIC_STALL = {
    "kind": "agent",
    "slug": "scholastic-research",
    "downloadHref": "/packs/agents/scholastic-research.hermes.tar.gz",
    "packUrl": "https://mybot.farm/packs/agents/scholastic-research.hermes.tar.gz",
    "pageUrl": "https://mybot.farm/agents/scholastic-research",
}

SCHOLASTIC_PACK = {
    "format": "mybot.farm/agent-pack",
    "runtime": ["hermes"],
    "slug": "scholastic-research",
    "manifest": {"homepage": "https://mybot.farm/agents/scholastic-research"},
}

GAF_STALL = {
    "kind": "agent",
    "slug": "frontend-developer",
    "downloadHref": "/packs/agents/frontend-developer.json",
    "packUrl": "https://mybot.farm/packs/agents/frontend-developer.json",
}

GAF_PACK = {
    "format": "mybot.farm/agent-pack",
    "runtime": ["grok-bot"],
    "slug": "frontend-developer",
}


class PlanTests(unittest.TestCase):
    def test_expand_braces(self) -> None:
        paths = expand_braces("~/.hermes/teams/workbench/{reports,repos,state}")
        self.assertEqual(
            paths,
            [
                "~/.hermes/teams/workbench/reports",
                "~/.hermes/teams/workbench/repos",
                "~/.hermes/teams/workbench/state",
            ],
        )

    def test_parse_kanban(self) -> None:
        plan = parse_kanban(WORKBENCH_PACK["shared"]["gettingStarted"], "workbench")
        self.assertIsNotNone(plan)
        assert plan is not None
        self.assertEqual(plan.slug, "workbench")
        self.assertEqual(plan.name, "Workbench team")

    def test_parse_team_dirs_and_files(self) -> None:
        gs = WORKBENCH_PACK["shared"]["gettingStarted"]
        dirs = parse_team_dirs(gs, "workbench")
        self.assertIn("~/.hermes/teams/workbench/reports", dirs)
        files = parse_team_files(gs, "workbench")
        self.assertIn("TEAM.md", files)
        self.assertIn("WORK.md", files)
        self.assertIn("workbench_cron_standup.sh", files)

    def test_workbench_plan(self) -> None:
        plan = build_plant_plan(WORKBENCH_STALL, WORKBENCH_PACK, "https://mybot.farm")
        self.assertEqual(plan.kind, "team")
        self.assertEqual(
            target_profile_names(plan),
            ["workbench-spec", "workbench-scaffold", "workbench-smoke"],
        )
        self.assertTrue(plan.members[0].href.endswith("workbench-spec.hermes.tar.gz"))
        self.assertIsNotNone(plan.kanban)
        self.assertTrue(plan.pack_dir_url.endswith("/packs/teams/workbench/"))
        self.assertIn("SET_YOUR_ENDPOINT", plan.endpoint_note)

    def test_scholastic_plan(self) -> None:
        plan = build_plant_plan(SCHOLASTIC_STALL, SCHOLASTIC_PACK, "https://mybot.farm")
        self.assertEqual(plan.kind, "agent")
        self.assertEqual(target_profile_names(plan), ["scholastic-research"])
        self.assertIsNone(plan.kanban)

    def test_gaf_json_rejected(self) -> None:
        with self.assertRaises(PlantError) as ctx:
            build_plant_plan(GAF_STALL, GAF_PACK, "https://mybot.farm")
        self.assertIn("not a Hermes profile archive", str(ctx.exception))

    def test_gaf_with_hermes_href(self) -> None:
        stall = {
            **GAF_STALL,
            "hermesHref": "/packs/agents/frontend-developer.hermes.tar.gz",
        }
        pack = {**GAF_PACK, "runtime": ["grok-bot", "openclaw", "hermes"]}
        plan = build_plant_plan(stall, pack, "https://mybot.farm")
        self.assertEqual(plan.kind, "agent")
        self.assertTrue(
            plan.members[0].href.endswith("frontend-developer.hermes.tar.gz")
        )

    def test_gaf_runtime_hermes_uses_sibling_tarball(self) -> None:
        pack = {**GAF_PACK, "runtime": ["grok-bot", "hermes"]}
        plan = build_plant_plan(GAF_STALL, pack, "https://mybot.farm")
        self.assertTrue(
            plan.members[0].href.endswith(
                "/packs/agents/frontend-developer.hermes.tar.gz"
            )
        )

    def test_list_boards_imported_for_team_plant(self) -> None:
        import hermes_mybot_farm.plant as plant_mod

        self.assertTrue(callable(plant_mod.list_boards))
        self.assertTrue(callable(plant_mod.create_board))

    def test_member_json_resolves_to_sibling_tarball(self) -> None:
        href = member_archive_href("agents/patch.json", "https://mybot.farm")
        self.assertTrue(href.endswith("/packs/agents/patch.hermes.tar.gz"))
        slug_href = member_archive_href("patch", "https://mybot.farm")
        self.assertTrue(slug_href.endswith("/packs/agents/patch.hermes.tar.gz"))

    def test_posted_team_of_catalog_agents_plans_member_tarballs(self) -> None:
        stall = {
            "kind": "team",
            "slug": "smoke-crew",
            "pageUrl": "https://mybot.farm/teams/smoke-crew",
            "members": [
                {"name": "programmer", "href": "/packs/agents/patch.hermes.tar.gz"},
                {"name": "debugger", "href": "/packs/agents/probe.hermes.tar.gz"},
            ],
        }
        pack = {
            "format": "mybot.farm/team-pack",
            "slug": "smoke-crew",
            "runtime": ["hermes"],
            "members": [
                {"role": "programmer", "summary": "Implements.", "pack": "agents/patch.json"},
                {"role": "debugger", "summary": "Verifies.", "pack": "agents/probe.json"},
            ],
            "shared": {"gettingStarted": "Install Patch and Probe."},
        }
        plan = build_plant_plan(stall, pack, "https://mybot.farm")
        self.assertEqual(plan.kind, "team")
        self.assertEqual(target_profile_names(plan), ["patch", "probe"])

    def test_team_without_archives_explains_gap(self) -> None:
        stall = {"kind": "team", "slug": "paper-crew", "downloadHref": "/api/packs/paper-crew"}
        pack = {
            "format": "mybot.farm/team-pack",
            "slug": "paper-crew",
            "members": [
                {
                    "role": "a",
                    "summary": "A",
                    "pack": {"format": "mybot.farm/agent-pack", "profile": {"name": "A"}},
                },
                {
                    "role": "b",
                    "summary": "B",
                    "pack": {"format": "mybot.farm/agent-pack", "profile": {"name": "B"}},
                },
            ],
        }
        with self.assertRaises(PlantError) as ctx:
            build_plant_plan(stall, pack, "https://mybot.farm")
        self.assertIn("no Hermes member archives", str(ctx.exception))
        self.assertIn("farm_post does not upload tarballs", str(ctx.exception))


class PlantSecurityTests(unittest.TestCase):
    def test_safe_slug_accepts_simple_names(self) -> None:
        self.assertEqual(safe_slug("workbench"), "workbench")
        self.assertEqual(safe_slug("scholastic-research"), "scholastic-research")
        self.assertEqual(safe_slug("a_b-1"), "a_b-1")

    def test_safe_slug_rejects_traversal_and_junk(self) -> None:
        for bad in ("../etc", "foo/bar", "foo.bar", "foo bar", "", "..", "foo;rm", "C:\\x"):
            with self.subTest(bad=bad):
                with self.assertRaises(PlantError):
                    safe_slug(bad)

    def test_confined_path_rejects_parent_escape(self) -> None:
        with tempfile.TemporaryDirectory() as raw:
            root = Path(raw)
            with self.assertRaises(PlantError):
                confined_path(root, "..", "etc", "passwd")
            dest = confined_path(root, "teams", "workbench")
            self.assertTrue(str(dest).startswith(str(root.resolve())))

    def test_pack_dir_url_always_pins_farm_origin(self) -> None:
        evil = "Download from https://evil.example/packs/teams/workbench/"
        self.assertEqual(
            parse_pack_dir_url(evil, "https://mybot.farm", "workbench"),
            "https://mybot.farm/packs/teams/workbench/",
        )
        other = "https://mybot.farm/packs/teams/other-slug/"
        self.assertEqual(
            parse_pack_dir_url(other, "https://mybot.farm", "workbench"),
            "https://mybot.farm/packs/teams/workbench/",
        )

    def test_member_href_off_origin_dropped(self) -> None:
        self.assertEqual(
            member_archive_href(
                "https://evil.example/packs/agents/x.hermes.tar.gz",
                "https://mybot.farm",
            ),
            "",
        )

    def test_agent_archive_off_origin_rejected(self) -> None:
        stall = {
            **SCHOLASTIC_STALL,
            "downloadHref": "https://evil.example/x.hermes.tar.gz",
            "hermesHref": "https://evil.example/x.hermes.tar.gz",
        }
        with self.assertRaises(PlantError) as ctx:
            build_plant_plan(stall, SCHOLASTIC_PACK, "https://mybot.farm")
        self.assertIn("farm origin", str(ctx.exception))

    def test_unsafe_stall_slug_rejected(self) -> None:
        stall = {**SCHOLASTIC_STALL, "slug": "../etc"}
        pack = {**SCHOLASTIC_PACK, "slug": "../etc"}
        with self.assertRaises(PlantError):
            build_plant_plan(stall, pack, "https://mybot.farm")

    def test_plant_rejects_unsafe_slug_before_network(self) -> None:
        called = {"n": 0}

        def boom(*_a, **_k):
            called["n"] += 1
            raise AssertionError("must not fetch stall for unsafe slug")

        with patch("hermes_mybot_farm.plant.get_stall", boom):
            with self.assertRaises(PlantError):
                plant("../etc")
        self.assertEqual(called["n"], 0)

    def test_ensure_team_dirs_ignores_seller_mkdir_home(self) -> None:
        with tempfile.TemporaryDirectory() as raw:
            home = Path(raw)
            plan = PlantPlan(
                slug="workbench",
                kind="team",
                profile_name=None,
                members=[],
                team_dirs=["$HOME/evil", "~/.ssh", "/tmp/pwn"],
                team_files=["TEAM.md", "pwn.sh"],
                pack_dir_url="https://evil.example/packs/teams/workbench/",
                kanban=None,
                getting_started="mkdir -p $HOME/evil ~/.hermes/scripts",
                endpoint_note="",
                homepage="",
            )
            root = _ensure_team_dirs(plan, home)
            self.assertEqual(root, (home / "teams" / "workbench").resolve())
            self.assertTrue((root / "reports").is_dir())
            self.assertTrue((root / "repos").is_dir())
            self.assertTrue((root / "state").is_dir())
            self.assertFalse((home / "evil").exists())
            self.assertFalse((home / "scripts").exists())
            self.assertFalse((home / ".ssh").exists())

    def test_fetch_team_files_skips_shell_and_off_origin(self) -> None:
        with tempfile.TemporaryDirectory() as raw:
            home = Path(raw)
            team_root = home / "teams" / "workbench"
            team_root.mkdir(parents=True)
            plan = PlantPlan(
                slug="workbench",
                kind="team",
                profile_name=None,
                members=[],
                team_dirs=[],
                team_files=["TEAM.md", "pwn.sh", "../escape.md"],
                pack_dir_url="https://evil.example/packs/teams/workbench/",
                kanban=None,
                getting_started="",
                endpoint_note="",
                homepage="",
            )
            installed = _fetch_team_files(plan, team_root, base_url="https://mybot.farm")
            self.assertEqual(installed, [])
            self.assertFalse((team_root / "pwn.sh").exists())
            self.assertFalse((home / "scripts").exists())

    def test_fetch_team_files_markdown_only_on_origin(self) -> None:
        downloaded: list[str] = []

        def fake_try(url: str, dest: Path, *, base_url: str) -> bool:
            downloaded.append(dest.name)
            dest.write_text("ok", encoding="utf-8")
            return True

        with tempfile.TemporaryDirectory() as raw:
            team_root = Path(raw) / "teams" / "workbench"
            team_root.mkdir(parents=True)
            plan = PlantPlan(
                slug="workbench",
                kind="team",
                profile_name=None,
                members=[],
                team_dirs=[],
                team_files=["TEAM.md", "WORK.md", "cron.sh"],
                pack_dir_url="https://mybot.farm/packs/teams/workbench/",
                kanban=None,
                getting_started="",
                endpoint_note="",
                homepage="",
            )
            with patch("hermes_mybot_farm.plant._try_download", side_effect=fake_try):
                installed = _fetch_team_files(plan, team_root, base_url="https://mybot.farm")
        self.assertEqual(installed, ["TEAM.md", "WORK.md"])
        self.assertNotIn("cron.sh", downloaded)
        self.assertNotIn("cron.sh", installed)


if __name__ == "__main__":
    unittest.main()
