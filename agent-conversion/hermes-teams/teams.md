# Hermes Teams Catalog

**39 teams across 8 categories** — each team is a downloadable GAF team-pack seed (3–5 agent members, pipeline or hub-and-spoke topology). Members are the hermes tarballs already on the farm (`agents/<slug>.json`, all `runtime: [grok-bot, openclaw, hermes]`). A team is planted, its members join a new group chat, and together they co-generate the workflow for the request pattern below.

**Use:** download the team seed → plant → members in one Group Chat → they generate the workflow that fits a request like the *sample request*.

## Coding (15)

### Indie Web App Sprint — `indie-sprint`
- **Purpose:** Greenfield web app from idea to reviewable PR: rapid MVP, clean review, tested API.
- **Members (5, pipeline):** rapid-prototyper (lead-builder), frontend-developer (ui), backend-architect (api-architecture), api-tester (api-qa), code-reviewer (quality-gate)
- **Sample request:** *Build a landing page + signup flow for a coffee subscription app this week.*

### Feature Copilot — `feature-copilot`
- **Purpose:** Add a feature to an existing codebase without regressions: understand, minimal diff, tested.
- **Members (4, pipeline):** codebase-onboarding-engineer (context), minimal-change-engineer (implementation), test-automation-engineer (tests), code-reviewer (review)
- **Sample request:** *Add a CSV export to our reports page with tests, no breaking changes.*

### Godot Game Studio — `godot-studio`
- **Purpose:** Ship a playable Godot title: design, level, gameplay script, shaders, multiplayer.
- **Members (5, pipeline):** game-designer (design-lead), godot-gameplay-scripter (gameplay), godot-shader-developer (visuals), godot-multiplayer-engineer (netcode), level-designer (levels)
- **Sample request:** *Design and build a 5-room 2D roguelike prototype in Godot with one multiplayer co-op mode.*

### Unreal Engine Studio — `unreal-studio`
- **Purpose:** High-fidelity Unreal title: world building, systems, tech art, multiplayer architecture.
- **Members (4, pipeline):** unreal-multiplayer-architect (architecture), unreal-systems-engineer (systems), unreal-world-builder (world), unreal-technical-artist (tech-art)
- **Sample request:** *Build a streaming-enabled open-world level with one combat system in Unreal.*

### Unity Game Studio — `unity-studio`
- **Purpose:** Unity title from architecture to shipped build: editor tooling, shaders, multiplayer.
- **Members (4, pipeline):** unity-architect (architecture), unity-multiplayer-engineer (netcode), unity-shader-graph-artist (visuals), unity-editor-tool-developer (tooling)
- **Sample request:** *Ship a 2D party game for 4 local players in Unity with editor tooling for content teams.*

### Roblox Experience Craft — `roblox-craft`
- **Purpose:** Build a Roblox experience that retains: avatars, experiences, systems that don't cheat.
- **Members (3, pipeline):** roblox-experience-designer (design), roblox-avatar-creator (avatars), roblox-systems-scripter (systems)
- **Sample request:** *Design and script a Roblox tycoon experience with one progression loop and avatar shop.*

### 3D Web Experience Crew — `webgl-experience`
- **Purpose:** Browser-based 3D/immersive experiences (three.js-style): scene, WASM perf, browser QA.
- **Members (4, pipeline):** 3d-scene-developer (scene), webassembly-engineer (wasm-performance), frontend-developer (integration), performance-benchmarker (perf-gate)
- **Sample request:** *Put a real-time 3D product configurator on our marketing site, 60fps on mid-tier laptops.*

### Data Pipeline Factory — `data-factory`
- **Purpose:** End-to-end data engineering: pipeline, healthy warehouse, clean AI-ready data, dashboards.
- **Members (4, pipeline):** data-engineer (pipelines), database-optimizer (db-health), ai-data-remediation-engineer (data-quality), data-visualization-engineer (dashboards)
- **Sample request:** *Stand up a nightly pipeline from Postgres to a dashboard with quality alerts.*

### LLM Pipeline Crew — `llm-pipeline-crew`
- **Purpose:** Production RAG/LLM systems: retrieval pipeline, model QA, knowledge-graph grounding.
- **Members (4, pipeline):** rag-pipeline-engineer (retrieval), llm-post-training-engineer (model-tuning), model-qa (evals), knowledge-graph-engineer (grounding)
- **Sample request:** *Build a RAG answer service over our help-center docs with evals and a QA gate.*

### Mobile App Forge — `mobile-forge`
- **Purpose:** Ship mobile apps through store review: build, release, test automation, review.
- **Members (4, pipeline):** mobile-app-builder (build), mobile-release-engineer (store-release), test-automation-engineer (tests), code-reviewer (review)
- **Sample request:** *Take our iOS app to the App Store: release notes, screenshots pipeline, store-ready build.*

### Red Team & SRE — `redteam-sre`
- **Purpose:** Keep systems up and unbreakable: incident response, threat detection, pen tests, secrets hygiene.
- **Members (5, hub-and-spoke):** sre (reliability), incident-responder (incidents), threat-detection-engineer (detection), penetration-tester (offense), secrets-credential-engineer (credential-hygiene)
- **Sample request:** *Run a full reliability review of our API: pen test, secrets audit, and an on-call playbook.*

### Platform & FinOps — `platform-finops`
- **Purpose:** Run the platform cheaply: infra, automation, cost control, perf budgeting.
- **Members (4, hub-and-spoke):** sre (platform), devops-automator (automation), infrastructure-maintainer (infra), finops-engineer (cost)
- **Sample request:** *Cut our cloud bill 20% without degrading p95 latency this quarter.*

### AI App Engineering Crew — `ai-app-crew`
- **Purpose:** Ship AI-native products: LLM features, voice interfaces, multi-agent orchestration.
- **Members (4, hub-and-spoke):** ai-engineer (llm-features), voice-ai-integration-engineer (voice), multi-agent-systems-architect (orchestration), prompt-engineer (prompts)
- **Sample request:** *Add a voice assistant that books appointments end-to-end into our product.*

### E-Commerce Build Crew — `shopify-crew`
- **Purpose:** Run web stores profitably: Shopify/Drupal builds, performance, payments, checkout.
- **Members (4, hub-and-spoke):** drupal-shopping-cart (storefront), wordpress-shopping-cart (ecom), payments-billing-engineer (payments), wordpress-performance (performance)
- **Sample request:** *Launch our second storefront on a different platform with shared billing and performance budget.*

### CMS & Web Content Crew — `cms-craft`
- **Purpose:** Own the website layer: CMS builds, accessibility, i18n, performance.
- **Members (4, pipeline):** cms-developer (cms), accessibility-auditor (a11y), section-508-specialist (508), i18n-engineer (i18n)
- **Sample request:** *Rebuild our marketing site with WCAG 2.2 AA and a 3-language rollout plan.*

## Marketing (8)

### Short-Form Video Squad — `shortform-video-squad`
- **Purpose:** Always-on TikTok/Shorts/Reels: strategy, edit coaching, hooks, platform-native creative.
- **Members (4, pipeline):** tiktok-strategist (platform-strategy), short-video-editing-coach (edit-director), social-media-strategist (strategy), image-prompt-engineer (ai-visuals)
- **Sample request:** *Launch a weekly 3-video Shorts pipeline for our supplement brand that hooks in the first 2 seconds.*

### Growth & Paid Media Desk — `growth-paid-media`
- **Purpose:** Scale paid acquisition profitably: experiments, paid social, creative, audit, measurement.
- **Members (5, hub-and-spoke):** growth-hacker (experiments), paid-social-strategist (paid-social), ppc-strategist (search), auditor (media-audit), tracking-specialist (measurement)
- **Sample request:** *Rebuild our paid funnel at a lower CAC: audit, new creative set, tracking plan.*

### Organic Social & Community Desk — `organic-social-desk`
- **Purpose:** Own the unpaid channels: cross-platform posting, LinkedIn, communities, repurposing.
- **Members (4, hub-and-spoke):** social-media-strategist (strategy), multi-platform-publisher (distribution), linkedin-content-creator (b2b-content), reddit-community-builder (community)
- **Sample request:** *Grow our B2B SaaS from 5k to 25k followers in 90 days with weekly cadence and community presence.*

### China Market Entry Desk — `china-market-entry`
- **Purpose:** Enter or deepen the China market: localization, Douyin/Kuaishu/WeChat, cross-border e-com.
- **Members (4, hub-and-spoke):** china-market-localization-strategist (localization), douyin-strategist (douyin), wechat-official-account (wechat), kuaishou-strategist (kuaishou)
- **Sample request:** *Plan our first 6 months in China: brand localization, platform mix, and a launch content calendar.*

### Local SEO & AI Search Desk — `local-ai-search`
- **Purpose:** Win local + AI-answer search: classic SEO, agentic/AEO optimization, citation strategy.
- **Members (4, pipeline):** seo-specialist (seo), agentic-search-optimizer (aeo), ai-citation-strategist (citations), search-query-analyst (query-intel)
- **Sample request:** *Get our dental practice into the top 3 local pack for 5 keywords and cited by ChatGPT for 'best implant dentist near me'.*

### Content & Email Engine — `content-email-engine`
- **Purpose:** Owned-audience growth: content production, email lifecycle, visual storytelling, carousels.
- **Members (4, pipeline):** content-creator (editor), email-strategist (email), visual-storyteller (visuals), carousel-growth-engine (carousels)
- **Sample request:** *Run our newsletter + content calendar for a quarter: 4 posts/month, email flows that grow the list.*

### Podcast Launch & Growth Team — `podcast-team`
- **Purpose:** Launch or grow a podcast: strategy, distribution, growth loops, promo content.
- **Members (4, hub-and-spoke):** podcast-strategist (strategy), growth-hacker (growth-loops), video-optimization-specialist (promo-clips), pr-communications-manager (press)
- **Sample request:** *Take our B2B podcast from 500 to 20k monthly downloads: positioning, clip strategy, and a press plan.*

### Live Commerce Studio — `livestream-com`
- **Purpose:** Run live shopping shows: coaching, cross-border logistics, platform ops, video prep.
- **Members (4, hub-and-spoke):** livestream-commerce-coach (show), cross-border-ecommerce (logistics), china-ecommerce-operator (platform-ops), video-optimization-specialist (video-prep)
- **Sample request:** *Run our twice-weekly live shopping shows for the APAC market: script, ops, and recap clips.*

## Sales (4)

### Outbound SDR Crew — `outbound-sdr-crew`
- **Purpose:** Generate pipeline from zero: offer/lead-gen, outbound sequences, pipeline analytics.
- **Members (4, pipeline):** outbound-strategist (outbound), offer-lead-gen-strategist (offers), sales-outreach (sequences), pipeline-analyst (analytics)
- **Sample request:** *Build a 90-day outbound motion that books 15 discovery calls/month for our mid-market SaaS.*

### Deal & Account Desk — `deal-desk`
- **Purpose:** Win named accounts: account strategy, deal shaping, proposals, pricing.
- **Members (4, pipeline):** account-strategist (account), deal-strategist (deal-shaping), proposal-strategist (proposals), pricing-analyst (pricing)
- **Sample request:** *Take us from shortlist to signature on the $400k enterprise deal: account map, proposal, and pricing strategy.*

### Pre-Sales & Solution Crew — `presales-tech-crew`
- **Purpose:** Technical wins in RFPs/evals: demo strategy, solution mapping, government presales.
- **Members (4, hub-and-spoke):** engineer (sales-engineering), solution-engineer (solutions), government-digital-presales-consultant (gov-presales), technical-consultant (consulting)
- **Sample request:** *Win the federal RFP: compliance mapping, technical volumes, and a demo that closes.*

### Sales Coaching & Intelligence — `sales-coaching-intel`
- **Purpose:** Make reps better and see the data: coaching, discovery practice, CRM extraction, pipeline truth.
- **Members (4, hub-and-spoke):** coach (coaching), discovery-coach (discovery-practice), sales-data-extraction-agent (crm-data), pipeline-analyst (pipeline-truth)
- **Sample request:** *Run a quarter of rep development: discovery drills, call reviews, and a clean pipeline report.*

## Research (4)

### GIS & Spatial Data Desk — `gis-spatial-desk`
- **Purpose:** Spatial analysis that ships: analysis, web maps, spatial pipelines, geoprocessing.
- **Members (4, pipeline):** analyst (gis-analysis), web-gis-developer (web-maps), spatial-data-engineer (spatial-pipelines), geoprocessing-specialist (geoprocessing)
- **Sample request:** *Build a city-scale service-area analysis with a public web map and refresh pipeline.*

### Mapping & Drone Survey Crew — `map-and-drone`
- **Purpose:** Reality capture to map deliverables: drone surveys, BIM/GIS, cartography, 3D scenes.
- **Members (4, pipeline):** drone-reality-mapping (reality-capture), bim-specialist (bim-gis), cartography-designer (cartography), 3d-scene-developer (3d-scenes)
- **Sample request:** *Map a 40-acre construction site from drone capture into a client-ready basemap and progress model.*

### Deep Research & Synthesis — `deep-research-syn`
- **Purpose:** Answer hard questions with sourced synthesis: research synthesis, grants, consulting-grade output.
- **Members (4, hub-and-spoke):** synthesist (synthesis), grant-research (funding), technical-consultant (domain-consulting), solution-engineer (solution-mapping)
- **Sample request:** *Produce a 12-page state-of-the-field report on solid-state batteries with a funding-landscape appendix.*

### Field Research Corps — `field-research-corp`
- **Purpose:** Human-centered and quantitative research: anthropology, statistics, psychology, narrative analysis.
- **Members (4, hub-and-spoke):** anthropologist (field-methods), psychologist (behavior), statistician (quant), narratologist (narrative-analysis)
- **Sample request:** *Design and analyze a user study of 60 participants: instruments, stats plan, and interpretation.*

## Productivity (2)

### Product Sprint Desk — `product-sprint-desk`
- **Purpose:** Run product operations: backlog, sprint cadence, delivery tracking, tooling hygiene.
- **Members (4, hub-and-spoke):** manager (product), sprint-prioritizer (backlog), project-shepherd (delivery), jira-workflow-steward (tooling)
- **Sample request:** *Re-run our quarter: re-prioritize the backlog, set two-week sprints, and get Jira out of weeds.*

### Executive Ops & Reporting Desk — `exec-ops-desk`
- **Purpose:** Keep leadership informed: analytics reporting, exec summaries, experiment tracking, meeting capture.
- **Members (4, hub-and-spoke):** analytics-reporter (reporting), executive-summary-generator (summaries), experiment-tracker (experiments), meeting-notes-specialist (meetings)
- **Sample request:** *Give me the Monday leadership digest: KPI moves, experiment readouts, and action items from last week's meetings.*

## Personal finance (2)

### CFO Finance Office — `finance-office`
- **Purpose:** Small-company finance: books, FP&A, tax planning, investment-grade analysis.
- **Members (4, pipeline):** bookkeeper-controller (books), fpa-analyst (fpa), tax-strategist (tax), financial-analyst (analysis)
- **Sample request:** *Close the month, produce the board pack, and set up next year's budget with scenario ranges.*

### Investment Research Desk — `investment-desk`
- **Purpose:** Research-grade investment diligence: ideas, due-diligence data, models, portfolio view.
- **Members (4, hub-and-spoke):** investment-researcher (research), financial-analyst (modeling), fpa-analyst (scenarios), statistician (quant)
- **Sample request:** *Run diligence on our 3 largest positions: thesis review, updated models, and a scenario stress test.*

## Music (2)

### Focus Audio Lab — `focus-audio-lab`
- **Purpose:** Functional music production: focus/ambient scoring, game-audio systems, release packaging.
- **Members (3, pipeline):** focus-music-architect (scoring), game-audio-engineer (audio-systems), pitch (promotion)
- **Sample request:** *Score a 40-minute focus suite for our meditation app and package it for release with promo assets.*

### Game Audio & Score Crew — `game-audio-cinema`
- **Purpose:** Game and interactive audio: score, SFX, adaptive audio systems, audio-driven delight.
- **Members (3, hub-and-spoke):** game-audio-engineer (audio-systems), focus-music-architect (score), whimsy-injector (delight)
- **Sample request:** *Design the full audio direction for our co-op game: adaptive score, SFX system, and the one iconic sound.*

## Lifestyle (2)

### Personal Growth Pod — `personal-growth-pod`
- **Purpose:** Lifestyle engineering: coaching, journaling, gifting/planning, habit nudges.
- **Members (4, hub-and-spoke):** personal-growth-mentor (coaching), sprout-journal (journaling), gift-day (planning), behavioral-nudge-engine (habits)
- **Sample request:** *Build me a 90-day routine: morning journal prompts, weekly review ritual, and two habit nudges that stick.*

### Career & Job-Search Desk — `career-desk`
- **Purpose:** Land the next role: resume optimization, application tracking, prep coaching.
- **Members (4, pipeline):** resume-tailor (resume), recruitment-specialist (sourcing), ats-validator-architect (ats), coach (interview-coaching)
- **Sample request:** *Get me interview-ready in 30 days: tailored resumes, tracker for 40 target companies, and two mock interviews.*
