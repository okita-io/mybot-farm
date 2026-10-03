# Group chats in a World

How a Hermes world "talks" once it is planted. A world has **two distinct chat
surfaces**, and the thing people usually conflate is that a *group chat* and the
*click-a-sprite chat bubble* are different animals.

- **The group chat (room)** — one hosted room for the cast. This is the *scene*:
  the multi-party conversation where Bots message each other. Owned by the
  gateway's room runtime.
- **The per-character chat bubble** — a *private 1:1* Bot Chat between you and
  one sprite. Opened by clicking a joined sprite in the pane. It is **not** the
  room; it is the single Bot's own canonical Bot Chat.

A world is populated (see README, Layer 2b+ `roster.json`) with **your** agents.
The group chat is the shared space those agents stand in and speak through; the
bubble is how *you* talk to one of them directly.

Cross-references: the authoritative turn-model and conformance rules live in the
repo's world specs — [`../../docs/worlds/exchange-spec.md`](../../docs/worlds/exchange-spec.md)
§"Field rules" and [`../../docs/worlds/portability-spec.md`](../../docs/worlds/portability-spec.md)
§"Let Bot Mode own the scene". This document is the Hermes-specific, self-contained
view; where they disagree, the repo specs win.

---

## 1. The scene is a hosted room

A world's group chat is a gateway **hosted room** — a durable, replayable
multi-agent discussion with a stable `room_id`. The room is created by the farm
plugin at plant time, *not* by the Worlds pane.

The room contract is the gateway's `groups.*` JSON-RPC methods
(`tui_gateway/methods_groups.py`):

```
groups.capabilities   groups.list      groups.create    groups.state
groups.send           groups.rename    groups.log       groups.disband
groups.replicate      groups.replica_state
groups.promote        groups.demote    groups.stop      groups.retry    groups.approve
groups.peer.invite    groups.peer.revoke  groups.peer.register
```

Rooms are process-scoped (a bounded worker schedules independent room workers);
**turn locks serialize Bots that share a profile** so two room turns on the same
profile never race. Member sessions reuse the title **`Group: <room_id>`** (source
`bot_room`) so a room keeps one transcript across restarts and local→hosted
migrations.

Two room methods matter to a world:

- **`groups.create`** — idempotent. `room_id` + `name` + `members: [{profile}]`.
  Returns the room. If the `room_id` already exists with different members/name it
  is a conflict (not a silent change); if it matches, the existing room is returned.
- **`groups.send`** — appends one typed event idempotently (keyed by `event_id`;
  the actor is server-owned, so a client cannot impersonate another member). Returns
  `{event, client_event_id, accepted, driver_started}`.

## 2. Plant creates the room and stamps its id

`farm_plant` on a `world-pack` (and `team-pack`) runs
`team_plant.configure_planted_team` → `try_create_group_chat`:

```python
groups.create(
    room_id  = plan.slug,            # the world slug, e.g. "neon-harbor"
    name     = plan.title or slug,   # e.g. "Neon Harbor"
    members  = [{"profile": name} for name in member_names],
)
```

Then, and only then, the **farm plugin** (never the pane) writes the returned room
id into `state.json` as **`chatId`** (todo 4 in
[`implementation-todos.md`](../../docs/worlds/hermes/implementation-todos.md)), via
`_write_world_state`. Guard rails that keep plant succeeding:

| Condition | What happens |
|-----------|--------------|
| `len(members) < 2` | No room; a `room_fallback_note` is added ("Create the room in Hermes Desktop: New Group Chat named … with members … — already seated via `ui_meta.hermes-bots.groups`"). |
| `HERMES_GATEWAY_RPC_URL` unset **or** gateway not running | No room; fallback note. Plant still writes `world.json`/`WORLD.md`/assets — a world without a gateway room is a **pure read model** (the pane still draws it). |
| `groups.create` throws | `groups.create skipped: …` + fallback note. Plant still succeeds. |

The pane reads `state.json.chatId` but **never invents a room** — the write door is
the farm plugin. The desktop pane's read-modify-write of `state.json` (its
`writeState`) preserves `chatId`, `recent`, and unknown keys (G7), so moving a
character never clobbers the room id.

> **Unpopulated worlds (0.3.0):** the reference pack ships `cast: []`, so
> `len(members) < 2` and **no room is created at plant** — you get the stage and a
> roster, not a pre-made group. A room appears only once you seat ≥2 agents in it.
> See §4 for how you create one.

## 3. Membership & seating

A profile "belongs" to a room through **profile metadata**, not a separate table:
`ui_meta.hermes-bots.groups` in the profile's `profile.yaml` is the list of group
ids it is seated in.

```yaml
ui_meta:
  hermes-bots:
    custom: true
    title: <role or summary-derived title>
    groups: [<teamSlug>]   # today: ONE group per world slug, not one per place
```

The mapping to a scene (data-contract, Layer 2c):

| Native | Maps to |
|--------|---------|
| `ui_meta.hermes-bots.groups` entry | a **place** id |
| profiles listing that group | that place's `present[]` (role ids) |
| `cast[].present` / `state.where` | who is actually standing where (authoritative for the scene) |

**The one known gap:** farm plant stamps the **world slug** as the single group, so
today there is **one group for the whole world**, not one group per place. The
scene layout the pane draws still comes from `world.places[].present` /
`state.where`, not from the group count — so the *picture* is per-place while the
*room* is one shared room. Per-place groups (`groups: [dock]`, `groups: [workshop]`)
is the pending work; until it lands, a world is **one room for 2–6 co-present
agents** (see `maxPresent`).

## 4. How you actually get a room (and the size rule)

- **2–6 agents** (`rules.maxPresent`, default 6): one group holds the scene.
- **> 6 cast**: the excess is **offstage** — `home` is set but the character is
  absent from every `present[]`. The pane shows them in the offstage list, not as
  extra people in the picture. Large casts mean "several groups or offstage", not
  one giant room.
- **Unpopulated world** (0.3.0): no members at plant → no room. Seat agents by
  adding them to the roster; the room is created when you (or a team plant with
  ≥2 members) trigger `groups.create`, or **manually** in Hermes Desktop:
  *New Group Chat* named for the world, members = your roster, then seed it. The
  plant's `room_fallback_note` is exactly this instruction, pre-filled.

## 5. Who speaks — `rules.turnModel` and `defer`

`turnModel` is one of `director` / `free-for-all` / `round-robin` / `defer`
(exchange-spec §Field rules). **Hermes runs `defer`**, and that is the whole
Hermes-specific story:

> Group chats are Discord-style rooms. Membership is stored in profile metadata
> and Bots **already message each other** via Bot Mode's messaging protocol
> (`agent.bot_mode_protocol`). Map a place to a group when the cast is co-present,
> and set `turnModel: defer` — a Director that *also* picks the speaker would
> double-drive the room. (`portability-spec.md`, "Let Bot Mode own the scene")

Under `defer` the **runtime's own room protocol picks the speaker**:

| Message | Who answers |
|---------|-------------|
| Unaddressed message | free-for-all — any member whose protocol says "I'm relevant" |
| `@Name` | that one member gets the turn |
| `@everyone` | wakes the whole room |

So a Hermes Director, if present, **only records state and emits render intents** —
it does not choose the speaker. The conformance matrix makes this explicit:

| `turnModel` | Hermes |
|-------------|--------|
| `defer` | **Native group protocol** (the real path) |
| `director` | **Loss** → treated as `defer`, ledgered. There is no Director process on Hermes yet. |
| `round-robin` / `free-for-all` | Post into the room only **after** a measured check that an external post does not race a live Bot-Mode turn (open todo). Not wired by default. |

The pane reflects this: when `turnModel` is `defer` it shows the line
*"Bot Mode owns turns in this world; this pane only draws"*, and the activity
**pulse dot is cosmetic** (it indicates a Bot is awake, not that the room is
turning).

## 6. What the two surfaces do

**Dashboard** (`dashboard/plugin_api.py`) — a **read-only view**. It returns a
reshaped world (theme, places, cast, `state`, `recent`, `turnModel`, `rosterOwned`)
and the roster it applied. It does **not** create rooms, does not send into the
room, and does not open chat. It is the safe mirror of the planted files.

**Desktop** (`desktop/plugin.js`) — draws the scene (sprites standing in places
over the backdrop/place art) and offers:

- **Click a sprite → 1:1 Bot Chat** in a stage bubble. This opens that *one* Bot's
  canonical Bot Chat via `session.list` (exact-title identity lookup) → resume if
  stored-only → `session.history` → `prompt.submit`. It is a **private DM**, a
  separate session from the group room. This is how *you* talk to a character.
- **Roster Add/Remove/Clear** → writes `roster.json` (`writeTextFile` bridge),
  capped at `maxPresent`.
- **Move a character** → read-modify-write `state.json` (`where` + bounded
  `recent[]`, preserving `chatId`/unknowns).

The group **room transcript** is a separate thing you read in the group chat itself
(or `groups.log`); the pane's bubble is the private side of it.

## 7. Ambient life — *not* the group chat

`rules.ambient` (default `false`) is a **per-profile scheduled probe**, not the
room. It is not a cron at plant; nothing is scheduled until the user toggles the
pane's *Enable ambient life* control (roster-owned worlds only), which schedules
one tagged routine per rostered agent on a **hourly** cadence by default. It is
how a populated world "lives" between your direct messages — separate from, and
additive to, the group room. It never double-drives a `defer` turn.

## 8. Gaps to keep in mind

1. **One group per world slug, not per place.** Per-place groups are the pending
   work; the scene *picture* is already per-place, the *room* is not yet.
2. **`turnModel: director` imports as a loss** on Hermes (no Director process).
   `round-robin`/`free-for-all` posting is behind a "measured no-race" gate.
3. **Unpopulated worlds ship no room** until ≥2 agents are seated.
4. The pane's per-character chat is **1:1**, not the room — don't expect the bubble
   to show the multi-party room conversation.
