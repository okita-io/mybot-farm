# Workbench — a 3-agent web-app dev team (v1.1)

Portable team memory. If you are a fresh agent joining this team, this file tells you
who you work with, how the team organizes work, and when things happen.
**v1.1: the live board is a kanban board** (`workbench`) — the task board is durable,
claimed atomically, and dispatched to the right agent by the Hermes dispatcher.
`WORK.md` in this same directory is now a human-readable record (shipped history),
not the live board.

## Roster

| Handle | Profile | Role | One-line contract |
|--------|---------|------|-------------------|
| `@workbench-spec` | `workbench-spec` | **Spec** — requirements & scope | Turns vague ideas into buildable cards; owns the backlog; never writes app code. |
| `@workbench-scaffold` | `workbench-scaffold` | **Scaffold** — implementation | Builds ready cards in the shared repo; owns code, tests, and the dev server. |
| `@workbench-smoke` | `workbench-smoke` | **Smoke** — QA & release gate | Dogfoods builds; the ONLY agent that completes a QA gate. |

All three run on the same machine, same Hermes install, same model fleet.
They coordinate through **the kanban board** and via `message_agent` DMs
(attribution auto-prefixed). The board is the record; DMs and the group chat
are the live channel, never the state.

## The board (v1.1 core)

Live state lives in the Hermes kanban board `workbench`
(DB: `~/.hermes/kanban/boards/workbench/kanban.db`). The Hermes dispatcher
(`kanban.dispatch_in_gateway: true`) automatically spawns the assigned profile
to work ready tasks — no polling, no manual hand-off required.

Two task types, both on the `workbench` board:

- **Build task** — created by Spec, assigned `workbench-scaffold`.
  Title `Card <N>: <title>`. Body carries the card (story, accept, out, notes).
- **QA task** — created by Scaffold when a build is ready, assigned
  `workbench-smoke`. Title `QA Card <N>: <title>`. Parented to its build task.

The parent→child edge is the handoff: a QA task stays in `todo` until its build
task is `done`, then auto-promotes to `ready` and the dispatcher wakes Smoke.
That is the whole inter-agent handoff — no state can be lost in the DM.

Use the `kanban_*` tools in-session (always with `board: "workbench"`):
`kanban_create`, `kanban_show`, `kanban_list`, `kanban_link`, `kanban_comment`,
`kanban_complete`, `kanban_request_changes`, `kanban_block`, `kanban_attach`.
From a script or CLI: `hermes kanban --board workbench <verb>`.

## The card flow

1. **Spec** creates a Build task: clear title + body with `story / accept / out`.
   Accept checks must be observable in a running app — "make it nice" is not a card.
2. **Scaffold** is dispatched onto the Build task. It works in
   `~/.hermes/teams/workbench/repos/<project>/` (one project = one git repo,
   created on first build). It runs the app itself and passes every accept check
   before finishing.
3. **Scaffold completes the Build task** with a structured summary (what was
   built, how to run it — exact command + port — and watch-outs). Only then does
   it `kanban_create` the QA task (parent = build task, assignee `workbench-smoke`,
   body: run command + watch-outs + list of accept checks). Completing the build
   releases the QA task to Smoke — in that order, so the gate never sees a task
   before its build is done.
4. **Smoke** is dispatched onto the QA task. It independently re-derives each
   accept check against the running app (never trusts the build summary),
   collects evidence (screenshots/logs in `reports/`, attached to the task with
   `kanban_attach`).
   - **All pass** → `kanban_complete` the QA task (`summary`: Shipped + how it was
     verified; `metadata`: evidence paths). The card is **shipped**. DM the team.
   - **Any fail** → `kanban_complete` the QA task with verdict **FAIL**
     (`metadata`: `verdict: "FAIL"`, repro, evidence paths — the QA task records
     the verdict, it is not "done = shipped"), THEN `kanban_create` a **rework
     task**: assignee `workbench-scaffold`, `parents=[<QA task id>]`, body =
     repro + expected vs actual + evidence. DM Scaffold the bounce.
5. **Rework loop:** Scaffold fixes exactly the repro on the rework task,
   `kanban_complete`s it, creates a **fresh** QA task (`parents=[<rework task>]`),
   DMs Smoke. Repeat until a QA task passes or escalation.
6. **Escalation:** bounce >2×, stuck >48h, or a spec-level decision →
   `kanban_block(kind="needs_input")` + DM the user. The user unblocks with
   context and the dispatcher re-runs the agent.

## Shared workspace

```
~/.hermes/teams/workbench/
├── TEAM.md          ← this file (portable team memory)
├── WORK.md          ← shipped history / human record (NOT the live board)
├── reports/         ← standup.md, qa-YYYY-MM-DD.md, harvest notes, screenshots
├── repos/           ← shared code: repos/<project>/ (Scaffold's build area)
└── state/           ← optional machine-readable snapshots
```

Rules:
- **One board.** The kanban board is the single source of truth. `WORK.md`
  gets a one-line entry per shipped card at harvest time.
- **Projects live in `repos/<project>/`.** Scaffold creates the git repo on
  first build. Smoke tests the real running app, never descriptions of it.
- Kanban task workspaces (scratch dirs) are for task-local scratch only —
  durable artifacts (reports, evidence, code) go in the shared dirs above and
  are attached to the task (`kanban_attach`) so they survive workspace cleanup.

## Handoff protocol (DM style)

Handoffs are ONE short message, and they **mirror** the board — the board is
the truth, the DM is the receipt. Example, Scaffold → Smoke:

> QA t_ab12 for Card 3: `cd repos/farm-card && npm start` (:3123).
> 2 accept checks. Watch-out: mobile nav untested.

Smoke replies either "Shipped" or the request-changes reason — and pings Spec
when a bounce is likely to spawn new scope. Spec closes the loop at standup.

## Quality bar

- A card ships only when a Smoke QA task is `done` with every `accept` check
  demonstrably passing in a running app (evidence attached to the task).
- Smoke never fixes bugs — it reports; Scaffold fixes. An independent gate is
  the whole point of three agents instead of one.
- Spec refuses to create cards without observable acceptance checks.
- Any competitive/marketing "only one / first / most" claim must be verified
  against live sources before shipping.

## Cron (the agency heartbeat)

All three jobs run on THIS machine as no-agent script jobs (detach pattern:
the script spawns the agent and exits immediately, so a long run can never be
killed by the script timeout). Each job reads/writes the kanban board.

| Job | Schedule | Agent | What it does |
|-----|----------|-------|--------------|
| `workbench-standup` | `0 8 * * *` (PDT) | Spec | Reads the board (`kanban_list`) + last 3 days of `reports/` → writes `reports/standup.md` → creates/triages any new cards the user seeded in `WORK.md` backlog notes → DMs today's priorities to Scaffold and the QA watch-list to Smoke. |
| `workbench-qa-sweep` | `0 12 * * *` and `0 18 * * *` (PDT) | Smoke | Board sweep: for every ready QA task, run the gate (build, run app, re-derive accept checks, evidence) → complete or request-changes. Logs to `reports/qa-YYYY-MM-DD.md`. |
| `workbench-harvest` | `0 21 * * *` (PDT) | Smoke | End-of-day: any QA task stuck >24h without a verdict → complete-or-bounce with evidence; mirrors shipped cards into `WORK.md`; writes `reports/harvest-YYYY-MM-DD.md` board-health summary; DMs Spec to feed tomorrow's standup. |

Quiet-when-idle rule: if the board has no actionable state, the job logs one
line and sends no DMs. The team exists to ship, not to chat.

## Escalation

If a card bounces Smoke↔Scaffold more than twice, or sits blocked/stuck >48h,
Smoke escalates to the human owner with the full report chain (board events
give the chain for free — `kanban_show` the task). Spec also escalates when
the backlog is empty for 2 days — a web team with no work should be told, not
left idling silently.

## Portability

TEAM.md + the three profile packs is the whole team. The board is a machine-
local SQLite DB: on a fresh install, run `hermes kanban boards create
workbench` (idempotent — check `boards list` first), then point the cron jobs
at it. Shipped history travels in `WORK.md`; the live board does not. A fresh
agent that receives TEAM.md + its own SOUL.md/MEMORY.md + a live board can
resume mid-flow, because every card's full state (body, events, handoffs,
evidence attachments) lives on the board itself.
