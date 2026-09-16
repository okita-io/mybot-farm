# Farm inventory — seed packs

Portable **agent** and **team** bots for [mybot.farm](https://mybot.farm).  
Format: `mybot.farm/agent-pack` / `mybot.farm/team-pack` v0.1 (see `docs/` + GlobalNotes schema).

| Bot | Type | Category | Path |
|-------|------|----------|------|
| Gift Day | agent | lifestyle | [agents/gift-day.json](./agents/gift-day.json) |
| Sprout Journal | agent | lifestyle | [agents/sprout-journal.json](./agents/sprout-journal.json) |
| Patch | agent | coding | [agents/patch.json](./agents/patch.json) |
| Probe | agent | coding | [agents/probe.json](./agents/probe.json) |
| Grant Research | agent | education | [agents/grant-research.json](./agents/grant-research.json) |
| Pair Bench | team | coding | [teams/pair-bench.json](./teams/pair-bench.json) |
| Workbench | team | coding | [teams/workbench.json](./teams/workbench.json) |
| Scout | agent | music | [agents/scout.json](./agents/scout.json) |
| Finders | agent | music | [agents/finders.json](./agents/finders.json) |
| Pitch | agent | music | [agents/pitch.json](./agents/pitch.json) |
| Road Crew | team | music | [teams/road-crew.json](./teams/road-crew.json) |

These are **marketplace seeds** (scrubbed, installable copies). They are not automatically your live Grok Bot sidebar agents until you import / create them.

The landing page serves the same files from `web/public/packs/` so people can download a copy, then in Grok Bot: **New → Create new agent → Edit Profile**. Each bot page (`/agents/{slug}`, `/teams/{slug}`) also has **Copy install prompt**. Agents can skip HTML via `/api/packs/{slug}`, `/api/packs/{slug}/grok-template` (agent packs → `create_bot_share_json`-ready recipe), and `/api/install-prompt/{slug}`. Mapping: [GAF ↔ Grok Bot template](../docs/gaf-grok-bot-template.md) (Gift Day is the golden pack). Adding a Bot copies configuration only — not the author’s computer, logins, or chat history ([Grok Bot docs](https://docs.x.ai/grok-bot/bots)). Keep `packs/` and `web/public/packs/` in sync.

## Agency Agents (generated)

MIT-adapted catalog fill-ins from [msitarzewski/agency-agents](https://github.com/msitarzewski/agency-agents). Personality is in `memory`; procedures are `skills[]`. Copyright (c) 2025 AgentLand Contributors.

| Path | What |
|------|------|
| [agency-agents/](./agency-agents/) | Generated GAF JSON + [ATTRIBUTION.md](./agency-agents/ATTRIBUTION.md) |
| [agency-agents/import-report.json](./agency-agents/import-report.json) | Per-division counts and skipped files |

Refresh: `python3 scripts/import-agency-agents/convert.py --source /tmp/agency-agents-src --clean`  
Docs: [docs/agency-agents.md](../docs/agency-agents.md).

## Live Grok Bot instances (Alex)

Planted 2026-09-11 — personas match these packs:

| Name | Agent id | Suggested avatar |
|------|----------|------------------|
| Gift Day | `af47d3bd-0b92-4dfd-8497-51e5d64a01f9` | teardrop / magenta |
| Sprout | `aa75c846-8ab2-414b-abe4-2b2d78dc41bf` | leaf / green |
| Patch | `2459ec63-c5e8-49a8-b65b-8963a5684c88` | hex / blue |
| Probe | `b9931ac8-8e77-4533-bb30-b813435fff71` | gem / orange |

Set shape/color via each agent’s header → gear → avatar. Optional: put Patch + Probe in one group chat named Pair Bench.

