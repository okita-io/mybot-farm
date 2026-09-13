# Farm inventory — seed packs

Portable **agent** and **team** stalls for [mybot.farm](https://mybot.farm).  
Format: `mybot.farm/agent-pack` / `mybot.farm/team-pack` v0.1 (see `docs/` + GlobalNotes schema).

| Stall | Type | Category | Path |
|-------|------|----------|------|
| Gift Day | agent | lifestyle | [agents/gift-day.json](./agents/gift-day.json) |
| Sprout Journal | agent | lifestyle | [agents/sprout-journal.json](./agents/sprout-journal.json) |
| Patch | agent | coding | [agents/patch.json](./agents/patch.json) |
| Probe | agent | coding | [agents/probe.json](./agents/probe.json) |
| Grant Research | agent | education | [agents/grant-research.json](./agents/grant-research.json) |
| Pair Bench | team | coding | [teams/pair-bench.json](./teams/pair-bench.json) |
| Workbench | team | coding | [teams/workbench.json](./teams/workbench.json) |

These are **marketplace seeds** (scrubbed, installable copies). They are not automatically your live Grok Bot sidebar agents until you import / create them.

The landing page serves the same files from `web/public/packs/` so people can download a copy, then in Grok Bot: **New → Create new agent → Edit Profile**. Each stall page (`/agents/{slug}`, `/teams/{slug}`) also has **Copy install prompt**. Agents can skip HTML via `/api/packs/{slug}` and `/api/install-prompt/{slug}`. Adding a Bot copies configuration only — not the author’s computer, logins, or chat history ([Grok Bot docs](https://docs.x.ai/grok-bot/bots)). Keep `packs/` and `web/public/packs/` in sync.

## Live Grok Bot instances (Alex)

Planted 2026-09-11 — personas match these packs:

| Name | Agent id | Suggested avatar |
|------|----------|------------------|
| Gift Day | `af47d3bd-0b92-4dfd-8497-51e5d64a01f9` | teardrop / magenta |
| Sprout | `aa75c846-8ab2-414b-abe4-2b2d78dc41bf` | leaf / green |
| Patch | `2459ec63-c5e8-49a8-b65b-8963a5684c88` | hex / blue |
| Probe | `b9931ac8-8e77-4533-bb30-b813435fff71` | gem / orange |

Set shape/color via each agent’s header → gear → avatar. Optional: put Patch + Probe in one group chat named Pair Bench.

