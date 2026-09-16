# GAF ↔ Grok Bot template

**Product:** [mybot.farm](https://mybot.farm)
**Golden pack:** [Gift Day](https://mybot.farm/agents/gift-day) — [`packs/agents/gift-day.json`](../packs/agents/gift-day.json)
**Template shape:** Grok Bot `create_bot_share_json` / `botTemplateShareArgsSchema` (profile, memory, skills, routines, plugins, gettingStarted, visibility)

This is **expressibility**, not a farm→Grok server call. The farm does not invoke `create_bot_share_json`. Path: download GAF (or `GET /api/packs/{slug}/grok-template`) → map → paste / share UI.

Hermes **rejects** GAF JSON and plants scrubbed `.tar.gz` only; new keys stay ignorable. OpenClaw plants profile / memory / skills today and may ignore `routines` / `plugins` / `gettingStarted` until a later plant pass.

---

## Already aligned (keep top-level)

Do **not** fork these under `runtimes.grokBot`. Gift Day already publishes them with the same names as the template:

| GAF (agent-pack) | Grok Bot template | Notes |
|------------------|-------------------|--------|
| `profile.name` | `profile.name` | Required |
| `profile.description` | `profile.description` | Required. Optional override: `exports.grokBotTemplate.profileDescriptionOverride` |
| `profile.title` | — | Farm listing/UI only. Drop on export. |
| `memory[]` | `memory[]` | `{ kind?: "profile"\|"log", createdAt?, content }`. No `[episode]` / `[note]`. |
| `skills[]` | `skills[]` | `{ name, description?, content }` prose — not a SKILL.md file. Template wants non-empty `content`. |
| `routines[]` | `routines[]` | `{ slug, name?, description, content }` intention prose. **Never** `automation.json` / cron JSON. Projector fills `name` from `slug` when missing. |
| `gettingStarted` | `gettingStarted` | Agent form `{ "skill": "<skills[].name>" }`. Omit on export if the skill is missing from `skills[]`. |

### Team packs are not 1:1

`format: "mybot.farm/team-pack"` uses `members[]`, `topology`, and `shared` (Hermes `shared.gettingStarted` is often a **string**). There is no `pack.team` key. Export each member agent-pack as its own template; put handoffs in memory or a README skill.

---

## Avatar

GAF keeps a nested geometric avatar:

```json
"profile": {
  "avatar": { "kind": "geometric", "shape": "teardrop", "color": "magenta" }
}
```

The template is flat: `profile.avatarShape` / `profile.avatarColor` against Grok Bot mark enums.

**Template shapes:** blob, pebble, bean, egg, squircle, tablet, capsule, cylinder, hex, gem, crystal, wedge, shield, dome, arch, cloud, teardrop, leaf

**Template colors:** black, brown, red, orange, yellow, green, cyan, blue, violet, magenta, gray

Farm-only values (seen on seeds) fall back unless the pack already uses a mark enum:

| GAF | Fallback |
|-----|----------|
| shape `book` | `tablet` |
| shape `triangle` | `wedge` |
| shape `circle` | `pebble` |
| shape `diamond` | `gem` |
| color `indigo` | `violet` |
| color `amber` | `yellow` |
| color `lime` | `green` |

Pack-level `exports.grokBotTemplate.avatarFallbacks` wins when present. Unmappable values are omitted (strict template Zod would reject them).

---

## Plugins (marketplace ids only)

`plugins[]` items are the same shape as the template:

```json
{ "pluginId": "some-marketplace-id", "name": "Optional", "description": "Optional" }
```

- Required: `pluginId` (non-empty string)
- Forbidden: `url`, `command`, custom MCP, local scripts
- Missing key → treat as `[]`. Prefer emitting `plugins: []`.
- If a needed service is not a marketplace plugin, say so in a `memory` log entry instead of inventing a connector.

Listing POST rejects url/command plugin items.

---

## Optional additive fields

Unknown keys stay ignorable by older consumers.

```ts
visibility?: "public" | "team"; // template export default: "public"

exports?: {
  grokBotTemplate?: {
    enabled?: boolean;
    avatarFallbacks?: {
      shape?: Record<string, string>;
      color?: Record<string, string>;
    };
    profileDescriptionOverride?: string;
  };
};
```

`enabled: true` is a hint that farm tooling may emit a template-ready recipe. The projector still runs for any agent-pack.

### JSON Schema (new bits)

```json
{
  "$defs": {
    "gafPlugin": {
      "type": "object",
      "required": ["pluginId"],
      "additionalProperties": false,
      "properties": {
        "pluginId": { "type": "string", "minLength": 1 },
        "name": { "type": "string" },
        "description": { "type": "string" }
      }
    },
    "exportsGrokBotTemplate": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "enabled": { "type": "boolean" },
        "avatarFallbacks": {
          "type": "object",
          "properties": {
            "shape": { "type": "object", "additionalProperties": { "type": "string" } },
            "color": { "type": "object", "additionalProperties": { "type": "string" } }
          }
        },
        "profileDescriptionOverride": { "type": "string" }
      }
    }
  },
  "properties": {
    "visibility": { "enum": ["public", "team"] },
    "plugins": { "type": "array", "items": { "$ref": "#/$defs/gafPlugin" } },
    "exports": {
      "type": "object",
      "properties": {
        "grokBotTemplate": { "$ref": "#/$defs/exportsGrokBotTemplate" }
      }
    }
  }
}
```

---

## Projector

`gafToGrokTemplate()` in `web/src/lib/gaf-grok-template.ts` maps an agent-pack to the recipe object. Gift Day projects to:

```json
{
  "profile": {
    "name": "Gift Day",
    "description": "Remembers birthdays and gifting occasions…",
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

Read it live: `GET /api/packs/gift-day/grok-template` (same purchase gate as `download_pack`). Team slugs return `400 not_an_agent_pack`.

---

## Exclusions (same deny-list as template share)

Do not put in a GAF pack or a template recipe:

- Secrets, API keys, logins, `.env`, `auth.json`
- Chat history, private files, customer PII
- Custom MCP servers / local scripts
- `automation.json` or live cron
- The author’s computer

`manifest.scrubbed: true` remains the farm promise. Hermes `scrub.py` is the tarball path.

---

## Install

`get_install_prompt` / How-To for Grok Bot now apply avatar, routines (user confirms schedules), marketplace plugins, and `gettingStarted.skill` — not only profile + memory + skills. Team copy uses `members[]` / `team-pack`, not `pack.team`.
