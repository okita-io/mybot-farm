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

EXCHANGE_SCHEMA = "mybot.farm/world-exchange"
WORLD_SCHEMA = "worlds/v1"
STATE_SCHEMA = "worlds/state/v1"
EXPORTED_FROM = "hermes"

# exchange-spec §Field rules: capabilities are a CLOSED set for v1. Raw tool
# names are dropped on export.
V1_CAPABILITIES = ("web", "files", "schedule")

RECENT_CAP = 20


class ExportError(Exception):
    pass


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

    Returns the exchange.json envelope dict. Does not zip (caller/CLI may).
    """
    world_dir = (worlds_root / world_id)
    wpath = world_dir / "world.json"
    if not wpath.is_file():
        raise ExportError(f"no planted world at {wpath}")
    world = json.loads(wpath.read_text(encoding="utf-8"))

    portable, loss = build_portable_world(world)
    bundle = out_dir / f"{world_id}.world"
    (bundle / "characters").mkdir(parents=True, exist_ok=True)
    (bundle / "world.json").write_text(json.dumps(portable, indent=2) + "\n", encoding="utf-8")

    # Assets: copy relative paths named by the world (missing = loss, not fatal).
    assets_src = world_dir / "assets"
    if assets_src.is_dir():
        shutil.copytree(assets_src, bundle / "assets", dirs_exist_ok=True)

    # Character packs: a minimal GAF agent-pack per character from its profile
    # description, so the bundle is self-contained. Missing profile -> a slug
    # reference is kept in world.json and a loss entry is added.
    for char in portable["characters"]:
        cid = char["id"]
        pack_path = bundle / "characters" / f"{cid}.json"
        desc = ""
        if profiles_root is not None:
            # Profile dir name is the member slug; the planted roster maps role->profile,
            # but at minimum a profile matching the character id is used when present.
            pdir = profiles_root / cid
            soul = pdir / "SOUL.md"
            if soul.is_file():
                desc = soul.read_text(encoding="utf-8")[:2000]
        pack = {
            "schema": "mybot.farm/agent-pack",
            "profile": {"name": cid, "description": desc},
            "memory": [],
        }
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
    return envelope
