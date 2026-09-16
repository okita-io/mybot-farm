# OpenClaw plant plugin

Plant mybot.farm agents into [OpenClaw](https://docs.openclaw.ai) with the native `mybot-farm` plugin (`@okita-io/openclaw-mybot-farm`).

Proven on OpenClaw **2026.9.4**. It calls live `https://mybot.farm/api/stalls` and `/api/packs/{slug}`, then writes a copy under `~/.openclaw/farm/<slug>`.

## In short

- Plugin id: `mybot-farm`
- Tools: `farm_search`, `farm_get_pack`, `farm_plant`
- Workspace files: `IDENTITY.md`, `SOUL.md`, `MEMORY.md`, `FARM.md`, `skills/*/SKILL.md`
- Does not email, spend money, invent pack fields, or delete existing agents
- Restart the OpenClaw gateway after install so agent sessions see the tools
- ClawHub is **live**: `openclaw plugins install clawhub:@okita-io/openclaw-mybot-farm`

Install page: [https://mybot.farm/install/openclaw](https://mybot.farm/install/openclaw)

## Install from ClawHub (recommended)

Package `@okita-io/openclaw-mybot-farm` is published on ClawHub (status published as of 2026-09-15):

```bash
openclaw plugins install clawhub:@okita-io/openclaw-mybot-farm
openclaw plugins enable mybot-farm
openclaw gateway restart
```

Optional discover: `openclaw plugins search mybot-farm`.

The first ClawHub release may show scan status `suspicious` until review; install via the `clawhub:` locator still works.

## Install from this repo

From a mybot-farm checkout (link so edits in `packages/openclaw-mybot-farm` load without recopying):

```bash
openclaw plugins install ./packages/openclaw-mybot-farm --link --force
openclaw plugins enable mybot-farm
```

Without `--link`, OpenClaw copies the plugin into its extensions directory.

Validate / inspect:

```bash
openclaw plugins validate --root ./packages/openclaw-mybot-farm
openclaw plugins inspect mybot-farm --runtime --json
```

You should see tools: `farm_search`, `farm_get_pack`, `farm_plant`.

## Install from the public tarball

The packed release is an `openclaw plugins pack` artifact served at:

`https://mybot.farm/downloads/openclaw-mybot-farm-0.1.0.tgz`

OpenClaw accepts a local archive path, or `npm-pack:` when you want the managed npm-project install path used by registry packs ([plugin install docs](https://docs.openclaw.ai/cli/plugins/install)):

```bash
curl -LO https://mybot.farm/downloads/openclaw-mybot-farm-0.1.0.tgz

# packed archive (works for .tgz produced by `openclaw plugins pack`)
openclaw plugins install ./openclaw-mybot-farm-0.1.0.tgz --force

# same file, npm-pack locator
openclaw plugins install npm-pack:./openclaw-mybot-farm-0.1.0.tgz --force

openclaw plugins enable mybot-farm
```

Noninteractive installs of an untrusted local archive need `--force` after you review the file.

## Allow the plugin (if needed)

If tools do not appear, backup then edit `~/.openclaw/openclaw.json`:

```bash
cp ~/.openclaw/openclaw.json ~/.openclaw/openclaw.json.bak-mybot-farm
```

Ensure `plugins.allow` includes `mybot-farm` when that allow-list is present.

Optional config:

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

Override API origin with `MYBOT_FARM_URL` if you run a mirror.

## Restart the gateway

Install records the plugin. A running gateway (and already-open agent sessions) may not see the new tools until you restart:

```bash
openclaw gateway restart
```

If a local gateway was down during install, the next start picks it up. After an activation failure: `openclaw plugins reload mybot-farm`.

## Plant from CLI

No agent loop required:

```bash
node packages/openclaw-mybot-farm/bin/farm-plant.mjs search frontend
node packages/openclaw-mybot-farm/bin/farm-plant.mjs get frontend-developer
node packages/openclaw-mybot-farm/bin/farm-plant.mjs plant frontend-developer
```

Workspace lands at `~/.openclaw/farm/frontend-developer`. Confirm:

```bash
openclaw agents list --json
ls ~/.openclaw/farm/frontend-developer/skills
```

Env overrides: `MYBOT_FARM_URL`, `MYBOT_FARM_WORKSPACE_ROOT`.

## Agent tools

Ask your OpenClaw agent to call:

- `farm_search` with `{ "query": "frontend" }`
- `farm_get_pack` with `{ "slug": "frontend-developer" }`
- `farm_plant` with `{ "slug": "frontend-developer" }`

Optional plant params: `agentId`, `workspace`, `force`. Existing agents are never overwritten unless `force` is true.

## Notes

- Source lives in this repo at [`packages/openclaw-mybot-farm`](../packages/openclaw-mybot-farm).
- Full package copy: [`packages/openclaw-mybot-farm/INSTALL.md`](../packages/openclaw-mybot-farm/INSTALL.md).
- Existing agents (scout / finders / pitch) are never deleted.
- Pack content keeps upstream attribution from each GAF manifest.
