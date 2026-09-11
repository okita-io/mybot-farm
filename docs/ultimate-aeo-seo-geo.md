---
name: Ultimate AEO SEO GEO
description: >-
  Use when auditing or improving a site for SEO, AEO (answer extractability),
  and GEO (AI citation/mention) — brief docs or owned-repo code fixes.
---
# Ultimate AEO / SEO / GEO

One skill for **traditional SEO**, **Answer Engine Optimization (AEO)**, and **Generative Engine Optimization (GEO)**. Works in two modes.

## Modes (ask once, then proceed)

1. **Brief mode (default)** — Write markdown review + plan documents. Do **not** patch live sites. Use when Agency/CRM, competitor study, or the user wants a human-applied brief.
2. **Code mode** — Edit the owned repo (metadata, schema, robots, content, `llms.txt`). Only when the user clearly owns the codebase and asked for implementation.

If unclear, default to **brief mode** and say so.

## Vocabulary (use exactly)

| Term | Meaning |
|------|---------|
| **SEO** | Blue-link rank in Google/Bing |
| **AEO** | Extractable answers (snippets, PAA, some AI Overviews) — can a model lift a correct, self-contained answer? |
| **GEO** | Being cited or mentioned inside generated chat answers (ChatGPT, Gemini, Perplexity, Copilot, Claude) |

Google Search Central does **not** require extra “AI markup.” Ship crawlable HTML and people-first pages. `llms.txt` is an optional docs index, **not** a ranking cheat. Schema is table stakes, not a citation formula. **GEO ≠ geography.**

## Hard rules

1. **Never invent** rankings, traffic, backlinks, GSC numbers, citation share, or AI mention counts. Use `[NEED: …]`.
2. **Verify against evidence** (scrape, repo files, live HTML). Do not claim “missing FAQ” if it exists.
3. **One action this week** in every review — plus a short prioritized fix list. Dumping 20 equal findings has failed.
4. **Owned vs competitor** — Owned: review + plan (and code fixes in code mode). Competitor: review only.
5. **No outreach / no Reddit spam / no auto-publish** unless the user explicitly asks and gates are clear.
6. **No fake GrokBot / invented crawler tokens.** Only document known User-agents.
7. Prefer **MIT/Apache** practices; do not vendor NO-LICENSE packs verbatim.

## Intake (infer if obvious — don’t interrogate)

1. Site URL(s) and whether this is owned or competitor.
2. **Questions to win** (how a human types into ChatGPT) — not just keywords. If missing, draft ~15 candidates from the product and have the user cut.
3. Mode: brief vs code.
4. Brand DNA / category one-liner if available (`brand-context`, About page).

## Operating order

1. **Access** — Important copy in HTML (not JS-only); WAF not blocking wanted crawlers; sitemap + canonical sane.
2. **Training vs search split** — GPTBot / ClaudeBot / Google-Extended / Applebot-Extended are **business decisions**, independent of search appearance.
3. **Entity kit** — Consistent name + category statement; Organization/Person/Product JSON-LD; bios; `sameAs`; About that reads like a reference entry.
4. **Quotable pages** — Answer up top; stats, quotes, sources, tables; visible FAQ. Evidence density beats keyword stuffing (directional: Aggarwal et al., KDD 2024, arXiv:2311.09735).
5. **Fan-out** — Sub-question pages (pricing, vs, how-to, use-cases) matched to the question list.
6. **Corroboration** — Independent mentions, reviews, journalism. Query engines with target questions — that citation set *is* the competitive set.
7. **Optional `/llms.txt`** — Short docs index only; no stuffing.
8. **Measure** — Prompt panel × engine × mode (mention / recommendation / citation / accuracy). GSC generative-AI reports; Bing AI Performance; referrals `utm_source=chatgpt.com`.

## Five GEO levers (score 0–100 each; heuristic)

1. **Extractability (~25%)** — Answer in first 2–3 sentences under the question heading; self-contained sections; question-shaped H2/H3; facts in lists/tables; ~100–170 word answer blocks as a *heuristic*.
2. **Specificity & evidence (~25%)** — Named numbers + source + date; first-party data; named entities/versions; methodology. If a model could invent the page, it won’t cite it.
3. **Entity clarity (~20%)** — One canonical description everywhere; legal + product names stated once together; structured data with author/date where relevant.
4. **Corroboration (~20%)** — Listicles, reviews, third-party comparisons, community mentions with the canonical description intact.
5. **Machine access (~10%)** — robots policy intentional; clean HTML; optional `llms.txt` for doc-heavy sites; no interstitial over the answer.

## Foundational technical checklist (AEO/SEO)

Run against live HTML or repo:

- [ ] `robots.txt` intentional (search bots vs training bots)
- [ ] XML sitemap linked and fresh
- [ ] Canonical URLs correct; no soft-404 traps
- [ ] Title / meta description unique and human
- [ ] Primary content in server-rendered or static HTML
- [ ] H1 one clear topic; heading hierarchy sane
- [ ] Internal links to money / answer pages
- [ ] Organization (and Product/Article as fits) JSON-LD valid
- [ ] FAQ visible on-page if FAQ schema exists (don’t hide answers)
- [ ] Dates / freshness signals on time-sensitive content
- [ ] Images with meaningful alt; charts have text/table fallback
- [ ] No cloaking / AI-only content gates on answers
- [ ] Core pages indexable (no accidental `noindex`)
- [ ] HTTPS, redirects clean, mobile usable
- [ ] Open Graph / Twitter cards for share surfaces
- [ ] Contact / About / author pages exist for entity trust

## Traditional SEO (pair with AEO/GEO — don’t skip)

- Intent match: informational vs commercial vs navigational
- Keyword/cluster map → URL map (one primary intent per URL)
- Title/H1 alignment; thin/duplicate consolidation
- Internal link equity to priority pages
- Technical hygiene (crawl, index, CWV as `[NEED]` if unmeasured)
- Content refresh vs net-new; kill or merge zombies
- Backlinks/mentions: plan only unless user asks for outreach

**Content quality gate (SHIP / FIX / BLOCK)** — before publishing:
- Clear claim + audience + outcome in the open
- Evidence for non-obvious claims
- Author/entity identifiable
- No keyword stuffing or AI-slop patterns (hedging walls, fake precision)
- Links to primary sources
- Schema matches visible content

## Crawler notes (do not invent others)

| Token / topic | Note |
|---------------|------|
| OAI-SearchBot | Needed for ChatGPT **search** visibility |
| GPTBot / ClaudeBot / Google-Extended / Applebot-Extended | Training / extended use — separate from search |
| ChatGPT-User / Perplexity-User | Often ignore robots |
| Claude-User | Honors robots (Anthropic docs) |
| Google-Extended | Does **not** alone control AI Overviews; use GSC generative-AI controls |
| Bing | NOARCHIVE / NOCACHE / `data-nosnippet` affect Copilot surfaces |
| Applebot vs Applebot-Extended | `nosnippet` can remove Apple Intelligence context |
| xAI / Grok | No official webmaster robots contract — don’t invent a token |

## Schema policy

Prefer: `Organization`, `Person`, `Product`/`SoftwareApplication`, `Article`/`BlogPosting` with `author` + `datePublished`, `BreadcrumbList`.
`FAQPage` / HowTo: use when the FAQ/steps are **visible**; treat as comprehension aid. Do not rely on deprecated rich-result assumptions — verify current Google docs if claiming SERP features.

## Anti-patterns

- `llms.txt` keyword stuffing or fake “AI priority” claims
- AI-only cloaking (different content for bots vs users)
- FAQ schema without on-page answers
- Keyword stuffing for GEO
- Reddit / forum spam for “corroboration”
- Inventing citation %, GSC charts, or vendor panel scores
- Misdefining GEO as locale/geography
- Copying NO-LICENSE skill packs verbatim

## Deliverables

### Brief mode
Produce:
1. **Review** — scores (heuristic), evidence, gaps as `[NEED]`, **one action this week**, short fix list
2. **Plan** (owned only) — ordered implementation steps a human can apply
3. Optional **prompt panel** worksheet (10–20 questions × engines × modes)

### Code mode (owned repo only)
1. Same audit findings
2. Concrete diffs: metadata, JSON-LD, robots, content answer-blocks, optional `llms.txt`
3. Note framework (Next.js App Router, Astro, etc.) and verify build
4. Do not deploy unless asked

## Measurement panel (human-run unless tooling exists)

For each target question, log engine + mode:
- Mention | Recommendation | Citation | Accuracy
Sources of truth when available: GSC generative AI, Bing AI Performance, `utm_source=chatgpt.com`, manual panel notes. Never fabricate panel results.

## Optional companions (not required)

- Agency CRM skills: `aeo-geo`, `open-seo` (document-first)
- Code audit tooling: onvoyage `audit-website-aeo` / `improve-aeo-geo`
- Broader SEO suites: AgriciDaniel/claude-seo GEO subskill; aaron-he-zhu SEO/GEO (Apache-2.0 — keep attribution)

## Attribution (merged doctrine)

Synthesized for local use from MIT/Apache sources and Agency packs — not a verbatim vendor:
- Local Agency `aeo-geo` + `open-seo` + marketing-agi `geo.md` / `geo-engines.md`
- onvoyage-ai/gtm-engineer-skills (MIT)
- holy-templar/marketing-agi GEO levers (MIT)
- every-app/open-seo concepts (MIT)
- AgriciDaniel/claude-seo GEO guidance (MIT) — Google-aligned skepticism on magic markup
- aaron-he-zhu SEO/GEO / CORE-EEAT ideas (Apache-2.0)
- Directional study: Aggarwal et al., KDD 2024, https://arxiv.org/abs/2311.09735

Skip NO-LICENSE packs for verbatim text.
