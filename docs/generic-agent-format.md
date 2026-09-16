# Generic Agent Format (GAF) ↔ Grok Bot templates

**Product:** [mybot.farm](https://mybot.farm)
**Golden pack:** [Gift Day](https://mybot.farm/agents/gift-day) (`packs/agents/gift-day.json`)
**Authoritative template shape:** Grok Bot `create_bot_share_json` / `botTemplateShareArgsSchema`

GAF (`mybot.farm/agent-pack`) already carries the core template payload: `profile`, `memory`, `skills`, `routines`, `plugins`, `gettingStarted`. Round-trip toward a Grok Bot template is **export mapping + install completeness**, not a second copy of memory/routines under `runtimes.grokBot`.

Farm tooling: `gafToGrokTemplate()` in `web/src/lib/gaf-to-grok-template.ts` (plus `validateFarmPack` for listing POST), optional `GET /api/packs/{slug}/grok-template`.

Unknown keys stay ignorable. Hermes **rejects GAF JSON by design** (plants scrubbed `.tar.gz` only). OpenClaw plants GAF into IDENTITY / SOUL / MEMORY / ROUTINES.md / FARM.md and ignores `exports` / `visibility`.

---

## Envelope vs recipe

| Field | GAF agent-pack | Grok Bot template | Mapping |
|-------|----------------|-------------------|---------|
| Envelope | `format`, `version`, `runtime[]`, `slug`, `category`, `tags`, `manifest`, `support`, `commerce` | None (recipe blob + `visibility`) | Strip on export. Optional `exports.grokBotTemplate.enabled` marks a pack as template-ready. |
| `profile.name` | Required in practice | Required | Direct |
| `profile.description` | Present | Required | Direct, or `exports.grokBotTemplate.profileDescriptionOverride` |
| `profile.title` | Farm listing/UI | **Absent** | Omit (do not invent a sentence) |
| Avatar | Nested `profile.avatar.{kind,shape,color}` | Flat `avatarShape` / `avatarColor` (mark enums) | Map at export / install. Keep the farm geometric avatar on the pack. |
| `memory[]` | `{ kind?: "profile"\|"log", createdAt?, content }` | Same | Direct. No `[episode]` / `[note]`. |
| `skills[]` | `{ name, description?, content }` prose | Same (not a SKILL.md file) | Direct. Scrubbed body only. |
| `routines[]` | `{ slug, name?, description, content }` intention prose | Same (no `automation.json`) | Direct. If `name` is missing, export uses `slug`. Never pack live cron JSON. |
| `plugins[]` | `{ pluginId, name?, description? }` | Same | Marketplace ids only. No custom MCP URLs. Omitted key → `[]`. |
| `gettingStarted` | `{ skill }` naming `skills[].name` | Same | Direct when set. Team packs use `shared.gettingStarted` **string** (Hermes/install prose) — do not feed that string into a template. |
| `visibility` | Optional `"public"` \| `"team"` | Required/used | Export defaults `"public"`. Farm stalls stay public listing pages. |

Team packs (`mybot.farm/team-pack`) have **no 1:1 template**. Export each `members[].pack` agent; put `topology.handoffs` into shared log memory or a README skill.

---

## Avatar fallbacks

Grok Bot mark **shapes:** blob, pebble, bean, egg, squircle, tablet, capsule, cylinder, hex, gem, crystal, wedge, shield, dome, arch, cloud, teardrop, leaf

Grok Bot mark **colors:** black, brown, red, orange, yellow, green, cyan, blue, violet, magenta, gray

Farm-only ids (live packs) map as:

| GAF | Used by | Template |
|-----|---------|----------|
| shape `book` | scholastic-research | `tablet` |
| shape `triangle` | pitch | `wedge` |
| shape `circle` | scout | `pebble` |
| shape `diamond` | finders | `gem` |
| color `indigo` | scholastic-research | `violet` |
| color `amber` | finders | `yellow` |
| color `lime` | (earlier / agency) | `green` |

Shared already: teardrop, leaf, hex, gem, shield, capsule; magenta, cyan, green, blue, orange.

Packs may override with `exports.grokBotTemplate.avatarFallbacks`. After fallbacks, values still outside the mark enums are **omitted** (not invented).

---

## Optional additive pack fields

```json
{
  "visibility": "public",
  "exports": {
    "grokBotTemplate": {
      "enabled": true,
      "avatarFallbacks": {
        "shape": { "book": "tablet", "triangle": "wedge", "circle": "pebble", "diamond": "gem" },
        "color": { "indigo": "violet", "amber": "yellow", "lime": "green" }
      },
      "profileDescriptionOverride": "optional template-only description"
    }
  }
}
```

`POST /api/listings` validates these when present. Older packs without the keys still list. Do not duplicate `memory` / `skills` / `routines` under a runtime-private tree.

Plugins — marketplace ids only:

```json
{ "pluginId": "web-search", "name": "Web search", "description": "Optional" }
```

`url`, `command`, and other MCP transport keys are rejected.

---

## Gift Day → template-ready projection

Live pack: nested `profile.avatar: { kind: "geometric", shape: "teardrop", color: "magenta" }` plus `memory`, `skills`, `routines`, `plugins: []`, `gettingStarted: { skill: "occasion-book" }`.

`gafToGrokTemplate` / `GET /api/packs/gift-day/grok-template` emits:

```json
{
  "profile": {
    "name": "Gift Day",
    "description": "Remembers birthdays and gifting occasions for the people you care about. Nudges you in time to buy or send something — never charges or orders without your yes.",
    "avatarShape": "teardrop",
    "avatarColor": "magenta"
  },
  "memory": [ ],
  "skills": [ ],
  "routines": [ ],
  "plugins": [],
  "gettingStarted": { "skill": "occasion-book" },
  "visibility": "public"
}
```

(The arrays are filled from the pack; this snippet shows the shape. The exporter does not invent occasion facts, skills, or schedules.)

---

## What each consumer should ignore

| Consumer | Use | Ignore |
|----------|-----|--------|
| **Grok Bot (install prompt)** | profile, mapped avatar, memory, skills, routines, plugins, gettingStarted | Farm envelope, `profile.title`, `exports` |
| **Grok Bot template export** | `gafToGrokTemplate` recipe | Same. Visibility defaults `public`. |
| **OpenClaw `farm_plant`** | profile/memory/skills → IDENTITY/SOUL/MEMORY; `routines[]` → `ROUTINES.md` (prose); plugin ids noted in `FARM.md` | `exports`, `visibility`; do not auto-install MCP |
| **Hermes `farm_plant`** | Scrubbed `.tar.gz` only | **All GAF JSON**, including new keys. Team `shared.gettingStarted` string is Hermes-oriented. |
| **Farm listing POST** | Accept optional `visibility` / `exports`; validate pluginId-only items | Unknown future keys (forward-compatible) |

Follow-up (not this change): Hermes stays tarball-only. OpenClaw types now list `routines` / `plugins` / `gettingStarted` explicitly.

---

## Install paths

1. Copy install prompt (`GET /api/install-prompt/{slug}`) — Grok-assisted plant now applies routines, plugins, gettingStarted, and avatar, not only profile/memory/skills.
2. Download GAF (`GET /api/packs/{slug}`).
3. Optional recipe JSON: `GET /api/packs/{slug}/grok-template`. Still not a server-side `create_bot_share_json`. Paid stalls use the same 402 gate as `download_pack`. Team slugs return 400.

Scrub deny-list (aligned with Hermes `scripts/scrub.py` and template share rules): no chat history, files, logins, keys, custom MCP, or local scripts.
