# Handoff — remaining gaps vs KiroCrew worlds

KiroCrew’s worlds install (`packages/kirocrew-mybot-farm`) plants a crew that
can read the scene: `_world.md`, a character skin on each agent, assets, and
a deny-by-default tool list. It does not draw a room and it does not open a
chat from a picture.

Hermes already draws the room (`desktop/plugin.js`, `dashboard/`) and plants
the files (`packages/hermes-mybot-farm`: `world.json`, `WORLD.md`, scene
images, a `MEMORY.md` skin, one group chat when the gateway RPC is set).

This list is what is still missing for the same behavior, plus the click
target that neither side has yet. Edit `packages/hermes-worlds` in the
mybot-farm repo. `~/.hermes/plugins/hermes-worlds` and
`~/.hermes/desktop-plugins/hermes-worlds/plugin.js` are symlinks to that
tree. Reload desktop plugins after a `desktop/plugin.js` change.

Do not `fetch` `http://127.0.0.1:9119` from the desktop page. Do not import
`fs`. Do not write `world.json` or `profile.yaml` from the pane. Do not
invent `host.botMode`. `host.sessions` is pin / reorder / colour only
(`apps/desktop/src/sdk/sessions.ts`); it is not a session list. The longer
engine plan is [parity-roadmap.md](parity-roadmap.md).
This file is the checklist.

Checked against the installed Hermes tree (`apps/desktop`, `tui_gateway/contracts`)
on 2026-10-02. The write door and the Bot Chat lookup below are from that
source, not from a live click in Desktop.

---

## Todo

- [x] **1. Read `profile.yaml` for the sprite's title.** The roster already
  stores the profile directory name, and the page already lists
  `$HERMES_HOME/profiles` through `readDir`. It does not read
  `profile.yaml`. The dashboard join (`_resolve_profile`) still matters for
  a pack cast that is not a roster: directory name equals `cast.name`
  (case-insensitive), then `ui_meta.hermes-bots.title` equals role, then
  title equals name. Read that file with `readFileText`. No match means the
  label stays the directory name. Do not call `/api/profiles`.

- [x] **2. Click a character, show the last chat in a bubble, send a new
  line.** Implemented in `desktop/plugin.js` (`Sprite` `onClick`, stage
  bubble, `session.list` / `history` / `prompt.submit`). KiroCrew does not
  have this yet.
  - Build the bubble in the page. `host.openSession` navigates
    (`in-place`, `main`, `stack`, `tab`, `window`). It is not a bubble on
    the sprite. The bot forever-chat is hidden from `$sessions`;
    `host.sessions` cannot find it.
  - The lookup is already in the gateway contract. After
    `host.ensureAgent(null, profile)` so the live socket is that profile:
    `host.request('session.list', { profile, title: 'Bot Chat' })`.
    Title lookup returns hidden rows (`methods_session._session_list_by_title`:
    "Hidden rows resolve (canonical chats are born hidden)"). Use
    `resolved_id` when set, otherwise `id`. `include_hidden` is only for
    the windowed list, not this title lookup.
  - An empty `sessions` array means that profile has no canonical Bot Chat.
    The protocol is injected only into a session titled exactly `Bot Chat`
    (`website/docs/user-guide/bot-mode.md`). Create that title if it is
    missing; do not submit into an untitled scratch session.
  - Last turn: `host.request('session.history', { session_id, profile })`.
    Send: `host.request('prompt.submit', { session_id, profile, text })`.
    Pass `profile` on both. `SessionParams` is `session_id` plus optional
    `profile`; a submit that hits the launch profile 4001s against a
    backend that does not own the chat.
  - Acceptance: click an agent who is on the roster, see the latest
    message, type a line, submit, and the Worlds page stays up. DevTools
    shows no request to port 9119.

- [x] **3. Let the scene move a character by writing `state.json` once.**
  Both panes only derive presence when `state.json` is missing (home, else
  the first place that lists the role). Place tabs change the view, not
  `where`. The write door is the same preload the roster uses.
  `hermes:fs:writeText` (`fs-ipc.ts`) resolves the path, requires the parent
  directory, caps the body at 1 MB, and writes in place. That in-place
  write is not safe for `state.json`. Write `state.json.tmp` with
  `writeTextFile`, then `renamePath` onto `state.json` (same directory; the
  handler already uses `fs.promises.rename`). Re-read on the existing 15s
  poll. The file must include `schema: "worlds/state/v1"` or both readers
  ignore it. Do not add a dashboard `POST` for this. The dashboard stays a
  reader, same as `roster.json`.
  **DONE (2026-10-03), with a corrected write strategy.** `plugin.js` gains
  `readRawState` (whole-object read), `writeState(worldDir, patch)` (merge +
  persist, G7: preserves `place`, `recent`, `chatId`, and unknown keys;
  always re-stamps the schema), and `moveCharacter` (sets one `where` entry,
  appends a bounded `recent[]` move event, caps at 20). UI: a "Move someone
  to <place>" select + "Move here" button in the agents panel, roster-owned
  worlds only, honouring `rules.maxPresent`. Re-reads on the 15s poll via
  `loadView`.
  **Deviation from the sketch (verified against the installed bridge):** the
  tmp-write + `renamePath`-over-`state.json` dance is NOT available — the
  preload's `renamePath` maps to `hermes:fs:rename`, which REFUSES to
  overwrite an existing path (`"...already exists"`) and takes a bare new
  name, and the bridge exposes no unlink (only `trashPath`). So an atomic
  rename-over-live-file is impossible here. Chosen instead: a single
  in-place `writeTextFile` of the merged JSON — one `fs.promises.writeFile`
  in the main process, and at `state.json`'s <1 MB size a reader never sees a
  torn file. If a future bridge adds an atomic replace, swap it into
  `writeState` and callers are unchanged. Covered by `desktop/plugin.test.mjs`
  (merge preserves `chatId`/unknowns, move updates `where` + bounded
  `recent`, no-op when already present).

- [x] **4. Store the world group-chat id.** Plant already calls
  `groups.create` when `HERMES_GATEWAY_RPC_URL` is set and stamps
  `ui_meta.hermes-bots.groups` with one group, the world slug, not one
  group per place (`team_plant.py`). Write that room id into `state.json`
  as `chatId` from the farm plugin, not from the pane.
  **DONE (2026-10-03):** `plant.py` gains `_write_world_state(world_path,
  chat_id)`, called in the world-write block with `result.room` (the id
  `configure_planted_team` returns from `groups.create`). It stamps
  `state.json.chatId` + the `worlds/state/v1` schema, read-modify-write so
  an existing `place`/`where`/`recent` is preserved (G7 on the engine side
  too). Guarded as the task requires: `result.room` is `None` when
  `HERMES_GATEWAY_RPC_URL` is unset (or the world has no cast), and then
  nothing is written — no empty state.json, the panes keep deriving, the
  pane never invents a room. Idempotent (no rewrite when already current),
  and a corrupt state.json is replaced rather than crashing the plant.
  Covered by `tests/test_world_state.py` (6 cases). Written from the farm
  plugin, not the pane, per the task.

- [ ] **5. Keep `defer` hands-off. Probe before any other turn router.**
  The pane already says Bot Mode owns turns when `turnModel` is `defer`.
  Leave that. `round-robin` / `director` / `@mention` may post into the
  room from todo 4 only after a measured check that an external post does
  not race `agent.bot_mode_protocol`. Until that measurement, do not add a
  second messaging stack.
  **BLOCKED (2026-10-03) — needs a running Hermes.** The task's own gate (a
  *measured* check that an external post does not race
  `agent.bot_mode_protocol`) cannot be satisfied offline: no gateway is up
  and `HERMES_GATEWAY_RPC_URL` is unset here, and the task forbids adding a
  second messaging stack until the race is measured. `defer` already stays
  hands-off (the pane shows the Bot-Mode note), so nothing regresses by
  leaving the active router unbuilt. Resume when a gateway is reachable:
  send a probe post into the world room while a Bot-Mode turn is live and
  confirm ordering before wiring round-robin/director/@mention.

- [ ] **6. Ambient life stays off until the user opts in.** `rules.ambient`
  is not a cron. Add one control, “Enable ambient life”, that schedules one
  tagged routine per cast member and a matching disable that removes only
  those tags (`world:<id>`). Plant must not schedule them.

- [ ] **7. Shared scene text stays in files.** Each member already gets a
  private skin in `MEMORY.md`. Do not create a second profile and expect
  the cast to read that profile’s `MEMORY.md` (portability spec §11.4:
  that file is small and frozen until the next session). Shared text is
  `WORLD.md` and `state.json`.

- [ ] **8. Assert plant does not add tools from `cast[].capabilities`.**
  Hermes has no KiroCrew `DEFAULT_TOOLS` list. A planted profile keeps the
  tools in its tarball. The test is: planting a world does not grant
  `execute_bash` or file-write because the manifest listed `files`.
  `WORLD.md` already calls those capabilities advisory.

- [ ] **9. Export the planted world back to a bundle.** Read
  `~/.hermes/worlds/<id>/{world.json,state.json}` plus member profiles and
  emit a world-exchange bundle from the farm plugin. The viewer only links
  to it.

---

## Roster (done)

A planted world is a stage. `members` and `cast` may be empty. The user adds
and removes agents they already have from the Desktop Worlds page. That
writes `~/.hermes/worlds/<id>/roster.json` (`worlds/roster/v1`:
`{ profile, place }`). When that file exists it replaces any sample cast.
The dashboard pane reads the same file. It does not add or remove.
`farm_plant` rewrites `world.json`, `WORLD.md`, and assets, and leaves
`roster.json` alone.

## Already done (do not rebuild)

- Desktop reads `profile.yaml` for `ui_meta.hermes-bots.title`, joins pack
  cast to profiles (same order as the dashboard), and shows the title on
  sprites. Roster members always use their profile directory name as
  `profileName`.
- Click a joined sprite opens a Bot Chat bubble on the stage (last messages +
  send). Uses `host.ensureAgent`, `session.list` with `title: "Bot Chat"`,
  `session.create` when missing, `session.history`, and `prompt.submit` with
  `profile` on every call. No `fetch` to port 9119.
- Desktop and dashboard draw places, backdrop, place art, avatars, and the
  greeter star from planted files.
- Desktop reads through `window.hermesDesktop` (`readDir`, `readFileText`,
  `readFileDataUrl`). No dashboard fetch.
- `farm_plant` writes `world.json`, `WORLD.md`, relative `assets/`, and the
  character skin (place **name**, greeter line) into each member
  `MEMORY.md`.
- Dashboard activity pulse is cosmetic and uses `/api/sessions` for joined
  cast profiles only. Desktop has no pulse. Do not add one from
  `/api/profiles`.

---

## Gaps & risks found on scan (2026-10-02)

Read against the live tree: `packages/hermes-worlds/desktop/plugin.js`,
`packages/hermes-worlds/dashboard/plugin_api.py`,
`packages/hermes-mybot-farm/plant.py`, `team_plant.py`, `world_doc.py`. These
are defects and hazards the numbered todos above do not already name. Each is
a `- [ ]` so it can be checked off like the rest. Line numbers are a reading
aid, not a contract — confirm against the file before editing.

- [x] **G1. The two `profile.yaml` parsers can disagree on a name.** The
  dashboard reads the file with PyYAML (`_hermes_bots_titles`,
  `plugin_api.py`) and so honours full nesting under
  `ui_meta.hermes-bots.title`. The desktop pane re-implements the parse by
  hand (`parseProfileYaml`, `plugin.js`): it enters on a line matching
  `hermes-bots:` and then takes the **last** `title:` it sees before the
  block de-indents — it does **not** require the key to sit under
  `ui_meta:`, and a nested mapping inside the block that carries its own
  `title:` clobbers the real one. Result: a profile the dashboard labels
  "Patch" the Desktop pane can label something else, so the same cast joins
  under two different names on the two surfaces. Fix: make the hand parser
  honour the `ui_meta:` -> `hermes-bots:` -> `title:` path at the expected
  indent only, and accept `title:` only one step inside the `hermes-bots:`
  block. Lock it with G6's test using the real planted `profile.yaml` shape.
  **DONE (2026-10-02):** `parseProfileYaml` rewritten to be path-aware —
  enters `hermes-bots:` only while inside `ui_meta:`, pins the direct-child
  indent, and accepts `title:` only at that depth (first wins). A nested
  `hermes-bots.theme.title` can no longer clobber the bot title, and a
  top-level or stray `hermes-bots:` is ignored. Covered by
  `desktop/plugin.test.mjs` (G6), incl. a regression case the old parser
  failed (returned `"Dark"` instead of `"Patch"`).

- [x] **G2. `ensureBotChatSession` adopts ANY session titled "Bot Chat".**
  `plugin.js` does `session.list({ profile, title: 'Bot Chat' })` then takes
  `sessions[0]` with no further check. If that profile already has an
  unrelated session a human titled "Bot Chat", the pane sends the user's
  line into it. The gateway contract says the canonical hidden chat is the
  one the Bot Mode protocol is injected into — confirm `session.list` by
  title returns the canonical row first (or carries a flag that marks it),
  and select on that, not on array position. Until confirmed, this is a
  wrong-session send waiting to happen. Probe a running gateway; do not
  assume ordering.
  **DONE (2026-10-02) — hypothesis corrected after probing the contract.**
  Read `tui_gateway/methods_session.py` `_session_list_by_title` in the
  installed Hermes tree: a `session.list` call carrying `title` is an
  EXACT-title identity lookup that returns AT MOST ONE row — the canonical
  chat — already resurrecting a recoverable archived Bot Chat and following
  the compression tip into `resolved_id`. So the "adopts one of several"
  framing was wrong; the gateway never returns multiple rows for a title
  lookup. The real client hardening applied: take the single row, assert its
  `title` is actually `Bot Chat` before adopting it (so a future relaxed
  contract can't redirect the send), prefer `resolved_id` over `id`, and
  create the hidden canonical chat only when the lookup returns nothing.

- [ ] **G3. The place-full guard is bypassed on a pack-sample scene.**
  `addAgent` (`plugin.js`) builds `existing` from the current cast **only
  when `world.rosterOwned`** is true; on a scene still showing the pack
  sample `existing` is `[]`, so the first add never counts the sample
  members already standing in the place and can exceed `rules.maxPresent`.
  Decide the intended rule — either the sample does not count toward the cap
  (then say so and drop the note), or it does (then seed `existing` from the
  shown cast, not just the roster). The dashboard never writes, so this is a
  desktop-only fix.

- [x] **G4. `prompt.submit` has no optimistic echo and no reply poll.** Todo
  2 is done for the round trip, but `sendChatLine` (`plugin.js`) submits,
  then re-reads `session.history` **once**. The user's own line and the
  agent's reply do not appear until something re-reads later (the 15s world
  poll does not refresh an open bubble). Add an optimistic append of the
  submitted user line, then a short bounded poll of `session.history`
  (a few tries, backing off, capped) so a reply lands in the bubble without
  a manual resend. Keep it off the 9119 port — same `host.request` path.
  **DONE (2026-10-03):** `sendChatLine` now appends the user's line to the
  bubble immediately (optimistic echo, keyed to the live `sessionId`), then
  runs a bounded `session.history` poll with backoff `[400,800,1500,2500,
  4000]ms`, stopping as soon as a NEW assistant message appears past the echo
  or the budget is spent. A `chatRef` mirror lets the async poll read live
  state and abort cleanly if the user closes the bubble or switches
  characters mid-poll. Still only `host.request` — no 9119 fetch. The
  reply-landed predicate is unit-tested in `desktop/plugin.test.mjs`.

- [ ] **G5. Built artifacts are committed with no source-match check.** The
  tree ships `dashboard/dist/` and a `hermes-worlds-1.1.0.zip` binary
  (commit `7c2eef4`). Nothing verifies the built output matches the source
  it was built from, so they can silently drift. Either stop committing the
  build and build on publish, or add a CI check that rebuilds and diffs the
  committed artifact. Pick one and write it down here.

- [x] **G6. No test for the desktop pure helpers.** `plugin_api_test.py`
  covers the dashboard join, but `parseProfileYaml`, `resolveProfileName`,
  `displayNameFor`, `previewMessages`, and `resolveAssetPath` in `plugin.js`
  are untested — and G1 lives in one of them. They are pure functions. Add a
  `desktop/plugin.test.mjs` (node --test, no bundler) that exercises them,
  including a nested-`title` fixture that would catch G1 and an asset path
  with a `..` segment that `resolveAssetPath` must reject.
  **DONE (2026-10-02):** `desktop/plugin.test.mjs` added — 11 cases over
  `parseProfileYaml` (incl. the G1 nested-`title` regression),
  `resolveAssetPath` (traversal / absolute / null-byte rejection), and
  `previewMessages`. Run `node --test packages/hermes-worlds/desktop/plugin.test.mjs`.
  The helpers are mirrored from `plugin.js` (uncompiled plugin, SDK-only
  imports can't be imported under node) — keep the twins in sync.
  Still untested: `resolveProfileName` / `displayNameFor` (need an index
  fixture) — left for a follow-up.

- [x] **G7. The `state.json` writer (todo 3) must preserve fields it does
  not own.** `plant.py` writes `world.json`, assets, `WORLD.md`, and the
  `MEMORY.md` skin, but **never writes `state.json`** — presence is only
  ever derived (`_default_state`/`_load_state` on both panes). When todo 3
  adds the first writer it must read-modify-write: a move changes `where`
  only, and must keep `place`, `recent[]`, and the `chatId` todo 4 adds.
  A writer that emits `{schema, where}` alone silently drops the room id and
  the event log. Make the atomic tmp+rename writer merge onto the existing
  file, and cover it in the Director state test (todo 3's own test).
  **DONE (2026-10-03) as part of todo 3.** `writeState` is read-modify-write
  (`{ ...prior, ...patch, schema }`) so `place`, `recent`, `chatId`, and
  unknown keys survive; the merge is covered by a `plugin.test.mjs` case that
  asserts `chatId` and a `futureKey` both persist across a `where`-only
  write. (The "atomic tmp+rename" instruction could not be followed — the
  bridge rename refuses to clobber; see todo 3's deviation note.)

- [x] **G8. `groups.create` already returns a room id that nothing persists.**
  `configure_planted_team` (via `team_plant.py`) calls `groups.create` when
  `HERMES_GATEWAY_RPC_URL` is set and the result is surfaced as
  `PlantResult.room` in `plant.py`, but it is written **nowhere on disk** —
  not into `world.json`, not into `state.json`. Todo 4 is the home for it:
  stamp that same id as `state.json.chatId` from the farm plugin at plant
  time (not from the pane), so the Director (todo 5) and any later router
  address one known room instead of re-deriving it. Guard the
  no-`HERMES_GATEWAY_RPC_URL` case: no room created means no `chatId`, and
  the pane must stay a pure viewer, not invent one.
  **DONE (2026-10-03) via todo 4.** `_write_world_state` now persists
  `PlantResult.room` into `state.json.chatId` at plant time, with exactly the
  guard this gap asked for (no room id → no write). See todo 4.

- [x] **G9. "session not found" opening Bot Chat (live, 2026-10-03).** Live
  test on HermesDesktop: added `cydonia` (title "TheDrummer") and later
  `News-Agent` to Neon Harbor, clicked a sprite — bubble showed **"session
  not found"** for BOTH, consistently.
  **First hypothesis (WRONG):** that `openChat` read history on a
  just-*created* session. Returned `{ sessionId, created }` and skipped the
  read on create — reload still failed, so the guess was wrong (recorded here
  so no one re-walks it).
  **Real root cause (confirmed against the gateway source + the on-disk DB):**
  `cydonia`'s Bot Chat already EXISTS — `state.db` has it (id
  `20260913_205530_e13c8f`, archived=0, hidden=1, 88 messages) — so
  `session.list` finds it and `created` is false. The failure is that
  `session.history` is a `_sess_nowait` RPC (`methods_session.py`: `_with_session`
  = "no agent-build wait"): it resolves the session from LIVE memory and
  4007s on a stored-but-not-loaded session. The hidden Bot Chat is on disk but
  not held by any running agent, so the history read can't find it.
  **FIXED:** `loadBotChatHistory` now calls **`session.resume`** first — which
  loads the stored session into memory AND returns its messages in one call
  (same path `_create_session` reuses) — and only falls back to
  `session.history` if resume returns no messages. A later `prompt.submit`
  then works because the session is now live. Added a `resumeBotChatSession`
  helper and per-step error labels (`ensureAgent:` / `session.list:` /
  `session.create:` / `session.resume:` / `prompt.submit:`) so any future
  failure names the exact RPC instead of a bare "session not found".
  **SECOND live round surfaced `prompt.submit: session not found`** (history
  now loaded fine). Cause: `session.resume` binds the session under a LIVE id
  (compression tip / freshly-bound) that can differ from the stored id we
  looked up, and `prompt.submit` (`_sess`) resolves from live memory — so
  submitting under the pre-resume id missed the live session. **FIXED:**
  `ensureBotChatSession` now resumes internally and returns the LIVE
  `session_id` from the resume response (plus its history); `openChat` stores
  that id and every later history/submit uses it. The standalone
  `resumeBotChatSession`/`loadBotChatHistory`-resume path was folded into
  this; `loadBotChatHistory` is now the post-live poll read only.
  **G1 verified live** either way: the sprite shows "TheDrummer" for the
  `cydonia` dir, whose real `profile.yaml` has `hermes-bots.title` among
  sibling keys with a nested `groups:` mapping below it.
  **THIRD live round: send SUCCEEDED** (the agent received the line and
  replied in its own session view) **but the reply never reached the Worlds
  bubble** ("No messages yet."). Two causes, both from the gateway's
  desktop/deferred resume contract (`methods_session.py::_resume_deferred`:
  *"Desktop owns the visible transcript ... not this model-history restore"*):
  (a) a desktop resume returns `messages: []` with `hydrating: true` and the
  real `message_count` — the transcript hydrates in the BACKGROUND and is read
  back via `session.history`; and (b) `previewMessages` caps at 6 rows, so the
  reply poll's length-based growth check could never fire on a long chat.
  **FIXED:** `loadBotChatHistory` returns `{ messages, count }` (raw server
  count); a new `hydrateHistory` polls `session.history` up to `message_count`
  so the bubble fills in on open; and the G4 send poll now detects a reply by
  RAW `count >= base + 2` with an assistant tail, not preview length. The send
  path (task 2) is now proven end-to-end live. Covered by a count-based
  reply-detection unit test.
  **FOURTH live round — the real reply-poll bug (2026-10-03).** The decisive
  clue: the echo + "Sending…" PERSISTED through the whole LM Studio stream,
  then reverted to "No messages yet." the instant the stream FINISHED. Cause:
  the reply poll's final iteration (`i === delays.length - 1`) wrote whatever
  it last read — an empty/unchanged history read — over the optimistic echo,
  and the budget (~15s) often expired right as the stream completed. **FIXED:**
  the poll now (a) NEVER regresses — it only replaces the view on a real reply
  (raw count grew by ≥2 AND an assistant tail AND non-empty), and (b) on
  timeout keeps the echo and just clears the spinner, never overwriting with
  empty; (c) the budget is widened to ~45s across backoff steps for local
  models whose reply only appears in model-history after the stream ends.

  **FIFTH live round — THE root cause of the empty bubble (2026-10-03).**
  Goal clarified: mimic KiroCrew worlds, where clicking an agent loads the
  last session's history into the bubble. History never loaded because
  `session.resume` was taking the DEFERRED path. The desktop app's own resume
  calls pass `source:"desktop"` + `omit_messages:true` (confirmed in the app
  bundle), which returns `messages:[]` and hydrates the transcript over REST
  pages the plugin host (JSON-RPC only) cannot read. `_resume_response`
  ALWAYS returns history inline under `messages` on the COLD path
  (`_resume_cold`, taken when `defer_history`/`omit_messages` are false).
  **FIXED:** the resume call now passes `omit_messages:false` +
  `defer_history:false` (and does NOT send `source:"desktop"`), so the gateway
  restores the full transcript inline under `messages` — exactly what the
  bubble reads. The hydrate-poll + wider reply budget stay as belt-and-braces.
  This is the behavior parity the user asked for.

  **RESOLVED (2026-10-03) — it was a field-name mismatch, found via on-screen
  debug.** Instrumenting the bubble proved the data DID reach the plugin:
  `session.list` → 1 row "Bot Chat" (message_count 96), `session.resume` →
  `messages_omitted:false`, `msgsLen:94`, `firstMsg`
  `{"role":"assistant","text":"Yo!..."}`. So resume delivered 94 messages —
  but `messageText` only read `msg.content`, while Hermes rows carry the body
  on a top-level **`text`** field. Every row flattened to '' and
  `previewMessages` dropped all 94 → "No messages yet." **FIX:** `messageText`
  now reads `msg.text` first, then falls back to `content` string / parts.
  Covered by a `{role,text}` unit test. The on-screen DEBUG instrumentation
  was removed after the finding. Clicking an agent now loads the last
  session's transcript into the bubble — the KiroCrew-worlds parity goal.
