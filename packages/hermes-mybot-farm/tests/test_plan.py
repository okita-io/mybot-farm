from __future__ import annotations

import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from plant import (
    PlantError,
    build_plant_plan,
    expand_braces,
    parse_kanban,
    parse_team_dirs,
    parse_team_files,
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
        import plant as plant_mod

        self.assertTrue(callable(plant_mod.list_boards))
        self.assertTrue(callable(plant_mod.create_board))


if __name__ == "__main__":
    unittest.main()
