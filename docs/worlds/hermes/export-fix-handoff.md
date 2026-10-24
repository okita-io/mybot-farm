# Fix handoff — world export character identity (after `f2d15ce`)

Review of `feat(hermes-mybot-farm): capture full character identity on world
export` (`f2d15ce`, branch `feat/world-export-full-identity`, 1 commit ahead
of main; touches `packages/hermes-mybot-farm/export_world.py` and
`tests/test_export_world.py`). The direction is right — a planted world should
export each character with SOUL, description, and memory instead of a 2000-char
SOUL stub. But as written the feature **captures nothing on a real planted
world** and the packs it does emit violate the GAF contract every consumer in
this repo reads.

Implement the fixes below **in this repo**, under
`packages/hermes-mybot-farm/`. Do not touch `packages/hermes-worlds` or the
desktop plugin.

Branch suggestion: `fix/world-export-identity-review` (off current branch).
Commit style: conventional commits, one commit per numbered fix.

Test command (run after every fix):

```bash
cd packages/hermes-mybot-farm
~/.hermes/hermes-agent/venv/bin/python tests/test_export_world.py -v
```

(15 tests pass at `f2d15ce`; all must keep passing, plus the new ones each
fix below requires.) A live sanity probe is in the Acceptance section of Fix 3.

Out of scope (do not do here):

- The web importer (`web/src/lib/*`) — Fix 2 changes the exporter to the GAF
  shape the web already expects; the web is not being modified.
- The `world-exchange` CLI (`docs/worlds/exchange-spec.md` §4) — this module
  is the Hermes reader/exporter; the node CLI is a separate package.
- `scrub_state` / assets / `build_portable_world` — unchanged by this review.

---

## Why the contract matters (read first)

`docs/worlds/exchange-spec.md` §2.2: `characters/<id>.json` **validates with
`validateGafPack`** (`web/src/lib/gaf-pack.ts:228`) and requires
`format: "mybot.farm/agent-pack"`, `profile.name`, `profile.description`;
`memory[]` is "same shapes as GAF". GAF's memory shape
(`docs/gaf-grok-template.md:56`, golden pack `packs/agents/gift-day.json`) is
`{kind?: "profile"|"log", createdAt?, content: string}` — **`content` is
required**. Consumers that read this shape today:

- `web/src/lib/gaf-to-grok-template.ts:142` projects `content: entry.content`
- `web/src/lib/pack-files.ts:149` `countMemoryLines` reads `entry.content`
- farm ingest keys off `pack.format` (`packages/hermes-mybot-farm/farm_api.py:220,351,397`)

Fixes 1–3 are the blockers. 4–6 are required for the feature to be true to its
docstring. Nits are optional but cheap.

---

## Fix 1 — Pack envelope: `format`, not `schema`

### Problem

`export_world.py:128` (and the missing-profile pack at `:87`) stamps
`{"schema": "mybot.farm/agent-pack", ...}`. The GAF pack envelope key is
`format` (spec §2.2, golden pack `gift-day.json` top level: `format`,
`version`, `runtime`, `slug`, …). Any consumer checking
`pack.format == "mybot.farm/agent-pack"` gets `None` for every character this
export emits.

### Files

- `packages/hermes-mybot-farm/export_world.py` — the two pack dicts in
  `build_character_pack` (`:87` missing branch, `:128` full branch)

### Implement

1. Replace `"schema": "mybot.farm/agent-pack"` with `"format":
   "mybot.farm/agent-pack"` in both pack dicts. Keep the value as a module
   constant (`AGENT_PACK_FORMAT = "mybot.farm/agent-pack"`, mirroring
   `farm_api.py:36`).
2. Add `"version": "1"` after `format` (the GAF envelope carries it; see
   golden pack).
3. Leave `schema` on `world.json` / `state.json` / `exchange.json` alone —
   those are worlds-spec documents, not GAF packs.

### Acceptance

- A new test: export a world, read `characters/<id>.json`, assert
  `pack["format"] == "mybot.farm/agent-pack"` and `"schema" not in pack`.

---

## Fix 2 — `memory[]` entries: use the GAF shape

### Problem

`export_world.py:109,117` emit `{"scope": "private"|"operator", "source":
"MEMORY.md"|"USER.md", "text": ...}`. That is not the GAF memory shape:

- `content` is **missing** → `gaf-to-grok-template.ts:142` produces
  `content: undefined` in every Grok recipe; `pack-files.ts:149`
  `countMemoryLines` reports 0 lines while `memoryCount` is 2.
- `scope` collides in name with `WORLD_MEMORY_SCOPES`
  (`web/src/lib/gaf-pack.ts:63` — `private`/`shared`/`substrate`, a different
  enum about where a character's *state* lives, defined on `world.json`
  `characters[]`, and per spec §2.2 "world-only facts stay on world.json").

### Implement

1. Emit the GAF shape, one entry per file that has text:

   ```python
   memory.append({"kind": "profile", "content": kept})   # MEMORY.md
   memory.append({"kind": "log",     "content": kept})   # USER.md
   ```

   (Either kind value is valid; `profile` for private notes and `log` for the
   operator model keeps them distinct without inventing a third vocabulary.
   The source file name is already ledgered in the loss `detail` and can
   stay in the docstring.)
2. Update the `build_character_pack` docstring accordingly (the current one
   promises `scope`-keyed entries).
3. Update the two tests that read `m["scope"]`
   (`test_captures_soul_description_and_memory`,
   `test_export_resolves_profile_via_roster_role_mapping`) to the new shape —
   key on `kind` + the `content` substring instead.

### Acceptance

- Existing tests pass against the new shape.
- `countMemoryLines`-equivalent check in a test: the total of
  `len(content)` over `memory[]` equals the sum of the two source file sizes
  (when under cap).

---

## Fix 3 — Resolve each character's profile with the real join

### Problem — the feature does not fire on a real planted world

`export_world.py:268–275` builds `roster_map[role] → profile` and `:287`
resolves `roster_map.get(cid, cid)`. But the roster the Desktop actually
writes (`packages/hermes-worlds/desktop/plugin.js` `writeRoster`, members
built around `:1521`) contains **`profile` + `place` + `sprite`, no `role`
key**:

```json
{ "schema": "worlds/roster/v1",
  "members": [ { "profile": "cydonia", "place": "dock", "sprite": "…" } ] }
```

So the map is always empty, every character probes the profile dir named after
its *cast id* (e.g. role `harbor-engineer`), finds nothing, and the export
ledgers `missing` — **the persona is never captured**. Verified live against
`~/.hermes/worlds/neon-harbor` (cast roles `harbor-engineer`/`night-watch`;
roster profiles `cydonia`/`biryani-agent`/`henry-agent`; result: desc 0 chars,
no memory, two `missing` losses).

The repo's two existing readers use a different, writer-shaped join:

- Dashboard `packages/hermes-worlds/dashboard/plugin_api.py:270`
  `_resolve_profile(name, role)`: profile dir `== cast.name` case-insensitive,
  then `ui_meta.hermes-bots.title == role`, then `== name`.
- Desktop `plugin.js:284` `resolveProfileName`: dir `== cast.name`
  case-insensitive, then bot title matched against role/name/id.

And spec §4.2 documents the Hermes exporter's intended join: one character per
profile, `name` from the directory, `ui_meta.hermes-bots.title` → role.

### Implement

Replace the roster-role map with a resolver mirroring the dashboard
(`plugin_api._resolve_profile`), in this priority order:

1. **Roster:** a `roster.json` member whose `profile` (or, for forward
   compatibility, whose `role`) equals the character id.
2. **Profile dir == cast name** (case-insensitive) under `profiles_root`.
   `build_portable_world` already carries `name` on each character
   (`export_world.py:172`).
3. **Bot title:** `ui_meta.hermes-bots.title` in
   `profiles_root/<dir>/profile.yaml` equals the character role or name
   (case-insensitive) — reuse the same tolerance `plugin_api` uses (PyYAML if
   importable, else skip; no new dependency).
4. **Fallback:** profile dir `== character id` (today's behavior, keep last).

Keep `safe_slug` + `confined_path` on the resolved dir name, and the
`missing` loss entry when nothing resolves.

The existing test `test_export_resolves_profile_via_roster_role_mapping`
fabricates a roster member with a `role` key that no writer produces. Rewrite
it to a **writer-shaped** roster (no `role` key — just `profile` + `place`),
with the character's cast `name` or bot title as the join key, and add a
second test covering the bot-title join (cast name `Patch`, role
`harbor-engineer`, profile `cydonia` whose `profile.yaml` has
`ui_meta.hermes-bots.title: TheDrummer`-style equality to role or name).

### Acceptance — the real-data probe

Run this from `packages/hermes-mybot-farm/tests` (adjust `HERMES_HOME` if
your probe machine differs; on the review machine `~/.hermes` is the home and
`~/.hermes/worlds/neon-harbor` is the planted world):

```bash
cd packages/hermes-mybot-farm/tests
~/.hermes/hermes-agent/venv/bin/python - <<'PY'
import sys, json, shutil
sys.path.insert(0, ".")
import plugin_import  # noqa
from hermes_mybot_farm.export_world import export_world
from pathlib import Path
env = Path.home() / ".hermes"
out = Path("/tmp/export-probe"); shutil.rmtree(out, ignore_errors=True)
envelope = export_world("neon-harbor", env / "worlds", out,
                        profiles_root=env / "profiles")
for cid in envelope["characters"]:
    pack = json.loads((Path(envelope["bundlePath"]) / "characters" /
                       (cid + ".json")).read_text())
    desc = pack["profile"]["description"]
    print(cid, "desc_chars:", len(desc),
          "memory:", [m.get("kind") for m in pack["memory"]])
    for l in envelope["loss"]:
        print("  LOSS:", l["action"], l["path"])
PY
```

**Before the fix** this prints `desc_chars: 0`, no memory, two `missing`
losses (the bug). **After:** each cast member resolves to a real profile —
desc carries that profile's SOUL, and any `missing` loss only for genuinely
absent profiles.

---

## Fix 4 — Clip by entry boundary, never mid-entry

### Problem

`export_world.py:59–64` `_clip_newest` does `text[-cap:]`. Real Hermes memory
files are entry-joined with `"\n§\n"` (the live store's `ENTRY_DELIMITER`,
`tools/memory_tool_store.py:25` in the hermes-agent tree). A raw tail slice
severs the newest entry in half; the §5.2 importer then appends that fragment
to the destination's `MEMORY.md`, corrupting an entry. The branch is
reachable: external writers and hand-edits bypass the store's add-time budget
(the live store deliberately *warns and keeps entries, never truncates a
user's memories* — `memory_tool_store.py:214`, issue #10877).

### Implement

Split on the entry delimiter and keep the newest **complete** entries that
fit:

```python
ENTRY_DELIMITER = "\n§\n"  # mirror of tools/memory_tool_store.ENTRY_DELIMITER

def _clip_newest(text: str, cap: int) -> tuple[str, bool]:
    if len(text) <= cap:
        return text, False
    entries = [e for e in (p.strip() for p in text.split(ENTRY_DELIMITER)) if e]
    kept, body = [], ""
    for e in reversed(entries):                      # newest first
        candidate = (ENTRY_DELIMITER.join(kept + [e])
                     if kept else e)
        if len(candidate) > cap:
            continue
        kept.append(e)
    return (ENTRY_DELIMITER.join(reversed(kept)), True)
```

Edge: if a single entry exceeds `cap` on its own, keep the file **as-is** and
ledger a `clipped` entry whose `detail` says the oldest entries could not be
retained (better a complete oversized entry than a half one; matches the live
store's warn-don't-truncate posture).

### Acceptance

- New test: a `MEMORY.md` of `"\n§\n"`-joined entries that totals > 2200
  chars — assert the kept text re-joins the surviving entries whole, the tail
  entry is intact (not cut mid-word), and a `clipped` loss exists.
- The existing `test_memory_over_cap_is_clipped_newest_and_ledgered`
  (a single unbroken blob, no `§`) still passes.

---

## Fix 5 — Read the caps from the profile's config

### Problem

`export_world.py:44–45` hardcode 2200/1375. The live store's budget comes
from each profile's `config.yaml`: the `memory:` section's
`memory_char_limit` / `user_char_limit` (defaults 2200/1375 —
`hermes_cli/config_defaults.py:1319-1320` in the hermes-agent tree, read by
`tools/memory_tool.get_builtin_memory_config` → `MemoryStore`). A profile
tuned to a larger budget gets clipped to a budget it doesn't use, and the
loss ledger then records a clip the profile never experienced — and
`--strict` (spec §4: exit 3 on any `clipped`) fails an export that lost
nothing.

### Implement

1. In `build_character_pack`, read `profile_dir / "config.yaml"` (the
   vendored `yamlutil.load_yaml_dict` from `packages/hermes-mybot-farm/yamlutil.py`
   is available; it tolerates a missing file by returning `{}` — verify the
   `memory:` section shape against `config_defaults.py` and accept a
   flat `memory_char_limit:` key inside it).
2. Effective cap = configured value if present and > 0, else the constant.
   Pass the effective caps into `_clip_newest`.
3. Keep the constants as the documented defaults.

### Acceptance

- New test: a profile whose `config.yaml` has
  `memory:\n  memory_char_limit: 5000` and a 3000-char `MEMORY.md` → **no**
  `clipped` loss, text verbatim.

---

## Fix 6 — Parse `profile.yaml` `description:` without dropping folded lines

### Problem

`export_world.py:96–100` scans `profile.yaml` line-by-line for
`description:`. Confirmed against the real `mario` profile: a two-line folded
description loses its continuation line — the persona (the whole point of
this feature) silently degrades by the tail of the description.

### Implement

Read the file with **PyYAML first, `yamlutil` as the no-PyYAML fallback** —
the same pattern `plugin_api._hermes_bots_titles` uses (`plugin_api.py:127-131`):

```python
def _profile_desc(profile_dir: Path) -> str:
    pfile = profile_dir / "profile.yaml"
    if not pfile.is_file():
        return ""
    raw = pfile.read_text(encoding="utf-8")
    if yaml is not None:                     # import yaml, tolerate ImportError
        data = yaml.safe_load(raw)
    else:
        data = load_yaml_dict(pfile)         # vendored fallback (yamlutil.py:84)
    if not isinstance(data, dict):
        return ""
    return str(data.get("description") or "")
```

Note: `yamlutil.load_yaml_dict` itself prefers PyYAML when importable
(`yamlutil.py:90`) and falls back to its minimal indent parser, which does
**not** fold continuation lines — so route through an explicit
PyYAML-first read as above rather than the simple parser.

### Acceptance

- New test using the exact mario shape:

  ```yaml
  description: Nintendo Switch 2 Developer — Discovery, for the Nintendo Switch
    development environment, SDK and API
  description_auto: false
  ```

  assert the full single-line description is captured (the current code
  captures only `…for the Nintendo Switch`).

---

## Nits (optional, cheap)

- **Pack filenames** (`export_world.py:283`): `f"{cid}.json"` writes a raw
  cast id; a role like `Night Watch` yields a space-bearing filename and an
  `exchange.characters` entry an importer must re-derive. `world.json` /
  `state.json` are `safe_slug`'d — apply the same to the pack file name and
  keep the id inside the JSON.
- **Loss dedupe** (`:296`): two cast members resolving to the same profile
  dir duplicate the same loss entry; dedupe the ledger by
  `(path, action, detail)` before the envelope.
- **`TypedDict` for the pack** in `build_character_pack`: the dict shape is
  now the contract (Fixes 1–2 pin it); a `TypedDict` or a `# contract:`
  comment pointing at spec §2.2 stops the next drift.

---

## Good code (keep it)

- The loss-ledger discipline — `missing` / `clipped` / `empty` with stable
  machine paths, folded into `exchange.loss[]`; missing profile is a loss,
  not a failure, exactly as the spec's "importer must supply it" intends.
- Defense-in-depth on paths: roster-supplied profile names still pass
  `safe_slug` + `confined_path`; malformed `roster.json` is tolerated.
- The docstrings cite the spec (§2.2, loss table) and say *why* the persona
  travels unclipped. The test factory (`_profile`) and both clip-direction
  assertions are good hygiene — extend them, don't rewrite them.

## Definition of done

- All six fixes committed (one commit each) + new tests from every
  Acceptance section; `tests/test_export_world.py` green (the 15 pre-existing
  tests pass with Fix 3's rewritten roster test).
- The real-data probe (Fix 3 Acceptance) prints captured personas for
  `neon-harbor` — no `missing` losses for profiles that exist.
- `git diff main...HEAD` of `export_world.py` shows no other behavior change
  (assets, `build_portable_world`, `scrub_state` untouched).
