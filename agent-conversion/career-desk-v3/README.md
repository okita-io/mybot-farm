# Career Desk v3

Replaces the two job-seeker mismatches in `career-desk` (employer-side `recruitment-specialist`, Sales `coach`) with
two original candidate-side agents, and rewires the team. The old two stay in the catalog as standalone agents.

| File | What it is |
|---|---|
| `agents.py` | Content for **Job Search Scout** and **Interview Coach**: persona, 8 skills each, routines (off by default), Hermes SOUL |
| `build.py` | Writes agent JSON + `.hermes.tar.gz` (both mirrors), both catalogs, and the rewired `career-desk` team (packVersion 3) |
| `validate.py` | 150+ structure checks, plus each agent's test scenario (instruction trace + artifact dry-run; no live model) |

```bash
python3 agent-conversion/career-desk-v3/build.py .     # run once on the audit-branch tree (asserts team packVersion 2)
python3 scripts/gen_team_md.py                          # TEAM.md (only career-desk changes)
python3 agent-conversion/career-desk-v3/validate.py .   # needs PyYAML
```

Tool boundary: GAF packs carry no tool list, so it is stated in each pack (core-mission, memory) and enforced for Hermes in
`config.yaml` via `agent.disabled_toolsets` (terminal, browser, code_execution, cronjob, delegation, connections, ...) with
`approvals.mode: smart`. `plugins` is `[]`. Routines ship as prose that starts `OFF BY DEFAULT`.

`updatedAt: 2026-11-24` is set in each pack's `manifest` and on the catalog stall entries (the field `StallDates` already reads).

After merge, copy the new and changed `packs/agents/*` and `packs/teams/career-desk*` into `okita-io/mybot-farm-catalog`.
