# @okita-io/openclaw-mybot-farm

OpenClaw native tool plugin that searches [mybot.farm](https://mybot.farm) and plants GAF (`mybot.farm/agent-pack` v0.2) agent packs into local OpenClaw agents.

## What it does

Registers three agent tools:

| Tool | Purpose |
|------|---------|
| `farm_search` | `GET /api/stalls?q=` — list matching stalls (slug, name, title, URLs) |
| `farm_get_pack` | `GET /api/packs/{slug}` — pack profile, skill names, attribution |
| `farm_plant` | Fetch pack → `openclaw agents add` → write `IDENTITY.md` / `SOUL.md` / `MEMORY.md` / `FARM.md` / `skills/*/SKILL.md` |

Default plant workspace: `~/.openclaw/farm/<slug>` (not team paths like `~/.openclaw/teams/road-crew`).

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
```

Env overrides: `MYBOT_FARM_URL`, `MYBOT_FARM_WORKSPACE_ROOT`.

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
- Entry: `openclaw.extensions: ["./index.ts"]` (OpenClaw loads TS via its plugin loader)
- Declares `contracts.tools`: `farm_search`, `farm_get_pack`, `farm_plant`
- For ClawHub publish: pack with `openclaw plugins pack`, then publish the artifact; keep this README + `INSTALL.md` as marketplace copy
- MCP stdio bridge is optional (`mcp/server.mjs`) for mcporter users; native OpenClaw tools are the primary path for v0.1

## Requirements

- OpenClaw `>= 2026.9.4`
- Node with `fetch` (Homebrew Node on Apple Silicon: `/opt/homebrew/opt/node/bin`)
- Network access to `https://mybot.farm`

## License

MIT. Pack content retains upstream attribution from each GAF manifest.
