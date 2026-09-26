# KiroCrew plugin spec — Track B (export/import)

**Date:** 2026-09-26
**Status:** specced, not started. System **#14** in [user-systems-backlog.md](./user-systems-backlog.md).
**One line:** A KiroCrew-native plugin that plants farm GAF packs into `~/.kiro/agents/*.json` (+ crew members for teams) and posts GAF listings back — the KiroCrew twin of [`packages/hermes-mybot-farm`](../packages/hermes-mybot-farm) and [`packages/openclaw-mybot-farm`](../packages/openclaw-mybot-farm).

KiroCrew is the fourth runtime. It is **not** a new pack format — a pack is portable GAF JSON; Grok Bot, Hermes, and OpenClaw are all consumers with a thin adapter. This spec is the KiroCrew adapter.

Two tracks:
- **Track A (farm-side, S):** register `kirocrew` as a runtime, add an install page + doc. Makes KiroCrew a visible/taggable runtime. Details in §6.
- **Track B (the plugin, M):** this doc.

---

## 1. Verified facts (grounded, not assumed)

Confirmed by reading a real template (`/Users/alexokita/.kiro/agents/kirocrew-research.json`) and the agents dir:

- **A KiroCrew agent is a JSON template at `~/.kiro/agents/<name>.json`.** Fields: `name`, `description`, `model`, `tools[]`, `allowedTools[]`, `resources[]`, `includeMcpJson`, `hooks`, `prompt` (the system prompt — the whole persona), `mcpServers`.
- **The agents dir** holds hand-authored templates (`kirocrew-research.json`, `kirocrew-worker.json`, …) alongside machine-managed `kirocrew-skill-view-*.json` projections and `.lock` files. A planted pack must land as a plain `<name>.json` and must **not** collide with the reserved `kirocrew-*` namespace or the skill-view files.
- **Crews/members** live under `~/.kiro/crew/members/<member-id>/` with a `briefing.md` and `memory_stores/.../memory/*.md` (preferences, projects). GAF `memory[]` maps here for a persistent identity.
- **GAF source shape** is `FarmPack` in [`web/src/lib/pack-files.ts`](../web/src/lib/pack-files.ts): `profile{name,title,description,avatar}`, `skills[]{name,description,content}`, `memory[]{kind,content,createdAt}`, `routines[]{slug,name,description,content}`, `plugins[]{pluginId}`, and for teams `members[]{role,summary,pack}` + `shared{memory,gettingStarted}` + `topology`.

**Still to verify in implementation cycle 1 (the one real unknown):** whether KiroCrew exposes a supported **import CLI/RPC** (a `kirocrew agent import` verb on the backend binary at `/Applications/KiroCrew.app/.../bin/kirocrew`, analogous to `hermes profile import`) versus writing `~/.kiro/agents/*.json` directly. The Hermes plugin learned the hard way (the "GAP 2" tombstone bug) that writing files around a runtime that also manages that dir is fragile. See decision **D1**.

---

## 2. Scope

**In:** a new `packages/kirocrew-mybot-farm` package; a `farm-plant` CLI + seven farm tools; GAF → KiroCrew agent-template mapping; GAF team → KiroCrew crew mapping; `farm_post`/`farm_update` (GAF publish, identical across runtimes); tests; an install page + doc (Track A companion).
**Out:** GAF schema changes (KiroCrew consumes the existing format); auto-running planted agents; live sync (copy-on-install per farm principle #4); the recommendation tool (#9, separate).

---

## 3. Package layout (mirror the existing twins)

```
packages/kirocrew-mybot-farm/
  plugin.(yaml|json)        # id: mybot-farm; version 0.1.0; declared tools
  bin/farm-plant.(mjs|py)   # no-agent-loop CLI: search|get|stall|plant|reinstall|post|update
  src/
    farm-api.*              # GET /api/stalls, /api/stalls/{slug}, /api/packs/{slug}; POST /api/listings
    gaf-to-kirocrew.*       # the mapping — the heart of this package (§5)
    plant.*                 # write agent template + optional crew member
    post.*                  # farm_post/farm_update (GAF, seller key)
    tools.*                 # register the 7 tools
  tests/
  INSTALL.md
  catalog/                  # (optional) registry entry, twin of hermes catalog/
```

---

## 4. Tool surface (match Hermes/OpenClaw naming exactly)

| Tool | Direction | Behaviour |
|------|-----------|-----------|
| `farm_search` | read | `GET /api/stalls?q=&kind=` |
| `farm_get_stall` | read | `GET /api/stalls/{slug}` |
| `farm_get_pack` | read | `GET /api/packs/{slug}` (402 on paid → MPP/purchase, same as siblings) |
| `farm_plant` | import | GAF → `~/.kiro/agents/<name>.json` (+ crew member); opts `force`, `dry_run`, `name` |
| `farm_reinstall` | import | re-plant an owned/prior pack; `--force` overwrites, `--clean` removes crew member/memory |
| `farm_post` | export | `POST /api/listings` with `Authorization: Bearer mbf_…` (GAF JSON) |
| `farm_update` | export | `farm_post` + required `slug` |

Auth: `MYBOT_FARM_API_KEY` env wins; never accept the key as a model-supplied tool arg (copy the Hermes/OpenClaw rule verbatim). Env: `MYBOT_FARM_URL`, `MYBOT_FARM_API_KEY`, `KIRO_HOME` (default `~/.kiro`).

---

## 5. The mapping — GAF ⇆ KiroCrew (the real work)

### 5.1 Import: GAF agent-pack → `~/.kiro/agents/<name>.json`

Model on `gafToGrokTemplate` ([`web/src/lib/gaf-to-grok-template.ts`](../web/src/lib/gaf-to-grok-template.ts)) — a pure projection `gafToKirocrewAgent(pack): KirocrewAgentTemplate`.

| GAF (`FarmPack`) | KiroCrew template field | Notes |
|------------------|-------------------------|-------|
| `profile.name` → slugified | `name` | Sanitize to `[a-z0-9-]`; reject/prefix if it starts with `kirocrew-` (reserved) or matches `kirocrew-skill-view-*` |
| `profile.description` / `title` | `description` | One-liner |
| `profile` + `memory[]` + `gettingStarted` | `prompt` | Composed system prompt — the persona. GAF has no single "prompt"; build it: soul/description → intro, `memory[]` → durable-context section, `gettingStarted` → first-run steps. KiroCrew analog of Hermes' `SOUL.md`+`MEMORY.md`. |
| `skills[]{name,description,content}` | `resources[]` (steering md) **or** appended prompt sections | KiroCrew skills are steering `.md` under `.kiro/steering/` (see template `resources: ["file://.kiro/steering/**/*.md"]`). Plant each skill as a steering file and reference it. Decision **D2**. |
| `plugins[]{pluginId}` | `mcpServers` / `tools[]` | Marketplace plugin ids → MCP server refs where a mapping exists; else recorded in prompt as "expects plugin X". No arbitrary MCP URLs (farm forbids them). |
| `routines[]` | crew `cron` jobs (optional) | Map to `kirocrew-cron` only with explicit opt-in; default records them in the prompt. Decision **D4**. |
| `model` | `model` | Default `"auto"` (matches shipped templates). |
| — | `tools`/`allowedTools` | Plant a **conservative default allow-list** (read/search/web), NOT full bash — a planted stranger's agent must not get unrestricted `execute_bash`. Decision **D3**, security-relevant. |

Write target: `~/.kiro/agents/<name>.json`. Never overwrite an existing file unless `force` (copy OpenClaw's "existing agents never overwritten unless force").

### 5.2 Import: GAF team-pack → KiroCrew crew

GAF teams map onto KiroCrew's native crew concept better than any other runtime (real orchestration via `spawn_run(crew=…)`, `route_crew` — not just a group chat):

- Each `members[]` entry → one `~/.kiro/agents/<member-name>.json` (via 5.1).
- `topology` (pair/hub/pipeline from [teams.md](./teams.md)) → crew routing hints in the conductor/member prompts, and a crew definition under `~/.kiro/crew/` if KiroCrew exposes crew config.
- `shared.memory` → a shared steering file or each member's memory.
- `shared.gettingStarted` → crew setup steps surfaced to the user.

### 5.3 Export: KiroCrew agent → GAF (`farm_post`)

Reverse projection `kirocrewAgentToGaf(template): FarmPack` for a user publishing their own agent:
- `name`→`profile.name`; `description`→`profile.description`/`title`; `prompt` → `profile.description` (soul) + a `memory[]`/`skills[]` entry; `model`→`model`.
- **Scrub first:** run through `scripts/scrub.py` semantics — strip `mcpServers` absolute binary paths (machine-local; note the `/Applications/KiroCrew.app/...` path in the real template), `hooks` with local paths, API keys, PII. This is system **#5** (linter/scrub gate); Track B calls the same scrub, so #5 and #14 share code.
- Validate against `validateGafPack` + `validateListingPack` ([`web/src/lib/gaf-pack.ts`](../web/src/lib/gaf-pack.ts)) before POST (the server enforces these anyway — dry-run locally).

---

## 6. Track A companion (farm-side, do alongside)

- [`web/src/lib/runtimes.ts`](../web/src/lib/runtimes.ts): add `"kirocrew"` to `RUNTIME_IDS` + a `runtimeTags.kirocrew` badge.
- `web/src/app/install/kirocrew/page.tsx`: install page, twin of `/install/hermes`.
- This doc doubles as `docs/kirocrew-plugin.md` once the plugin ships (twin of [hermes-plugin.md](./hermes-plugin.md)).

---

## 7. Language/runtime choice

Hermes plugin = Python, OpenClaw = Node/TS. KiroCrew's backend is a bundled binary; its agents run MCP servers. **Recommend TypeScript/Node** — aligns with `web/`, and the API client can share types with `web/src/lib/pack-files.ts`. Confirm against how KiroCrew loads plugins (part of **D1**).

---

## 8. Tests & Definition of Done

- **Unit:** `gafToKirocrewAgent` produces a valid template for `patch`/`probe`; reserved-name rejection (`kirocrew-*`); default allow-list is conservative (no bare `execute_bash`); team pack (`pair-bench`) yields 2 member templates + routing hints; `kirocrewAgentToGaf` round-trips and scrubs machine paths; `farm_post` dry-run validates via `validateListingPack`.
- **Integration (dry-run default):** `farm-plant plant patch --dry-run` shows the target `~/.kiro/agents/patch.json` without writing; live plant writes it and it loads.
- **DoD:** all 7 tools registered and callable; plant produces a loadable KiroCrew agent; team plant produces a crew; `farm_post` publishes GAF with a seller key; scrub strips machine-local fields; tests green; install page + doc shipped; `runtimes.ts` shows the KiroCrew badge.

---

## 9. Decision gates

- **D1 — import path: RESOLVED (2026-09-26).** Probed the backend binary (`/Applications/KiroCrew.app/.../bin/kirocrew`). `kirocrew agent {list,create,update,delete}` manages **Crew Member bindings only** — `create` takes `--name`, `--kiro-agent` (an *existing* template), `--workspace`, `--memory-store`. It does **not** author template content (no `--prompt/--tools/--model`). `agent list` confirms a member = `NAME → KIRO_AGENT template + WORKSPACE + MEMORY_STORE`. **Conclusion:** the plugin must **write the template JSON directly** to `~/.kiro/agents/<name>.json`, then optionally bind a Crew Member with `kirocrew agent create --name <n> --kiro-agent <name> [--memory-store]`. There is no full-agent import verb, so the direct-write approach is correct — but it means the plugin owns template correctness (schema, reserved-name avoidance, D3 tool allow-list). No Hermes-"GAP 2" tombstone risk observed for agent templates; the crew binding is the CLI-supported step. (The gateway owns `~/.kiro/crew` perms — a research-sandbox `agent create` hit `Operation not permitted` there; the real plugin runs with the user's perms and is unaffected.)
- **D2 — skills placement:** GAF `skills[].content` as steering `.md` files vs inlined into `prompt`. Steering files are more faithful; inlining is simpler/self-contained. Lean steering files.
- **D3 — default tool allow-list (security):** a planted third-party agent must NOT inherit full `execute_bash`. Propose read/search/web only by default; user opts into more. Safety default, not convenience.
- **D4 — routines auto-scheduling:** default OFF (record in prompt); user opts into `kirocrew-cron`. Auto-scheduling a stranger's cron jobs on install is a footgun.

---

## 10. Sequencing

1. **Verify D1** (probe KiroCrew's import path) — one work-session cycle.
2. **Track A** (runtime badge + install page stub) — unblocks visibility.
3. **Import half** (`gafToKirocrewAgent`, `farm_plant`, tests) — the demonstrable win: plant `patch` into KiroCrew.
4. **Team import** (crew mapping).
5. **Export half** (`kirocrewAgentToGaf` + scrub + `farm_post`) — shares scrub code with #5.

---

## Related

- [user-systems-backlog.md](./user-systems-backlog.md) — parent backlog (#14)
- [hermes-plugin.md](./hermes-plugin.md) / [openclaw-plugin.md](./openclaw-plugin.md) — the twin plugins this mirrors
- [teams.md](./teams.md) — team topology (pair/hub/pipeline)
- [api-keys.md](./api-keys.md) — seller API keys, `farm_post` contract
