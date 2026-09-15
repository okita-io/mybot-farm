# Workbench — a 3-agent web-app dev team (Hermes, v1.1)

A portable multi-agent team: **Spec** (requirements) → **Scaffold** (implementation)
→ **Smoke** (QA & release gate), coordinated through a **Hermes kanban board**.

Trained and proven on the source install: shipped two real apps — a live board
status page (after a genuine QA bounce → fix → regression re-check) and a Safeway
hot-sauce catalog (27 real SKUs, QA re-verified against live safeway.com PDPs) —
and **v1.1's handoff itself is verified live**: a probe card went
Scaffold-build → complete → QA task auto-promoted via the parent edge →
Smoke verdict PASS on the running app, with zero manual intervention.

## What's in this pack

| File | What it is |
|------|-----------|
| `TEAM.md` | **The team's portable memory** — roster, roles, the kanban card flow, handoff protocol, quality bar, escalation rules, cron table. Read this first. |
| `WORK.md` | The shipped-history record + user backlog notes (NOT the live board — the board is kanban). |
| `workbench-spec.hermes.tar.gz` | Scrubbed Hermes profile: SOUL (requirements charter), team memory, learned skills, redacted config. |
| `workbench-scaffold.hermes.tar.gz` | Scrubbed profile (implementation charter + the `workbench-card-build` skill, which encodes the "use a worst-case fixture for ordering checks" lesson learned from a real QA bounce). |
| `workbench-smoke.hermes.tar.gz` | Scrubbed profile (QA gate charter: gate-only, evidence-first, never fixes). |
| `workbench_cron*.sh` | The heartbeat scripts (standup 08:00 / QA sweep 12:00+18:00 / harvest 21:00) — v1.1 prompts drive the kanban board. |

All profiles are scrubbed (no sessions, no secrets, no machine-local state;
`config.yaml` endpoints are `SET_YOUR_ENDPOINT` placeholders).

## How v1.1 coordinates (the kanban model)

- One kanban board, `workbench` (SQLite, durable, atomic claims). The Hermes
  dispatcher (`kanban.dispatch_in_gateway`) spawns the assigned profile onto
  ready tasks automatically — no polling, no manual wake-up.
- Two task types: **Build task** (Spec → Scaffold) and **QA task**
  (Scaffold → Smoke). The QA task's `parents=[build task]` edge **is the
  handoff** — it auto-promotes the moment the build completes. A QA task also
  carries the verdict (PASS = shipped / FAIL + rework task), so the whole
  chain — build → QA → rework → QA → shipped — is a queryable event chain on
  the board, not scrollback in a chat.
- DMs and the optional group chat are the live channel and the receipts;
  the board is the only state.

## Install

```bash
# 1. import the three profiles
hermes profile import workbench-spec.hermes.tar.gz --name workbench-spec
hermes profile import workbench-scaffold.hermes.tar.gz --name workbench-scaffold
hermes profile import workbench-smoke.hermes.tar.gz --name workbench-smoke

# 2. recreate the team workspace + the board (the one new step in v1.1)
mkdir -p ~/.hermes/teams/workbench/{reports,repos,state}
cp TEAM.md WORK.md ~/.hermes/teams/workbench/
hermes kanban boards create workbench --name "Workbench team"   # idempotent: check `hermes kanban boards list` first

# 3. set each profile's model endpoint
#    edit ~/.hermes/profiles/workbench-*/config.yaml: replace
#    https://SET_YOUR_ENDPOINT/v1 with your LLM endpoint (all three profiles)

# 4. install the heartbeat (Hermes cron, no-agent script jobs)
cp workbench_cron*.sh ~/.hermes/scripts/ && chmod +x ~/.hermes/scripts/workbench_cron*
# then create four cron jobs pointing at the per-job wrappers:
#   workbench-standup      0 8 * * *   -> workbench_cron_standup.sh
#   workbench-qa-sweep-am  0 12 * * *  -> workbench_cron_qa-sweep.sh
#   workbench-qa-sweep-pm  0 18 * * *  -> workbench_cron_qa-sweep.sh
#   workbench-harvest      0 21 * * *  -> workbench_cron_harvest.sh
```

Note: the kanban board is machine-local SQLite — the pack ships `WORK.md`
(shipped history + backlog notes), not the live board. On the source install
the board already exists; on a fresh install, step 2 creates it.

## Optional: seat the team in a Group room

Hermes Bot Mode supports **group chats** (2–6 bots in one shared room). Rooms are
created from the desktop — there is no CLI command for them.

1. **Bots tab** → right-click `@workbench-spec` (any of the three) → **Manage
   groups** → create a group inline, or use the **New Group Chat** picker.
2. Seat all three members: `@workbench-spec`, `@workbench-scaffold`,
   `@workbench-smoke` (optionally add yourself).

In the room, your message triggers up to three serial rounds of member turns —
@-mentioned bots respond, the rest pass when they have nothing to add; hard caps
(10 messages per send, 3 rounds) prevent loops. Each member keeps a persistent
`Group: <name>` session. The room is the live working channel; all durable
knowledge stays in `TEAM.md` / the kanban board / skills, so the transcript is
cheap to reset and nothing is lost.

Note: group membership lives in each bot's backend-synced profile metadata, so
rooms follow gateways — a fresh install ships the three profiles but not your
room. Create the group after installing the profiles.

## Notes

- The team works anything you put on the board (or seed as a backlog note in
  `WORK.md` — standup promotes it); add cards or DM `@workbench-spec`.
- Cron sessions are date-stamped per run (no shared long-lived session) — that
  avoids the context-bloat failure mode of pinned chat sessions.
- License: MIT. Profiles may contain bundled Hermes skills under their own terms.
