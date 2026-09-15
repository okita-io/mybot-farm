# Agency Agents catalog packs

**Product:** [mybot.farm](https://mybot.farm)
**Upstream:** [msitarzewski/agency-agents](https://github.com/msitarzewski/agency-agents) (MIT)
**Copyright:** Copyright (c) 2025 AgentLand Contributors

The farm catalogs the Agency Agents roster as **plantable GAF packs** — one
bot per upstream agent file. This is not a dump of each `soul.md` as a
single blob, and it is not the upstream Claude/Cursor install-script
product.

## How packs are split

Each upstream markdown file has YAML frontmatter (`name`, `description`,
often `color` / `emoji` / `vibe`) plus long body sections.

| Piece | Where it lands |
|-------|----------------|
| Identity, vibe, voice, memory framing, success tone | `memory[]` — the plantable soul |
| Core mission, workflows, critical rules, deliverables, domain playbooks | `skills[]` — agentskills-style `name` + “Use when …” `description` + recipe `content` |
| Division, tags, emoji/color | `category`, `tags`, `profile.avatar` |

The JSON shape matches existing farm seeds (`mybot.farm/agent-pack` v0.2):
see Gift Day / Patch / the more recent Road Crew members (Scout, Finders,
Pitch). Runtime is `grok-bot` + `openclaw`. Plant via Copy install prompt,
`/api/packs/{slug}`, or `/plant` — not `./scripts/install.sh`.

## Attribution

Every pack repeats the MIT notice:

- `manifest.license`, `manifest.sourceNote`, `manifest.attribution`
- `manifest.sourceRepo` + `manifest.sourcePath` (original filename)
- a `memory` log line
- shared [packs/agency-agents/ATTRIBUTION.md](../packs/agency-agents/ATTRIBUTION.md)

The required copyright line from upstream LICENSE is:

> Copyright (c) 2025 AgentLand Contributors

Full text: [scripts/import-agency-agents/UPSTREAM-LICENSE](../scripts/import-agency-agents/UPSTREAM-LICENSE).

## Refresh

The converter is reproducible. From the repo root:

```bash
git clone --depth 1 https://github.com/msitarzewski/agency-agents.git /tmp/agency-agents-src
python3 scripts/import-agency-agents/convert.py --source /tmp/agency-agents-src --clean
python3 scripts/import-agency-agents/convert.py --validate-only
```

`--divisions engineering,marketing,design,product,security` is the first-wave
flag if you do not want the full roster. Details:
[scripts/import-agency-agents/README.md](../scripts/import-agency-agents/README.md).

After a refresh, keep `packs/agency-agents/` and
`web/public/packs/agents/` in sync (the converter writes both) and commit
`web/src/data/agency-catalog.generated.json` so Next.js catalog discovery
picks up new slugs.

## Catalog discovery

Generated stalls and packs are imported by `web/src/lib/agency-catalog.ts`
and merged into the same `stalls` / `getPack()` tables as the handmade
seeds. They show up on `/catalog`, bot pages, WebMCP, and `/api/packs/{slug}`
the same way Gift Day does.

## Skip list

Not converted (not source agents): `integrations/`, `scripts/`,
`examples/`, `strategy/`. `divisions.json` is the division catalog.
