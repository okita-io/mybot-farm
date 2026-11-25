# 2026-11-24 team-pack audit

Audited the three catalog teams with downloads (Neon `stall_stats`, read 2026-11-24):
`gis-spatial-desk` (2), `finance-office` (1), `career-desk` (1), plus their 12 member agents.

These scripts made every pack edit in this change, so a reviewer can re-run them on a
clean checkout of the parent commit and get byte-identical output:

```bash
python3 agent-conversion/audit-2026-11-24/apply_audit.py .       # 12 agents: JSON x2, agency catalog, .hermes.tar.gz x2
python3 agent-conversion/audit-2026-11-24/apply_team_audit.py .  # 3 teams: JSON x2, team catalog
python3 scripts/gen_team_md.py                                    # TEAM.md for the 3 teams (others unchanged)
```

`convert_one.py` (the original tarball builder) is not in this repo, so `apply_audit.py`
edits the existing archives in place: same layout, fixed mtime, uid/gid 0, no owner names.

Verification run: `scripts/scrub.py` on every rebuilt archive (pass, 0 high-confidence hits),
`python3 -m unittest discover -s packages/hermes-mybot-farm/tests` (108 OK),
`python3 scripts/import-agency-agents/test_convert.py`, `npm test` in `web/` (123 pass),
`tsc --noEmit` and ESLint on the touched web files.

Production pulls `agents/` and `teams/` from `okita-io/mybot-farm-catalog` at build time
(`web/scripts/pull-catalog.sh`). Copy the changed files under `packs/agents/` and `packs/teams/`
into that repo too, or production keeps serving the old archives.
