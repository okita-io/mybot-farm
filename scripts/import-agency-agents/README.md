# import-agency-agents

Reproducible converter that turns the MIT-licensed
[msitarzewski/agency-agents](https://github.com/msitarzewski/agency-agents)
roster into mybot.farm GAF packs (`mybot.farm/agent-pack` v0.2).

Personality (identity, voice, vibe, success tone) lands in `memory`.
Procedures land in `skills[]` as “Use when …” recipes. Claude/Cursor
install scripts are **not** copied — the farm plants via share / GAF /
install-prompt.

## Refresh from upstream

```bash
# from the mybot-farm repo root
git clone --depth 1 https://github.com/msitarzewski/agency-agents.git /tmp/agency-agents-src

python3 scripts/import-agency-agents/convert.py \
  --source /tmp/agency-agents-src \
  --clean

# first wave only (if you want a subset)
python3 scripts/import-agency-agents/convert.py \
  --source /tmp/agency-agents-src \
  --divisions engineering,marketing,design,product,security \
  --clean

# validate generated packs + catalog wiring files
python3 scripts/import-agency-agents/convert.py --validate-only

# converter smoke test (tiny fixture, no network)
python3 scripts/import-agency-agents/test_convert.py
```

`--clean` deletes previously generated Agency packs (those whose
`manifest.sourceRepo` is the upstream GitHub URL) before rewriting.

Pin a commit if you need a byte-stable refresh:

```bash
git -C /tmp/agency-agents-src fetch --depth 1 origin <sha>
git -C /tmp/agency-agents-src checkout <sha>
```

The converter records `upstreamRef` in `packs/agency-agents/import-report.json`
and `web/src/data/agency-catalog.generated.json`.

## What it writes

| Path | Role |
|------|------|
| `packs/agency-agents/{slug}.json` | Canonical GAF pack |
| `packs/agency-agents/ATTRIBUTION.md` | Shared MIT notice + per-division counts |
| `packs/agency-agents/import-report.json` | Counts, skipped files, slugs |
| `web/public/packs/agents/{slug}.json` | Public download (same bytes) |
| `web/src/data/agency-catalog.generated.json` | Stall cards + pack map for Next.js |

Slugs are kebab-case from the upstream filename with the division prefix
stripped (`engineering-frontend-developer.md` → `frontend-developer`).
Reserved farm seed slugs stay reserved.

## Skip list

`divisions.json` is the division catalog. These top-level dirs are **not**
agents and are skipped:

- `integrations/` — generated tool outputs
- `scripts/` — install/convert tooling
- `examples/`
- `strategy/` — playbooks without agent frontmatter

A file is also skipped if it has no `name` + `description` frontmatter,
fails pack validation, or collides on slug.

## Split rules

| Upstream section | Farm field |
|------------------|------------|
| Identity & Memory, communication style, success metrics, vibe, “when not to use” | `memory[]` (persona) |
| Core mission / capabilities | skill `core-mission` |
| Critical rules | skill `critical-rules` |
| Workflow / process | skill `workflow` |
| Technical deliverables / templates | skill `deliverables` |
| Other substantial `##` sections | their own skill |

Light rewrites swap Claude Code / `~/.claude/agents` install language for
a generic agent host. Example secrets matching high-confidence patterns
are replaced with `[REDACTED]`.

## Attribution

Every pack includes:

- `manifest.license`: `MIT`
- `manifest.sourceRepo` / `sourcePath` / `sourceNote` / `attribution`
- a `memory` log line with the copyright notice

Required copyright notice from upstream LICENSE:

> Copyright (c) 2025 AgentLand Contributors

Full license text: [UPSTREAM-LICENSE](./UPSTREAM-LICENSE).
Product notes: [docs/agency-agents.md](../../docs/agency-agents.md).
