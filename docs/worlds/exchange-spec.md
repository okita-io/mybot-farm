# Spec: World Exchange — export once, import per runtime

**Status:** Draft
**Date:** 2026-10-01
**Companion to:** [portability-spec.md](./portability-spec.md) §11
**Runtimes:** KiroCrew, Hermes Desktop, OpenClaw, Grok Bot

---

## 1. What this is

A hub format and two transforms per runtime:

1. **Export** reads a live world (or the files that stand in for one) and writes a generic bundle.
2. **Import** reads that bundle and writes an **import plan**: the exact files, profile fields, and manual steps that runtime can accept.

Pairwise converters are out. Four exporters and four importers cover every direction, including round-trip through the hub. Characters inside the bundle are [GAF agent-packs](./gaf-grok-template.md) (`mybot.farm/agent-pack`), so a world reuses planted agents instead of a second persona format.

The bundle is declarative. It contains no runtime API calls, no absolute paths, and no credentials.

---

## 2. Bundle layout

A world exchange is a directory (zipped for transport as `<id>.world.zip`):

```
neon-harbor.world/
  exchange.json                 # envelope + loss ledger
  world.json                    # portable world (schema worlds/v1)
  characters/<characterId>.json # one GAF agent-pack per character
  assets/<relative path>        # images and other bytes the manifest names
  state.json                    # optional scrubbed snapshot; import may ignore it
```

`exchange.json`:

```json
{
  "schema": "mybot.farm/world-exchange",
  "schemaVersion": 1,
  "id": "neon-harbor",
  "title": "Neon Harbor",
  "exportedFrom": "hermes",
  "exportedAt": "2026-10-01T16:00:00Z",
  "source": {
    "runtime": "hermes",
    "note": "profiles mara, jonah; group neon-harbor-dock"
  },
  "characters": ["mara", "jonah"],
  "lossy": true,
  "loss": [
    {
      "path": "characters.mara.memory",
      "action": "clipped",
      "detail": "Hermes MEMORY.md is 2200 characters; older entries omitted"
    }
  ]
}
```

`exportedFrom` is one of `kirocrew`, `hermes`, `openclaw`, `grok`, `author` (hand-written, no live runtime).

### 2.1 `world.json` (the generic world)

This is the file every importer reads. It replaces the draft manifest in the portability spec with the constraints from that review.

```json
{
  "schema": "worlds/v1",
  "id": "neon-harbor",
  "title": "Neon Harbor",
  "theme": {
    "palette": { "bg": "#0b1020", "fg": "#e6f1ff", "accent": "#36e0c0" },
    "backdrop": "assets/harbor-night.webp",
    "mood": "cyberpunk-cozy"
  },
  "places": [
    {
      "id": "dock",
      "name": "The Docks",
      "art": "assets/dock.webp",
      "connects": ["bar"],
      "present": ["mara"]
    }
  ],
  "characters": [
    {
      "id": "mara",
      "name": "Mara",
      "role": "harbor-master",
      "pack": "characters/mara.json",
      "avatar": "assets/mara.webp",
      "home": "dock",
      "memoryScope": "private",
      "capabilities": ["web", "files"],
      "relationships": { "jonah": "old friend", "user": "newcomer" }
    }
  ],
  "rules": {
    "turnModel": "defer",
    "handoff": "mention",
    "ambient": false,
    "maxPresent": 6
  },
  "entrypoint": { "place": "dock", "greeter": "mara" }
}
```

Field rules:

| Field | Rule |
|---|---|
| `characters[].pack` | Relative path to a GAF agent-pack inside the bundle, or a farm slug (`agents/mara`) resolved at import. Inline persona markdown is the pack's `profile.description` plus `memory[]`. |
| `memoryScope` | `private` (this character's notes), `shared` (the world state document), `substrate` (the runtime's shared machine). `substrate` is a warning, not a feature to recreate. |
| `capabilities` | Closed set for v1: `web`, `files`, `schedule`. Importers map these onto that runtime's conservative tool default. Raw tool names are dropped on export. |
| `turnModel` | `director`, `free-for-all`, `round-robin`, `defer`. `defer` means the runtime's own room protocol picks the speaker. Export uses `defer` when the source was a Hermes group or a Grok group. |
| `maxPresent` | Characters listed on one place. Default 6 so a Grok group can hold a scene. Extra cast stays offstage (`home` set, absent from every `present`). |
| `ambient` | Default `false`. Routines travel as GAF `routines[]` prose. No importer creates cron unless the operator passes `--schedule`. |
| Assets | Paths relative to the bundle root. Missing files are a loss entry, not a hard failure, unless `--strict`. |
| Absent on purpose | `voice`, runtime tool ids, session transcripts, cookies, `.env`, absolute paths, MCP server commands. |

`state.json` is a snapshot, not the world:

```json
{
  "schema": "worlds/state/v1",
  "worldId": "neon-harbor",
  "place": "dock",
  "where": { "mara": "dock", "jonah": "bar" },
  "recent": [{ "at": "2026-10-01T16:00:00Z", "kind": "speech", "actor": "mara", "text": "Tide's in." }]
}
```

Import places the file and starts the world at `entrypoint` unless the operator passes `--with-state`. `recent` is capped at 20 entries on export. Transcripts of the underlying chats are not copied.

### 2.2 Character file = GAF agent-pack

`characters/mara.json` validates with `validateGafPack`. Required for a world character:

- `format: "mybot.farm/agent-pack"`
- `profile.name`
- `profile.description` (the persona body an importer can drop into a system prompt)
- `memory[]`, `skills[]`, `routines[]` optional, same shapes as GAF

World-only facts (home, relationships, capabilities, memory scope) stay on `world.json`, not inside the GAF pack. That keeps `gafToGrokTemplate`, Hermes plant, and OpenClaw plant working on the character file alone.

---

## 3. Loss ledger

Every exporter appends `exchange.loss[]`. Importers append more when they cannot apply a field. Actions:

| Action | Meaning |
|---|---|
| `kept` | Omitted from the ledger. Round-trips. |
| `clipped` | Text shortened to a runtime budget. |
| `rewritten` | Same intent, different shape (capability `web` → Kiro `web` tool, Hermes toolset, Grok "use the browser"). |
| `dropped` | Not representable. Listed so the operator sees it. |
| `manual` | Present in the import plan as a human step. |

Lossless subset, asserted on every round trip: `id`, `title`, `places[]` (id, name, connects, present), `characters[]` (id, name, role, home, memoryScope, capabilities, relationships), `rules`, `entrypoint`, and each character's `profile.name` + `profile.description`.

Known loss, recorded and not treated as failure:

| From | To | What gives |
|---|---|---|
| Hermes | any | `MEMORY.md` above ~2,200 chars and `USER.md` above ~1,375. Exporter keeps the world pointer and the newest entries that fit, and ledgers the rest. |
| OpenClaw | any | `SOUL.md` plant path already clips near 1,200 chars. Exporter stores the full persona in GAF and ledgers the clip only when the source file was already clipped. |
| any | Grok | Image avatars. Importer emits `avatarShape` / `avatarColor` via `gafToGrokTemplate` fallbacks, or omits them. Scene art becomes a file path, not a group-chat image. |
| any | Grok | `memoryScope: private` for files. Private text is folded into that Bot's description and memory lines. The state file is `substrate`. |
| any | Grok | Cast present in one place above 6, or more than 50 bots + groups on the account. Extra places become extra manual groups, or characters stay offstage. |
| any | all | Live cron, session ids, widget HTML, desktop pane layout, OpenClaw session keys, Grok screens. |
| all | all | Secrets. Scrub runs before the bundle is written. A finding fails the export (exit 2) rather than landing in the zip. |

Scrub reuses the farm rule: strip API keys, bearer tokens, absolute home paths, `mcpServers` command paths, `.env` values, and cookie or credential files. Asset bytes are kept only when the manifest references them and the file is an image (`png`, `webp`, `jpg`, `gif`) under 4 MiB.

---

## 4. Exporter contract

One entrypoint, four readers:

```
node packages/world-exchange/bin/world-export.mjs <runtime> --id <worldId> --out <dir> [--strict]
```

Shared behavior:

1. Read the runtime's native records (§5).
2. Build `world.json`, one GAF pack per character, and copy referenced assets.
3. Run scrub. Exit 2 on a secret or an absolute path that scrub cannot rewrite.
4. Write `exchange.json` with `loss[]`.
5. Default is a directory. `--zip` writes `<id>.world.zip`.
6. `--strict` exits 3 when any `dropped` or `clipped` entry exists. Default exits 0 and prints the ledger.

Exporters are read-only against the runtime. They do not create profiles, agents, or cron.

### 4.1 KiroCrew reader

| Native | Bundle field |
|---|---|
| `~/.kiro/agents/<name>.json` `prompt` | `characters/<id>.json` `profile.description` |
| `description` | `profile.title` and a one-line `profile.description` fallback when `prompt` is empty |
| `~/.kiro/crew/members/<id>/briefing.md` | Prepended to the persona under a `## Briefing` heading |
| Member private memory files (`memory_stores/.../memory/*.md`) | `memory[]` entries, `kind: "profile"` for durable notes, `kind: "log"` for the rest. Cap 40 entries. |
| World-state artifact whose slug is `world-<id>` | `state.json` |
| `tools` / `allowedTools` | `capabilities` via the map below. Unknown tools → `dropped`. |
| Crew workflow `META` that names this world | `rules.turnModel` when the script is a director; otherwise `defer`. The script body is not copied. |

Capability map (export): a read or web tool → `web`; `fs_read` → `files`; `kirocrew-cron` or a schedule bound to the member → `schedule`. `execute_bash` and `fs_write` are dropped even if the live agent has them. Import will not grant them back.

`KIRO_HOME` overrides `~/.kiro`. If Crew Members is disabled and only agent JSON exists, export still succeeds and ledgers `manual`: "member binding was not present."

### 4.2 Hermes reader

| Native | Bundle field |
|---|---|
| Profile dir `~/.hermes/profiles/<name>/` | One character. `name` from the directory. |
| `SOUL.md` | `profile.description` |
| `profile.yaml` `ui_meta.hermes-bots.title` | `role` |
| `memories/MEMORY.md`, `memories/USER.md` | `memory[]`, clipped to the live file caps, with a `clipped` loss if the file was already at the cap and a world block was stripped |
| `skills/*/SKILL.md` | `skills[]` |
| Bot groups (`ui_meta.hermes-bots.groups`) | `places[]`. One group id → one place. Members of that group → `present`. |
| `~/.hermes/worlds/<id>/world.json` when the Worlds plugin has written one | Preferred source for theme, places, and rules. Profiles fill any character the file names and the file omitted. |
| `~/.hermes/worlds/<id>/state.json` | `state.json` |
| Cron jobs on the profile | `routines[]` prose only. Job ids dropped. |

`HERMES_HOME` overrides `~/.hermes`. A profile that is not stamped `ui_meta.hermes-bots` is still exportable with `--include-profiles mara,jonah`; it is ledged as "not a Bot Mode roster entry."

Group chats are the scene, so `turnModel` exports as `defer` and `handoff` as `mention`.

### 4.3 OpenClaw reader

| Native | Bundle field |
|---|---|
| Agent workspace (`~/.openclaw/worlds/<id>/<agent>/` or `~/.openclaw/agents/<id>/`) `SOUL.md` | `profile.description` |
| `IDENTITY.md` name and title lines | `profile.name`, `profile.title` |
| `MEMORY.md` | `memory[]` |
| `skills/*/SKILL.md` | `skills[]` |
| `AGENTS.md` standing orders | `memory[]` kind `profile`, prefixed `[standing order]` |
| Plugin file `~/.openclaw/worlds/<id>/world.json` | Preferred world source, same rule as Hermes |
| `state.json` beside it | `state.json` |
| `tools.agentToAgent.allow` pairs | `relationships` only when the world file has no relationships. The allow-list itself is not a relationship; it is rebuilt on import from the cast. |

`turnModel` exports as `director` when the world file says so, otherwise `defer`. Channel transcripts are not read. `show_widget` HTML is dropped.

Config is read from the gateway's documented config file. The exporter does not call `openclaw agents add`.

### 4.4 Grok reader

Grok Bot has no management API, so this exporter reads a **folder the operator copied** off the shared computer, not a live session.

```
world-export grok --from ~/Downloads/neon-harbor-export --out ./neon-harbor.world
```

Expected layout of `--from` (a convention we document; the app does not produce it):

```
neon-harbor-export/
  world.json          # optional, if a coordinator Bot was told to save one
  state.json          # optional
  bots/<name>.md      # name, title, description, memory notes the operator pasted from Edit Profile
  groups.json         # [{ "name", "bots": [] }]
  assets/             # optional
```

Without `bots/*.md`, export exits 4 and prints the paste template (name, title, description, which group). That is the whole Grok exporter: normalize those notes into GAF packs and a `world.json`. `turnModel` is `defer`. `memoryScope` for the state file is `substrate`, ledged `dropped` for private files. Group membership above 6 is `dropped` down to the first 6 and the rest move offstage.

---

## 5. Import plan — the shape each runtime accepts

Import does not poke the runtime until `--apply`. Default is a plan on stdout and a directory of files that *would* be written.

```
node packages/world-exchange/bin/world-import.mjs <runtime> --bundle ./neon-harbor.world --out ./plan [--apply]
```

Every plan has the same envelope:

```json
{
  "schema": "mybot.farm/world-import-plan",
  "schemaVersion": 1,
  "runtime": "hermes",
  "worldId": "neon-harbor",
  "files": [
    { "path": "~/.hermes/worlds/neon-harbor/world.json", "contents": "{...}" }
  ],
  "commands": [
    { "argv": ["hermes", "profile", "import", "..."], "when": "apply" }
  ],
  "manual": [
    { "order": 1, "text": "Open Hermes Desktop and confirm the Bots roster lists Mara." }
  ],
  "loss": []
}
```

`files[].path` may use `~` and the runtime env home (`KIRO_HOME`, `HERMES_HOME`, `OPENCLAW_HOME`). `--apply` refuses a path outside that home. Commands are a fixed allow-list per runtime (below). Anything else stays in `manual`.

Existing destinations are not overwritten unless `--force`. `--dry-run` is the default; `--apply` is the opt-in.

### 5.1 KiroCrew plan

| Plan entry | Shape |
|---|---|
| Agent template | `~/.kiro/agents/<id>.json` with `name`, `description`, `model: "auto"`, `prompt` (persona + a short "you live in \<world\>, home \<place\>" block), `tools` / `allowedTools` from capabilities only: `web` → read/search/web tools already on the farm's conservative list; `files` → `fs_read`; `schedule` → documented in the prompt, no cron. Never `execute_bash` or `fs_write`. |
| Member bind | Command, only with `--apply`: `kirocrew agent create --name <id> --kiro-agent <id>`. Skipped with a manual step when the CLI returns the Crew Members preview error. |
| Briefing | `~/.kiro/crew/members/<id>/briefing.md` containing role, home, relationships, and "read the world state artifact `world-<id>` before speaking." |
| State | Artifact body in the plan as `files[]` content. Apply asks the operator to save it (`kirocrew artifact save --slug world-<id>`) because artifact create is session-scoped. Listed as `manual` until that CLI is confirmed. |
| World plugin / widget | Not generated per world. The plan's last manual step points at the Worlds workflow or app once it exists. v1 import stops at agents + briefing + state JSON. |

### 5.2 Hermes plan

| Plan entry | Shape |
|---|---|
| Profile soul | `SOUL.md` body = GAF `profile.description`. Applied by writing a profile directory and `hermes profile import`, or `profiles.create` when the desktop host is the caller. Import in v1 uses the CLI: stage a tarball the existing plant path already accepts, then `hermes profile import`. |
| Bot stamp | `profile.yaml` `ui_meta.hermes-bots`: `{ custom: true, title: <role>, groups: [<placeId>] }`. Same marker `team_plant.mark_member_bot` writes today. |
| Memory | One fenced block appended to `memories/MEMORY.md`, matching the team-plant fence style: world id, place, "shared facts live in `~/.hermes/worlds/<id>/state.json`." Block must fit under the 2,200 character cap. Overflow is `clipped` and the full text stays in the bundle's GAF `memory[]` only. |
| Skills | `skills/<name>/SKILL.md` from GAF `skills[]`. |
| Routines | Written as prose in the profile. Cron is created only with `--schedule`, via `hermes cron` when that command exists; otherwise a manual step. Default off. |
| World files | `~/.hermes/worlds/<id>/world.json` and `state.json` (entrypoint state if `--with-state` is absent). |
| Groups | One Bot Mode group id per place, members = `present` plus the greeter if missing. Creating the room through gateway RPC is a command when `HERMES_GATEWAY_RPC` is set (the farm team planter already does this). Otherwise manual: "In the Bots roster, new group chat named \<place\>, add \<names\>." |
| Pane | Not in the plan. The Worlds desktop plugin is installed once and reads `~/.hermes/worlds/<id>/`. |

### 5.3 OpenClaw plan

| Plan entry | Shape |
|---|---|
| Agent | Command allow-list: `openclaw agents add <id>` when the agent is missing. Workspace `~/.openclaw/worlds/<id>/<characterId>/`. |
| Files in the workspace | `SOUL.md` (persona, clipped to 1,200 with a ledger entry when longer), `IDENTITY.md` (name, title, world id, home), `MEMORY.md` (GAF memory lines, each clipped to 400 to match the current plant writer), `AGENTS.md` (relationships, place, "shared state is `../state.json`", handoff by mention). `skills/<name>/SKILL.md`. `ROUTINES.md` when `routines[]` is non-empty, marked as intention prose. |
| Policy snippet | A JSON fragment the operator merges, or `--apply` writes only the worlds plugin config key, never the whole `openclaw.json`. Fragment: `tools.agentToAgent.enabled: true` and `allow` pairs for every ordered pair in the cast. Ledger a warning that gateway default visibility is broad and this allow-list is the world's boundary. |
| State | `~/.openclaw/worlds/<id>/state.json` and a copy of `world.json`. |
| Render | Manual: "Open the world session in Control UI and pin a scene widget." No `show_widget` call at import time. Messaging channels get no extra files. |
| Restart | Manual: `openclaw gateway restart` after apply, same as the farm plugin. |

### 5.4 Grok plan

`commands` is empty. The plan is a checklist plus one JSON file per Bot in the Grok template shape from `gafToGrokTemplate` ([gaf-grok-template.md](./gaf-grok-template.md)).

| Plan entry | Shape |
|---|---|
| `bots[]` | `{ recipe, worldAddendum }`. `recipe` is the template (`profile.name`, `profile.description`, flat avatar tokens, `memory`, `skills`, `routines`, `plugins`, `visibility`). `worldAddendum` is a paragraph appended to the description: world title, role, home, relationships, "shared scene file: worlds/\<id\>/state.json on this computer, visible to every Bot", "when speaking in a group, wait for @mention unless you are the greeter." |
| `groups[]` | `{ name, botNames }`, one per place, length 2–6. A place with one character is a manual DM, not a group. A place with more than 6 is split or truncated and ledged. |
| `files[]` | `worlds/<id>/world.json` and `state.json` for the operator to put on the shared computer. |
| `manual` | Ordered: create each Bot (New → Create new agent → Edit Profile from the recipe), enable skills per Bot, create each group with those Bots, paste the addendum, copy the files, send the greeter `@<name> open the scene`. |
| Images | Asset paths listed as files. The checklist says to attach the backdrop from the user's own message, because bot-to-group messages are text-only. |

Apply on Grok prints the checklist and writes `plan/grok/` (recipes + files). It does not open the app.

---

## 6. Compatibility matrix

What a field becomes on the way in. "File" means the import plan writes it. "Manual" means a checklist line. "Drop" means a loss entry and no write.

| Bundle field | KiroCrew | Hermes | OpenClaw | Grok |
|---|---|---|---|---|
| Persona (`profile.description`) | Agent `prompt` | `SOUL.md` | `SOUL.md` | Bot description |
| `memory[]` | Member memory notes in the briefing (cap 40) | Fenced `MEMORY.md` block, 2,200 char budget | `MEMORY.md` lines, 400 chars each | Recipe `memory[]` |
| `skills[]` | Steering files under `.kiro/steering/farm/worlds/<id>/` | `skills/<name>/SKILL.md` | `skills/<name>/SKILL.md` | Recipe `skills[]`, enable per Bot (manual) |
| `routines[]` | Prompt section; cron only with `--schedule` | Prose; cron only with `--schedule` | `ROUTINES.md` | Recipe `routines[]`; user schedules them |
| `capabilities` | Conservative allow-list | Toolset note in `SOUL.md` for v1 (no toolset API in this plan) | Not written into agent config in v1; documented in `AGENTS.md` | Addendum sentence |
| Places / present | Briefing + state JSON | Bot groups | `AGENTS.md` + state JSON | Groups of 2–6 |
| Theme / backdrop | State JSON + asset paths; widget later | `world.json` for the pane plugin | `world.json`; widget later | Files + manual attach |
| `turnModel: defer` | Briefing: answer when `@`mentioned | Native group protocol | `AGENTS.md` instruction | Native group protocol |
| `turnModel: director` | Manual until the workflow exists | Loss → treated as `defer`, ledgered | Same, ledgered | Same, ledgered |
| Private memory | Member store | Profile home | Agent workspace | Conversation text only |
| Shared state | Artifact slug `world-<id>` | `~/.hermes/worlds/<id>/state.json` | `~/.openclaw/worlds/<id>/state.json` | File on the shared computer (`substrate`) |
| Avatar image | Path in briefing | Left as an asset; profile avatar stays the app's | `IDENTITY.md` notes the path | Mark enum or omitted |

---

## 7. Round trip

The conformance test is one bundle, not one UI snapshot.

1. Author `neon-harbor.world` by hand (`exportedFrom: author`).
2. Import `--dry-run` for all four runtimes. Assert the lossless subset appears in each plan, and the loss ledger contains the Grok image and private-file entries.
3. `--apply` on KiroCrew and Hermes in a temp home. Export again. Diff the lossless subset of `world.json` and each character's `profile.name` and `profile.description`.
4. OpenClaw apply is the same test when the CLI is present; otherwise the dry-run plan is the assertion.
5. Grok apply is "the checklist names every character and every place, and every group has length 2–6."

A field that fails to round-trip on the lossless subset is a bug. A field in the known-loss table is a ledger line.

---

## 8. Package and sequencing

```
packages/world-exchange/
  bin/world-export.mjs
  bin/world-import.mjs
  src/bundle.mjs            # read/write/validate/scrub
  src/exporters/{kirocrew,hermes,openclaw,grok}.mjs
  src/importers/{kirocrew,hermes,openclaw,grok}.mjs
  src/capabilities.mjs      # tool name → web|files|schedule
  fixtures/neon-harbor.world/
  test/
```

Language is Node, so it can import the GAF validators by extracting them later. v1 copies the small validation it needs (format string, profile.name, relative asset paths) and does not depend on the Next app.

Sequence:

1. Schema, fixture, validator, loss ledger, scrub.
2. Hermes exporter + importer (dry-run, then apply against a temp `HERMES_HOME`). Highest-value pair: groups and `SOUL.md` already match the bundle.
3. KiroCrew exporter + importer (agent JSON + briefing).
4. OpenClaw exporter + importer (workspace files + policy fragment).
5. Grok exporter (folder convention) + importer (checklist + `gafToGrokTemplate` recipes).

The Worlds desktop pane, OpenClaw widget, and KiroCrew workflow stay in the portability spec. This package only moves the data those UIs read.

---

## 9. Out of scope

- Running a scene or routing turns.
- Installing the Worlds plugin or pane.
- Writing cron by default.
- Granting shell or write tools on import.
- Calling a Grok Bot API.
- Replacing GAF. A character file *is* a GAF agent-pack. The world file is the only new schema.
