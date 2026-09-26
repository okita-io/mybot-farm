# User Systems — backlog & specs

**Date:** 2026-09-26
**Status:** proposal / tracking doc
**Idea:** Systems mybot.farm can provide for its three user types — **buyers/planters**, **sellers/authors**, and **agents themselves** (the WebMCP-native audience). Ordered by effort × impact so we can pick what to build next.

This is a living backlog. Each system links to the existing code it builds on so a spec never starts from zero. When a system ships, move it to a `## Shipped` section with the PR/commit.

---

## The three user types

The marketplace "user" is not one person:

- **Buyers / planters** — install whole agents/teams into their runtime (Grok Bot, Hermes, OpenClaw). Want trust and fit *before* they commit a copy.
- **Sellers / authors** — publish, maintain, and (optionally) earn from packs. Want easy publishing, safety gates, and signal on how packs perform.
- **Agents** — discover and transact over WebMCP (`search_stalls`, `download_pack`, …) without clicking UI. The strategic audience: the farm as the supply side for autonomous crews.

---

## Effort × Impact ranking

**Legend:** effort S (days) / M (1–2 wk) / L (weeks+). Impact ★–★★★★★.

### Tier 1 — Do first (high impact, low effort)

| # | System | Impact | Effort | Builds on |
|---|--------|--------|--------|-----------|
| 5 | Pack linter + auto-scrub gate | ★★★★★ | S | `scripts/scrub.py`, `web/src/lib/gaf-pack.ts`, `web/src/lib/listing-publish.ts` |
| 2 | Runtime compatibility matrix | ★★★★ | S | `web/src/lib/runtimes.ts`, `web/src/lib/pack-files.ts` |
| 6 | Version diffing + update notifications | ★★★★ | S–M | `web/src/lib/pack-diff.ts`, `web/src/lib/stall-revisions.ts` |

### Tier 2 — Strategic bets (high impact, higher effort)

| # | System | Impact | Effort | Builds on |
|---|--------|--------|--------|-----------|
| 9 | Agent-to-agent recommendation (`recommend_stall`) | ★★★★★ | M | `web/src/lib/webmcp-catalog.ts`, `web/src/lib/catalog.ts` |
| 11 | Capability search (index by what agents *do*) | ★★★★ | M | `web/src/lib/catalog.ts`, `list_pack_skills` |
| 1 | Post-plant verification / smoke test | ★★★★ | M–L | `web/src/lib/install-prompt.ts`, runtime plugins |
| 10 | Team composer (goal → team pack + topology) | ★★★★ | M–L | `web/src/lib/team-catalog.ts`, `docs/teams.md` |
| 14 | KiroCrew runtime — export/import plugin | ★★★★ | M | `web/src/lib/runtimes.ts`, `web/src/lib/gaf-to-grok-template.ts`, `packages/hermes-mybot-farm` (twin) — spec: [kirocrew-plugin-spec.md](./kirocrew-plugin-spec.md) |

### Tier 3 — Trust & monetization

| # | System | Impact | Effort | Builds on |
|---|--------|--------|--------|-----------|
| 4 | Reviews with proof-of-install | ★★★ | M | `web/src/lib/comments.ts`, `web/src/lib/purchases.ts`, `web/src/lib/engagement.ts` |
| 7 | Author analytics | ★★★ | M | `web/src/lib/engagement.ts`, `web/src/lib/purchases.ts` |
| 12 | Provenance & pack signing | ★★★★ | M–L | `web/src/lib/api-key-crypto.ts`, `web/src/lib/gaf-pack.ts` |
| 8 | Co-author revenue split | ★★★ | L | `web/src/lib/mpp-settlement.ts`, `web/src/lib/connect.ts`, `web/src/lib/fees.ts` |

### Tier 4 — Later (gated by the above)

| # | System | Impact | Effort | Notes |
|---|--------|--------|--------|-------|
| 3 | "Try before plant" sandbox | ★★★ | L | Needs ephemeral runtime execution — infra-heavy |
| 13 | Reputation graph | ★★★ | L | Depends on #4 + #7 producing signal first |

**Dependency chains:** #11 → #9 (capability index enables recommendation) · #4 + #7 → #13 (install/analytics signal feeds reputation) · #12 should land before broad open publishing to untrusted authors.

**Suggested roadmap:** #5 this sprint → #9 + #11 together → #12 before scaling open publishing.

---

## System details

### 1. Post-plant verification / smoke test — *buyer*
After planting, run the agent through a canned task and score it "works as described." Closes the gap between "copy on install" and "does it actually do the job." Builds on `install-prompt.ts` + runtime plugins.

### 2. Runtime compatibility matrix — *buyer*
Per-pack badges for which runtimes actually work (required skills/plugins present), extending `runtimes.ts`. Prevents dead installs.

### 3. "Try before plant" sandbox — *buyer*
Ephemeral run of a stall's agent against sample input, no library commit. Infra-heavy (needs sandboxed execution).

### 4. Reviews with proof-of-install — *buyer*
Gate ratings on a verified plant/purchase. Anchored on `purchases.ts` + `engagement.ts`; extends `comments.ts`.

### 5. Pack linter + auto-scrub gate — *seller*
CI-style check on `post_listing` that runs `scrub.py`, validates GAF schema, and flags secrets/PII before a stall goes live. Turns the stated "scrub or don't ship" principle from honor-system into an enforced gate. Highest-value Tier 1 item.

### 6. Version diffing + update notifications — *seller/buyer*
`pack-diff.ts` already exists; surface "what changed in v2" to prior planters and offer re-plant. Uses `stall-revisions.ts` history.

### 7. Author analytics — *seller*
Plants, conversions, drop-off, per-runtime split, review sentiment. Built on `engagement.ts` + `purchases.ts`.

### 8. Co-author revenue split — *seller*
Listed as a v0 non-goal in `docs/teams.md`; a real system here unlocks multi-author team packs. Touches `mpp-settlement.ts`, `connect.ts`, `fees.ts`.

### 9. Agent-to-agent recommendation (`recommend_stall`) — *agent*
**Highest strategic leverage.** A `recommend_stall(task)` WebMCP tool so an orchestrator agent can auto-source a teammate for a task it can't do. Full spec below (§ "Spec: #9").

### 10. Team composer — *agent*
Given a goal, assemble a team pack from existing solo agents with a suggested topology (pair/hub/pipeline from `docs/teams.md`). Uses `team-catalog.ts`.

### 11. Capability search — *agent*
Index by *what an agent can do* (skills/tools), not just category, so agents query by capability. Prerequisite for a robust #9.

### 12. Provenance & pack signing — *trust*
Sign packs so a planter can verify authorship and that content wasn't tampered post-publish. Builds on `api-key-crypto.ts` + `gaf-pack.ts`.

### 13. Reputation graph — *trust*
Author trust from verified installs + review history, feeding featured/ranking. Depends on #4 + #7 signal.

### 14. KiroCrew runtime — export/import plugin — *buyer/seller/agent*
Add KiroCrew as a fourth plant/export runtime alongside Grok Bot, Hermes, and OpenClaw. Two tracks: **A (farm-side, S)** — register `kirocrew` in `runtimes.ts` + install page + doc; **B (the plugin, M)** — a `packages/kirocrew-mybot-farm` package (twin of the Hermes/OpenClaw plugins) that plants GAF into `~/.kiro/agents/*.json` (+ crew members for teams) and posts GAF back via a seller key. GAF teams map onto KiroCrew's native crews better than any other runtime. Full spec: [kirocrew-plugin-spec.md](./kirocrew-plugin-spec.md). Shares scrub code with #5.

---

## Spec: #9 — Agent-to-Agent Recommendation (`recommend_stall`)

**Status:** specced, not started.

### Problem & goal
Existing WebMCP tools (`search_stalls`, `get_stall`, …) are lexical browse tools — `stallMatchesQuery` in `web/src/lib/catalog.ts` runs a substring match over name/title/description/README, so an intent like "reproduce a flaky test and bisect it" returns nothing useful. Goal: a single read-only tool, `recommend_stall(task)`, that takes a natural-language task and returns a ranked shortlist of agents/teams that can do it, each with a *why*, a fit score, and the exact next-step API paths (`download_pack`, `get_install_prompt`). Makes the farm the supply side for autonomous crews.

### Scope
**In:** new WebMCP tool + `GET /api/recommend`; a scoring function over the existing catalog (`listCatalogStalls`); capability-derived matching from pack skills/memory; deterministic, LLM-free ranking v1.
**Out (v1):** paid-pack gating changes (recommendation returns metadata only — no pack bodies, no 402), embeddings/vector search (v2), auto-install/auto-plant, the full standalone capability index (#11 — this ships a lightweight inline version and notes where #11 replaces it).

### Interface

WebMCP tool (add to `packTools` in `web/src/lib/webmcp-catalog.ts`):

```
name: "recommend_stall"
title: "Recommend a bot for a task"
description: "Given a task in plain language, return a ranked shortlist of
  mybot.farm bots (agents and teams) that can do it. Each result has a fit
  score, a one-line why, matched capabilities, and the download_pack /
  install-prompt API paths to act on it. Read-only. Does not return pack
  bodies and never triggers payment — use download_pack to fetch a pack."
method: "GET"
path: "/api/recommend"
query: ["task", "kind", "limit", "maxPriceCents"]
```

HTTP: `GET /api/recommend`
- `task` (required, string) — the natural-language task.
- `kind` (optional, `agent|team`) — restrict results.
- `limit` (optional, int, default 5, max 20).
- `maxPriceCents` (optional, int) — cap price; omit for any.

Response (`200`):

```jsonc
{
  "task": "reproduce a flaky test and bisect the commit that broke it",
  "results": [
    {
      "slug": "probe",
      "kind": "agent",
      "name": "Probe",
      "title": "Debugger & verifier",
      "score": 0.82,
      "why": "Matches: reproduce bugs, verify fix path; category Coding",
      "matchedCapabilities": ["reproduce", "verify", "bisect"],
      "category": "Coding",
      "priceCents": 0,
      "pagePath": "/agents/probe",
      "api": {
        "get_stall": "/api/stalls/probe",
        "download_pack": "/api/packs/probe",
        "get_install_prompt": "/api/install-prompt/probe"
      },
      "pairsWith": [{ "slug": "patch", "name": "Patch" }]
    }
  ],
  "empty": false
}
```

`400` on missing/empty `task` (mirror `{ error: "task_required" }` used by other tools).

### Ranking (v1, deterministic)

Scorer in a new `web/src/lib/recommend.ts`. No model call — cheap, cacheable, testable.

1. **Capability document per stall** (reuse existing loaders): from `Stall` (`name, title, description, category, readmeMarkdown`, member names) and from the pack via `catalogPackSkillList(slug)` (skill name + description, memory lines, team member role/summary). Skills/memory carry the real capability signal, matching `docs/positioning-farmers-market.md` ("procedures are `skills[]`").
2. **Task terms:** lowercase, tokenize, drop stopwords, keep unigrams + bigrams. Small synonym/verb map (`debug↔reproduce↔bisect`, `write↔draft↔author`, `find↔scout↔research`) so intent verbs hit skill text. Map lives in `recommend.ts`, extensible.
3. **Score** = weighted field matches, normalized 0..1:

   | Signal | Weight |
   |--------|--------|
   | skill name/description hit | 3.0 |
   | memory/soul hit | 2.0 |
   | title hit | 1.5 |
   | description / README hit | 1.0 |
   | category term hit | 1.0 |
   | member role/summary hit (teams) | 2.0 |

   Tie-break by `downloadCount` then `likeCount` (already on `Stall` via `withStallStats`). Floor at ~0.15 so weak/empty matches return `empty: true` honestly.
4. **`pairsWith`:** if a matched agent is a member of any team stall, surface that team as a soft link (the "Also works with…" idea in `docs/teams.md`). Scan `members[]` on team stalls.

### Files to touch

| File | Change |
|------|--------|
| `web/src/lib/recommend.ts` | **new** — `recommendStalls(task, opts)`, scorer, synonym map, capability-doc builder |
| `web/src/lib/recommend.test.ts` | **new** — unit tests (see below) |
| `web/src/app/api/recommend/route.ts` | **new** — parse query, call `recommendStalls`, return JSON; runtime + cache headers matching `/api/stalls` |
| `web/src/lib/webmcp-catalog.ts` | add `recommend_stall` to `packTools` |
| `web/src/components/webmcp-tools.tsx` | add `recommend_stall` executor + `inputSchemaFor` branch |
| `web/src/app/openapi.json/route.ts` | document the new path |
| `web/src/app/api/route.ts` | add to the public API index blurb |

### Performance
`listCatalogStalls()` already loads the whole catalog per-search, so base cost matches `search_stalls`. Extra cost is per-stall skill loading (`catalogPackSkillList`). Mitigations: (a) score first on cheap `Stall` fields, load skills only for the top ~30 candidates before final ranking; (b) memoize a capability-doc map keyed by `slug@packVersion` (in-memory, invalidated on catalog change) — the natural seam where #11 later slots in without changing the tool contract.

### Tests & Definition of Done
- **Unit** (`recommend.test.ts`): "reproduce a flaky test" ranks `probe` above `gift-day`; "book a venue for my band" ranks `scout`/`road-crew` top; empty/whitespace task → `empty:true` and `task_required` at HTTP layer; `kind=team` filter; `maxPriceCents` filter; `pairsWith` surfaces Pair Bench for Probe.
- **Route**: 200 shape matches interface; 400 on missing task.
- **DoD:** `recommend_stall` registered and callable via WebMCP; grounded, scored, actionable results; no pack bodies returned; `npm test` green; `openapi.json` lists the tool.

### Risks / open decisions
- [ ] **Lexical (v1) vs semantic (v2):** ship v1 keyword+synonym scoring first (transparent, free, no infra); add embeddings in v2.
- [ ] **Order vs #11:** ship inline capability-doc builder now, or build the persisted capability index (#11) first and make `recommend.ts` a thin consumer. Tool contract is stable across both.
- [ ] **Recommendation ≠ endorsement:** scoring is capability-fit, not quality. Add a `note` field so callers don't read fit as a safety guarantee; reputation (#4/#13) would later weight the score.

---

## Related

- [positioning-farmers-market.md](./positioning-farmers-market.md) — product principles (scrub-or-don't-ship, copy-on-install, whole-agent)
- [teams.md](./teams.md) — team packs, topology, "also works with" soft links
- [categories.md](./categories.md) — browse taxonomy
- [api-keys.md](./api-keys.md) — seller API keys, `post_listing`
- [../packs/](../packs/) — seed agents & teams
