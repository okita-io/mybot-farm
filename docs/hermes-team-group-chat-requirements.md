# Hermes Team Seeds → Group Chat: Requirements Report

**Status:** **implemented 2026-09-18** in `packages/hermes-mybot-farm` (A/B/C.2/D/E)
and shipped `TEAM.md` for all 39 seeds (C.1). Plant marks members as Bots, writes
team orientation + team-rules, fetches or generates TEAM.md, and creates a group
chat when `HERMES_GATEWAY_RPC_URL` is set; otherwise it prints the Desktop step.

Written 2026-09-17 against the live Hermes source at
`~/.hermes/hermes-agent` and the current farm tree. Companion to
`docs/hermes-team-stall-bundle.md` (the Workbench v1.1 ejection-test reference).

---

## 0. What "plantable for a group chat" means, end to end

The user's target flow: **download the team seed → plant → its members join one
new Group Chat → together they co-generate the workflow** for a human request
(the team's *sample request*). For that to work unattended, four things must be
true on the target machine after `farm_plant`:

1. Every member profile is a **Bot** (appears in the Bots roster, can receive
   `@` mentions and run room turns, and can DM each other).
2. A **group chat (hosted room) exists** with all members seated in it.
3. The members **know the team protocol** (who's in the lane, handoff order,
   quality bar) so they read as a team, not N solos.
4. The room is **seeded with the sample request** and can actually run turns.

The current seeds satisfy the *import* half and leave 1–4 to a human. Details:

---

## 1. Evidence — how Hermes group chats actually work

Verified against source, not assumed:

- **A Bot is a profile with a marker.** `tools/bot_mode_probe.py:116`
  `_is_bot_managed(profile_dir)` returns true **iff** `profile.yaml` carries a
  `ui_meta.hermes-bots` dict. Real example on this machine:
  `~/.hermes/profiles/biryani-agent/profile.yaml` →
  ```yaml
  ui_meta:
    hermes-bots:
      shape: drop
      imageKind: shape
      title: Byrani-Agent
      custom: true
  ```
  The same `ui_meta['hermes-bots']` block holds `groups` (list of group names)
  and the legacy `group` scalar (see
  `apps/desktop/src/plugins/hermes-bots/data.bot-meta.test.ts`): that is where
  **group membership is stored per profile**, mirrored to every connected
  gateway.
- **The marker gates bot-to-bot messaging.** `bot_mode_probe.py:124`
  `is_bot_mode_managed(home)` docstring: *"True when ANY profile on this install
  is Bot-Mode-managed… The `message_agent` injection gate."* Without the marker,
  the members cannot DM each other and are not first-class Bots.
- **Rooms are created by a gateway RPC, not a CLI.**
  `tui_gateway/contracts/groups_bot_relay.py:177,193`:
  - `groups.list` — list hosted rooms.
  - `groups.create` params `GroupsCreateParams { room_id, name,
    members: RoomMemberInput[] }`; `RoomMemberInput` =
    `{ member_id?, profile?, handle?, display_name?, target? }`. Authority is
    always the calling gateway's install identity (a client can't spoof it).
  - Also on the wire (`methods_groups.py:19`): `groups.state`, `groups.send`,
    `groups.rename`, `groups.log`, `groups.disband`, `groups.stop`, …
  These RPCs are served by `tui_gateway` (the backend behind Desktop, the
  dashboard `/chat`, and `hermes serve` / `hermes gateway run`). **There is no
  `hermes group create` CLI** — the only programmatic path is this RPC or the
  per-profile `ui_meta` file write.
- **Room rules (from the Bot Mode docs):** 2–6 Bots per room; a user message
  triggers up to **3 serial rounds**, **10 messages per send**; a room "settles"
  when a full round stays silent; each member keeps a persistent room session;
  the room keeps running when Desktop is closed **if all members share one
  gateway** (`groups.capabilities` → `driver:true`).
- **A team bundle ships a `TEAM.md`.** `hermes-team-stall-bundle.md` §2b is
  explicit: *"TEAM.md — the portable team memory: roster, roles, card/task flow,
  handoff protocol, quality bar, escalation… **This is the file that makes N
  agents read as a team instead of N solos.**"* The gold-standard reference is
  `web/public/packs/teams/workbench/` (TEAM.md + WORK.md + cron scripts + member
  tarballs).

---

## 2. Gaps (ranked by impact on the target flow)

### GAP A — Members are imported as plain profiles, not Bots  *(HIGH)*

**Symptom.** The 39 seeds' members are the shared agent tarballs
(`web/public/packs/agents/<slug>.hermes.tar.gz`). A member tarball contains only
`SOUL.md`, `config.yaml`, `memories/`, `skills/` — **no `profile.yaml`** (verified:
`tar tzf …/game-designer.hermes.tar.gz` → no `profile.yaml`). After
`hermes profile import`, each member is a bare profile with **no
`ui_meta.hermes-bots` marker**, so:
- the members are not Bot-Mode-managed → not first-class Bots;
- the `message_agent` gate (`is_bot_mode_managed`) is false → members can't DM
  each other; the room relies only on the shared-room transcript.

**Requirement.** Team plant must, *after* importing each member, write
`<profile>/profile.yaml` with `ui_meta.hermes-bots`:
```yaml
ui_meta:
  hermes-bots:
    title: <team title>      # or the member's role/summary
    custom: true
    groups: ["<team slug>"]  # seat them in the team room
```
Use the existing atomic writer (`hermes_cli/profiles.py::write_profile_meta` or
the desktop `profiles.configure` RPC) — never truncate `profile.yaml` by hand.
`title` should come from the GAF `members[].summary`/`role`; `groups` = the team
slug (the room name) so the Desktop picker already has them seated.

**Acceptance:** after `farm_plant <team>`, `grep -l 'hermes-bots'` matches every
member's `profile.yaml`; each lists the team in `groups`; `is_bot_mode_managed`
is true on the install.

---

### GAP B — No group chat is created; it's a manual Desktop step  *(HIGH)*

**Symptom.** The generated `shared.gettingStarted` says *"2. Start one group chat
with all members…"* — a human Desktop action. Nothing in the seed or the plant
flow actually creates the room or seeds the first message.

**Requirement (layered — the plugin can't assume a gateway is up):**
1. **File-level (always works):** the GAP A write already seats members via
   `ui_meta.hermes-bots.groups`. This alone makes the room creatable and the
   members resolvable in the picker.
2. **Automated (when a gateway is reachable):** call the gateway RPC
   `groups.create` with `{ room_id: "<team slug>", name: "<team title>",
   members: [{profile: "<member slug>"} … ] }`, then `groups.send` the team's
   *sample request* as the opening room message. Detect a running gateway
   (e.g. `hermes status` / the `groups.capabilities` probe); if none, fall back
   to layer 1 and print the one Desktop step.
3. **Human fallback:** keep the gettingStarted prose, but phrase it as the
   fallback, not the primary path.

**Acceptance:** on a machine with a running gateway, `farm_plant <team>` returns
`room: "<team slug>"` and `groups.list` shows the room with all members; on a
machine without a gateway, plant succeeds (layer 1) and the result's notes carry
the exact "create the room" step.

---

### GAP C — No team protocol file ships; members read as N solos  *(HIGH)*

**Symptom.** The seeds ship **only** the GAF JSON (`…/teams/<slug>.json`).
`plant._fetch_team_files` (`plant.py:422`) fetches `TEAM.md`/`WORK.md`/cron from
`/packs/teams/<slug>/` and **silently 404s** on every one of them for our 39
teams. Result: the team dir gets only the generated `FARM.md`; there is no
roster/handoff/quality-bar document for the members to orient to.

**Requirement.**
1. Emit `web/public/packs/teams/<slug>/TEAM.md` per team (mirror the GAF):
   roster + roles, the `topology.handoffs` verbatim, quality bar, escalation
   rule, the sample request, and "the human ships; nobody deploys unattended."
   Generate it from `teams.json` (extend `gen_teams.py`).
2. Point members at it: append a short team-orientation block to each member's
   `memories/MEMORY.md` **at install time** (the team dir path, the roster, and
   "read TEAM.md before your first turn"). Do this in the plugin, because member
   tarballs are shared across teams (one agent can sit on several teams), so the
   team-specific pointer can't be baked into the tarball.
3. (Optional) `WORK.md` with the shipped record + backlog; skip cron scripts
   unless a team has a heartbeat.

**Acceptance:** `curl -s <farm>/packs/teams/<slug>/TEAM.md` → 200 with the roster
and handoffs; after plant, each member's `memories/MEMORY.md` references the team
dir.

---

### GAP D — Team-rules skill is in the GAF but not installed on any member  *(MED)*

**Symptom.** The GAF `skills[]` carries `<slug>-team-rules` (lane discipline,
handoff protocol, quiet-when-idle), but that only feeds the stall's skills tab /
WebMCP. Plant never installs team skills into member profiles, so the standing
rules that make the group behave don't live in any member's context.

**Requirement.** At team plant time, install the team-rules skill into every
member profile's `skills/` dir (idempotent; one shared copy is fine). Alternative
if that's heavier: fold the rules into each member's team-orientation memory
block (GAP C.2) so the behavior is always present without a separate skill.

**Acceptance:** after plant, `<member>/skills/<team>-team-rules/SKILL.md` exists
(or the rules text is present in the member's memory), for every member.

---

### GAP E — Endpoint heterogeneity + backend headroom in a room  *(LOW)*

**Symptom / note.** Every member tarball ships
`base_url: https://SET_YOUR_ENDPOINT/v1`, `provider: spark-4f07`,
`model: qwen3.8-27b-sglang` (with an `opencode-free` fallback). In a group chat
each member's turn runs in its **own backend**; a room won't settle while any
member's backend is down, and the Desktop's **Warm Bot Backends default is 3** —
a 5-member team needs that raised for all five to respond concurrently.

**Requirement.** Plant should:
- warn (in the result notes) that every member needs a working LLM endpoint
  before the room is seeded, and show the single `config.yaml` edit;
- print the "raise Warm Bot Backends to ≥ the team size" hint for teams > 3.

**Acceptance:** plant output includes both notes for a 4+ member team.

---

## 3. What is *not* a gap (verified, don't re-do)

- **Slug resolution / catalog wiring** is done: `web/src/data/team-catalog.generated.json`
  + `web/src/lib/team-catalog.ts` + the three-line fallthrough in
  `web/src/lib/catalog.ts` make all 39 teams resolvable by slug and listed on
  `/teams` + search. `tsc` clean for touched files; `npm test` 73/73.
- **GAF team-pack shape** is correct: `format: mybot.farm/team-pack`,
  `runtime:["hermes"]`, `members[].pack` → `agents/<slug>.hermes.tar.gz`,
  topology + shared.memory + gettingStarted. All 39 pass the plugin's own
  listing validator.
- **Member count compliance:** every team is 3–5 members; rooms allow 2–6.
- **No slug collisions** with the 279 agency agents or the 3 hand-made teams.
- **Scrub / leak-scan:** clean (no LAN IPs, keys, usernames, `mbf_` tokens).

---

## 4. Suggested implementation order for the PR

1. **GAP A + C + D in the plugin** (`packages/hermes-mybot-farm/plant.py`):
   after import, write `ui_meta.hermes-bots` on each member (title +
   `groups:[slug]`), append the team-orientation block to each member's
   `memories/MEMORY.md`, and install the team-rules skill into each member.
   Keep it idempotent and honor `force`/`clean`/`dry_run` like the existing
   team branch.
2. **GAP C.1 as a generator** (`/tmp/farm-conv/gen_teams.py` → ship the output):
   emit `web/public/packs/teams/<slug>/TEAM.md` (mirror into `packs/teams/`),
   regenerated from `teams.json`.
3. **GAP B in the plugin:** `groups.create` + `groups.send` when a gateway is
   reachable; else document the fallback step.
4. **GAP E:** the two result notes.
5. **Verification:** ejection-test one team on a scratch `HERMES_HOME`
   (or this machine under a temp home) — delete members, room, team dir;
   reinstall from the live URL; assert every member's `profile.yaml` has
   `ui_meta.hermes-bots` with the team in `groups`, `groups.list` (or the
   fallback step) yields the room, `groups.send` the sample request produces a
   multi-member plan in the room transcript, and a trivial handoff settles with
   a PASS. Mirror the checklist in `hermes-team-stall-bundle.md` §4.

**Guardrails:** never hand-edit `config.yaml`/`profile.yaml` with bare
`open("w")` (use the atomic writer / `profiles.configure`); tests must run under
`scripts/run_tests.sh` with `HERMES_HOME` redirected to a temp dir; no real
endpoints or credentials in any shipped artifact.
