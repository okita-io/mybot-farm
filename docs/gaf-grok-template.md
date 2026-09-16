# GAF ↔ Grok Bot template

**Product:** [mybot.farm](https://mybot.farm)
**Status:** Additive GAF fields + client projector (the farm does **not** call `create_bot_share_json`)

GAF agent-packs already carry the template payload: top-level `profile`, `memory`, `skills`, `routines`, `plugins`, and `gettingStarted`. Do **not** fork those under `runtimes.grokBot`. Export is a thin map onto a `create_bot_share_json`-shaped recipe, plus optional `exports.grokBotTemplate` hints.

Golden pack: [Gift Day](https://mybot.farm/agents/gift-day) (`/packs/agents/gift-day.json`).

---

## Catalog metadata vs template recipe

`GET /api/stalls` (and each stall card) exposes identity/version fields that are **marketplace/catalog metadata**, not `create_bot_share_json` columns:

| Field | What it is | Where it comes from |
|-------|------------|---------------------|
| `stallId` | Stable UUID for the stall listing | **Seller listings:** `listings.id` (Postgres UUID). **Catalog/seed stalls:** UUID v5 of `https://mybot.farm/{agents\|teams}/{slug}` in the RFC 4122 URL namespace (`catalogStallId` in `web/src/lib/stall-id.ts`). Example: Finders (Road Crew peer) `04caa770-f6ae-5fad-881b-c77f28ae972c`; Gift Day `11732350-45c3-51ca-a73b-e9e8a1fc57b5`. |
| `packVersion` | Integer **content revision** for same-slug GAF updates | Stored on pack JSON as `packVersion` (distinct from GAF format `version` such as `"0.1"` / `"0.2"`). Seeds omit it and the catalog reports `1`. Seller upserts auto-increment (`web/src/lib/pack-version.ts`). |

Cite these in FARM.md, install notes, or optional GAF `manifest` / `commerce` provenance if an exporter wants a paper trail. **Do not** stuff `stallId` or `packVersion` into the template recipe — Grok Bot Zod would reject unknown recipe fields, and they are not bot identity.

Slug remains the public URL key (`/agents/{slug}`). `stallId` is the stable listing id; `packVersion` tracks listing revisions.

---

## Compatibility matrix

| Field | GAF agent-pack | Grok Bot template | Mapping |
|-------|----------------|-------------------|---------|
| Envelope | `format`, `version`, `runtime`, `slug`, `category`, `tags`, `manifest`, `support`, `commerce` | None | Strip on export. |
| `profile.name` / `profile.description` | Required in practice | Required | Direct. Optional `exports.grokBotTemplate.profileDescriptionOverride`. |
| `profile.title` | Farm listing/UI | Absent | **Omit** on export. |
| Avatar | Nested `profile.avatar.{kind,shape,color}` | Flat `avatarShape` / `avatarColor` (mark enums) | Flatten; apply fallbacks below. |
| `memory[]` | `{ kind?: "profile"\|"log", createdAt?, content }` | Same | 1:1. |
| `skills[]` | `{ name, description?, content }` | Same | 1:1. |
| `routines[]` | `{ slug, name?, description, content }` — intention prose, never `automation.json` | Same | 1:1; `name: r.name ?? r.slug`. |
| `plugins[]` | `[]` / omitted, or `{ pluginId, name?, description? }` | Marketplace ids only | 1:1. No custom MCP URLs. |
| `gettingStarted` | `{ skill }` naming `skills[].name` | Same | 1:1 when set. Team `shared.gettingStarted` **string** is Hermes-oriented — do not feed it to the template. |
| `visibility` | Optional `"public"\|"team"` | `"public"\|"team"` | Default export `"public"`. |
| `exports` | Optional; unknown sibling keys allowed | Absent | `exports.grokBotTemplate` is farm tooling only. |
| `stallId` / `packVersion` | Catalog / listing | Absent | Provenance only. |

Hermes plants **reject GAF JSON** (scrubbed `.tar.gz` only). New GAF fields stay ignorable there.

---

## Avatar fallbacks

Template shapes: blob, pebble, bean, egg, squircle, tablet, capsule, cylinder, hex, gem, crystal, wedge, shield, dome, arch, cloud, teardrop, leaf.

Template colors: black, brown, red, orange, yellow, green, cyan, blue, violet, magenta, gray.

Farm-only values map to the nearest mark enum (pack `avatarFallbacks` override these defaults):

| GAF | Fallback |
|-----|----------|
| shape `book` | `tablet` |
| shape `triangle` | `wedge` |
| shape `circle` | `pebble` |
| shape `diamond` | `gem` |
| color `indigo` | `violet` |
| color `amber` | `yellow` |
| color `lime` | `green` |

Shared already: teardrop, leaf, hex, gem, shield, capsule; magenta, cyan, green, blue, orange. Tokens still unknown after fallbacks are **omitted** (not invented).

---

## Additive pack fields

```json
{
  "visibility": "public",
  "plugins": [{ "pluginId": "marketplace-id", "name": "Optional", "description": "Optional" }],
  "exports": {
    "grokBotTemplate": {
      "enabled": true,
      "avatarFallbacks": {
        "shape": { "book": "tablet", "triangle": "wedge", "circle": "pebble", "diamond": "gem" },
        "color": { "indigo": "violet", "amber": "yellow", "lime": "green" }
      },
      "profileDescriptionOverride": "Optional template description"
    }
  }
}
```

Listing POST (`parsePackJson`) accepts unknown `exports` keys, validates plugin item shape when `plugins` is present, and requires `gettingStarted.skill ∈ skills[].name` when `gettingStarted` is set. Old packs that omit these keys still validate.

---

## Gift Day → template-ready projection

`gafToGrokTemplate(pack)` (in `web/src/lib/gaf-to-grok-template.ts`) maps Gift Day to:

```json
{
  "profile": {
    "name": "Gift Day",
    "description": "Remembers birthdays and gifting occasions for the people you care about. Nudges you in time to buy or send something — never charges or orders without your yes.",
    "avatarShape": "teardrop",
    "avatarColor": "magenta"
  },
  "memory": [
    {
      "kind": "profile",
      "content": "Gift Day only reminds and drafts; the user always approves purchases, sends, and calendar invites."
    },
    {
      "kind": "profile",
      "content": "Store occasion facts as name, relationship, date (month-day), lead time in days, and optional gift ideas — never store payment methods."
    },
    {
      "kind": "log",
      "createdAt": "2026-09-11",
      "content": "Default lead times: 10 days for shipped gifts, 3 days for a card-only note, 1 day for a same-day text draft."
    }
  ],
  "skills": [
    {
      "name": "occasion-book",
      "description": "Use when adding, updating, or listing birthdays and gift occasions.",
      "content": "Keep an occasion book in durable memory…"
    },
    {
      "name": "gift-nudge",
      "description": "Use when checking what is coming up or drafting a reminder.",
      "content": "Scan occasions within lead time…"
    }
  ],
  "routines": [
    {
      "slug": "morning-gift-scan",
      "name": "Morning gift scan",
      "description": "Weekday morning check for occasions inside lead time so gifts are not last-minute.",
      "content": "Each weekday morning in the user's local timezone: scan the occasion book…"
    }
  ],
  "plugins": [],
  "gettingStarted": { "skill": "occasion-book" },
  "visibility": "public"
}
```

Finders (`diamond` / `amber`) projects to `avatarShape: "gem"`, `avatarColor: "yellow"` via the default fallback table.

---

## Install / How-To (Grok Bot)

`get_install_prompt` now tells a Grok agent to:

1. Set the avatar from `profile.avatar` (mapped enums).
2. Save `pack.memory` and `pack.skills`.
3. Save `pack.routines` (prose; owner confirms schedules).
4. List `pack.plugins[].pluginId` for the owner to install from the marketplace.
5. Use `pack.gettingStarted.skill` as the first-run skill.
6. Mention catalog provenance (`slug`, `stallId`, `packVersion`).

Team packs are **not** 1:1 templates: plant each `members[]` agent pack. `pack.shared.gettingStarted` is a Hermes install string, not a Grok skill name.

The farm **cannot** call `create_bot_share_json` server-side. Clients map GAF → recipe (or `GET /api/packs/{slug}/grok-template`, which returns `{ recipe, catalog }` with `stallId` / `packVersion` **beside** the recipe, not inside it).

---

## Runtimes

| Consumer | memory / skills | routines | plugins | gettingStarted | exports / visibility / stall ids |
|----------|-----------------|----------|---------|----------------|----------------------------------|
| Grok install prompt | Consume | Consume | Marketplace id list | First-run skill | Provenance in prompt; visibility on export |
| `gafToGrokTemplate` | 1:1 | 1:1 + name fallback | 1:1 | If set | `visibility` default public; strip farm meta |
| OpenClaw `farm_plant` | IDENTITY / SOUL / MEMORY / skills | `ROUTINES.md` prose | Note ids in `FARM.md` | Tip in `FARM.md` | `packVersion` already in `FARM.md`; stallId from stall API if cited |
| Hermes `farm_plant` | N/A (rejects GAF JSON) | Ignore | Ignore | Team `shared.gettingStarted` string on tarball packs | Ignore |

Optional pack stub: `"exports": { "grokBotTemplate": { "enabled": true } }` signals “template-ready” without a GAF format version bump.
