# @okita-io/agent-sprites

Deterministic, no-AI pixel sprite sheets for mybot.farm cast members.

The generator ports the seeded [pixel-sprite-generator](https://github.com/zfedoran/pixel-sprite-generator)
algorithm (MIT; [seiyria/mixel](https://github.com/seiyria/mixel) TypeScript rewrite, also MIT).
PNGs are encoded with [`pngjs`](https://github.com/lukeapage/pngjs) — no `node-canvas` or other
native dependency. The same `{ role, color, shape }` always produces the same bytes.

See [NOTICE.md](./NOTICE.md) for upstream copyright.

## Inputs

| Field | Source | Effect |
|-------|--------|--------|
| `role` | `world.cast[].role` / `members[].role` | RNG seed |
| `color` | `profile.avatar.color` | Palette (hue + tint). Named tokens from `convert.py` `COLOR_MAP` / Grok marks, or `#rrggbb` |
| `shape` | `profile.avatar.shape` | Silhouette mask family (`circle`, `hex`, `diamond`, `triangle`, `gem`, `shield`, `teardrop`, `leaf`, `capsule`, …) |

`avatar_for()` in `scripts/import-agency-agents/convert.py` writes
`{ kind: "geometric", shape, color }`. This package maps those two tokens; it
does not re-hash the slug.

## Outputs

Written next to each other (default directory `./assets`):

```
assets/<role>.sheet.png
assets/<role>.sheet.json
```

The PNG is a grid of **32×32** frames: one row per state, four columns.

The JSON manifest is the swap-in contract for later AI-made sheets
(same idea as [aldegad/sprite-gen](https://github.com/aldegad/sprite-gen) `manifest.json`:
named states, row index, frame count, fps, loop):

```json
{
  "frameW": 32,
  "frameH": 32,
  "sheet": "harbor-engineer.sheet.png",
  "states": {
    "idle": { "row": 0, "frames": 4, "fps": 4, "loop": true },
    "working": { "row": 1, "frames": 4, "fps": 8, "loop": true },
    "thinking": { "row": 2, "frames": 4, "fps": 3, "loop": true },
    "done": { "row": 3, "frames": 4, "fps": 6, "loop": false },
    "error": { "row": 4, "frames": 4, "fps": 4, "loop": true },
    "sleeping": { "row": 5, "frames": 4, "fps": 2, "loop": true }
  }
}
```

Frame 0 of `idle` (top-left cell) is the still. Keep `cast[].avatar` pointing at
that still (or a copy of it) so runtimes that do not read `cast[].sprite` still
draw a face.

## States and Hermes pulse

Rows are animated procedurally from the base sprite (bob, bounce, sway, hop,
"!" , "Zzz"). They map onto Hermes-Worlds' four session-pulse states:

| Pulse (sessions API) | Condition | Sprite state |
|----------------------|-----------|--------------|
| `working` | Active session or touched &lt; 5 min | `working` |
| `fresh` | 5–30 min | `thinking` |
| `idle` | 30 min – 3 h | `idle` |
| `asleep` | &gt; 3 h or no recent session | `sleeping` |

`done` and `error` are task-outcome overlays, not pulse states.

Live-status wiring is **not** part of this package. See
`packages/hermes-worlds/README.md` for how a future consumer would sample the
sheet.

## CLI

```bash
cd packages/agent-sprites
npm install
npm run build

node bin/agent-sprites.mjs generate --role harbor-engineer --color cyan --shape capsule --out assets
# assets/harbor-engineer.sheet.png
# assets/harbor-engineer.sheet.json
```

`--role` can also be the first positional: `generate harbor-engineer --color cyan`.

## Library

```ts
import { generateSpriteSheet, writeSpriteSheet, PULSE_TO_SPRITE } from "@okita-io/agent-sprites";

const { png, manifest, avatarPng } = generateSpriteSheet({
  role: "harbor-engineer",
  color: "cyan",
  shape: "capsule",
});

await writeSpriteSheet(
  { role: "harbor-engineer", color: "cyan", shape: "capsule" },
  "assets",
);
```

## Develop

```bash
npm test
npm run lint
npm run build
```

Tests cover determinism (identical PNG bytes) and the manifest shape.
