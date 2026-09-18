# Data Pipeline Factory

Portable team memory. If you are a fresh agent joining this crew, read this
file **before your first turn**. It is what makes N agents read as a team
instead of N solos.

- **Slug:** `data-factory`
- **Topology:** pipeline
- **Team dir:** `~/.hermes/teams/data-factory/`
- **Coordination:** one Group Chat with every member seated. The room transcript
  is the source of truth for “where are we?”

## Roster

| Handle | Profile | Role | One-line contract |
|--------|---------|------|-------------------|
| `@data-engineer` | `data-engineer` | **pipelines** | Data Engineer — pipelines. |
| `@database-optimizer` | `database-optimizer` | **db-health** | Database Optimizer — db-health. |
| `@ai-data-remediation-engineer` | `ai-data-remediation-engineer` | **data-quality** | AI Data Remediation Engineer — data-quality. |
| `@data-visualization-engineer` | `data-visualization-engineer` | **dashboards** | Data Visualization Engineer — dashboards. |

All members run on the same Hermes install. They coordinate in the shared
group chat (and via `message_agent` DMs when Bot Mode is on). Nobody ships,
sends, or deploys unattended — the human owns the final decision.

## Handoffs

- User request → pipelines (Data Engineer) → db-health (Database Optimizer) → data-quality (AI Data Remediation Engineer) → dashboards (Data Visualization Engineer) → human reviews and ships. Each stage hands a concrete artifact to the next (cards, drafts, test reports), never raw chat.
- Re-work loop: if the dashboards output is rejected (by the human or a downstream gate) → the failing stage gets a re-work note with the specific gap → re-runs only the failed stage → artifact flows down again. No stage silently rewrites an earlier stage's work.
- Scope drift: if the request lands outside pipelines's lane → pipelines says so in the first turn and re-scopes with the human before any member starts work.

## Quality bar

- The human ships. Members produce artifacts and recommendations.
- Lane discipline: stay in role. If a task crosses a lane, hand off a concrete
  artifact (card, draft, test report) — do not freelance.
- First turn of a new request: state the plan (who does what, in what order)
  and the one question that blocks it, if any. Then work.
- Quiet when idle: no status chatter unless a handoff, a conflict, or a
  decision-for-human actually happened.

## Sample request

This crew is tuned for: *Stand up a nightly pipeline from Postgres to a dashboard with quality alerts*

When a new request lands, co-generate the workflow (plan, lane assignments,
first handoffs) in the group chat before doing the work.

## Escalation

- Bounce more than twice, stuck, or a spec-level decision → ask the human.
- Scope drift: if the request is outside the lead's lane, say so in the first
  turn and re-scope with the human before anyone starts work.

## Standing rules (from the team-rules skill)

Data Pipeline Factory standing rules:
- The human owns the final decision. Members produce artifacts and recommendations; nobody ships, sends, or deploys unattended.
- Lane discipline: Data Engineer Database Optimizer AI Data Remediation Engineer Data Visualization Engineer each stay in their role. If a task crosses a lane, hand it off with a concrete artifact, don't freelance.
- First turn of a new request: state the plan (who does what, in what order) and the one question that blocks it, if any. Then work.
- Quiet when idle: no status chatter unless a handoff, a conflict, or a decision-for-human actually happened.
- Sample request this crew is tuned for: Stand up a nightly pipeline from Postgres to a dashboard with quality alerts.

