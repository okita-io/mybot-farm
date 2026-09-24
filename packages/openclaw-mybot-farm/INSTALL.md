# Install mybot.farm → OpenClaw

Plant agent packs from [mybot.farm](https://mybot.farm) into OpenClaw, and post GAF listings, with the `mybot-farm` plugin (v0.2.0).

## 1. Install the plugin

### ClawHub (recommended)

Package `@okita-io/openclaw-mybot-farm` is published and live on ClawHub:

```bash
openclaw plugins install clawhub:@okita-io/openclaw-mybot-farm
openclaw plugins enable mybot-farm
openclaw gateway restart
```

Optional discover: `openclaw plugins search mybot-farm`.

The first ClawHub release may show scan status `suspicious` until review; install via the `clawhub:` locator still works.

**Republish:** after this 0.2.0 `farm_post` change, run `clawhub package publish` from this package so ClawHub serves the new tool. Until then, use a checkout or the packed tarball.

### From a local checkout

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

You should see tools: `farm_search`, `farm_get_pack`, `farm_plant`, `farm_post`, `farm_update`.

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

## 5. Post a listing

Create a seller API key at [https://mybot.farm/sell](https://mybot.farm/sell). Prefer env `MYBOT_FARM_API_KEY` (plugin config `apiKey` is the fallback). Never commit the key. Details: [`docs/api-keys.md`](../../docs/api-keys.md).

```bash
export MYBOT_FARM_API_KEY=mbf_YOUR_KEY
node /path/to/openclaw-mybot-farm/bin/farm-plant.mjs post \
  --kind agent --name "Smoke Bot" --title "API key smoke listing" \
  --description "Minimal free GAF listing posted with a seller API key." \
  --category Experimental --price-cents 0 --pack ./smoke.gaf.json --dry-run
```

Drop `--dry-run` to POST. Pack input is **GAF JSON** (OpenClaw already plants GAF). Free listings (`--price-cents 0`) skip Stripe Connect. Paid (`200`–`999900`) need Connect (`403 connect_required` otherwise). `category` is an exact farm label (`Lifestyle`, `Coding`, `Experimental`, …).

## 6. Use from an agent

Ask your OpenClaw agent to call:

- `farm_search` with `{ "query": "frontend" }`
- `farm_get_pack` with `{ "slug": "frontend-developer" }`
- `farm_plant` with `{ "slug": "frontend-developer" }`
- `farm_post` with `{ "kind", "name", "title", "description", "category", "priceCents", "pack" | "packPath" }` (optional `dryRun`; auth via env or plugin config)

Optional plant params: `agentId`, `workspace`, `force`.

## Notes

- Does not email, spend money, or invent pack fields.
- Existing agents (scout / finders / pitch) are never deleted.
- Override API origin with `MYBOT_FARM_URL` if you run a mirror.
- Local plugin category stays `tools` (OpenClaw validate). ClawHub may still map taxonomy to `other` on publish.
