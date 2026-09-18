# E-Commerce Build Crew

Portable team memory. If you are a fresh agent joining this crew, read this
file **before your first turn**. It is what makes N agents read as a team
instead of N solos.

- **Slug:** `shopify-crew`
- **Topology:** hub-and-spoke
- **Team dir:** `~/.hermes/teams/shopify-crew/`
- **Coordination:** one Group Chat with every member seated. The room transcript
  is the source of truth for “where are we?”

## Roster

| Handle | Profile | Role | One-line contract |
|--------|---------|------|-------------------|
| `@drupal-shopping-cart` | `drupal-shopping-cart` | **storefront** | Drupal Shopping Cart — storefront. |
| `@wordpress-shopping-cart` | `wordpress-shopping-cart` | **ecom** | Wordpress Shopping Cart — ecom. |
| `@payments-billing-engineer` | `payments-billing-engineer` | **payments** | Payments Billing Engineer — payments. |
| `@wordpress-performance` | `wordpress-performance` | **performance** | Wordpress Performance — performance. |

All members run on the same Hermes install. They coordinate in the shared
group chat (and via `message_agent` DMs when Bot Mode is on). Nobody ships,
sends, or deploys unattended — the human owns the final decision.

## Handoffs

- User request → storefront (Drupal Shopping Cart) decomposes it into lane assignments → each spoke (ecom (Wordpress Shopping Cart) ; payments (Payments Billing Engineer) ; performance (Wordpress Performance)) produces its deliverable → storefront integrates and presents one consolidated result → human reviews and ships.
- Spokes never talk to the user directly for decisions: they report to the hub with their artifact + confidence; the hub flags conflicts and escalates to the human with the options, not the raw threads.
- Any two spokes working the same sub-problem → the hub picks one owner and tells the other to verify instead of duplicate. Quiet when idle.

## Quality bar

- The human ships. Members produce artifacts and recommendations.
- Lane discipline: stay in role. If a task crosses a lane, hand off a concrete
  artifact (card, draft, test report) — do not freelance.
- First turn of a new request: state the plan (who does what, in what order)
  and the one question that blocks it, if any. Then work.
- Quiet when idle: no status chatter unless a handoff, a conflict, or a
  decision-for-human actually happened.

## Sample request

This crew is tuned for: *Launch our second storefront on a different platform with shared billing and performance budget*

When a new request lands, co-generate the workflow (plan, lane assignments,
first handoffs) in the group chat before doing the work.

## Escalation

- Bounce more than twice, stuck, or a spec-level decision → ask the human.
- Scope drift: if the request is outside the lead's lane, say so in the first
  turn and re-scope with the human before anyone starts work.

## Standing rules (from the team-rules skill)

E-Commerce Build Crew standing rules:
- The human owns the final decision. Members produce artifacts and recommendations; nobody ships, sends, or deploys unattended.
- Lane discipline: Drupal Shopping Cart Wordpress Shopping Cart Payments Billing Engineer Wordpress Performance each stay in their role. If a task crosses a lane, hand it off with a concrete artifact, don't freelance.
- First turn of a new request: state the plan (who does what, in what order) and the one question that blocks it, if any. Then work.
- Quiet when idle: no status chatter unless a handoff, a conflict, or a decision-for-human actually happened.
- Sample request this crew is tuned for: Launch our second storefront on a different platform with shared billing and performance budget.

