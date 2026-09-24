# @okita-io/openclaw-mybot-farm

OpenClaw native tool plugin that searches [mybot.farm](https://mybot.farm), plants GAF (`mybot.farm/agent-pack` v0.2) agent packs into local OpenClaw agents, and posts GAF listings with a seller API key.

## What it does

Registers agent tools:

| Tool | Purpose |
|------|---------|
| `farm_search` | `GET /api/stalls?q=` — list matching stalls (slug, name, title, URLs) |
| `farm_get_pack` | `GET /api/packs/{slug}` — pack profile, skill names, attribution |
| `farm_plant` | Fetch pack → `openclaw agents add` → write `IDENTITY.md` / `SOUL.md` / `MEMORY.md` / `FARM.md` / `ROUTINES.md` (when present) / `skills/*/SKILL.md` |
| `farm_post` | `POST /api/listings` — publish or update a GAF stall (seller API key). Same slug owned by you bumps `packVersion` and records revision history. |
| `farm_update` | Same as `farm_post` with required `slug` — in-place GAF update (skills, soul/memory). Omit packVersion to auto-increment. |

Default plant workspace: `~/.openclaw/farm/<slug>` (not team paths like `~/.openclaw/teams/road-crew`).

**Plant vs post:** `farm_plant` installs GAF into OpenClaw. `farm_post` publishes **GAF JSON** to the farm. There is no tarball translator — OpenClaw already plants GAF.

## Install from ClawHub (recommended)

```bash
openclaw plugins install clawhub:@okita-io/openclaw-mybot-farm
openclaw plugins enable mybot-farm
openclaw gateway restart
```

Optional discover: `openclaw plugins search mybot-farm`.

After this 0.2.0 change, republish with `clawhub package publish` from this package (Alex) so ClawHub serves the `farm_post` tool. Until then, install from a checkout or the packed tarball.

## Install (local path)

```bash
openclaw plugins install /Users/alexokita/src/openclaw-mybot-farm --link --force
openclaw plugins enable mybot-farm
```

If your `plugins.allow` is a closed list, add `mybot-farm` (backup `~/.openclaw/openclaw.json` first).

After editing tools, refresh generated metadata:

```bash
openclaw plugins build --root /Users/alexokita/src/openclaw-mybot-farm
```

Validate / inspect:

```bash
openclaw plugins validate --root /Users/alexokita/src/openclaw-mybot-farm
openclaw plugins inspect mybot-farm --runtime --json
```

## CLI smoke tests (no agent loop)

```bash
node bin/farm-plant.mjs search frontend
node bin/farm-plant.mjs get frontend-developer
node bin/farm-plant.mjs plant frontend-developer
# overwrite existing:
node bin/farm-plant.mjs plant frontend-developer --force
node bin/farm-plant.mjs post --kind agent --name "Smoke Bot" \
  --title "API key smoke listing" --description "Minimal free GAF listing." \
  --category Experimental --price-cents 0 --pack ./smoke.gaf.json --dry-run
```

Env overrides: `MYBOT_FARM_URL`, `MYBOT_FARM_WORKSPACE_ROOT`, `MYBOT_FARM_API_KEY`.

## Post a listing (`farm_post`)

Create a seller key on [https://mybot.farm/sell](https://mybot.farm/sell). Prefer `MYBOT_FARM_API_KEY` for unattended use (never commit it). Plugin config `apiKey` is the fallback. See [`docs/api-keys.md`](../../docs/api-keys.md).

```bash
export MYBOT_FARM_API_KEY=mbf_YOUR_KEY
node bin/farm-plant.mjs post \
  --kind agent --name "Smoke Bot" --title "API key smoke listing" \
  --description "Minimal free GAF listing posted with a seller API key." \
  --category Experimental --price-cents 0 --pack ./smoke.gaf.json
```

`--json` prints machine-readable JSON. `--dry-run` validates locally and prints a payload summary (key redacted) without POSTing.

- **Free** (`--price-cents 0`): no Stripe Connect required.
- **Paid** (`200`–`999900` cents): seller account must have Connect transfers active, else `403 connect_required`.
- `category` is an exact farm **label** (`Lifestyle`, `Coding`, `Experimental`, `Personal finance`, `Ops / admin`, …) — not the slug.
- Pack is GAF JSON (object or `--pack` path). OpenClaw plants GAF; posting also expects GAF.

Ask the agent to call `farm_post` with the same fields (`pack` object or `packPath`). For a team, pass `kind: "team"` and a `mybot.farm/team-pack` with `members[]`. The seller key comes from env or plugin config — never from a tool argument.

## Config (`openclaw.json`)

```json
{
  "plugins": {
    "entries": {
      "mybot-farm": {
        "enabled": true,
        "config": {
          "baseUrl": "https://mybot.farm",
          "workspaceRoot": "~/.openclaw/farm"
        }
      }
    }
  }
}
```

Prefer env `MYBOT_FARM_API_KEY` over config `apiKey`. Never commit the key.

## Plant layout

Matches the road-crew scout plant style:

- `openclaw agents add <id> --workspace <dir> --non-interactive --json`
- Workspace files: `IDENTITY.md`, `SOUL.md`, `MEMORY.md`, `FARM.md`, `skills/<name>/SKILL.md`
- Skill frontmatter: `name` + `description`
- Attribution from `manifest.attribution` / `sourceNote` preserved in `IDENTITY.md` and `FARM.md`
- Does **not** overwrite an existing agent unless `force: true`

## ClawHub / marketplace notes

- Plugin id: `mybot-farm`
- Package name: `@okita-io/openclaw-mybot-farm`
- Version: **0.2.0**
- Entry: `openclaw.extensions: ["./index.ts"]` (OpenClaw loads TS via its plugin loader)
- Declares `contracts.tools`: `farm_search`, `farm_get_pack`, `farm_plant`, `farm_post`, `farm_update`
- Local OpenClaw category remains `tools` (do not regress the 0.1.1 category fix). ClawHub taxonomy may still map to `other` on publish.
- Published on ClawHub as `@okita-io/openclaw-mybot-farm` (status published as of 2026-09-15). **Alex:** republish 0.2.0 with `clawhub package publish` after merging; also pack/upload `openclaw-mybot-farm-0.2.0.tgz` if the download URL is used.
- MCP stdio bridge is optional (`mcp/server.mjs`) for mcporter users; native OpenClaw tools are the primary path for v0.2.0

## Requirements

- OpenClaw `>= 2026.9.4`
- Node with `fetch` (Homebrew Node on Apple Silicon: `/opt/homebrew/opt/node/bin`)
- Network access to `https://mybot.farm`

## License

MIT. Pack content retains upstream attribution from each GAF manifest.
