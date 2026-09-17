# Hermes agent conversion pipeline — status & findings

_Date: 2026-09-16 · Companion to `agent-conversion/` (queue, progress) and `docs/hermes-team-stall-bundle.md`._

## What this pipeline does

Every farm agent stall gets a Hermes-native pack: a scrubbed
`<slug>.hermes.tar.gz` (so the Hermes `mybot-farm` plugin's `farm_plant` can
install it) plus `"hermes"` in the GAF `runtime` array, plus matched built-in
Hermes skills added to the profile ("Hermes-like" layer).

## Status (COMPLETE — 287/287 converted, all waves verified)

**Queue:** 288 agents on the live farm; 287 missing a hermes tarball
(only `scholastic-research` had one). **287/287 converted** (waves
1–58 verified, 0 failures). Full-queue audit CLEAN at 287. 288 hermes
tarballs now on disk in `web/public/packs/agents/` (287 converted +
pre-existing scholastic-research), each with a byte-identical mirror in
`packs/agents/`, and `hermes` in the `runtime` array of both GAF JSON
copies. See `agent-conversion/missing-hermes-tarballs.md` (full list)
and `agent-conversion/queue.json`.

**NEXT:** ship via git → deploy (Cursor), then resume the posting step
(`farm_post` listings / static catalog) now that every agent is
convertible. The clobber hazard (concurrent catalog-regenerator)
applies until the static catalog is deployed — see "Known issues &
fixes" (HAZARD note).

**Wave 58 (FINAL) — DONE & independently verified (2026-09-16):**
zhihu-strategist, zk-steward — both PASS import test, leak-scanned
clean, mirrors byte-identical, GAF runtime + hermes in both JSON
copies. Full-queue audit CLEAN at 287 = **PIPELINE COMPLETE**. Note:
zk-steward is a Zettelkasten knowledge-base steward (subagent read the
actual GAF and substituted knowledge-management skills — obsidian +
session-librarian — instead of crypto-adjacent hints). A catalog-
regenerator clobber hit both web tarballs mid-run; restored from root,
re-audited to stable CLEAN.

**Wave 57 — DONE & independently verified (2026-09-16):**
x-twitter-intelligence-analyst, xiaohongshu-specialist,
xr-cockpit-interaction-specialist, xr-immersive-developer,
xr-interface-architect — all PASS import test, leak-scanned clean,
mirrors byte-identical, GAF runtime + hermes in both JSON copies.
Full-queue audit CLEAN at 285.

**Wave 56 — DONE & independently verified (2026-09-16):**
whimsy-injector, wordpress-performance, wordpress-shopping-cart,
workflow-architect, workflow-optimizer — all PASS import test,
leak-scanned clean, mirrors byte-identical, GAF runtime + hermes in both
JSON copies. Full-queue audit CLEAN at 280.

**Wave 55 — DONE & independently verified (2026-09-16):**
web-gis-developer, webassembly-engineer, wechat-mini-program-developer,
wechat-official-account, weibo-strategist — all PASS import test,
leak-scanned clean, mirrors byte-identical, GAF runtime + hermes in both
JSON copies. Full-queue audit CLEAN at 275.

**Wave 54 — DONE & independently verified (2026-09-16):**
video-optimization-specialist, video-streaming-engineer,
visionos-spatial-engineer, visual-storyteller, voice-ai-integration-
engineer — all PASS import test, leak-scanned clean, mirrors
byte-identical, GAF runtime + hermes in both JSON copies. Full-queue
audit CLEAN at 270.

**Wave 53 — DONE & independently verified (2026-09-16):**
unreal-technical-artist, unreal-world-builder, uswds-developer,
ux-architect, ux-researcher — all PASS import test, leak-scanned clean,
mirrors byte-identical, GAF runtime + hermes in both JSON copies. Full-
queue audit CLEAN at 265.

**Wave 52 — DONE & independently verified (2026-09-16):**
unity-multiplayer-engineer, unity-shader-graph-artist, universal-
document-compiler, unreal-multiplayer-architect, unreal-systems-engineer
— all PASS import test, leak-scanned clean, mirrors byte-identical, GAF
runtime + hermes in both JSON copies. Full-queue audit CLEAN at 260.

**Wave 51 — DONE & independently verified (2026-09-16):**
twitter-engager, ui-designer, ui-finish-gate-reviewer, unity-architect,
unity-editor-tool-developer — all PASS import test, leak-scanned clean,
mirrors byte-identical, GAF runtime + hermes in both JSON copies. Full-
queue audit CLEAN at 255 agents.

**Wave 50 — DONE & independently verified (2026-09-16, AFTER clobber
recovery):** threat-intelligence-analyst, tiktok-strategist, tool-
evaluator, tracking-specialist, trend-researcher — all PASS import test,
leak-scanned clean, mirrors byte-identical, GAF runtime + hermes in both
JSON copies. A concurrent catalog-regenerator clobbered web/ copies
mid-wave; the wave subagent restored from root and repaired 38 other
clobbered web JSONs. Post-wave FULL-QUEUE AUDIT (all 250 done agents:
tarballs present, mirrors identical, runtimes ok) passed with 0 problems.
See "Known issues & fixes" (HAZARD note).

**Wave 49 — DONE & independently verified (2026-09-16):**
technical-writer, terminal-integration-specialist, test-automation-
engineer, test-results-analyzer, threat-detection-engineer — all PASS
import test, leak-scanned clean, mirrors byte-identical, GAF runtime +
hermes in both JSON copies. All 5 root JSONs auto-seeded.

**Wave 48 — DONE & independently verified (2026-09-16):**
supply-chain-strategist, support-responder, tax-strategist,
technical-artist, technical-consultant — all PASS import test,
leak-scanned clean, mirrors byte-identical, GAF runtime + hermes in both
JSON copies. All 5 root JSONs auto-seeded.

**Wave 47 — DONE & independently verified (2026-09-16):**
statistician, strategy-duel-agent, studio-operations, studio-producer,
study-abroad-advisor — all PASS import test, leak-scanned clean, mirrors
byte-identical, GAF runtime + hermes in both JSON copies. All 5 root
JSONs auto-seeded.

**Wave 46 — DONE & independently verified (2026-09-16):**
spatial-data-engineer, spatial-data-scientist, sprint-prioritizer,
sprout-journal, sre — all PASS import test, leak-scanned clean, mirrors
byte-identical, GAF runtime + hermes in both JSON copies. All 5 root
JSONs auto-seeded.

**Wave 45 — DONE & independently verified (2026-09-16):**
social-media-strategist, software-architect, solidity-smart-contract-
engineer, solution-engineer, sovereign-health-systems-agent — all PASS
import test, leak-scanned clean, mirrors byte-identical, GAF runtime +
hermes in both JSON copies. All 5 root JSONs auto-seeded.

**Wave 44 — DONE & independently verified (2026-09-16):**
senior-developer, project-manager-senior, senior-secops, seo-specialist,
short-video-editing-coach — all PASS import test, leak-scanned clean,
mirrors byte-identical, GAF runtime + hermes in both JSON copies. All 5
root JSONs auto-seeded.

**Wave 43 — DONE & independently verified (2026-09-16):**
search-query-analyst, search-relevance-engineer, secrets-credential-
engineer, section-508-specialist, architect — all PASS import test,
leak-scanned clean, mirrors byte-identical, GAF runtime + hermes in both
JSON copies. All 5 root JSONs auto-seeded by the fixed `update_gaf`.

**Wave 42 — DONE & independently verified (2026-09-16):**
sales-data-extraction-agent, engineer, sales-outreach, salesforce-
architect, scout — all PASS import test, leak-scanned clean, mirrors
byte-identical, GAF runtime + hermes in both JSON copies. 4 of 5 root
JSONs auto-seeded by the fixed `update_gaf`.

**Wave 41 — DONE & independently verified (2026-09-16):**
roblox-avatar-creator, roblox-experience-designer, roblox-systems-
scripter, rust-refactoring-specialist, coach — all PASS import test,
leak-scanned clean, mirrors byte-identical, GAF runtime + hermes in both
JSON copies. All 5 root JSONs auto-seeded by the fixed `update_gaf`.

**Wave 40 — DONE & independently verified (2026-09-16):**
reddit-community-builder, report-distribution-agent, synthesist,
resume-tailor, retail-customer-returns — all PASS import test,
leak-scanned clean, mirrors byte-identical, GAF runtime + hermes in both
JSON copies. All 5 root JSONs auto-seeded by the fixed `update_gaf`.

**Wave 39 — DONE & independently verified (2026-09-16):**
rapid-prototyper, real-estate-buyer-seller, reality-checker,
realtime-collaboration-engineer, recruitment-specialist — all PASS import
test, leak-scanned clean, mirrors byte-identical, GAF runtime + hermes in
both JSON copies. All 5 root JSONs auto-seeded.

**Wave 38 — DONE & independently verified (2026-09-16):**
project-shepherd, prompt-engineer, proposal-strategist, psychologist,
rag-pipeline-engineer — all PASS import test, leak-scanned clean, mirrors
byte-identical, GAF runtime + hermes in both JSON copies. All 5 root
JSONs auto-seeded by the fixed `update_gaf`.

**Wave 37 — DONE & independently verified (2026-09-16):**
privacy-engineer, private-domain-operator, probe, manager,
programmatic-buyer — all PASS import test, leak-scanned clean, mirrors
byte-identical, GAF runtime + hermes in both JSON copies. 4 of 5 root
JSONs auto-seeded by the fixed `update_gaf` — the wave-36 bugfix proven in
production.

**Wave 36 — DONE & independently verified (2026-09-16, re-run after
converter bug fix):** platform-engineer, podcast-strategist, ppc-
strategist, pr-communications-manager, pricing-analyst — all PASS import
test, leak-scanned clean, mirrors byte-identical, GAF runtime + hermes in
both JSON copies (root JSONs auto-seeded by the fixed `update_gaf`). This
was the first wave hitting agents without a pre-existing root mirror — see
"Known issues & fixes" below.

**Wave 35 — DONE & independently verified (2026-09-16):**
performance-benchmarker, persona-walkthrough,
personal-growth-mentor, pipeline-analyst, pitch — all PASS import test,
leak-scanned clean, mirrors byte-identical, GAF runtime + hermes in both
JSON copies.

**Wave 34 — DONE & independently verified (2026-09-16):**
paid-social-strategist, patch, payments-billing-engineer,
pdf-engine-architect, penetration-tester — all PASS import test,
leak-scanned clean, mirrors byte-identical, GAF runtime + hermes in both
JSON copies.

**Wave 33 — DONE & independently verified (2026-09-16):**
offer-lead-gen-strategist, organizational-psychologist,
orgscript-engineer, outbound-strategist, auditor — all PASS import test,
leak-scanned clean, mirrors byte-identical, GAF runtime + hermes in both
JSON copies.

**Wave 32 — DONE & independently verified (2026-09-16):**
multi-agent-systems-architect, multi-platform-publisher,
narrative-designer, narratologist, network-engineer — all PASS import
test, leak-scanned clean, mirrors byte-identical, GAF runtime + hermes in
both JSON copies.

**Wave 31 — DONE & independently verified (2026-09-16):**
meeting-notes-specialist, minimal-change-engineer, mobile-app-builder,
mobile-release-engineer, model-qa — all PASS import test, leak-scanned
clean, mirrors byte-identical, GAF runtime + hermes in both JSON copies.

**Wave 30 — DONE & independently verified (2026-09-16):**
ma-integration-manager, macos-spatial-metal-engineer,
master-plan-architect, mcp-builder, medical-billing-coding-specialist —
all PASS import test, leak-scanned clean, mirrors byte-identical, GAF
runtime + hermes in both JSON copies.

**Wave 29 — DONE & independently verified (2026-09-16):**
linkedin-content-creator, livestream-commerce-coach,
llm-post-training-engineer, loan-officer-assistant, lsp-index-engineer —
all PASS import test, leak-scanned clean, mirrors byte-identical, GAF
runtime + hermes in both JSON copies.

**Wave 28 — DONE & independently verified (2026-09-16):**
legal-billing-time-tracking, legal-client-intake,
legal-compliance-checker, legal-document-review, level-designer — all
PASS import test, leak-scanned clean, mirrors byte-identical, GAF runtime
+ hermes in both JSON copies.

**Wave 27 — DONE & independently verified (2026-09-16):**
jira-workflow-steward, knowledge-graph-engineer,
korean-business-navigator, kuaishou-strategist, language-translator —
all PASS import test, leak-scanned clean, mirrors byte-identical, GAF
runtime + hermes in both JSON copies.

**Wave 26 — DONE & independently verified (2026-09-16):**
instagram-curator, i18n-engineer, investment-researcher,
iot-fleet-engineer, it-service-manager — all PASS import test,
leak-scanned clean, mirrors byte-identical, GAF runtime + hermes in both
JSON copies.

**Wave 25 — DONE & independently verified (2026-09-16):**
image-prompt-engineer, incident-responder,
incident-response-commander, inclusive-visuals-specialist,
infrastructure-maintainer — all PASS import test, leak-scanned clean,
mirrors byte-identical, GAF runtime + hermes in both JSON copies.
(One pre-existing `cydinia` tombstone in `.deleted/` is from an earlier
wave, not this one — untouched.)

**Wave 24 — DONE & independently verified (2026-09-16):**
historian, hospitality-guest-services, hr-onboarding,
identity-access-engineer, identity-graph-operator — all PASS import
test, leak-scanned clean, mirrors byte-identical, GAF runtime + hermes
in both JSON copies.

**Wave 23 — DONE & independently verified (2026-09-16):**
grant-writer, growth-hacker, healthcare-customer-service,
innovation-strategist, healthcare-marketing-compliance — all PASS
import test, leak-scanned clean, mirrors byte-identical, GAF runtime +
hermes in both JSON copies.

**Wave 22 — DONE & independently verified (2026-09-16):**
godot-gameplay-scripter, godot-multiplayer-engineer,
godot-shader-developer, government-digital-presales-consultant,
grant-research — all PASS import test, leak-scanned clean,
mirrors byte-identical, GAF runtime + hermes in both JSON copies.

**Wave 21 — DONE & independently verified (2026-09-16):**
gift-day, analyst, qa-engineer, git-workflow-master,
global-podcast-strategist — all PASS import test, leak-scanned clean,
mirrors byte-identical, GAF runtime + hermes in both JSON copies.

**Wave 20 — DONE & independently verified (2026-09-16):**
game-designer, gaussdb-expert, geoai-ml-engineer, geographer,
geoprocessing-specialist — all PASS import test, leak-scanned clean,
mirrors byte-identical, GAF runtime + hermes in both JSON copies.
**First 100 agents converted.**

**Wave 19 — DONE & independently verified (2026-09-16):**
focus-music-architect, fpa-analyst, french-consulting-market,
frontend-developer, game-audio-engineer — all PASS import test,
leak-scanned clean, mirrors byte-identical, GAF runtime + hermes in both
JSON copies.

**Wave 18 — DONE & independently verified (2026-09-16):**
filament-optimization-specialist, finance-tracker, financial-analyst,
finders, finops-engineer — all PASS import test, leak-scanned clean,
mirrors byte-identical, GAF runtime + hermes in both JSON copies.

**Wave 17 — DONE & independently verified (2026-09-16):**
executive-summary-generator, experiment-tracker, fedramp-rmf-compliance,
feedback-synthesizer, feishu-integration-developer — all PASS import
test, leak-scanned clean, mirrors byte-identical, GAF runtime + hermes in
both JSON copies.

**Wave 16 — DONE & independently verified (2026-09-16):**
email-intelligence-engineer, email-strategist,
embedded-firmware-engineer, esg-sustainability-officer,
evidence-collector — all PASS import test, leak-scanned clean, mirrors
byte-identical, GAF runtime + hermes in both JSON copies.

**Wave 15 — DONE & independently verified (2026-09-16):**
douyin-strategist, drone-reality-mapping, drupal-performance,
drupal-shopping-cart, economy-designer — all PASS import test,
leak-scanned clean, mirrors byte-identical, GAF runtime + hermes in both
JSON copies.

**Wave 14 — DONE & independently verified (2026-09-16):**
developer-advocate, developer-tooling-engineer, devops-automator,
discovery-coach, document-generator — all PASS import test,
leak-scanned clean, mirrors byte-identical, GAF runtime + hermes in both
JSON copies.

**Wave 13 — DONE & independently verified (2026-09-16):**
data-visualization-engineer, database-optimizer,
database-reliability-engineer, deal-strategist, desktop-app-engineer —
all PASS import test, leak-scanned clean, mirrors byte-identical, GAF
runtime + hermes in both JSON copies.

**Wave 12 — DONE & independently verified (2026-09-16):**
customer-service, customer-success-manager, data-consolidation-agent,
data-engineer, data-privacy-officer — all PASS import test,
leak-scanned clean, mirrors byte-identical, GAF runtime + hermes in both
JSON copies.

**Wave 11 — DONE & independently verified (2026-09-16):**
compliance-auditor, content-creator, corporate-training-designer,
cross-border-ecommerce, cultural-intelligence-strategist — all PASS
import test, leak-scanned clean, mirrors byte-identical, GAF runtime +
hermes in both JSON copies.

**Wave 10 — DONE & independently verified (2026-09-16):**
cloud-security-architect, cms-developer, code-reviewer,
codebase-archaeologist, codebase-onboarding-engineer — all PASS import
test, leak-scanned clean, mirrors byte-identical, GAF runtime + hermes in
both JSON copies.

**Wave 9 — DONE & independently verified (2026-09-16):**
china-ecommerce-operator, china-market-localization-strategist,
china-network-engineer, civil-engineer, clinical-evidence-agent — all
PASS import test, leak-scanned clean, mirrors byte-identical, GAF runtime
+ hermes in both JSON copies.

**Wave 8 — DONE & independently verified (2026-09-16):**
carousel-growth-engine, cartography-designer, change-management-consultant,
chief-financial-officer, chief-of-staff — all PASS import test,
leak-scanned clean, mirrors byte-identical, GAF runtime + hermes in both
JSON copies.

**Wave 7 — DONE & independently verified (2026-09-16):**
blockchain-security-auditor, book-co-author, bookkeeper-controller,
brand-guardian, business-strategist — all PASS import test,
leak-scanned clean, mirrors byte-identical, GAF runtime + hermes in both
JSON copies.

**Wave 6 — DONE & independently verified (2026-09-16):**
baidu-seo-specialist, behavioral-nudge-engine, bilibili-content-strategist,
bim-specialist, blender-addon-engineer — all PASS import test,
leak-scanned clean, mirrors byte-identical, GAF runtime + hermes in both
JSON copies.

**Wave 5 — DONE & independently verified (2026-09-16):**
appsec-engineer, ats-validator-architect, automation-governance-architect,
autonomous-optimization-architect, backend-architect — all PASS import test,
leak-scanned clean, mirrors byte-identical, GAF runtime + hermes in both
JSON copies.

**Wave 4 — DONE & independently verified (2026-09-16):**
analytics-reporter, anthropologist, api-platform-engineer, api-tester,
app-store-optimizer — all PASS import test, leak-scanned clean, mirrors
byte-identical, GAF runtime + hermes in both JSON copies.

**Wave 2 — DONE & independently verified (2026-09-16):**
creative-strategist, aeo-foundations, agentic-identity-trust,
agentic-search-optimizer, agents-orchestrator — all PASS import test,
leak-scanned clean, GAF runtime + hermes in both mirrors.

**Wave 3 — DONE & independently verified (2026-09-16):**
healthcare-aging-parent-care-companion, ai-citation-strategist,
ai-data-remediation-engineer, ai-engineer, ai-generated-code-auditor —
all PASS import test, leak-scanned clean, mirrors byte-identical,
GAF runtime + hermes in both JSON copies.

**Wave 1 — DONE & independently verified (2026-09-16):**

| slug | GAF skills | +Hermes skills | KB | import test |
|---|---|---|---|---|
| operations-manager | 10 | hermes-agent, hermes-cron-authoring | 19 | PASS |
| 3d-scene-developer | 4 | hermes-agent, rss-feeds, research-paper-writing | 782 | PASS |
| accessibility-auditor | 5 | hermes-agent, github, blocked-page-recovery | 46 | PASS |
| account-strategist | 5 | hermes-agent, web_competitor_intel, box | 37 | PASS |
| accounts-payable-agent | 5 | hermes-agent, hermes-cron-authoring | 13 | PASS |

Verification (re-run independently, not subagent self-report):
- top dir = slug; `SOUL.md` + `config.yaml` (endpoint = `SET_YOUR_ENDPOINT`
  placeholder, no `10.0.1.x`) + `memories/MEMORY.md` + skills/ present
- full-content leak scan clean (`sk-…`, `ghp_…`, `postgres://`, `xox…`,
  LAN IPs, `alexokita`, `mbf_…` key material)
- both JSON mirrors (`web/public/packs/agents/` + `packs/agents/`) carry
  `"hermes"` in `runtime`
- import-tested on scratch profiles (subagent), scratch profiles deleted

Artifacts on disk, **uncommitted** — Cursor ships the wave (git + deploy).

## Verified publish paths (empirical, 2026-09-16)

Two distinct publish surfaces — they do different things:

1. **Static catalog** (the 288 GAF stalls): files under
   `web/public/packs/agents/` (+ generated `agency-catalog.generated.json`
   from `scripts/import-agency-agents/convert.py`), deployed via git.
   **This is where hermes tarballs live and must be committed.**
   `farm_plant` downloads `…/packs/agents/<slug>.hermes.tar.gz` from here.
   No API writes here.

2. **Seller listings** (`POST /api/listings`, the plugin's `farm_post`):
   a Postgres `listings` row with `published: true`, pack JSON embedded
   (≤500 KB), its own `/agents/<slug>` page. Smoke-tested end-to-end:
   key accepted (Bearer `mbf_…`), `ok: true`, page served 200, then
   deleted by the seller from the UI (clean).

**Consequence:** `farm_post` alone does NOT make an agent plantable —
the tarball file must still ship through the static catalog
(git → deploy). `farm_post` is a complementary listing/marketplace
surface, not the catalog write path.

## Known issues & fixes

**FIXED in `/tmp/farm-conv/convert.py` (wave 36, 2026-09-16): `update_gaf`
crashed on agents without a root `packs/agents/<slug>.json` mirror.**
Root `packs/agents/` is a *partial* mirror: the original repo shipped only
126 root GAF JSONs (+120 tarballs) of the 288 agents; our conversion waves
created 53 more; Cursor committed 122 of those in `d7a79e5` ("add converted
agent GAF JSON next to Hermes tarballs"). Waves 1–35 only converted agents
that happened to have a root JSON, so the bug stayed latent; wave 36
(platform-engineer, podcast-strategist, ppc-strategist,
pr-communications-manager, pricing-analyst) hit the first 5 without one and
`json.load(open(root_path))` raised `FileNotFoundError` mid-wave (nothing
shipped: no repo tarballs, done.json untouched, only the first agent's
`web/public` runtime partially updated). The web build only reads
`web/public/packs` (`next.config.ts` rewrites `/packs/*` → `public/`), so the
root tree is a convenience mirror, not the source of truth.
**Fix:** `update_gaf` now seeds a missing root JSON from `web/public` before
updating both, preserving the byte-identical-mirror invariant that
`verify_wave.py` checks. Verified on platform-engineer: both runtimes
`['grok-bot','openclaw','hermes']`, copies identical. The wave-36 re-run is
safe — the update is idempotent ('hermes' appended only if absent), so the
partially-updated web copy cannot double-append.

**HAZARD (encountered wave 50, 2026-09-16): a concurrent catalog-
regenerator (upstream `scripts/import-agency-agents` tooling, run by a
Cursor-agent worker ~20:20) regenerated `web/public/packs/agents/` mid-
wave: it stripped `hermes` from web-copy GAF JSONs and deleted the 5
wave-50 web tarballs; root `packs/agents/` copies stayed intact. The
wave subagent restored all 5 from root and repaired 38 other clobbered
web JSONs; a full audit of all 250 done agents after that (tarballs
present + mirrors byte-identical + `hermes` in runtime in both JSON
copies) passed with 0 problems. **For future waves: a concurrent
catalog-regen can silently clobber web/ copies at any time — treat the
post-wave FULL-QUEUE AUDIT as a required final check (not just the
per-wave verify), and prefer root copies as restore source.**

## Findings for the site (mybot.farm)

- **FEATURE — tarball attach for listings / catalog.**
  No endpoint accepts a binary tarball. `farm_post` embeds pack JSON only
  (500 KB cap, no binary). Options: (a) `PUT /api/listings/[id]/tarball`
  (multipart or raw) keyed by seller API key; or (b) keep tarballs in the
  static catalog and have the listing/agent page link
  `…/packs/agents/<slug>.hermes.tar.gz` when the file exists (simplest —
  the workbench team pack already ships tarballs this way).
- **FEATURE — listing management API.** Seller keys can create listings but
  there is no `GET my listings` / `DELETE listing` by API key
  (`/api/listings/[id]` POST/PATCH are session/owner-scoped; deletion was
  done via UI). Needed for the plugin to clean up smoke tests headlessly.
- **FEATURE — key health check.** No authenticated `GET` to validate a
  seller key short of a full listing POST. A `GET /api/sell/key` (returns
  scope + listing count) would let the plugin preflight `farm_post`.
- **BUG (minor) — listing not in catalog/search APIs.** While the smoke
  listing was live it appeared on its `/agents/…` page and briefly in
  search, but `/api/stalls/<slug>` returned `stall_not_found` and the
  agent count stayed 288. If listings are meant to be first-class stalls,
  the `/api/stalls` list/by-slug routes need to merge `listings` rows
  (or the UI should make the distinction explicit). *Flagged, not yet
  confirmed as defect vs intended — confirm product intent.*

## Findings for the plugin (hermes-mybot-farm)

- **FEATURE — `farm_post` should return the listing `id` + page URL.**
  The API response includes `slug`/`pagePath` but not the DB `id`;
  management calls need the id.
- **FEATURE — `farm_my_listings` + `farm_delete_listing` tools**
  (depends on the listing-management API above).
- **CHORE — hermes-conversion publish helper.** A `farm_publish` flow that,
  per agent: updates the GAF `runtime` with `hermes`, verifies the tarball
  file exists in the pack dir, and (once the site ships a listing-tarball
  endpoint) attaches it. Until then, posting = git/deploy of the static
  catalog; the plugin stays read/plant-side.

## Next steps

- Wave 2 onward: one subagent per wave (~5 agents) per the queue; each
  wave lands as uncommitted repo artifacts + `agent-conversion/done.json`
  entries; Cursor ships waves.
- After site ships tarball-attach: switch waves to post listings with
  attached tarballs; add plugin management tools.
- Known upstream Hermes bug (GAP 2, `profile import` vs `.deleted/`
  tombstone) still open — see `docs/hermes-team-stall-bundle.md`.
