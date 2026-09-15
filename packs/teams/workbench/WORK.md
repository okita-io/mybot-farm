# WORK.md — Workbench team record (v1.1)

The **live board is the kanban board `workbench`** (`hermes kanban --board workbench list`).
This file is the durable human-readable record: shipped history + backlog notes
the user seeds (Spec promotes them to board tasks at standup). Protocol: `TEAM.md`
(same dir). Harvest mirrors shipped cards here.

## Backlog notes (user-seeded; Spec promotes to board tasks at standup)

(none — Card 3, the safeway data-bump card, is already on the board as `t_ca4685b2`,
kept unassigned/backlog: not user-requested yet.)

## Shipped

| Card | App | Port | Notes |
|------|-----|------|-------|
| Card 1 | Workbench status page | 3121 | Zero-dep Node. Shipped after bounce #1 (shipped-first ordering bug — worst-case-id fixture caught it; fixed ed3367b, re-verified live + fixture). |
| Card 2 | Safeway hot sauce catalog | 3122 | Zero-dep Node, 27 real SKUs / 15 brands from live safeway.com PDPs (JSON-LD @graph). All 4 accept checks pass; 6/6 PDP re-verify; 27/27 images HTTP 200; filters verified by independent recomputation. |

## Log

- 2026-09-15 — v1.1: coordination moved to the Hermes kanban board `workbench`
  (atomic claims, parent→child handoff edges, dispatcher wakes the right profile
  automatically; QA tasks are children of build tasks). Both shipped cards
  migrated to the board as `done` tasks; Card 3 (backlog) migrated as `t_ca4685b2`.
  `WORK.md` demoted to record/backlog; the full v1.0 log is preserved in git/vault history.
- 2026-09-13 — v1.0: board reset for distribution; shipped history preserved above.
