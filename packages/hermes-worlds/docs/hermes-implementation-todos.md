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
`fs`. Do not write `world.json`, `state.json`, or `profile.yaml` from the
pane. Do not invent `host.botMode`. The longer engine plan is
[kirocrew-parity-roadmap.md](kirocrew-parity-roadmap.md). This file is the
checklist.

---

## Todo

- [ ] **1. Join a sprite to a profile on the desktop page.** The dashboard
  already resolves a cast member to a profile directory
  (`_resolve_profile` in `dashboard/plugin_api.py`): directory name equals
  `cast.name` (case-insensitive), then `ui_meta.hermes-bots` title equals
  role, then title equals name. The desktop page does not. Read
  `profile.yaml` through `readFileText` under `$HERMES_HOME/profiles/<name>/`.
  No match means the sprite stays a picture. Do not call `/api/profiles`.

- [ ] **2. Click a character, show the last chat in a bubble, send a new
  line.** Sprites are not buttons today (`Sprite` in `desktop/plugin.js`
  has no `onClick`). KiroCrew does not do this either.
  - Build the bubble in the page. `host.openSession` navigates
    (`in-place`, `main`, `stack`, `tab`, `window`). It is not a bubble on
    the sprite.
  - Resolve the stored session id for that profile before opening anything.
    A bot’s forever-chat is hidden from the normal session list
    (`host.openSession` in `apps/desktop/src/sdk/index.ts`). Probe
    `host.sessions` and `host.request('session.list', …)` on a running
    Desktop build and record which call returns that id. If none does, stop
    and write the miss into this file. Do not guess a method name.
  - Show the last turn in the bubble. Send with
    `host.request('prompt.submit', { session_id, text })`, the same pair
    the Farm page uses in `packages/hermes-mybot-farm/desktop/plugin.js`
    (`session.create` returns `session_id` for submit and
    `stored_session_id` for `openSession`).
  - Acceptance: click Patch, see the latest message, type a line, submit,
    and the Worlds page stays up. DevTools shows no request to port 9119.

- [ ] **3. Let the scene move a character by writing `state.json` once.**
  Both panes only derive presence when `state.json` is missing (home, else
  the first place that lists the role). Place tabs change the view, not
  `where`. The gateway is the only writer. Add an atomic
  `POST /worlds/{id}/state` in `dashboard/plugin_api.py`. The desktop page
  cannot call it with `fetch` (CORS). Probe a confined preload write or
  main-process HTTP, then re-read the file on the existing 15s poll. The
  file must include `schema: "worlds/state/v1"` or both readers ignore it.
  A crash mid-write must not leave a partial file.

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

## Already done (do not rebuild)

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
