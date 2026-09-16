# Hermes Team Stalls: Bundle Shape, Download Shape & Install Contract

Reference doc for publishing a Hermes multi-agent team (or single agent) as a
mybot.farm stall. Written from the live **Workbench v1.1 ejection test**
(2026-09-15): the team was fully ejected from the source machine, re-downloaded
from `https://mybot.farm/teams/workbench`, reinstalled, and ran a live
functional handoff (build → QA auto-promotion → verdict) with the re-imported
profiles on a freshly created board.

---

## 1. What "download shape" means on the site

A team stall exposes **9 artifacts**, all under one URL namespace:

```
https://mybot.farm/packs/teams/<slug>/
├── <slug>.json                          ← NOT here (see below)
├── <slug>-member-A.hermes.tar.gz        ← profile A (scrubbed)
├── <slug>-member-B.hermes.tar.gz        ← profile B (scrubbed)
├── <slug>-member-C.hermes.tar.gz        ← profile C (scrubbed)
├── TEAM.md                              ← portable team memory / protocol
├── WORK.md                              ← shipped record + backlog notes
└── workbench_cron*.sh (or similar)      ← heartbeat scripts (if the team has one)

https://mybot.farm/packs/teams/<slug>.json   ← the GAF team pack (manifest)
```

The GAF pack lives at `/packs/teams/<slug>.json` — **a sibling of the directory,
not inside it**. The `packsBySlug` registration in `pack-files.ts` imports it;
the static dir holds the tarballs + team files.

### WebMCP / API surface (what an installer agent actually calls)

| Tool | Endpoint | Returns |
|------|----------|---------|
| `search_stalls` | `GET /api/stalls?q=…&kind=team` | matching stalls w/ slugs |
| `get_stall` | `GET /api/stalls/<slug>` | metadata + **member tarball hrefs** + `api` block with all other paths |
| `download_pack` | `GET /api/packs/<slug>` | the GAF JSON (same as static path) |
| `list_pack_skills` | `GET /api/packs/<slug>/skills` | curated team skills (name/description/content) |
| `get_install_prompt` | `GET /api/install-prompt/<slug>[?short=1]` | ready-to-paste install prompt (Grok-Bot/WebMCP) |

A correct install flow is fully expressible against these:
`search_stalls → get_stall (member hrefs) → download_pack (manifest: gettingStarted, shared.memory, members) → download each member tarball + the team files listed in gettingStarted → hermes profile import ×N → follow gettingStarted`.

---

## 2. What a profile tarball must contain (bundle shape)

Produced by `hermes profile export <name>` + `scripts/scrub.py` + endpoint
neutralization. **Required** for the agent to function:

| Path in archive | Why it's required |
|-----------------|-------------------|
| `<name>/SOUL.md` | Role charter + team-protocol pointer. Without it the agent is a generic assistant. |
| `<name>/config.yaml` | Self-contained model/provider config (profiles don't inherit the host's). Endpoints must be a placeholder (`https://SET_YOUR_ENDPOINT/v1`) — the installer fills in their endpoint. |
| `<name>/memories/MEMORY.md` | Thin pointer: where the team memory lives, who the teammates are, cron overview. This is what re-orients a fresh profile in one read. |
| `<name>/skills/…` | The agent's skill library, **including any learned team skills** (e.g. `workbench-card-build`). These carry the hard-won lessons that make performance survive a fresh install. |

**Must NOT ship** (scrub.py drops these; verify every pack):
- `state.db`, sessions, `state-snapshots/` — episodic memory, machine-local, and a context-bloat vector
- `lsp/`, `wisdom/`, `runtime/`, `sandboxes/`, `home/`, caches, logs, `__pycache__`, `node_modules`
- anything with real endpoints, keys, or usernames (final leak-rescan after every pack build)
- config backups / `state-snapshots` (they contain un-redacted endpoints)

Target size: ~900KB per profile. A pack in the tens of MB almost certainly
carried machine-local state.

## 2b. What the team dir must contain (ships as plain files)

- **`TEAM.md`** — the portable team memory: roster, roles, card/task flow,
  handoff protocol, quality bar, escalation, cron table. This is the file that
  makes N agents read as a team instead of N solos.
- **`WORK.md`** — shipped history + user backlog notes.
- **Cron scripts** — the heartbeat (one runner + one wrapper per job), with a
  detach pattern so long agent runs can't be killed by the script timeout.
- The **live coordination state is NOT shipped** (by design): for the Workbench
  that's the kanban board (machine-local SQLite, created at install time).

## 2c. What the GAF team pack must carry

- `format: mybot.farm/team-pack`, `version`, `runtime: ["hermes"]`
- `members[]`: role + summary + `pack` path (relative tarball path)
- `shared.gettingStarted`: **the complete install procedure** — import each
  profile, recreate the team workspace, fetch the team files from the live URL,
  set endpoints, create the coordination substrate, install + schedule cron.
- `shared.memory[]`: the one-line team invariants
- `topology.handoffs[]`: the pipeline, in prose
- `skills[]`: curated team skills (for the stall's skills tab / WebMCP)

---

## 3. Gaps found by the ejection test (2026-09-15)

The live download was **byte-complete** (all 9 artifacts present, tarballs
hash-identical to the source pack), and the team reinstalled and ran a full
functional handoff. Status after PR #18 (`fix/workbench-v1.1-gaf`) and the
Hermes installer plugin:

### GAP 1 (HIGH) — GAF `shared.gettingStarted` missing the kanban step — **fixed in PR #18**
Live `GET /api/packs/workbench` gettingStarted now includes
`hermes kanban boards create workbench`.

### GAP 2 (MEDIUM) — same-name re-import hits a name tombstone — **open upstream; plugin automates the workaround**
Hermes records profile deletion as a tombstone under
`~/.hermes/profiles/.deleted/<name>`. `hermes profile import --name <existing
deleted name>` extracts the files and prints success, but the profile stays
invisible (not in `profile list`, not spawnable by the kanban dispatcher:
"Skipped (non-spawnable assignee)"). The import did not clear the tombstone.

**Workaround:** `rm ~/.hermes/profiles/.deleted/<name>` after import (or before
the next import). **Automated:** the Hermes `mybot-farm` plugin
(`packages/hermes-mybot-farm`, docs: [hermes-plugin.md](./hermes-plugin.md),
install: `/install/hermes`) always clears matching tombstones before
`hermes profile import`, and `farm_reinstall` / `scripts/clear-tombstones.py`
cover clean re-installs. After `force` deletes (which create new tombstones),
it clears those too, then verifies `hermes profile list` before success.
**Upstream:** `hermes profile import` should `clear_named_profile_deleted` for the
target name.

### GAP 3 (MEDIUM) — GAF `skills[]` stale v1.0 — **fixed in PR #18**
Live pack skills are `workbench-team` and `workbench-card-build` (kanban protocol).

### Non-gaps verified OK
- TEAM.md/WORK.md/cron scripts all served live from the pack dir (byte-identical)
- the **tarballs** carry the correct v1.1 skills intact (`workbench-team`,
  `workbench-card-build`)
- tarballs import cleanly; SOULs/skills/memories intact; endpoints
  placeholder-neutralized; no secret leaks in any artifact
- board created at install time; dispatcher spawned the re-imported profiles
  correctly; parent→child QA handoff auto-promoted; QA verdict PASS with
  evidence attached — the reinstalled team works end-to-end

### Installer plugin

Prefer `farm_search` → `farm_get_stall` → `farm_get_pack` → `farm_plant` /
`farm_reinstall` over a hand-rolled gettingStarted walk. See
[hermes-plugin.md](./hermes-plugin.md).

---

## 4. Check-list for shipping a team stall

**Bundle (pre-publish):**
- [ ] Each profile: SOUL.md + config.yaml (endpoint placeholder) +
      memories/MEMORY.md + skills (incl. learned team skills)
- [ ] Scrub: no state.db/sessions/caches/lsp/wisdom/node_modules; config
      backups dropped; final regex leak-scan (LAN IPs, keys, usernames) clean
- [ ] Team files present: TEAM.md (protocol), WORK.md (record), cron scripts
      (executable bits set)
- [ ] GAF team JSON: members[] → correct relative tarball paths;
      shared.gettingStarted matches the CURRENT version's install steps
      (incl. any coordination-substrate creation step); shared.memory[];
      topology.handoffs[]; skills[] curated
- [ ] `pack-files.ts` registration + `packs.ts` stall entry (kind "team",
      member hrefs → static tarball paths)
- [ ] `tsc --noEmit` clean; dev-server routes 200; push + deploy

**Post-publish (this test's flow — keep it):**
- [ ] Live check: `/api/stalls/<slug>`, `/api/packs/<slug>`,
      `/api/packs/<slug>/skills`, `/api/install-prompt/<slug>` all 200
- [ ] Every artifact under `/packs/teams/<slug>/` + `<slug>.json` → 200
- [ ] Hash-compare live tarballs vs the published local pack (must be identical)
- [ ] Ejection test on a scratch machine (or the origin): delete profiles +
      board + team dir + cron; reinstall from the live URL only; verify
      `profile list` shows all members (watch GAP 2); run one trivial
      build→QA card; require verdict PASS before declaring the stall shippable.
