# Install mybot.farm → OpenClaw

Plant agent packs from [mybot.farm](https://mybot.farm) into OpenClaw with the `mybot-farm` plugin.

## 1. Install the plugin

From a local checkout (or a downloaded release folder):

```bash
openclaw plugins install /path/to/openclaw-mybot-farm --link --force
openclaw plugins enable mybot-farm
```

Without `--link`, OpenClaw copies the plugin into its extensions directory instead of symlinking.

## 2. Allow the plugin (if needed)

If tools do not appear, backup then edit `~/.openclaw/openclaw.json`:

```bash
cp ~/.openclaw/openclaw.json ~/.openclaw/openclaw.json.bak-mybot-farm
```

Ensure `plugins.allow` includes `mybot-farm` (when that allow-list is present).

## 3. Verify

```bash
openclaw plugins validate --root /path/to/openclaw-mybot-farm
openclaw plugins inspect mybot-farm --runtime --json
```

You should see tools: `farm_search`, `farm_get_pack`, `farm_plant`.

## 4. Plant an agent (CLI)

```bash
node /path/to/openclaw-mybot-farm/bin/farm-plant.mjs search frontend
node /path/to/openclaw-mybot-farm/bin/farm-plant.mjs plant frontend-developer
```

Workspace lands at `~/.openclaw/farm/frontend-developer` with:

- `IDENTITY.md`, `SOUL.md`, `MEMORY.md`, `FARM.md`
- `skills/*/SKILL.md`

Confirm:

```bash
openclaw agents list --json
ls ~/.openclaw/farm/frontend-developer/skills
```

## 5. Use from an agent

Ask your OpenClaw agent to call:

- `farm_search` with `{ "query": "frontend" }`
- `farm_get_pack` with `{ "slug": "frontend-developer" }`
- `farm_plant` with `{ "slug": "frontend-developer" }`

Optional plant params: `agentId`, `workspace`, `force`.

## ClawHub (later)

When published:

```bash
openclaw plugins install clawhub:@okita-io/openclaw-mybot-farm
# or: openclaw plugins search mybot-farm
```

## Notes

- Does not email, spend money, or invent pack fields.
- Existing agents (scout / finders / pitch) are never deleted.
- Override API origin with `MYBOT_FARM_URL` if you run a mirror.
