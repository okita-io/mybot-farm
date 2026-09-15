# Workbench — a 3-agent web-app dev team (Hermes)

A portable multi-agent team: **Spec** (requirements) → **Scaffold** (implementation) →
**Smoke** (QA & release gate), coordinated through a shared task board.

Trained and proven on the source install: shipped two real apps — a live board status
page (after a genuine QA bounce → fix → regression re-check) and a Safeway hot-sauce
catalog (27 real SKUs, QA re-verified against live safeway.com PDPs).

## What's in this pack

| File | What it is |
|------|-----------|
| `TEAM.md` | **The team's portable memory** — roster, roles, card format, handoff protocol, quality bar, escalation rules, cron table. Read this first. |
| `WORK.md` | The task board (shipped with a clean board + shipped history). |
| `workbench-spec.hermes.tar.gz` | Scrubbed Hermes profile: SOUL (requirements charter), team memory, learned skills, redacted config. |
| `workbench-scaffold.hermes.tar.gz` | Scrubbed profile (implementation charter + the `workbench-card-build` skill, which encodes the "use a worst-case fixture for ordering checks" lesson learned from a real QA bounce). |
| `workbench-smoke.hermes.tar.gz` | Scrubbed profile (QA gate charter: gate-only, evidence-first, never fixes). |
| `workbench_cron*.sh` | The heartbeat scripts (standup 08:00 / QA sweep 12:00+18:00 / harvest 21:00). |

All profiles are scrubbed (no sessions, no secrets, no machine-local state;
`config.yaml` endpoints are `SET_YOUR_ENDPOINT` placeholders).

## Install

```bash
# 1. import the three profiles (each into its own name; import refuses to overwrite)
hermes profile import workbench-spec.hermes.tar.gz --name workbench-spec
hermes profile import workbench-scaffold.hermes.tar.gz --name workbench-scaffold
hermes profile import workbench-smoke.hermes.tar.gz --name workbench-smoke

# 2. recreate the team workspace (default: ~/.hermes/teams/workbench)
mkdir -p ~/.hermes/teams/workbench/{reports,repos,state}
cp TEAM.md WORK.md ~/.hermes/teams/workbench/

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

## How it works (30-second version)

- One board (`WORK.md`), a state machine: `Ready → In-Progress → Ready-for-QA →
  Shipped | Needs-Fix`, with atomic claims so two agents never collide.
- Agents talk via Bot-Mode DMs (`message_agent`); handoffs are one short message.
- **Smoke gates but never fixes; Spec never writes app code.** That separation is
  the whole point of three agents.
- Quiet-when-idle: no DMs when there's no actionable state change.

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
knowledge stays in `TEAM.md` / `WORK.md` / skills, so the transcript is cheap to
reset and nothing is lost.

Note: group membership lives in each bot's backend-synced profile metadata, so
rooms follow gateways — a fresh install ships the three profiles but not your
room. Create the group after installing the profiles.

## Notes

- The team works anything you put in `Ready` on the board; add cards or DM `@workbench-spec`.
- Cron sessions are date-stamped per run (no shared long-lived session) — that avoids
  the context-bloat failure mode of pinned chat sessions.
- License: MIT. Profiles may contain bundled Hermes skills under their own terms.
