# Contract: downloading a mybot.farm **world** into KiroCrew

**Status:** implemented in plugin 0.2.0. This doc is the contract the code follows.
**Date:** 2026-10-02
**Scope:** the `kirocrew-mybot-farm` plugin — the download/plant bridge from
mybot.farm's WebMCP/HTTP surface into this KiroCrew runtime (`~/.kiro/agents` + crew).

This doc is the source of truth for *what a world download must produce*
and *what agents call to trigger it*. The mapper, plant path, CLI, and opt-in
MCP server are in this package.

---

## 1. What already exists (audited, do not rebuild)

The bridge and most of the world path are already here:

- **Farm WebMCP/HTTP surface** (`web/src/components/webmcp-tools.tsx`,
  `web/src/lib/webmcp-catalog.ts`): browser tools `search_stalls`, `get_stall`,
  `download_pack`, `get_install_prompt`, `post_listing`, backed by plain HTTP —
  `GET /api/stalls?kind=world`, `GET /api/stalls/{slug}`, `GET /api/packs/{slug}`
  (the GAF JSON). `kind=world` already filters; the `pack`/`post_listing` docs
  already mention `mybot.farm/world-pack`.
- **Plugin farm client** (`src/farm-api.mjs`): `searchStalls(q, kind)`,
  `getStall(slug)`, `getPack(slug)` hit those same endpoints. Env:
  `MYBOT_FARM_URL`, `MYBOT_FARM_API_KEY`, `KIRO_HOME`.
- **Plugin plant path** (`src/plant.mjs`): `plantTeam` already detects a
  `world` object on the pack and writes it raw to
  `~/.kiro/steering/farm/<slug>/world.json`, returning `worldJsonPath`.
- **Tool router** (`src/tools.mjs`): `farm_plant` already routes
  `mybot.farm/world-pack` through `plantTeam` and returns `kind: "world"`.
- **World-pack format** (`web/src/lib/gaf-pack.ts`): `WORLD_PACK_FORMAT`,
  `validateWorldBlock` — `world` is `worlds/v1`, a **team-pack superset**.

## 2. The real `world` block shape (authoritative = the seed, not spec §4 draft)

From the validated seed `public/packs/worlds/neon-harbor.json` and
`validateWorldBlock` in `gaf-pack.ts`. The portability spec §4 sketches a
`characters[]` form; the **shipped** schema is this and is what the adapter maps:

```
world: {
  schema: "worlds/v1",                 // required, exact
  title: string,                        // required
  thumbnail?: string,                   // https URL or scheme-less relative path, no ".."
  theme?: { palette?, backdrop?, mood?, font? },
  places: [                             // required, >= 1
    { id, name, art?, connects?: string[], present?: string[] /* role ids */ }
  ],
  cast?: [                              // persona overlays per member, keyed by role
    { role, name?, home?: placeId, avatar?, memoryScope?: private|shared|substrate,
      capabilities?: ("web"|"files"|"schedule")[], relationships?: {..} }
  ],
  rules?: { turnModel?: director|free-for-all|round-robin|defer,
            handoff?, ambient?: bool, maxPresent?: int },
  entrypoint?: { place: placeId, greeter?: role },
  render?: { theme?, widgetHints?: { scenePanel?, showBackdrop? } }
}
```

Cast is keyed by **`role`**, which matches `members[].role` on the team superset.
`present`/`home`/`entrypoint.greeter` reference **role ids**, not member names.

## 3. On-disk contract — what a world install MUST produce

`KIRO_HOME` defaults to `~/.kiro`. For a world slug `<w>` with members `<m1..mn>`:

| Artifact | Path | Owner / status |
|---|---|---|
| Member agent template (per member) | `~/.kiro/agents/<memberName>.json` | exists (team path); **persona must gain world skin** (Stage 2) |
| Member skill steering (per skill) | `~/.kiro/steering/farm/<memberSlug>/<skill>.md` | exists |
| Shared crew context | `~/.kiro/steering/farm/<w>/_shared.md` | exists (from `shared.memory`) |
| Crew topology doc | `~/.kiro/steering/farm/<w>/_crew.md` | exists |
| **Raw world manifest** | `~/.kiro/steering/farm/<w>/world.json` | exists (raw `world` block) |
| **World steering doc** (human/agent readable) | `~/.kiro/steering/farm/<w>/_world.md` | **NEW (Stage 2)** |
| Install marker | `~/.kiro/steering/farm/<w>/.farm-meta.json` | exists (version-aware reinstall) |

Plus the returned **bind commands** (not auto-run):
```
kirocrew workspace create --name <w>
kirocrew agent create --name "<mName>" --kiro-agent <mName> --workspace <w> --memory-store default   # per member
```

### 3.1 `_world.md`

`gafWorldToKirocrewCrew` writes this readable projection of the `world` block.
It covers:
- world **title + mood/theme** and the thumbnail reference;
- the **places** (id, name, who is `present`, how they `connect`);
- the **cast skin** per member: character `name`, `home` place, `relationships`,
  and the world **persona overlay** (the member keeps its own GAF persona; the
  world adds "you are <name>, the <role>, you live in <home>…");
- the **turn model + handoff + entrypoint greeter** so the crew knows who speaks
  first and how control passes.

Each member's template `prompt` (or a per-member world note) gains a short
**world skin** line pointing at `_world.md` and naming its character + home, so a
member planted from a world reads as its character, not a bare agent.

## 4. Safety contract (non-negotiable — spec §11.3)

- **Deny-by-default survives worlds.** A world's `cast[].capabilities`
  (`web|files|schedule`) is **documentation only**. Planted members keep the
  farm `DEFAULT_TOOLS` allow-list (read/search/web). A world **never** grants
  `execute_bash` or `fs_write` because the manifest named a capability.
- **Routines stay unscheduled** on install (`ambient:true` is documented, not
  cron-armed). The user opts in later.
- **Reserved namespace** `kirocrew-*` is never written; collisions get `farm-`.
- **Thumbnail/asset paths** are validated (no `..`, https or scheme-less rel).

## 5. Tool / arg surface agents call (what Stage 3 must advertise)

The surface already exists; the gap is **discovery** — it must say "worlds":

| Tool | Change needed |
|---|---|
| `farm_search` | accept `kind: "world"`; description + `plugin.yaml` enum add `world` |
| `farm_get_stall` / `farm_get_pack` | already slug-based; no change (worlds are slugs) |
| `farm_plant` | route worlds through the **world mapping** (Stage 2), not the bare team path; description names worlds + what lands on disk (`world.json` + `_world.md` + crew) |
| `farm_reinstall` | inherits the world path via `farm_plant` |
| CLI `bin/farm-plant.mjs` | `plant <worldSlug>` already works; output must surface `worldJsonPath` + the new `_world.md` path; help text names worlds |

Args unchanged: `slug`, `name?`, `workspace?`, `force?`, `reinstall?`, `clean?`,
`dryRun?`. Auth for writes stays env-only (`MYBOT_FARM_API_KEY`) — never a tool arg.

## 6. Runtime wiring (Stage 4)

The plugin is **not** wired into this gateway today (`config.json` has
`mcpServers: []`, no plugins). Stage 4 options, in preference order:
1. **Documented zero-dep CLI** (`node bin/farm-plant.mjs plant <slug>`), pointed
   at the live farm via `MYBOT_FARM_URL` — no gateway edit, already the install
   page's recommended path. Default; needs no new permission.
2. **Register as an MCP server** in `~/.kiro/crew/config.json` so this runtime
   can call `farm_*` as tools. Edits the live gateway config → surface to the
   user before doing it (plan note already flags this).

End-to-end acceptance: download the seed `neon-harbor` world from the farm and
produce §3's full artifact set (dry-run first), with agent/team installs
unchanged.

## 7. Stage checklist (each later stage verifies against this doc)

- **Stage 2:** `gafWorldToKirocrewCrew` maps the `world` block → `_world.md` +
  per-member world skin; team/agent mapping byte-identical; unit tests.
- **Stage 3:** `farm_plant` world route + `farm_search kind=world` + `plugin.yaml`
  / description updates + CLI help; `npm test` green incl. world cases.
- **Stage 4:** wire into this runtime (CLI default; MCP only with consent);
  dry-run plant of `neon-harbor` produces §3 artifacts.
- **Stage 5:** full suite + real dry-run plant; no regression to agent/team or
  the unrelated `agent-worlds` visualizer app.
