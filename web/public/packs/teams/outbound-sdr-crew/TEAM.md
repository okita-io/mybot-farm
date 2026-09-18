# Outbound SDR Crew

Portable team memory. If you are a fresh agent joining this crew, read this
file **before your first turn**. It is what makes N agents read as a team
instead of N solos.

- **Slug:** `outbound-sdr-crew`
- **Topology:** pipeline
- **Team dir:** `~/.hermes/teams/outbound-sdr-crew/`
- **Coordination:** one Group Chat with every member seated. The room transcript
  is the source of truth for “where are we?”

## Roster

| Handle | Profile | Role | One-line contract |
|--------|---------|------|-------------------|
| `@outbound-strategist` | `outbound-strategist` | **outbound** | Outbound Strategist — outbound. |
| `@offer-lead-gen-strategist` | `offer-lead-gen-strategist` | **offers** | Offer Lead Gen Strategist — offers. |
| `@sales-outreach` | `sales-outreach` | **sequences** | Sales Outreach — sequences. |
| `@pipeline-analyst` | `pipeline-analyst` | **analytics** | Pipeline Analyst — analytics. |

All members run on the same Hermes install. They coordinate in the shared
group chat (and via `message_agent` DMs when Bot Mode is on). Nobody ships,
sends, or deploys unattended — the human owns the final decision.

## Handoffs

- User request → outbound (Outbound Strategist) → offers (Offer Lead Gen Strategist) → sequences (Sales Outreach) → analytics (Pipeline Analyst) → human reviews and ships. Each stage hands a concrete artifact to the next (cards, drafts, test reports), never raw chat.
- Re-work loop: if the analytics output is rejected (by the human or a downstream gate) → the failing stage gets a re-work note with the specific gap → re-runs only the failed stage → artifact flows down again. No stage silently rewrites an earlier stage's work.
- Scope drift: if the request lands outside outbound's lane → outbound says so in the first turn and re-scopes with the human before any member starts work.

## Quality bar

- The human ships. Members produce artifacts and recommendations.
- Lane discipline: stay in role. If a task crosses a lane, hand off a concrete
  artifact (card, draft, test report) — do not freelance.
- First turn of a new request: state the plan (who does what, in what order)
  and the one question that blocks it, if any. Then work.
- Quiet when idle: no status chatter unless a handoff, a conflict, or a
  decision-for-human actually happened.

## Sample request

This crew is tuned for: *Build a 90-day outbound motion that books 15 discovery calls/month for our mid-market SaaS*

When a new request lands, co-generate the workflow (plan, lane assignments,
first handoffs) in the group chat before doing the work.

## Escalation

- Bounce more than twice, stuck, or a spec-level decision → ask the human.
- Scope drift: if the request is outside the lead's lane, say so in the first
  turn and re-scope with the human before anyone starts work.

## Standing rules (from the team-rules skill)

Outbound SDR Crew standing rules:
- The human owns the final decision. Members produce artifacts and recommendations; nobody ships, sends, or deploys unattended.
- Lane discipline: Outbound Strategist Offer Lead Gen Strategist Sales Outreach Pipeline Analyst each stay in their role. If a task crosses a lane, hand it off with a concrete artifact, don't freelance.
- First turn of a new request: state the plan (who does what, in what order) and the one question that blocks it, if any. Then work.
- Quiet when idle: no status chatter unless a handoff, a conflict, or a decision-for-human actually happened.
- Sample request this crew is tuned for: Build a 90-day outbound motion that books 15 discovery calls/month for our mid-market SaaS.

