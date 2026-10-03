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

- [ ] **3. Let the scene move a character by writing `state.json` once.**
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

- [ ] **4. Store the world group-chat id.** Plant already calls
  `groups.create` when `HERMES_GATEWAY_RPC_URL` is set and stamps
  `ui_meta.hermes-bots.groups` with one group, the world slug, not one
  group per place (`team_plant.py`). Write that room id into `state.json`
  as `chatId` from the farm plugin, not from the pane.

- [ ] **5. Keep `defer` hands-off. Probe before any other turn router.**
  The pane already says Bot Mode owns turns when `turnModel` is `defer`.
  Leave that. `round-robin` / `director` / `@mention` may post into the
  room from todo 4 only after a measured check that an external post does
  not race `agent.bot_mode_protocol`. Until that measurement, do not add a
  second messaging stack.

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
