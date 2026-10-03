"""hermes-worlds — dashboard gateway (backend routes).

Serves the GAF **worlds/v1** data contract to the dashboard scene pane.
The browser cannot read $HERMES_HOME directly, so this module is the only
filesystem boundary. See ../README.md ("Data contract" + "API sketch") and
the authoritative mybot-farm specs (docs/worlds/exchange-spec.md,
docs/worlds/portability-spec.md, docs/worlds/hermes/data-contract.md).

Reads (Layer 2 on disk, written by farm_plant):
    $HERMES_HOME/worlds/<id>/world.json   (worlds/v1)
    $HERMES_HOME/worlds/<id>/state.json   (worlds/state/v1, optional)
    $HERMES_HOME/worlds/<id>/roster.json  (worlds/roster/v1, optional; the user's cast)
    $HERMES_HOME/worlds/<id>/assets/...   (bundle images, optional)
    $HERMES_HOME/profiles/<name>/         (cast -> profile join)

This plugin is read-only: it never mutates state.json, world.json, or profiles.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Response

WORLD_SCHEMA = "worlds/v1"
STATE_SCHEMA = "worlds/state/v1"

router = APIRouter()

# ---------------------------------------------------------------------------
# Locations
# ---------------------------------------------------------------------------

def _hermes_home() -> Path:
    env = os.environ.get("HERMES_HOME")
    if env:
        return Path(env).expanduser()
    return Path.home() / ".hermes"


def _worlds_root() -> Path:
    return _hermes_home() / "worlds"


def _profiles_root() -> Path:
    return _hermes_home() / "profiles"


# ---------------------------------------------------------------------------
# Confinement / safety
# ---------------------------------------------------------------------------

def _safe_world_id(raw: str) -> str:
    """A world id is a bare directory slug. Reject traversal + weirdness."""
    if not raw or len(raw) > 128:
        raise HTTPException(status_code=400, detail="invalid world id")
    if raw in (".", "..") or "/" in raw or "\\" in raw or "\x00" in raw:
        raise HTTPException(status_code=400, detail="invalid world id")
    if raw.startswith("."):
        # Allow hidden? No — worlds are plain slugs. Fail closed.
        raise HTTPException(status_code=400, detail="invalid world id")
    return raw


def _world_dir(world_id: str) -> Path:
    root = _worlds_root().resolve()
    target = (root / world_id).resolve()
    if root != target and not target.is_relative_to(root):
        raise HTTPException(status_code=404, detail="world not found")
    if not target.is_dir():
        raise HTTPException(status_code=404, detail="world not found")
    return target


def _confine_asset(world_dir: Path, rel_path: str) -> Path:
    """Resolve an asset path relative to the world dir, confined to it."""
    if not rel_path or "\x00" in rel_path or rel_path.startswith("/"):
        raise HTTPException(status_code=400, detail="invalid asset path")
    base = world_dir.resolve()
    target = (base / rel_path).resolve()
    if not target.is_relative_to(base):
        raise HTTPException(status_code=400, detail="asset path escapes world dir")
    if not target.is_file():
        raise HTTPException(status_code=404, detail="asset not found")
    return target


def _asset_url(world_id: str, rel_path: str) -> Optional[str]:
    if not rel_path:
        return None
    return f"/api/plugins/hermes-worlds/worlds/{world_id}/asset/{rel_path}"


# ---------------------------------------------------------------------------
# Loading + normalization
# ---------------------------------------------------------------------------

def _load_json(path: Path) -> Any:
    with open(path, "r", encoding="utf-8") as fh:
        return json.load(fh)


def _profile_names() -> Dict[str, str]:
    """Return {lowercased dir name: actual dir name} under profiles/."""
    root = _profiles_root()
    out: Dict[str, str] = {}
    if not root.is_dir():
        return out
    for entry in root.iterdir():
        if entry.is_dir():
            out[entry.name.lower()] = entry.name
    return out


def _hermes_bots_titles() -> Dict[str, str]:
    """Return {lowercased bot title: profile dir name}.

    Reads $HERMES_HOME/profiles/<dir>/profile.yaml (read-only) and indexes
    ``ui_meta.hermes-bots.title``. PyYAML is preferred when importable
    (Hermes installs include it); when the import fails, this returns {} and
    the caller falls back to directory-name matching only. No new package
    dependencies are added.
    """
    try:
        import yaml  # type: ignore
    except ImportError:
        return {}
    root = _profiles_root()
    out: Dict[str, str] = {}
    if not root.is_dir():
        return out
    for entry in root.iterdir():
        if not entry.is_dir():
            continue
        pfile = entry / "profile.yaml"
        if not pfile.is_file():
            continue
        try:
            with open(pfile, "r", encoding="utf-8") as fh:
                data = yaml.safe_load(fh)
        except Exception:
            continue
        if not isinstance(data, dict):
            continue
        ui_meta = data.get("ui_meta")
        bots = ui_meta.get("hermes-bots") if isinstance(ui_meta, dict) else None
        title = bots.get("title") if isinstance(bots, dict) else None
        if isinstance(title, str) and title.strip():
            out[title.strip().lower()] = entry.name
    return out


def _normalize_cast(world: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Accept GAF cast[] or exchange characters[]. Normalize to a common shape.

    Normalized row: {id, name, role, home?, avatar?, memoryScope?,
    capabilities?, relationships?}
    id = cast.role || characters.id
    """
    raw: List[Dict[str, Any]] = []
    if isinstance(world.get("cast"), list):
        raw = world["cast"]
    elif isinstance(world.get("characters"), list):
        raw = world["characters"]
    else:
        raw = []

    rows: List[Dict[str, Any]] = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        role = item.get("role") or item.get("id") or ""
        char_id = item.get("id") or role
        row: Dict[str, Any] = {
            "id": role or char_id,
            "name": item.get("name") or char_id,
            "role": role,
        }
        for opt in ("home", "avatar", "memoryScope", "capabilities", "relationships"):
            row[opt] = item.get(opt)
        rows.append(row)
    return rows


def _default_state(world: Dict[str, Any], cast: List[Dict[str, Any]],
                   world_id: str) -> Dict[str, Any]:
    entrypoint = world.get("entrypoint") or {}
    entry_place = entrypoint.get("place")
    places = world.get("places") or []
    place_ids = [p.get("id") for p in places if isinstance(p, dict)]
    if entry_place not in place_ids and place_ids:
        entry_place = place_ids[0]

    # where: role -> place id. Prefer cast.home; else first place that lists
    # the role in `present`.
    where: Dict[str, str] = {}
    for c in cast:
        role = c["role"]
        if c.get("home") and c["home"] in place_ids:
            where[role] = c["home"]
        else:
            for p in places:
                if isinstance(p, dict) and role in (p.get("present") or []):
                    where[role] = p.get("id")
                    break
    return {
        "place": entry_place or (place_ids[0] if place_ids else None),
        "where": where,
        "recent": [],
    }


def _load_state(world_dir: Path, world_id: str,
                fallback: Dict[str, Any]) -> Dict[str, Any]:
    spath = world_dir / "state.json"
    if spath.is_file():
        try:
            data = _load_json(spath)
        except (OSError, json.JSONDecodeError) as exc:
            raise HTTPException(status_code=409,
                                detail=f"state.json unreadable: {exc}")
        if isinstance(data, dict) and data.get("schema") == STATE_SCHEMA:
            where = data.get("where")
            if not isinstance(where, dict):
                where = {}
            recent = data.get("recent")
            if not isinstance(recent, list):
                recent = []
            return {
                "place": data.get("place") or fallback.get("place"),
                "where": where,
                "recent": recent,
            }
    return fallback


def _build_view(world_id: str, world: Dict[str, Any]) -> Dict[str, Any]:
    if world.get("schema") != WORLD_SCHEMA:
        raise HTTPException(
            status_code=409,
            detail=f"world.schema must be \"{WORLD_SCHEMA}\"",
        )
    title = world.get("title")
    if not isinstance(title, str) or not title.strip():
        raise HTTPException(status_code=409, detail="world.title is required")

    places_raw = world.get("places") or []
    places: List[Dict[str, Any]] = []
    for p in places_raw:
        if not isinstance(p, dict):
            continue
        art = p.get("art")
        places.append({
            "id": p.get("id"),
            "name": p.get("name") or p.get("id"),
            "artUrl": _asset_url(world_id, art) if art else None,
            "connects": p.get("connects") or [],
            "present": p.get("present") or [],
        })

    cast = _normalize_cast(world)
    prof_names = _profile_names()
    bots_titles = _hermes_bots_titles()
    entrypoint = world.get("entrypoint") or {}
    greeter = entrypoint.get("greeter")

    def _resolve_profile(name: str, role: str) -> Optional[str]:
        # Join order (README): 1) profile dir == cast.name (case-insensitive),
        # 2) hermes-bots title == cast.role, 3) hermes-bots title == cast.name.
        # No match → None (never attach an unrelated profile).
        if name:
            match = prof_names.get(name.lower())
            if match:
                return match
        for key in (role, name):
            if key:
                match = bots_titles.get(key.lower())
                if match:
                    return match
        return None

    cast_view: List[Dict[str, Any]] = []
    for c in cast:
        cast_view.append({
            "id": c["id"],
            "name": c["name"],
            "home": c.get("home"),
            "avatarUrl": _asset_url(world_id, c["avatar"]) if c.get("avatar") else None,
            "profileName": _resolve_profile(c["name"], c["role"]),
            "isGreeter": bool(c.get("role") and c["role"] == greeter),
            "memoryScope": c.get("memoryScope"),
            "capabilities": c.get("capabilities") or [],
            "relationships": c.get("relationships") or {},
        })

    default_state = _default_state(world, cast, world_id)

    theme = world.get("theme") or {}
    backdrop = theme.get("backdrop")
    rules = world.get("rules") or {}
    render = world.get("render") or {}

    view = {
        "id": world.get("id") or world_id,
        "title": title,
        "entrypoint": {
            "place": entrypoint.get("place"),
            "greeter": greeter,
        },
        "theme": {
            "palette": theme.get("palette"),
            "backdropUrl": _asset_url(world_id, backdrop) if backdrop else None,
            "mood": theme.get("mood"),
        },
        "places": places,
        "cast": cast_view,
        "state": default_state,
        "rules": {
            "turnModel": rules.get("turnModel"),
            "handoff": rules.get("handoff"),
            "maxPresent": rules.get("maxPresent"),
        },
        "widgetHints": render.get("widgetHints"),
    }
    return view


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("/worlds")
async def list_worlds() -> Dict[str, Any]:
    root = _worlds_root()
    worlds: List[Dict[str, Any]] = []
    if root.is_dir():
        for child in sorted(root.iterdir()):
            if not child.is_dir() or child.name.startswith("."):
                continue
            wpath = child / "world.json"
            if not wpath.is_file():
                continue
            try:
                world = _load_json(wpath)
            except (OSError, json.JSONDecodeError):
                continue
            if not isinstance(world, dict) or world.get("schema") != WORLD_SCHEMA:
                continue
            entry = world.get("entrypoint") or {}
            worlds.append({
                "id": child.name,
                "title": world.get("title") or child.name,
                "entrypoint": {
                    "place": entry.get("place"),
                    "greeter": entry.get("greeter"),
                },
            })
    return {"worlds": worlds}


@router.get("/worlds/{world_id}")
async def read_world(world_id: str) -> Dict[str, Any]:
    _safe_world_id(world_id)
    world_dir = _world_dir(world_id)
    wpath = world_dir / "world.json"
    if not wpath.is_file():
        raise HTTPException(status_code=404, detail="world.json not found")
    try:
        world = _load_json(wpath)
    except (OSError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=409, detail=f"world.json unreadable: {exc}")
    if not isinstance(world, dict):
        raise HTTPException(status_code=409, detail="world.json must be an object")

    view = _build_view(world_id, world)

    # Load/derive state, then overwrite the placeholder.
    view["state"] = _load_state(world_dir, world_id, view["state"])
    _apply_roster(view, world_dir)
    return view


ROSTER_SCHEMA = "worlds/roster/v1"


def _apply_roster(view: Dict[str, Any], world_dir: Path) -> None:
    """When roster.json exists, it is the cast. The pack sample is not shown."""
    path = world_dir / "roster.json"
    if not path.is_file():
        return
    try:
        data = _load_json(path)
    except (OSError, json.JSONDecodeError):
        return
    if not isinstance(data, dict) or data.get("schema") != ROSTER_SCHEMA:
        return
    members = data.get("members")
    if not isinstance(members, list):
        return
    place_ids = {p.get("id") for p in view.get("places") or [] if isinstance(p, dict)}
    cast_view: List[Dict[str, Any]] = []
    where: Dict[str, str] = {}
    seen: set = set()
    for item in members:
        if not isinstance(item, dict):
            continue
        profile = item.get("profile")
        place = item.get("place")
        if not isinstance(profile, str) or not profile.strip():
            continue
        profile = profile.strip()
        if profile in seen or not isinstance(place, str) or place not in place_ids:
            continue
        seen.add(profile)
        cast_view.append({
            "id": profile,
            "name": profile,
            "home": place,
            "avatarUrl": None,
            "profileName": profile,
            "isGreeter": False,
            "memoryScope": None,
            "capabilities": [],
            "relationships": {},
        })
        where[profile] = place
    view["cast"] = cast_view
    state = view.get("state") if isinstance(view.get("state"), dict) else {}
    state["where"] = where
    view["state"] = state
    view["rosterOwned"] = True


@router.get("/worlds/{world_id}/asset/{rel_path:path}")
async def serve_asset(world_id: str, rel_path: str) -> Response:
    _safe_world_id(world_id)
    world_dir = _world_dir(world_id)
    target = _confine_asset(world_dir, rel_path)
    data = target.read_bytes()
    suffix = target.suffix.lower()
    media = {
        ".webp": "image/webp",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".gif": "image/gif",
        ".svg": "image/svg+xml",
        ".avif": "image/avif",
    }.get(suffix, "application/octet-stream")
    return Response(content=data, media_type=media)
