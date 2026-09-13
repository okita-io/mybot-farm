# Workbench — a 3-agent web-app dev team

Portable team memory. If you are a fresh agent joining this team, this file tells you
who you work with, how the team organizes work, and when things happen. The single
task board is `WORK.md` in this same directory.

## Roster

| Handle | Profile | Role | One-line contract |
|--------|---------|------|-------------------|
| `@workbench-spec` | `workbench-spec` | **Spec** — requirements & scope | Turns vague ideas into buildable cards; owns the backlog; never writes app code. |
| `@workbench-scaffold` | `workbench-scaffold` | **Scaffold** — implementation | Builds Ready cards in the shared repo; owns code, tests, and the dev server. |
| `@workbench-smoke` | `workbench-smoke` | **Smoke** — QA & release gate | Dogfoods builds; the ONLY agent that moves a card to Shipped or bounces it back. |

All three run on the same machine, same Hermes install, same model fleet. They
talk via `message_agent` DMs (attribution auto-prefixed) and via the board file.

## Shared workspace

```
~/.hermes/teams/workbench/
├── TEAM.md          ← this file (portable team memory)
├── WORK.md          ← the task board (single source of truth)
├── reports/         ← standup.md, qa-YYYY-MM-DD.md, harvest notes
├── repos/           ← shared code: repos/<project>/ (Scaffold's build area)
└── state/           ← machine-readable snapshots (board.json if needed)
```

Rules:
- **One board.** All state changes happen in `WORK.md` — DMs are for handoffs and
  questions, never the record of state.
- **Claim before work.** A card moves to In-Progress only when its `owner` line is
  set to your handle with a timestamp. Two agents claiming the same card = the
  one with the earlier claim-time wins; the other picks a different card.
- **Projects live in `repos/<project>/`.** Scaffold creates a git repo there on
  first build. Smoke tests against the real running app, not descriptions of it.

## Card format (WORK.md)

```
### Card N — <title>
state: Backlog | Ready | In-Progress | Ready-for-QA | Shipped | Needs-Fix
owner: @workbench-<who> (claimed <YYYY-MM-DD HH:MM>)   ← only when In-Progress
project: <project-slug>
story: <one sentence, user-facing>
accept:
  - <observable check 1>
  - <observable check 2>
out: <explicitly out of scope>
notes: <handoff notes; QA findings for Needs-Fix>
```

States and who moves them:
- `Backlog → Ready`: **Spec** (card has story + accept + out, no open questions)
- `Ready → In-Progress`: **Scaffold** (claims it)
- `In-Progress → Ready-for-QA`: **Scaffold** (build done; notes say how to run it)
- `Ready-for-QA → Shipped`: **Smoke** only (acceptance checks all pass)
- `Ready-for-QA → Needs-Fix`: **Smoke** only (notes carry the repro + evidence)
- `Needs-Fix → In-Progress`: **Scaffold** (re-claims)

## Handoff protocol (DM style)

Handoffs are ONE short message: card id, new state, and what the next agent needs
to know. Example, Scaffold → Smoke:

> Card 3 → Ready-for-QA. Project `farm-card`, branch `main`. `cd repos/farm-card && npm start`
> (port 3123). Acceptance: 2 checks in card. Watch out: mobile nav is untested.

Smoke replies either `Shipped` or a Needs-Fix card note — and pings Spec when a
bounce is likely to spawn a new card. Spec closes the loop at the next standup.

## Quality bar

- A card ships only when every `accept` check is demonstrably passing in a running
  app (screenshot/log/test output in `reports/` as evidence).
- Smoke never fixes bugs itself — it reports, Scaffold fixes. Keeping the gate
  independent of the builder is the whole point of three agents instead of one.
- Spec refuses to spec cards without an observable acceptance check —
  "make it nice" is not a card.

## Cron (the agency heartbeat)

All three jobs run on THIS machine as no-agent script jobs that wake the right
profile with a named session (one session per job — never a long-lived shared
session; that's how context bloat happens).

| Job | Schedule | Agent | What it does |
|-----|----------|-------|--------------|
| `workbench-standup` | `0 8 * * *` (PDT) | Spec | Reads WORK.md + last 3 days of reports → writes `reports/standup.md` → DMs today's priorities (top 2–3 Ready cards) to Scaffold, and QA watch-list to Smoke. |
| `workbench-qa-sweep` | `0 12 * * *` and `0 18 * * *` (PDT) | Smoke | Checks the board for Ready-for-QA / Needs-Fix cards; for each, builds & runs the project, runs the acceptance checks, writes `reports/qa-YYYY-MM-DD.md`, moves the card (Shipped or back with evidence), DMs the others. |
| `workbench-harvest` | `0 21 * * *` (PDT) | Smoke | End-of-day: confirms no card is stuck >24h in a state it doesn't own; promotes anything valid; bounces stale items; DMs Spec a short "board health" summary to feed tomorrow's standup. |

Quiet-when-idle rule: if there is no actionable state change, the job logs one
line to its report and sends no DMs. The team exists to ship, not to chat.

## Escalation

If a card bounces Smoke↔Scaffold more than twice, or sits Needs-Fix >48h, Smoke
escalates to the human owner (the user) with the full report chain. Spec also
escalates when the backlog is empty for 2 days — a web team with no work is a
team that should be told, not a team that idles silently.

## Portability

This directory + the three profile packs is the whole team. To move it:
export each profile, scrub (see `scripts/scrub.py` in the mybot-farm repo), and
ship the `workbench/` team directory alongside. A fresh agent that receives
TEAM.md + WORK.md + its own SOUL.md/MEMORY.md can resume mid-board.
