# kirocrew-mybot-farm

Plant mybot.farm agents and teams into **KiroCrew**, and post GAF listings back.
The KiroCrew twin of `packages/hermes-mybot-farm` and `packages/openclaw-mybot-farm`
(system #14 Track B — see [`../../docs/kirocrew-plugin-spec.md`](../../docs/kirocrew-plugin-spec.md)).

## What it does

- **Plant an agent** → writes a KiroCrew agent template at `~/.kiro/agents/<name>.json`
  with the persona composed into `prompt`, skills materialized as steering files
  under `.kiro/steering/farm/<slug>/`, and a **deny-by-default tool allow-list**
  (read/search/web only — never `execute_bash`/`fs_write` from a third-party pack).
- **Plant a team** → writes each member template + a shared-context steering file +
  a crew/topology doc, and returns the `kirocrew workspace create` / `agent create`
  **bind commands** to wire the crew (the CLI binds members; the plugin writes
  templates — see D1 in the spec).
- **Post / update** → publishes a GAF listing to the farm with a seller key.

Design decisions (D2 steering files, D3 deny-by-default tools, D4 routines not
auto-scheduled) are documented in the spec and covered by tests.

## Tools

`farm_search`, `farm_get_stall`, `farm_get_pack`, `farm_plant`, `farm_reinstall`,
`farm_post`, `farm_update` — declared in [`plugin.yaml`](./plugin.yaml), handlers in
[`src/tools.mjs`](./src/tools.mjs). Write auth is **env-only** (`MYBOT_FARM_API_KEY`,
an `mbf_…` seller key); the model never supplies a key as a tool argument.

## CLI (no agent loop)

```bash
export MYBOT_FARM_URL=https://mybot.farm     # or a local mock
export MYBOT_FARM_API_KEY=mbf_yourkey        # for post/update
node bin/farm-plant.mjs search patch
node bin/farm-plant.mjs get patch
node bin/farm-plant.mjs plant patch --dry-run
node bin/farm-plant.mjs plant patch
node bin/farm-plant.mjs plant pair-bench      # team → crew + bind commands
node bin/farm-plant.mjs post --kind agent --name "My Bot" --title T \
  --description D --category Experimental --price-cents 0 --pack ./bot.gaf.json
```

Env: `MYBOT_FARM_URL`, `MYBOT_FARM_API_KEY`, `KIRO_HOME` (default `~/.kiro`).

## Develop against the local mock

The plugin was built and verified against [`../../mock-farm`](../../mock-farm) so it
needs no live farm / GitHub / Stripe / Neon:

```bash
# terminal 1 — start the mock (seeds from packs/)
cd ../../mock-farm && npm start            # http://localhost:8787

# terminal 2 — point the plugin at it
export MYBOT_FARM_URL=http://localhost:8787
export MYBOT_FARM_API_KEY=mbf_mocktoken
node bin/farm-plant.mjs plant pair-bench
```

## Tests

```bash
npm test        # node --test tests/*.test.mjs
```

Covers the GAF↔KiroCrew mapping, the D2/D3/D4 decisions, export scrubbing, agent +
team plant into a temp `KIRO_HOME`, and the tool handlers against a live mock
(search / get / plant agent / plant team / post + round-trip).

## Status & next

Import (agent + team) and export/post halves are working and tested against the
mock. Remaining: bind-command execution via the KiroCrew CLI on a real install
(needs the gateway's own permissions), then port the proven surface to the live
`web/` app + add the `kirocrew` runtime badge (Track A).
