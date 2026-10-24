"""Export a planted Hermes world back to a portable world-exchange bundle (todo 9).

Reads ``$HERMES_HOME/worlds/<id>/{world.json,state.json,assets/}`` plus the
member profiles and emits a ``mybot.farm/world-exchange`` bundle
(``docs/worlds/exchange-spec.md`` §2):

    <id>.world/
      exchange.json                  # envelope + loss ledger
      world.json                     # portable world (worlds/v1, characters[])
      characters/<characterId>.json  # one GAF agent-pack per character
      assets/<relative path>         # copied bytes
      state.json                     # scrubbed snapshot (recent capped at 20)

The bundle is declarative: no runtime API calls, no absolute paths, no
credentials, no raw tool ids. Capabilities are scrubbed to the closed v1 set.
This module builds the bundle; the Worlds pane only *links* to the result.
"""

from __future__ import annotations

import json
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .plant import PlantError, confined_path, safe_slug

EXCHANGE_SCHEMA = "mybot.farm/world-exchange"
WORLD_SCHEMA = "worlds/v1"
STATE_SCHEMA = "worlds/state/v1"
EXPORTED_FROM = "hermes"

# exchange-spec §Field rules: capabilities are a CLOSED set for v1. Raw tool
# names are dropped on export.
V1_CAPABILITIES = ("web", "files", "schedule")

RECENT_CAP = 20

# exchange-spec loss table: Hermes MEMORY.md keeps the newest entries up to
# ~2,200 chars and USER.md up to ~1,375; the SOUL/persona travels in FULL in
# the GAF pack (only a source that was already clipped is ledgered). We keep
# the full persona and only ledger the memory/user clips.
MEMORY_CHAR_CAP = 2200
USER_CHAR_CAP = 1375


class ExportError(Exception):
    pass


def _read_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8") if path.is_file() else ""
    except OSError:
        return ""


def _clip_newest(text: str, cap: int) -> tuple[str, bool]:
    """Keep the NEWEST entries that fit under `cap` chars. MEMORY/USER grow by
    appending, so 'newest' is the tail. Returns (kept, was_clipped)."""
    if len(text) <= cap:
        return text, False
    return text[-cap:], True


def build_character_pack(cid: str, profile_dir: Path | None) -> tuple[dict, list[dict]]:
    """Compose a GAF agent-pack capturing the character's FULL identity so it
    round-trips between runtimes (exchange-spec §2.2 + lossless subset):

      profile.name        — the character id
      profile.description — the persona an importer drops into a system prompt:
                            SOUL.md (full) + profile.yaml `description`, joined
      memory[]            — MEMORY.md (private notes) + USER.md (operator model),
                            each clipped newest-first per the loss table

    Returns (pack, loss_entries). A missing profile yields a minimal pack + a
    loss entry so the importer knows the persona was not captured.
    """
    loss: list[dict] = []
    if profile_dir is None or not profile_dir.is_dir():
        loss.append({
            "path": f"characters.{cid}.profile",
            "action": "missing",
            "detail": "no local profile dir found; persona not captured, importer must supply it",
        })
        return ({"schema": "mybot.farm/agent-pack",
                 "profile": {"name": cid, "description": ""}, "memory": []}, loss)

    # Persona = SOUL.md (identity, full) + profile.yaml description. The persona
    # travels in full; we do NOT clip it (only a source already clipped is a
    # loss, which Hermes SOUL is not).
    soul = _read_text(profile_dir / "SOUL.md").strip()
    yaml_desc = ""
    pdata = _read_text(profile_dir / "profile.yaml")
    for line in pdata.splitlines():
        m = line.strip()
        if m.startswith("description:") and not m.startswith("description_auto:"):
            yaml_desc = m[len("description:"):].strip().strip("'\"")
            break
    parts = [p for p in (soul, yaml_desc) if p]
    description = "\n\n".join(parts)

    # Memory = MEMORY.md + USER.md, each clipped newest-first and ledgered.
    memory: list[dict] = []
    mem_text = _read_text(profile_dir / "memories" / "MEMORY.md").strip()
    if mem_text:
        kept, clipped = _clip_newest(mem_text, MEMORY_CHAR_CAP)
        memory.append({"scope": "private", "source": "MEMORY.md", "text": kept})
        if clipped:
            loss.append({"path": f"characters.{cid}.memory",
                         "action": "clipped",
                         "detail": f"MEMORY.md over {MEMORY_CHAR_CAP} chars; newest kept, older omitted"})
    user_text = _read_text(profile_dir / "memories" / "USER.md").strip()
    if user_text:
        kept, clipped = _clip_newest(user_text, USER_CHAR_CAP)
        memory.append({"scope": "operator", "source": "USER.md", "text": kept})
        if clipped:
            loss.append({"path": f"characters.{cid}.user",
                         "action": "clipped",
                         "detail": f"USER.md over {USER_CHAR_CAP} chars; newest kept, older omitted"})

    if not description and not memory:
        loss.append({"path": f"characters.{cid}.profile",
                     "action": "empty",
                     "detail": "profile had no SOUL.md/description/memory to capture"})

    return ({"schema": "mybot.farm/agent-pack",
             "profile": {"name": cid, "description": description},
             "memory": memory}, loss)


def _utc_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _scrub_capabilities(caps: Any) -> list[str]:
    """Keep only the closed v1 set; drop raw tool names (exchange-spec)."""
    if not isinstance(caps, list):
        return []
    return [c for c in caps if c in V1_CAPABILITIES]


def world_to_exchange_characters(world: dict[str, Any]) -> tuple[list[dict[str, Any]], list[dict[str, str]]]:
    """Map a planted ``cast[]`` (role-keyed) to exchange ``characters[]``.

    Returns (characters, loss_entries). ``cast[].role`` becomes the character
    ``id`` AND ``role``; a ``pack`` pointer is added. Raw tool capabilities are
    scrubbed, and any dropped capability is ledgered as a loss.
    """
    raw = world.get("cast")
    if not isinstance(raw, list):
        raw = world.get("characters") if isinstance(world.get("characters"), list) else []
    characters: list[dict[str, Any]] = []
    loss: list[dict[str, str]] = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        cid = item.get("id") or item.get("role")
        if not cid:
            continue
        kept = _scrub_capabilities(item.get("capabilities"))
        dropped = [c for c in (item.get("capabilities") or []) if c not in V1_CAPABILITIES]
        if dropped:
            loss.append({
                "path": f"characters.{cid}.capabilities",
                "action": "dropped",
                "detail": f"raw/non-v1 capabilities not exported: {', '.join(map(str, dropped))}",
            })
        char: dict[str, Any] = {
            "id": cid,
            "name": item.get("name") or cid,
            "role": item.get("role") or cid,
            "pack": f"characters/{cid}.json",
        }
        for opt in ("avatar", "home", "memoryScope", "relationships"):
            if item.get(opt) is not None:
                char[opt] = item[opt]
        if item.get("sprite") is not None:  # agent-sprites: carry the sheet pointer
            char["sprite"] = item["sprite"]
        char["capabilities"] = kept
        characters.append(char)
    return characters, loss


def build_portable_world(world: dict[str, Any]) -> tuple[dict[str, Any], list[dict[str, str]]]:
    """The generic world.json every importer reads: cast[] -> characters[],
    places/rules/entrypoint/theme carried, render/thumbnail dropped."""
    if world.get("schema") != WORLD_SCHEMA:
        raise ExportError(f'world.schema must be "{WORLD_SCHEMA}"')
    characters, loss = world_to_exchange_characters(world)
    places = []
    for p in world.get("places") or []:
        if not isinstance(p, dict):
            continue
        places.append({
            "id": p.get("id"),
            "name": p.get("name") or p.get("id"),
            "art": p.get("art"),
            "connects": p.get("connects") or [],
            "present": p.get("present") or [],
        })
    rules = world.get("rules") or {}
    portable = {
        "schema": WORLD_SCHEMA,
        "id": world.get("id") or world.get("slug"),
        "title": world.get("title"),
        "theme": world.get("theme") or {},
        "places": places,
        "characters": characters,
        "rules": {
            "turnModel": rules.get("turnModel") or "defer",
            "handoff": rules.get("handoff"),
            "ambient": bool(rules.get("ambient", False)),
            "maxPresent": rules.get("maxPresent", 6),
        },
        "entrypoint": world.get("entrypoint") or {},
    }
    return portable, loss


def scrub_state(state: Any, world_id: str) -> dict[str, Any] | None:
    """A snapshot, not the world: cap recent[] at 20; drop transcripts/unknowns
    we don't own are preserved but recent is bounded. None when absent/invalid."""
    if not isinstance(state, dict) or state.get("schema") != STATE_SCHEMA:
        return None
    recent = state.get("recent")
    recent = recent[-RECENT_CAP:] if isinstance(recent, list) else []
    out = dict(state)
    out["worldId"] = world_id
    out["recent"] = recent
    return out


def export_world(world_id: str, worlds_root: Path, out_dir: Path,
                 *, profiles_root: Path | None = None) -> dict[str, Any]:
    """Write a world-exchange bundle for ``world_id`` under ``out_dir``.

    Returns the exchange.json envelope dict with ``bundlePath`` set.
    Does not zip (caller/CLI may).
    """
    try:
        slug = safe_slug(world_id, what="world id")
        worlds_root_res = worlds_root.expanduser().resolve()
        out_dir_res = out_dir.expanduser().resolve()
        world_dir = confined_path(worlds_root_res, slug)
        bundle = confined_path(out_dir_res, f"{slug}.world")
    except PlantError as exc:
        raise ExportError(str(exc)) from exc

    wpath = world_dir / "world.json"
    if not wpath.is_file():
        raise ExportError(f"no planted world at {wpath}")
    world = json.loads(wpath.read_text(encoding="utf-8"))

    portable, loss = build_portable_world(world)
    (bundle / "characters").mkdir(parents=True, exist_ok=True)
    (bundle / "world.json").write_text(json.dumps(portable, indent=2) + "\n", encoding="utf-8")

    # Assets: copy relative paths named by the world (missing = loss, not fatal).
    assets_src = world_dir / "assets"
    if assets_src.is_dir():
        shutil.copytree(assets_src, bundle / "assets", dirs_exist_ok=True)

    # Roster maps a character ROLE to the actual profile dir name (they differ:
    # role "harbor-engineer" may be profile "cydonia"). Prefer that; fall back
    # to a profile whose dir name equals the character id.
    roster_map: dict[str, str] = {}
    rpath = world_dir / "roster.json"
    if rpath.is_file():
        try:
            rdata = json.loads(rpath.read_text(encoding="utf-8"))
            for m in (rdata.get("members") or []):
                if isinstance(m, dict) and m.get("role") and m.get("profile"):
                    roster_map[str(m["role"])] = str(m["profile"])
        except (OSError, json.JSONDecodeError):
            pass

    # Character packs: a GAF agent-pack per character capturing its FULL
    # identity (SOUL + description + memory), so the bundle round-trips.
    for char in portable["characters"]:
        cid = char["id"]
        pack_path = bundle / "characters" / f"{cid}.json"
        profile_dir: Path | None = None
        if profiles_root is not None:
            # Resolve the profile dir name: roster role->profile, else the id.
            prof_name = roster_map.get(cid, cid)
            try:
                profile_slug = safe_slug(prof_name, what="profile name")
                profile_dir = confined_path(profiles_root.expanduser().resolve(), profile_slug)
            except PlantError:
                profile_dir = None
            if profile_dir is not None and not profile_dir.is_dir():
                profile_dir = None
        pack, pack_loss = build_character_pack(cid, profile_dir)
        loss.extend(pack_loss)
        pack_path.write_text(json.dumps(pack, indent=2) + "\n", encoding="utf-8")

    # Scrubbed snapshot.
    spath = world_dir / "state.json"
    if spath.is_file():
        try:
            snap = scrub_state(json.loads(spath.read_text(encoding="utf-8")), world_id)
        except json.JSONDecodeError:
            snap = None
        if snap is not None:
            (bundle / "state.json").write_text(json.dumps(snap, indent=2) + "\n", encoding="utf-8")

    envelope = {
        "schema": EXCHANGE_SCHEMA,
        "schemaVersion": 1,
        "id": world_id,
        "title": portable.get("title") or world_id,
        "exportedFrom": EXPORTED_FROM,
        "exportedAt": _utc_now(),
        "source": {"runtime": "hermes", "note": f"{len(portable['characters'])} character(s)"},
        "characters": [c["id"] for c in portable["characters"]],
        "lossy": bool(loss),
        "loss": loss,
    }
    (bundle / "exchange.json").write_text(json.dumps(envelope, indent=2) + "\n", encoding="utf-8")
    envelope["bundlePath"] = str(bundle)
    return envelope
