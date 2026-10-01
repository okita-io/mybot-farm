# Spec: Porting "Worlds" to Other Agent Runtimes

**Status:** Draft for review
**Author:** default (Kiro Crew)
**Date:** 2026-10-01
**Target runtimes:** HermesDesktop, OpenClaw, GrokBot — with Kiro Crew as the reference implementation.

**Review (2026-10-01):** Compatibility, porting, and implementation comments are in [§11](#11-review-comments). Checked against [Kiro Crew](https://kiro.dev/docs/crew/), [Hermes Desktop](https://hermes-agent.nousresearch.com/docs/user-guide/desktop), [Bot Mode](https://hermes-agent.nousresearch.com/docs/user-guide/bot-mode), [Desktop Plugin SDK](https://hermes-agent.nousresearch.com/docs/developer-guide/desktop-plugin-sdk), [OpenClaw](https://docs.openclaw.ai/), and [Grok Bot](https://docs.x.ai/grok-bot/overview). The capability map holds. Several named primitives do not, and the Director cannot be one library dropped into all four processes.

---

## 1. What "Worlds" is

Worlds is the KiroCrew feature where agents are **embodied as characters inside a themed world setting**. Instead of a flat chat with a tool-using assistant, the user interacts with named personas who have:

- a **persona** (name, role, voice, backstory) — the "character";
- a **place** (the "world" — a setting, theme, map, or room) they inhabit;
- **presence and state** (where a character is, what it's doing, who else is around);
- **relationships and continuity** (memory of the user and of each other, carried across sessions);
- a **rendered surface** (avatar, scene art, themed UI) that makes the embodiment visible.

Underneath, each character is still an agent: it reasons, uses tools, runs scheduled work, and can hand off to or converse with sibling characters. Worlds is a **presentation + orchestration layer over the existing agent primitives**, not a new reasoning engine.

That framing is the key to portability: a port does not reimplement the agent. It maps the Worlds layer onto whatever persona, memory, UI, and multi-agent primitives the target runtime already exposes.

---

## 2. Decomposition — the capabilities Worlds requires

To port Worlds, a runtime must supply (or let us build on) these capability slots. Each is listed with its role and the minimum viable form.

| # | Capability | Role in Worlds | Minimum viable form |
|---|------------|----------------|---------------------|
| C1 | **Persona definition** | Give a character its identity, voice, and behavioral contract | A per-agent system prompt / persona file the runtime loads |
| C2 | **Multiple concurrent agents** | One world holds many characters | Isolated agent instances addressable by name |
| C3 | **Per-character memory** | Characters remember the user and prior scenes | Per-agent memory store, not shared global |
| C4 | **Inter-agent messaging** | Characters talk to each other / hand off | Agent-to-agent send + routing |
| C5 | **Presence & world state** | "Where" a character is, who's in a scene | A shared, queryable state object the agents and UI both read |
| C6 | **Rich / themed UI surface** | Render avatars, scene art, themed chrome | A widget / card / custom-pane mechanism in the client |
| C7 | **Scheduling / autonomy** | Characters act on their own (ambient life) | Cron / heartbeat / automations |
| C8 | **Session model** | A "scene" or "visit" is a bounded conversation | Named sessions with their own history |
| C9 | **Asset storage** | World art, avatars, maps, character sheets | Any file/artifact store the runtime can serve |
| C10 | **World definition format** | Declarative description of a world + its cast | A portable manifest (ours to design — see §4) |

C1–C4 and C7–C8 exist in all four runtimes. C5 (shared world state) and C6 (themed UI) are the two that vary most and drive the per-runtime design. C10 is the portable artifact we author once and ship everywhere.

---

## 3. Reference: how KiroCrew provides each slot

This anchors the port — it's the "known-good" mapping.

- **C1 Persona** → Crew Member identity + agent system prompt (`members/<name>/briefing.md`, SOUL-style persona).
- **C2 Agents** → Crew Members; `select_crew` / `spawn_run(agent=...)`.
- **C3 Memory** → per-member private memory (V2) vs shared Global (V1).
- **C4 Messaging** → `session_send` / `session_read_message`, subagent spawn/continue.
- **C5 World state** → session ledger + a world-state artifact (JSON) the characters read/write.
- **C6 UI** → `<mcwidget>` inline widgets (themed via CSS variables), auto-registered as artifacts.
- **C7 Autonomy** → `cron_add`, monitor loops, heartbeat.
- **C8 Sessions** → dashboard sessions, folders.
- **C9 Assets** → artifact library (versioned), folders.
- **C10 World definition** → **the new portable `world.json` manifest proposed in §4.**

---

## 4. The portable World manifest (`world.json`)

The one thing we author once and reuse across runtimes. Everything runtime-specific is derived from it by an adapter (§6). Keep it declarative and runtime-agnostic — no runtime API calls inside it.

```json5
{
  "schema": "worlds/v1",
  "id": "neon-harbor",
  "title": "Neon Harbor",
  "theme": {
    "palette": { "bg": "#0b1020", "fg": "#e6f1ff", "accent": "#36e0c0" },
    "font": "Space Grotesk",
    "backdrop": "assets/harbor-night.webp",
    "mood": "cyberpunk-cozy"
  },
  "places": [
    { "id": "dock", "name": "The Docks", "art": "assets/dock.webp",
      "connects": ["market", "bar"] },
    { "id": "bar", "name": "The Rusty Anchor", "art": "assets/bar.webp",
      "connects": ["dock"] }
  ],
  "characters": [
    {
      "id": "mara",
      "name": "Mara",
      "role": "harbor-master",
      "persona": "personas/mara.md",   // the C1 system-prompt body
      "avatar": "assets/mara.webp",
      "voice": "elevenlabs:rachel",
      "home": "dock",
      "memory_scope": "private",         // private | shared
      "tools": ["web_search", "schedule"],
      "relationships": { "jonah": "old friend", "user": "newcomer" }
    }
  ],
  "rules": {
    "turn_model": "director",            // director | free-for-all | round-robin
    "ambient": true,                      // characters act on schedule
    "handoff": "mention"                  // how control passes between characters
  },
  "entrypoint": { "place": "dock", "greeter": "mara" }
}
```

Design rules:
- **Assets are relative paths** resolved by the adapter against the runtime's asset store (C9).
- **`persona` points at a markdown body** so the same persona file drops into any runtime's system-prompt slot unchanged.
- **`memory_scope`** maps to the runtime's private-vs-shared memory primitive (C3).
- **`turn_model` + `handoff`** are interpreted by a small **Director** component (§5), not by any one runtime.

---

## 5. Runtime-agnostic core: the "Director"

A thin orchestration layer that every port shares. It owns the logic that is *not* runtime-specific, so each adapter stays small.

Responsibilities:
1. **Load** `world.json`, resolve personas and assets.
2. **Instantiate** one agent per character via the runtime adapter (C2).
3. **Maintain world state** (C5): current place of each character, who is in a scene, recent events — a single JSON document the adapter persists and the UI renders.
4. **Route turns** per `turn_model`: decide which character responds, drive handoffs on `@mention`, inject ambient events on a schedule (C7).
5. **Emit render intents**: a normalized "render this scene / this character spoke / move to this place" event that the adapter translates into the runtime's UI primitive (C6).

The Director is a library (TypeScript or Python to match the runtime), not a service — it runs inside each runtime's agent/gateway process and talks to the runtime only through the **adapter interface** below.

---

## 6. The adapter interface

Each runtime implements this contract. This is the entire porting surface.

```ts
interface WorldsAdapter {
  // C1/C2 — create a character as a runtime agent
  createCharacter(c: Character): Promise<AgentHandle>;

  // C3 — scoped memory
  readMemory(agent: AgentHandle, query: string): Promise<string>;
  writeMemory(agent: AgentHandle, fact: string): Promise<void>;

  // C4 — talk between characters
  sendToCharacter(from: AgentHandle, to: AgentHandle, msg: string): Promise<void>;

  // C5 — world state persistence
  loadState(worldId: string): Promise<WorldState>;
  saveState(worldId: string, s: WorldState): Promise<void>;

  // C6 — render into the runtime's UI
  render(intent: RenderIntent): Promise<void>;   // scene | speech | move | roster

  // C7 — ambient autonomy
  schedule(agent: AgentHandle, cron: string, prompt: string): Promise<void>;

  // C9 — assets
  publishAsset(path: string): Promise<Url>;
}
```

`render(intent)` is the one method whose quality gates the whole experience, because the UI primitives differ sharply (see §7).

---

## 7. Per-runtime mapping

### 7.1 KiroCrew (reference)
Full fidelity. `render` → `<mcwidget>` themed with CSS variables; state → artifact JSON + session ledger; characters → Crew Members; scheduling → cron. This is already how Worlds works and is the conformance baseline for the others.

### 7.2 HermesDesktop
**Fit: high.** Hermes is the strongest non-Kiro target because it already ships a persona-roster feature.

- **C1/C2 Persona + agents → Bot Mode.** Each Hermes **profile** is a bot with its own avatar, canonical Bot Chat, and routines. A Worlds character maps directly to a Hermes bot: name, title, description, SOUL, skills, model. `createCharacter` = create a profile/bot (the "Create on" picker even allows multi-machine placement).
- **C4 Inter-agent → `@mention` handoff.** Hermes bots message each other (`@researcher …`) and reach each other's Bot Chats headlessly; the backend teaches the messaging protocol automatically (`agent.bot_mode_protocol`). `sendToCharacter` maps onto this directly. **Group chats** (Discord-style rooms where several bots deliberate) are an almost-exact match for a Worlds "scene."
- **C3 Memory → per-profile memory + Memory Graph.** Memory is per-profile, so `memory_scope: private` is native; shared scope needs a dedicated "world" profile that others read.
- **C6 UI → Desktop Plugin SDK.** This is the port's main build effort. Hermes desktop plugins register **panes, pages, sidebar nav, status-bar items, palette commands, keybinds, and themes** via one SDK (an ESM `plugin.js` under `$HERMES_HOME/desktop-plugins/`, hot-reloaded). `render` becomes a custom **"World" pane** that draws the scene art, avatars, and roster beside the chat. The right-hand **preview rail** and **artifacts** can host scene renders in the interim before a dedicated pane exists.
- **C5 State → plugin storage + a shared profile's memory/files.** The desktop plugin can hold app-level state; durable cross-character state lives in files the gateway serves.
- **C7 Autonomy → Hermes cron / routines** (Bot Mode "Routines" are cron-backed) → `schedule`.
- **C9 Assets → artifacts / file browser**, served through the gateway (works on remote backends too).
- **Caveats:** themed world chrome must respect the desktop theming system (VS Code-theme import exists); a desktop plugin is **not sandboxed** and runs with app authority — the World plugin must be reviewed/trusted. Bot Mode can be disabled by the user (Capabilities → Plugins → Bots), so the port should detect it.

### 7.3 OpenClaw
**Fit: high on logic, medium on UI.** OpenClaw is the richest *platform* (self-hosted gateway, deep plugin SDK) but its UI is a browser Control UI rather than a native app.

- **C1/C2 Persona + agents → multi-agent routing + SOUL.md.** OpenClaw has first-class **multi-agent routing** with isolated sessions per agent/workspace/sender, **agent bindings**, and **parallel specialist lanes**. Each character = one agent entry with its own SOUL.md persona. `createCharacter` configures an agent in `openclaw.json` (or via Config RPC for live updates).
- **C4 Inter-agent → `agent-send` tool + sub-agents + swarm.** `sendToCharacter` maps to the `agent-send` tool; scenes with deliberation map to **swarm** / parallel specialist lanes.
- **C3 Memory → builtin memory engine / Honcho / LanceDB, with provenance.** Per-agent memory is native; `memory_scope` chooses the store. Active memory + standing intents give characters ambient recall.
- **C6 UI → Control UI panels/docks + Show Widget + MCP Apps + Session Dashboards.** OpenClaw exposes a **`show_widget` tool**, **Session Dashboards**, a **Dashboard architecture**, **Portals**, and **MCP Apps**. `render` targets `show_widget` for inline scene cards and a **Session Dashboard** for the persistent world view. Theming via the `theme` tool. The macOS companion app adds a **Widget panel** and voice overlay for a more embodied feel.
- **C5 State → gateway state + plugin SDK memory/context slots + Workboard.** The plugin SDK has **memory and context slots** and **state helpers**; a feature plugin owns the world-state document.
- **C7 Autonomy → automations (cron), hooks, webhooks, standing orders** → `schedule`. Ambient room events and presence are first-class.
- **C9 Assets → media tools + gateway file serving.** Image generation is even available to generate scene/avatar art on demand.
- **Build path:** ship Worlds as an **OpenClaw plugin bundle** (channel-neutral feature plugin + the UI via `show_widget`/dashboard). Because OpenClaw bridges to many chat channels (Discord, Telegram, etc.), a text-only "world" degrades gracefully there — characters as named senders, scene changes as messages — while the Control UI gets the full visual version.
- **Caveats:** the strongest embodiment needs the Control UI or macOS app; pure messaging channels get a reduced (text/card) experience. Respect the trust-boundary / policy-as-code model when a plugin writes state or spawns agents.

### 7.4 GrokBot
**Fit: medium — strong agents and persistence, constrained/opaque UI.**

- **C1/C2 Persona + agents → named Bots.** GrokBot's core unit is a **Bot** with a name, job, and compounding context; multiple Bots **run in parallel, message each other, share context in group chats, and hand off ownership**. A Worlds character = a Bot; a scene = a **group chat** of Bots. `createCharacter` = create a Bot with its persona as its job description.
- **C4 Inter-agent → native.** Bot-to-bot messaging, group chats, and task handoff are built in — `sendToCharacter` and scene deliberation map cleanly.
- **C3 Memory → native per-Bot memory.** "Context compounds" per named Bot (preferences, role context, prior-work summaries); conversations/learned context are per-Bot while files/browser sessions are shared on the one computer. `memory_scope: shared` is actually the *default substrate* (shared computer), so **private** is the scope that needs care.
- **C7 Autonomy → skills + routines on a schedule.** Bots learn a path by demonstration, save it as a **skill**, and **rerun it on a schedule** → `schedule`. Work continues on the cloud computer while the laptop is closed — good for ambient world life.
- **C9 Assets → the shared cloud computer's filesystem/browser.** Scene art and character sheets live there.
- **C6 UI → the hard constraint.** GrokBot has **no documented public plugin/widget/custom-pane SDK**. The client is a messaging-style app (desktop + mobile) you talk to. So `render` cannot draw a custom themed scene pane. Options, in order of fidelity:
  1. **Message-native embodiment** — characters speak as distinct Bots in a group chat; scene changes are narrated + an attached scene image (generated/stored on the computer) sent as a file; roster/state posted as a formatted message or a generated image card. This is the realistic MVP.
  2. **Browser-rendered world** — a Bot uses its **computer + browser** to open a Worlds web page (served by the Director) that renders the full visual world; the user views/drives it through the Bot's browser surface. Higher fidelity, more moving parts.
  3. **API path** — if building *on* the xAI API (Grok Build) rather than inside the GrokBot app, render the world in your own front end and use the API only for reasoning. This stops being a "port into GrokBot" and becomes "Worlds using Grok as the model."
- **C5 State → files on the shared computer.** `loadState`/`saveState` read/write a JSON on the Bot's filesystem.
- **Caveats:** no themed-UI primitive is the blocker; the shared-computer model means state isolation between characters needs explicit discipline; capabilities are governed by GrokBot's approval/security model. Verify current SDK surface before committing — docs may evolve.

---

## 8. Feature parity matrix

| Capability | KiroCrew | HermesDesktop | OpenClaw | GrokBot |
|---|---|---|---|---|
| C1 Persona | Crew Member / SOUL | ✅ Bot (SOUL) | ✅ agent + SOUL.md | ✅ Bot job desc |
| C2 Multi-agent | ✅ | ✅ profiles/bots | ✅ routing/lanes | ✅ parallel Bots |
| C3 Per-char memory | ✅ V2/V1 | ✅ per-profile + graph | ✅ builtin/Honcho/LanceDB | ✅ per-Bot (shared default) |
| C4 Inter-agent msg | ✅ | ✅ @mention + rooms | ✅ agent-send/swarm | ✅ native group chat |
| C5 World state | ✅ ledger+artifact | ⚠️ plugin storage/files | ✅ SDK state slots | ⚠️ files on shared PC |
| C6 Themed UI | ✅ mcwidget | ✅ desktop plugin pane | ✅ show_widget/dashboard | ❌ none (message/browser) |
| C7 Autonomy | ✅ cron/monitor | ✅ routines/cron | ✅ automations/hooks | ✅ scheduled skills |
| C8 Sessions | ✅ | ✅ | ✅ | ✅ chats |
| C9 Assets | ✅ artifacts | ✅ artifacts/files | ✅ media+files | ✅ shared PC fs |
| C10 Manifest | authored once, portable across all |

Legend: ✅ native/strong · ⚠️ buildable with glue · ❌ not available, needs fallback.

**Headline:** HermesDesktop and OpenClaw can reach near-full fidelity; GrokBot reaches full *logic* fidelity but only *message/browser-level* visual embodiment because it exposes no custom-UI primitive.

---

## 9. Implementation plan (phased)

1. **Extract the core.** Factor Worlds in KiroCrew into (a) the portable `world.json` schema, (b) the runtime-agnostic Director, (c) the KiroCrew adapter. Prove the KiroCrew path is unchanged behaviorally — this is the conformance test.
2. **HermesDesktop adapter.** Map characters→bots, handoff→@mention/rooms, memory→per-profile; build the **World desktop-plugin pane** for `render`. Highest-fidelity non-Kiro port and the one that reuses the most existing product (Bot Mode).
3. **OpenClaw adapter.** Ship as a plugin bundle; `render` via `show_widget` + a Session Dashboard; characters via multi-agent routing; state via SDK slots. Add graceful text degradation for messaging channels.
4. **GrokBot adapter (MVP).** Message-native embodiment: Bots as characters in a group chat, scene art as sent images, state as a file. Spike option (2) (browser-rendered world) separately and compare.
5. **Conformance suite.** One world (`neon-harbor` fixture) runs on all four; assert persona load, handoff, memory scope, scheduling, and a render snapshot per runtime. UI fidelity is tiered, not pass/fail.

---

## 10. Open questions for you

- **Scope of the first port** — one runtime deep, or the shared Director + two adapters in parallel?
- **GrokBot fidelity bar** — is message/browser-level embodiment acceptable as "ported," or does Worlds require a true custom UI (which would push GrokBot to the API-only path, i.e. not a port into the app)?
- **Shared vs private memory default** — Worlds leans on per-character private memory; GrokBot's shared-computer model inverts that default. Do we require private isolation, or adapt the world rules per runtime?
- **Manifest ownership** — should `world.json` be a KiroCrew artifact format we standardize, or a neutral open spec so third parties can author worlds?

---

## 11. Review comments

Checked 2026-10-01 against the current public docs for each runtime. The decomposition in §2 is the right porting surface. The per-runtime essays in §7 are directionally right and a few of them name the wrong primitive, which would send an implementation at a feature that does not do what the adapter needs.

### 11.1 What is portable, and what is not

Portable: the manifest (cast, places, theme tokens, persona markdown, entrypoint), a world-state JSON document, and a small turn policy (`director` / `free-for-all` / `round-robin` / `defer`).

Not portable, despite the adapter interface treating them as one method each:

- **Who hosts the Director.** KiroCrew can run it as a [workflow](https://kiro.dev/docs/crew/features/workflows/) (`ctx.agent(..., agent=<member>)`) or as gateway app code. Hermes splits the job across two unrelated SDKs (Python gateway plugin + ESM desktop plugin). OpenClaw can host it in a gateway plugin. Grok Bot has no plugin host, so the Director has to be a coordinator Bot plus a file, or an external page.
- **`render(intent)`.** Four different delivery models, not four skins of one widget. See §11.3–11.6.
- **`createCharacter`.** KiroCrew, Hermes, and OpenClaw have a file or RPC to write. Grok Bot's documented create path is the New-chat UI ([Create and manage Bots](https://docs.x.ai/grok-bot/bots)). There is no documented bot-management API, so the Grok adapter cannot promise `createCharacter()`.
- **`schedule(cron, prompt)`.** Kiro cron, Hermes routines, and OpenClaw automations accept a schedule. Grok routines are per Bot and are a schedule *or* a Cursor-account event, and the skill they run is account-wide ([Skills and routines](https://docs.x.ai/grok-bot/skills-routines-and-automations)). A cron string is not the contract.
- **`voice`.** `elevenlabs:rachel` is not a slot on any of the four. Drop it from v1, or mark it `runtime: optional` with no required provider. Kiro appearance packs can attach a sound to a member reaction. Grok has voice chat and voice memos. Neither consumes an ElevenLabs voice id from the manifest.
- **`tools[]`.** Tool names do not survive the port. Kiro templates have an allow-list, Hermes has toolsets, OpenClaw has tool profiles and `tools.agentToAgent`, Grok has account-wide connectors the user enables. The manifest should name capabilities (`web`, `schedule`, `files`), and the adapter should map those onto the runtime's conservative default.

`C1–C4 and C7–C8 exist in all four` (§2) is too strong. Persona, some kind of multi-agent, some kind of memory, some kind of handoff, some kind of schedule, and some kind of chat all exist. They are not the same shape, and on Grok Bot two of them (private files, a Director-owned turn) do not exist as product features.

### 11.2 Manifest changes worth making before any adapter

- **Characters should point at a GAF pack, not only a loose `personas/*.md`.** The farm already plants personas into these runtimes (`packages/hermes-mybot-farm`, `packages/openclaw-mybot-farm`, the KiroCrew plugin spec, `gafToGrokTemplate`). A world that invents a second persona file will drift from planted agents. `persona` can stay a markdown body for hand-authored worlds; add optional `pack` so a world composes stalls.
- **Add `turn_model: "defer"`.** Hermes group chats and Grok groups already decide who speaks (Bot Mode's messaging protocol; Grok's "write normally and let the Bots decide"). A Director that also picks the speaker will double-drive the room. `defer` means the runtime owns the turn and the Director only records state and emits render intents.
- **Cap a scene, not the world.** Grok group chats are 2–6 Bots ([Message and collaborate](https://docs.x.ai/grok-bot/chat-and-collaboration)). An account holds at most 50 Bots and group chats combined. A world with a larger cast still ports if each *place* has at most six present characters and the rest are offstage. Put that in the manifest rules as `max_present`, with runtime overrides.
- **`memory_scope` is three behaviors, not two.** `private` = this character's notes. `shared` = a world document every character may read. `substrate` = the runtime's shared machine (Grok's computer, and any Hermes profile that shares a home). Do not map Grok's shared filesystem onto `memory_scope: "shared"`; that scope should mean the world-state file, which the adapter writes on purpose.
- **Places are Director state on every runtime.** No target has a place graph. The closest native "scene" is a Hermes group chat, an OpenClaw session, or a Grok group. `connects` is ours. Adapters should not look for a rooms API that encodes the map.

### 11.3 KiroCrew — reference primitives, not a shipped Worlds

[Crew docs](https://kiro.dev/docs/crew/) do not describe a Worlds feature. §7.1's "this is already how Worlds works" overclaims the baseline. What exists, and what a first implementation should actually call:

| Slot | Use this | Watch-out |
|---|---|---|
| C1 | Agent JSON `prompt` at `~/.kiro/agents/<name>.json` ([Agents](https://kiro.dev/docs/crew/capabilities/agents/)). Member identity is `briefing.md` under the crew member dir. | There is no full-agent import verb. Write the template, then `kirocrew agent create` to bind the member. Same constraint as the KiroCrew plugin spec. |
| C2 | Crew Members, behind Settings → Developer → Feature Previews. | The conformance baseline depends on a preview flag. The public CLI is `kirocrew spawn run --agent`. `select_crew` is not in the public docs; confirm it before treating it as the port API. |
| C3 | Member private memory, plus the six global layers (preferences, projects, lessons, history, semantic, episodic). Session modes: Persistent / Incognito / Temporary. | Public docs do not name this "V2 vs V1". Channel sessions share long-term memory and not in-session context. A scene must not assume a fresh tab is a blank character. |
| C4 | `session_send` into a peer session ([Workflows](https://kiro.dev/docs/crew/features/workflows/)). Session-control tools are deny-by-default. | Subagent spawn returns a result to the parent. A scene of peers wants `session_send`, not only spawn. |
| C5 | `session_ledger_read` / ledger write, plus an artifact or a JSON file. | Ledger is per session, for compaction recovery. World state should be its own artifact so it survives session compaction. |
| C6 | Inline mcwidget: sandboxed iframe, Tailwind, `var(--bg)`, `var(--text)`, `var(--accent)`, `postMessage({type:'kirocrew:action'})` ([Widgets](https://kiro.dev/docs/crew/chat/artifacts/)). | Widgets live inside a message. They are not a persistent map pane. Artifacts persist and can be webapps with a local preview. Crew Companion shows one member avatar, not a cast. A member drawer can show a live webview of content a deployed member holds — that is the closest thing to a standing scene view. |
| C7 | `kirocrew-cron`, schedules bound to a member's private memory, heartbeat, workflows. | Workflows are sandboxed to the `ctx` DSL. That is a feature: the Director script cannot widen member tool allow-lists. |
| C8 | Dashboard tabs, folders. Channel sessions are separate. | Incognito writes nothing back. A world visit should be Persistent or it will look like the characters forgot. |
| C9 | Artifact library, versioned, slug must be unique. | Theme tokens in the widget must use the CSS variables. Hardcoded colors get a dashboard warning when saved as an artifact. |

**Implementation.** Phase 1 is not a refactor of an existing Worlds product. It is: manifest loader, world-state artifact, a workflow (or app) that `session_send`s the greeter and updates the ledger, and one mcwidget that draws the current place. Treat that widget-plus-artifact pair as the conformance render, not a pixel match for the other three.

Approval modes still apply. A planted character must keep the farm's deny-by-default tool list. Worlds must not grant `execute_bash` to a cast member because the manifest listed a tool.

### 11.4 Hermes Desktop — best visual port, two plugins, do not fight Bot Mode

The §7.2 fit call is right, with these corrections from [Bot Mode](https://hermes-agent.nousresearch.com/docs/user-guide/bot-mode), [profiles](https://hermes-agent.nousresearch.com/docs/user-guide/profiles), [memory](https://hermes-agent.nousresearch.com/docs/user-guide/features/memory), and the [Desktop Plugin SDK](https://hermes-agent.nousresearch.com/docs/developer-guide/desktop-plugin-sdk).

**Build a unified package, not a desktop pane alone.** Hermes has three plugin systems that do not share code: Python gateway plugins, the native desktop SDK (`@hermes/plugin-sdk`), and the web-dashboard SDK. A world needs the first two. The supported layout is one package with `desktop/plugin.js` scanned from `$HERMES_HOME/plugins/<id>/`. `ctx.rest` / `plugin_api.py` is the shared backend namespace. The existing `mybot-farm` Hermes plugin is the pattern to extend, not a reason to invent a second install path.

**`createCharacter` is `profiles.create`.** Desktop host exposes `profiles.create({ name, description, soul, model, provider })` and `profiles.list`. A profile is its own home: `SOUL.md`, `MEMORY.md`, `USER.md`, sessions, skills, cron, `state.db`. That is the character. Cloning a profile copies soul, skills, and the two memory files; do not clone if the new character should start blank.

**Let Bot Mode own the scene.** Group chats are Discord-style rooms, membership is stored in profile metadata, and bots already message each other. The backend teaches the protocol (`agent.bot_mode_protocol`). Map a place to a group when the cast is co-present, and set `turn_model: "defer"` unless we have measured that an external Director can post without racing that protocol. `sendToCharacter` should call the same path Bot Mode uses, not a second messaging stack.

**Memory is per profile and tiny.** Built-in `MEMORY.md` is about 2,200 characters and `USER.md` about 1,375. Writes are a frozen snapshot until the next session. Two agents must not share one Hermes home. Scene history will not fit in built-in memory. Put it in the world-state file (or an external provider — Honcho and the others run *beside* built-in memory). The Memory Graph (`/journey`) is a viewer of skills and memory nodes, not a shared world store. "A dedicated world profile that others read" works only if those others are pointed at an external provider or a file, not if they read that profile's `MEMORY.md`.

**The pane is the render target, and it is unsandboxed.** Disk plugins are plain ESM evaluated in the renderer with app authority. The integrity hash does not sandbox them. Closing the only pane a plugin contributes disables the plugin. Register the World pane with an explicit `placement` and width so it does not take half the window. Theme through `ui.*` and the app's CSS variables; VS Code theme import is a user feature, not an API the world manifest should target. Bot Mode itself is a bundled desktop plugin: Capabilities → Plugins → Bots turns the roster off without deleting profiles or cron. Detect that switch; the characters still exist as profiles when the roster is hidden.

**State.** Plugin storage in the renderer is not the durable world. Persist `world-state.json` via the gateway (files the profile can read, or the plugin's `plugin_api.py` namespace) so CLI and remote backends see the same scene the pane draws.

### 11.5 OpenClaw — gateway plugin, `sessions_send`, pinned dashboard

Logic fit is high. The §7.3 UI paragraph stacks five features that are not interchangeable.

| Spec says | Actual primitive | Use for Worlds? |
|---|---|---|
| `agent-send` tool | `openclaw agent --message` is a CLI that runs a turn. The in-agent tool is [`sessions_send`](https://docs.openclaw.ai/concepts/session-tool). | Yes: `sendToCharacter`. Cross-agent access defaults on and is governed by `tools.agentToAgent`. A world should set `allow` to the cast's agent ids. |
| swarm | Fan-out of isolated collector subagents via Code Mode `agents.run`. Results return to the parent. Not a room of peers. | No, unless a character is delegating a one-shot task. |
| `show_widget` | Core tool, only when the client advertises `inline-widgets`, or exactly one current-channel presenter matches. Control UI and supported native apps do. Discord only if Activities are configured. Other channels do not get the tool. Pinned widgets accept `size`, `presentation.frame`, and a capability grant. | Yes: scene card. `pin: true` puts it on that session's dashboard. |
| Session Dashboard | A board owned by one session. Survives `/new` and `/reset`. Agent tools are `dashboard` and `show_widget`. There is no world-level board. | Yes: the standing view, pinned to one "world" session. Other character sessions do not share that board. |
| MCP Apps | Opt-in. Renders `ui://` HTML from an MCP server inside a double iframe, 2 MiB cap, ten-minute view lease. | Only if Worlds is an MCP server that serves the scene. Heavier than `show_widget`, and the wrong default. |
| Portals | Proxies a dev server to Control UI → Portals. `portal` is `group:ui` / coding profile. Sandboxed sessions never receive it. | Useful spike for a live web scene, not the MVP render path. |
| theme tool | Not a documented Worlds-facing tool. | Theme the widget HTML with the manifest palette. Do not depend on a theme tool. |
| Honcho / LanceDB | Optional memory plugins. The memory slot has one owner. LanceDB rows are per agent. Honcho is an external service beside builtin markdown. Memory Wiki is global unless `vault.scope` is `agent`. | Builtin markdown plus plugin-owned world JSON. Do not make `memory_scope` select Honcho vs LanceDB per character in one gateway. |
| Ambient presence | Gateway event `presence` is process presence. Ambient group watches queue activity notices; they do not grant session access and they are not a character's place. | Director-owned world state. Hooks can wake a character; they are not the map. |

**Implementation.** Ship the same shape as `packages/openclaw-mybot-farm`: a feature plugin that writes one agent per character (`SOUL.md` in that agent's workspace, `~/.openclaw/agents/` by default), stores `world-state.json` in plugin state (plugin stores are not automatically per-agent), and renders with `show_widget` + `pin: true` on a single world session. Config writes should go through the supported config path; hand-editing `openclaw.json` under a running gateway is how plugins get lost until restart.

**Degradation is a delivery rule, not a nice-to-have.** `show_widget` is absent on ordinary capless channel runs. Messaging channels get named senders and a text scene line. Automations may pin a widget only when the scheduled tool policy explicitly allows `show_widget`, and those calls must set `pin: true` and cannot set `presentation.target`. An ambient cron that "draws the harbor" will no-op on a channel that cannot pin.

**Trust boundary.** Plugin-spawned agents and session tools can see other sessions when visibility is `all`. The world plugin should narrow `tools.sessions.visibility` for cast agents and list character pairs in `tools.agentToAgent.allow`. Sandboxed sessions clamp session tools to their spawn tree, which will break a scene if we sandbox the cast without meaning to.

### 11.6 Grok Bot — message-native is the port; the other two options are different products

§7.4 is the most accurate of the three essays. Tighten it with the current limits:

- **No custom UI, and Plugins are not a UI SDK.** Settings → Plugins installs connectors and packaged skills. The client is a messenger on desktop and mobile. `render` cannot target a pane.
- **No documented management API.** Creating a Bot is New → Create new agent → Edit Profile (name, title, description, avatar). `createCharacter` on this adapter is a setup checklist, or a coordinator Bot the user has already created, not an RPC.
- **Scenes are groups of 2–6.** Larger casts need several groups or offstage characters. Unaddressed messages are free-for-all; `@Name` assigns the turn; `@everyone` wakes the room. That is `defer` or `mention`, not a Director process.
- **Bot-to-group handoffs are text-only.** The user can attach images. A Bot that must show a picture sends it in a direct message, or writes a file on the shared computer. "Post a scene image into the group" is not a supported bot action today. MVP render is narration plus a file path, or a DM from the greeter.
- **Memory split is exactly as the spec says, and it binds the rules.** Conversations and learned context stay per Bot. Files, browser sessions, cookies, and CLI credentials are account-wide. Each Bot has its own screen; one computer-use task at a time per screen; screens are not a security boundary ([Computer and apps](https://docs.x.ai/grok-bot/computer-and-apps)). Private isolation is impossible for anything stored as a file. Keep secrets and other characters' private notes out of the world directory. Put private continuity in the Bot's own conversation and description; put shared scene state in one explicit JSON file the cast is told to treat as canonical.
- **Skills are shared, routines are per Bot.** Enabling a skill is per Bot, but the skill body is account-wide. A character routine can keep running with the laptop closed. Do not plant a stranger's routine during world install; match the farm rule that routines are documented until the user opts in.
- **Approvals still gate the computer.** Auto Review, connector scope, and local-computer execution (default: ask every time) are the capability boundary. A world must not instruct Bots to work around a CAPTCHA, login, or approval.

**Option 2** (open a web world in the Bot's browser) is a demo, not the port. The user watches it through Agent Computer. It depends on computer-use reliability and a server the Bot can reach.

**Option 3** (Grok API, your own frontend) is a Worlds client that uses Grok as the model. It is not a Grok Bot port. Keep it out of the adapter matrix.

**Recommendation for the open question in §10:** message-level embodiment counts as the Grok port. Requiring a custom UI drops Grok Bot from the matrix rather than pushing it to the API.

### 11.7 Adapter interface changes

Keep the interface small, and make the methods that cannot be uniform return a capability report instead of pretending.

```ts
interface WorldsAdapter {
  capabilities(): Promise<{
    render: "widget" | "pane" | "dashboard" | "transcript";
    createCharacter: "api" | "manual";
    privateMemory: "native" | "conversation-only";
    maxPresent: number | null;
    turn: "director" | "defer";
  }>;

  createCharacter(c: Character): Promise<AgentHandle | ManualStep>;
  readMemory(agent: AgentHandle, query: string): Promise<string>;
  writeMemory(agent: AgentHandle, fact: string): Promise<void>;
  sendToCharacter(from: AgentHandle, to: AgentHandle, msg: string): Promise<void>;
  loadState(worldId: string): Promise<WorldState>;
  saveState(worldId: string, s: WorldState): Promise<void>;
  render(intent: RenderIntent): Promise<void>;
  schedule(agent: AgentHandle, when: Schedule, prompt: string): Promise<void>;
  publishAsset(path: string): Promise<{ url?: string; path: string }>;
}
```

`Schedule` is `{ cron?: string; note?: string }`, not a bare cron string. `publishAsset` must be allowed to return a filesystem path when the runtime has no public URL (Grok, and Hermes remote backends that are not serving the file).

The Director stays a library of pure functions: load manifest, reduce world state, decide the next speaker when `turn` is `director`, build a `RenderIntent`. Each adapter binds those functions to the host. Do not require the library to run inside the agent process on all four.

### 11.8 Implementation order

1. **Manifest + state schema + one KiroCrew slice.** Workflow or app, one place, two members, mcwidget scene card, world-state artifact. This is the conformance fixture. It is new behavior, not a regression test of a current Worlds feature.
2. **Hermes unified plugin.** Profiles for the cast, one group chat per place, World pane reading the same state file, `turn_model: "defer"`. Memory writes go to the state file, not into the 2,200-character `MEMORY.md`, except for a short pointer.
3. **OpenClaw plugin.** One agent per character, `sessions_send`, world session with a pinned `show_widget`. Text fallback when the client has no inline widgets. Lock `agentToAgent.allow` to the cast.
4. **Grok Bot checklist, not an SDK port.** Document the manual Bot and group setup, the world-state path on the shared computer, the text-only group constraint, and a coordinator prompt that `@mentions` the greeter. Spike the browser page separately and do not block the other ports on it.

Conformance should assert the same transcript events everywhere: persona loaded, greeter spoke, handoff recorded, state file updated, schedule registered or explicitly skipped. Render assertions are tiered: Kiro widget HTML, Hermes pane mounted, OpenClaw pinned widget on the Control UI, Grok a transcript line plus a file path.

### 11.9 Answers to the open questions

- **First port.** One runtime deep, after the manifest exists: Hermes, because Bot Mode and the desktop pane are the only non-Kiro pair that can show a scene without inventing a client. Extract the Kiro slice in the same milestone so the manifest is proven by two adapters, not designed in the abstract. Leave OpenClaw and Grok as follow-ons; their adapters are smaller once `defer` and the capability report exist.
- **Grok fidelity.** Message and file embodiment is the port. A custom UI is out of scope for the Grok Bot app.
- **Private memory.** Require private *conversation* memory where the runtime has it (Kiro member memory, Hermes profile, OpenClaw per-agent workspace, Grok per-Bot chat). Do not require private files on Grok. World rules that need secrecy between characters should say so and degrade to "not available on a shared computer."
- **Manifest ownership.** Neutral spec, versioned `worlds/v1`, stored as a farm artifact the way GAF is. KiroCrew is the first adapter, not the owner of the format. Characters should be able to reference a GAF pack so worlds reuse planted agents instead of a parallel persona format.

The exchange format, per-runtime exporters, and import plans are specified in [worlds-exchange-spec.md](./worlds-exchange-spec.md).

