# Farm → Hermes agent conversion queue

Goal: every farm agent gets a Hermes-native pack — a scrubbed
`<slug>.hermes.tar.gz` (so `farm_plant` can install it) + a GAF `runtime`
entry of `hermes` — with **Hermes-flavored additions** that make each agent
more Hermes-like (matched built-in skills, not just the published GAF skills).

## Files

- `missing-hermes-tarballs.md` — the full list: 288 agents, 287 missing, 1 done
- `queue.json` — machine queue (slug/name/category), 287 entries, sorted
- `done.json` / `failed.json` — processed results (append per agent)
- `convert_one.py` — the conversion script (GAF → hermes tarball, reusable)
- `status.md` — rolling progress log (who converted what, verdicts)

## "Done" definition per agent

1. `<slug>.hermes.tar.gz` built: SOUL.md (from GAF profile+memory) +
   memories/MEMORY.md pointer + GAF skills under skills/ + **matched Hermes
   built-in skills** + redacted config.yaml (spark endpoint placeholder)
2. Scrub + leak-rescan clean (no LAN IPs, no keys, no machine state)
3. Import-tested on a scratch profile (then the scratch profile is deleted)
4. Placed in `web/public/packs/agents/<slug>.hermes.tar.gz` + root `packs/` mirror
5. GAF JSON `runtime` updated to include `"hermes"`
6. `done.json` entry: {slug, tarball_kb, import_test: pass, hermes_additions: [...]}

## Hermes-matching heuristic (the "more Hermes-like" layer)

Match GAF skill topics → installed Hermes skill categories, add to the profile:
- research/data → `research/` (arxiv, rss-feeds, grounded-citations)
- coding/dev → `software-development/` (github, test-driven-development, systematic-debugging)
- marketing → `marketing-agi`, `research/web_competitor_intel`
- social → `social-media/xurl`, `social-media/reddit-reading`
- ops/process → `productivity/` (sop-adjacent: docx/xlsx/pdf), `devops/sdlc-review`
- web → `web/blocked-page-recovery`
Every agent gets the `hermes-agent` hub skill so it knows its own runtime.

## Batch mode

One subagent per wave (user constraint: one subagent at a time, no rush).
Wave = ~5 agents. After each wave: run convert_one.py for the wave's slugs,
import-test each, update done.json + status.md. Do NOT commit/push —
Cursor publishes waves.
