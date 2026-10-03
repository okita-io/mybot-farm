# Wiring the mybot.farm world surface into a KiroCrew runtime

Two ways to let a KiroCrew runtime download & install a world (or agent/team)
from mybot.farm. Both are **verified against the live `https://mybot.farm`** and
both honor the deny-by-default safety contract
([`world-install-contract.md`](./world-install-contract.md) §4).

The runtime is `~/.kiro` (`~/.kiro/crew/config.json` is the gateway config).
Requires Node >= 20 (tested on v22).

---

## Option 1 - zero-dependency CLI (default, no gateway edit)

Nothing is registered; you (or an agent with shell access) run the CLI. This is
the install page's recommended path and needs no new permission.

```bash
export MYBOT_FARM_URL=https://mybot.farm
# export MYBOT_FARM_API_KEY=mbf_...        # only to post/update

cd packages/kirocrew-mybot-farm
node bin/farm-plant.mjs search --kind world          # discover worlds
node bin/farm-plant.mjs plant neon-harbor --dry-run  # preview the plan
node bin/farm-plant.mjs plant neon-harbor            # install into ~/.kiro
```

A world install writes, under `~/.kiro`:
- `agents/<member>.json` per cast member (deny-by-default tools);
- `steering/farm/<member>/*.md` skills, `steering/farm/<slug>/_shared.md`,
  `steering/farm/<slug>/_crew.md`;
- `steering/farm/<slug>/world.json` (raw worlds/v1 block) +
  `steering/farm/<slug>/_world.md` (readable scene doc);
and prints the `kirocrew workspace create` / `agent create` **bind commands** to
wire the crew (not auto-run - you review first).

## Option 2 - register as an MCP server (opt-in, edits config.json)

Exposes the `farm_*` tools to the runtime so an agent can call
`farm_search` / `farm_get_pack` / `farm_plant` as MCP tools. A thin stdio MCP
server ships at `bin/farm-mcp.mjs` (no external deps; JSON-RPC over stdio -
`initialize`, `tools/list`, `tools/call`).

**This edits your live `~/.kiro/crew/config.json`, so apply it yourself.** Add a
`mcpServers` block (merge with the existing `mcp` config; do not replace it):

```jsonc
{
  "mcpServers": {
    "mybot-farm": {
      "command": "node",
      "args": [
        "/absolute/path/to/mybot-farm/packages/kirocrew-mybot-farm/bin/farm-mcp.mjs"
      ],
      "env": {
        "MYBOT_FARM_URL": "https://mybot.farm"
        // "MYBOT_FARM_API_KEY": "mbf_..."   // only if you want farm_post/farm_update
      }
    }
  }
}
```

Replace the `args` path with the absolute path to `bin/farm-mcp.mjs` in your
checkout. Then restart the gateway so it picks up the new server. Verify the handshake
without the gateway at any time:

```bash
printf '%s\n' \
 '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05"}}' \
 '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' \
 '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"farm_search","arguments":{"kind":"world"}}}' \
 | MYBOT_FARM_URL=https://mybot.farm node bin/farm-mcp.mjs
```

Expected: `serverInfo.name = "mybot-farm"`, seven `farm_*` tools listed, and
`farm_search` returning the `neon-harbor` world.

### Why not auto-wire it?

Registering an MCP server changes what tools the runtime trusts and runs; that
is a user decision, not something the plugin should do to a live gateway behind
your back. Writes still require `MYBOT_FARM_API_KEY` in the server's env - the
model never passes a key as a tool argument - and planted characters keep the
deny-by-default allow-list regardless of which option you choose.
