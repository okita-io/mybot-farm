# Teams — agents that work together

**Date:** 2026-09-11  
**Idea:** A marketplace listing can be a single **agent** or a **team**: a small group of agents with roles and handoffs, installable as one pack.

---

## Why teams

Solo agents are useful. Many real workflows are **pairs or crews**:

| Example team | Roles |
|--------------|--------|
| **Programmer + Debugger** | One writes / implements; one reproduces failures, bisects, files checks |
| **Spec + Scaffold + QA** | One writes cards; one builds; one gates release in a running app and never patches |
| **Researcher + Librarian** | One hunts; one files, indexes, and retrieves |
| **Writer + Editor** | One drafts; one humanizes, fact-checks, cuts |
| **Hunter + Enricher** | One finds leads; one verifies contacts and deepens accounts |
| **Planner + Doer** | One breaks work down; one executes and reports |

mybot.farm should make **“install this team”** as obvious as “install this agent.”

---

## What a team pack includes (v0)

```text
team pack
  profile          name, blurb, cover avatar / badge
  members[]        each member = a whole agent pack (or stub + shared skills)
  topology         who talks to whom; default handoff rules
  shared           optional shared skills, memory conventions, getting-started
  runtime hints    e.g. grok-bot group channel / sidebar section
```

### Topology (simple)

- **Pair:** A ↔ B (programmer ↔ debugger)
- **Hub:** Manager routes to specialists
- **Pipeline:** A → B → C (hunt → enrich → draft)

Document handoffs in prose the host can turn into group membership + standing instructions — don’t require proprietary wire formats in v0.

---

## Install semantics

- Installing a **team** creates **N agent copies** (one per member) plus suggested grouping (e.g. Grok Bot channel / section) when the runtime supports it.
- Still **copies**: no live link to the author’s farm.
- Member agents keep distinct names, avatars, descriptions, memories, routines.

---

## Marketplace UX ideas

- Team page shows **member faces in a row** + one-line roles.
- Filter: `type=agent | team`.
- “Also works with…” soft links between solo agents that often pair.
- Example featured team early: **Programmer + Debugger** reference pack.

---

## Non-goals (v0)

- Live multi-tenant orchestration across strangers’ accounts  
- Automatic billing split between co-authors  
- Guaranteeing every runtime has group chat (degrade to “install members separately”)

---

## Open decisions

- [ ] Hard cap on members per team (suggest ≤ 6 for UX)
- [ ] Can a team reference already-published solo agents by id vs embed full packs?
- [ ] Author = one publisher vs multi-author listings
