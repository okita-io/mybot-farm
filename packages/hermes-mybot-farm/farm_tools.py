"""Tool handlers — run when the LLM calls farm_* tools. Always return JSON.

Named farm_tools.py (not tools.py): Hermes already ships a top-level `tools`
package, so `from tools import …` inside a plugin binds the host, not us.
"""

from __future__ import annotations

import json
from typing import Any

from farm_api import (
    FarmError,
    get_pack,
    get_stall,
    pack_summary,
    resolve_base_url,
    search_stalls,
    stall_summary,
)
from hermes_bin import HermesCliError
from plant import PlantError, plant, reinstall
from tombstones import clear_tombstones, hermes_home, list_tombstones


def _ok(payload: dict[str, Any]) -> str:
    return json.dumps(payload, indent=2)


def _err(message: str, **extra: Any) -> str:
    body = {"ok": False, "error": message}
    body.update(extra)
    return json.dumps(body, indent=2)


def _base(kwargs: dict[str, Any]) -> str:
    cfg = kwargs.get("plugin_config") if isinstance(kwargs.get("plugin_config"), dict) else {}
    return resolve_base_url(cfg)


def farm_search(args: dict, **kwargs) -> str:
    query = str(args.get("query") or "").strip()
    if not query:
        return _err("query required")
    limit = args.get("limit")
    limit_n = int(limit) if isinstance(limit, (int, float)) and limit else None
    try:
        data = search_stalls(_base(kwargs), query, limit_n)
    except FarmError as exc:
        return _err(str(exc))
    stalls = [stall_summary(s) for s in data["stalls"] if isinstance(s, dict)]
    lines = [
        f'mybot.farm search "{query}" — {len(stalls)} of {data["count"]} stall(s)',
        "",
        *[
            f"{i}. {s['name']} (`{s['slug']}`) [{s['kind']}]\n   {s['title']}\n   {s['pageUrl']}"
            for i, s in enumerate(stalls, 1)
        ],
    ]
    return _ok(
        {
            "ok": True,
            "text": "\n".join(lines),
            "query": query,
            "count": data["count"],
            "stalls": stalls,
        }
    )


def farm_get_pack(args: dict, **kwargs) -> str:
    slug = str(args.get("slug") or "").strip()
    if not slug:
        return _err("slug required")
    try:
        pack = get_pack(_base(kwargs), slug)
    except FarmError as exc:
        return _err(str(exc))
    summary = pack_summary(pack)
    lines = [
        f"Pack: {(summary.get('profile') or {}).get('name') or summary.get('slug')} (`{summary.get('slug')}`)",
        f"Format: {summary.get('format')} {summary.get('version')}",
        f"Runtime: {', '.join(summary.get('runtime') or []) or '(none)'}",
        f"Skills ({summary.get('skillCount')}): {', '.join(summary.get('skillNames') or []) or '(none)'}",
        f"Members ({summary.get('memberCount')}): "
        + (
            ", ".join(
                f"{m.get('role')} ({m.get('pack')})"
                for m in (summary.get("members") or [])
            )
            or "(none)"
        ),
        f"Homepage: {summary.get('homepage') or '(none)'}",
    ]
    if summary.get("gettingStarted"):
        lines.extend(["", "gettingStarted:", summary["gettingStarted"]])
    return _ok({"ok": True, "text": "\n".join(lines), "summary": summary, "pack": pack})


def farm_get_stall(args: dict, **kwargs) -> str:
    slug = str(args.get("slug") or "").strip()
    if not slug:
        return _err("slug required")
    try:
        stall = get_stall(_base(kwargs), slug)
    except FarmError as exc:
        return _err(str(exc))
    summary = stall_summary(stall)
    members = summary.get("members") or []
    member_lines = [
        f"  - {m.get('name')}: {m.get('href')}"
        for m in members
        if isinstance(m, dict)
    ] or ["  (none)"]
    lines = [
        f"Stall: {summary['name']} (`{summary['slug']}`) [{summary['kind']}]",
        f"Title: {summary['title']}",
        f"Page: {summary['pageUrl']}",
        f"Pack URL: {summary['packUrl']}",
        f"Download: {summary['downloadHref']}",
        "Members:",
        *member_lines,
    ]
    return _ok({"ok": True, "text": "\n".join(lines), "stall": stall, "summary": summary})


def _plant_args(args: dict) -> dict[str, Any]:
    return {
        "name": str(args["name"]).strip() if isinstance(args.get("name"), str) else None,
        "force": bool(args.get("force")),
        "clean": bool(args.get("clean")),
        "dry_run": bool(args.get("dry_run")),
    }


def farm_plant(args: dict, **kwargs) -> str:
    slug = str(args.get("slug") or "").strip()
    if not slug:
        return _err("slug required")
    cfg = kwargs.get("plugin_config") if isinstance(kwargs.get("plugin_config"), dict) else {}
    try:
        result = plant(slug, plugin_config=cfg, **_plant_args(args))
    except (PlantError, FarmError, HermesCliError) as exc:
        return _err(str(exc), slug=slug)
    payload = result.as_dict()
    payload["text"] = _plant_text(result)
    return _ok(payload)


def farm_reinstall(args: dict, **kwargs) -> str:
    slug = str(args.get("slug") or "").strip()
    if not slug:
        return _err("slug required")
    cfg = kwargs.get("plugin_config") if isinstance(kwargs.get("plugin_config"), dict) else {}
    try:
        result = reinstall(slug, plugin_config=cfg, **_plant_args(args))
    except (PlantError, FarmError, HermesCliError) as exc:
        return _err(str(exc), slug=slug)
    payload = result.as_dict()
    payload["text"] = _plant_text(result)
    return _ok(payload)


def _plant_text(result) -> str:
    lines = [
        f"{'Dry-run planted' if result.dry_run else ('Planted' if result.ok else 'Plant incomplete')}: `{result.slug}` ({result.kind})",
        f"Profiles: {', '.join(result.profiles) or '(none)'}",
    ]
    if result.missing_profiles:
        lines.append(f"Missing from hermes profile list: {', '.join(result.missing_profiles)}")
    if result.tombstones_cleared:
        lines.append(f"Cleared tombstones: {', '.join(result.tombstones_cleared)}")
    if result.team_dir:
        lines.append(f"Team dir: {result.team_dir}")
    if result.team_files:
        lines.append(f"Team files: {', '.join(result.team_files)}")
    if result.kanban:
        lines.append(f"Kanban board: {result.kanban}")
    if result.endpoint_note:
        lines.append(result.endpoint_note)
    for note in result.notes:
        lines.append(f"- {note}")
    if result.error:
        lines.append(result.error)
    return "\n".join(lines)


# CLI helpers used by bin/farm-plant (not registered as LLM tools).
def clear_named_tombstones(names: list[str] | None = None) -> dict[str, Any]:
    home = hermes_home()
    found = list_tombstones(names, home)
    cleared = clear_tombstones(found, home)
    return {"ok": True, "found": found, "cleared": cleared, "dir": str(home / "profiles" / ".deleted")}
