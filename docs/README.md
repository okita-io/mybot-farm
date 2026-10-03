# mybot.farm docs

Product and marketplace notes for [mybot.farm](https://mybot.farm). The web app lives in `web/`.

| Doc | What it covers |
|-----|----------------|
| [positioning-farmers-market.md](./positioning-farmers-market.md) | Open “farmers market” for whole agents — positioning & principles |
| [user-systems-backlog.md](./user-systems-backlog.md) | **User systems backlog**: ranked systems for buyers/sellers/agents (#14 KiroCrew shipped; #15 team workflows specced), plus the `recommend_stall` (#9) spec |
| [teams.md](./teams.md) | **Teams**: multi-agent packs that work together (e.g. programmer + debugger) |
| [categories.md](./categories.md) | Browse taxonomy (lifestyle, coding, marketing, …) |
| [ultimate-aeo-seo-geo.md](./ultimate-aeo-seo-geo.md) | SEO / AEO / GEO doctrine for the site |
| [gaf-grok-template.md](./gaf-grok-template.md) | GAF ↔ Grok Bot template mapping, avatar fallbacks, `gafToGrokTemplate`, stallId/packVersion catalog metadata |
| [plant-from-share.md](./plant-from-share.md) | Share URL → preview → plant into buyer library (API + `/plant` sketch) |
| [agency-agents.md](./agency-agents.md) | Agency Agents MIT roster → farm packs (split, attribution, refresh) |
| [openclaw-plugin.md](./openclaw-plugin.md) | OpenClaw `mybot-farm` plugin — plant plus `farm_post` (GAF listings, seller API key) |
| [kirocrew-plugin-spec.md](./kirocrew-plugin-spec.md) | **KiroCrew plugin spec** (Track B) — fourth runtime: plant GAF into `~/.kiro/agents/*.json` + crew, `farm_post` back (system #14) |
| [kirocrew-team-workflows-spec.md](./kirocrew-team-workflows-spec.md) | **Team workflows spec** — additive `workflows[]` on the team kind: bundle a crew's orchestrating workflows with its members; self-satisfying KiroCrew install (system #15) |
| [worlds/README.md](./worlds/README.md) | **Worlds** — hub for `worlds/v1`, exchange/portability specs, Hermes data contract, conformance, implementation todos |
| [hermes-plugin.md](./hermes-plugin.md) | Hermes `mybot-farm` plugin — Desktop Recruit plus plant/reinstall and `farm_post` (GAF listings, seller API key) |
| [hermes-team-stall-bundle.md](./hermes-team-stall-bundle.md) | Hermes team stall contract: download/bundle shape, GAF install flow, shipping gates |
| [api-keys.md](./api-keys.md) | Seller API keys, `POST /api/listings` Bearer auth, WebMCP `post_listing`, Hermes/OpenClaw `farm_post` |
| [solana-roadmap.md](./solana-roadmap.md) | Solana as an MPP rail: phased code changes, tests, GitHub branch + e2e checkpoints |
| [../packs/](../packs/) | Seed agent & team bots plus [Agency Agents packs](../packs/agency-agents/) |

Vault twin (editable scratch): `~/Documents/GlobalNotes/2026-09-11-mybot-farm-agent-marketplace.md`
