"""Tool handlers — run when the LLM calls farm_* tools. Always return JSON.

Named farm_tools.py (not tools.py): Hermes already ships a top-level `tools`
package, so `from tools import …` inside a plugin binds the host, not us.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from farm_api import (
    FarmError,
    build_listing_payload,
    create_listing,
    get_pack,
    get_stall,
    listing_page_url,
    listing_payload_summary,
    pack_summary,
    resolve_api_key,
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


def _plugin_config(kwargs: dict[str, Any]) -> dict[str, Any]:
    return kwargs.get("plugin_config") if isinstance(kwargs.get("plugin_config"), dict) else {}


def _truthy(value: Any) -> bool:
    if isinstance(value, str):
        return value.strip().lower() in {"1", "true", "yes", "on"}
    return bool(value)


def _load_pack(args: dict) -> Any:
    pack = args.get("pack")
    path = args.get("packPath") or args.get("pack_path")
    has_pack = pack is not None and pack != ""
    has_path = isinstance(path, str) and path.strip()
    if has_pack and has_path:
        raise FarmError("provide pack or packPath, not both")
    if has_path:
        file_path = Path(str(path)).expanduser()
        if not file_path.is_file():
            raise FarmError(f"pack file not found: {file_path}")
        try:
            raw = file_path.read_text(encoding="utf-8")
            return json.loads(raw)
        except json.JSONDecodeError as exc:
            raise FarmError(f"pack file is not JSON: {exc}") from exc
        except OSError as exc:
            raise FarmError(f"cannot read pack file: {exc}") from exc
    if has_pack:
        return pack
    raise FarmError("pack (GAF JSON object) or packPath (path to a .json GAF file) required")


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


def farm_post(args: dict, **kwargs) -> str:
    cfg = _plugin_config(kwargs)
    dry_run = _truthy(args.get("dryRun") if "dryRun" in args else args.get("dry_run"))
    override = args.get("apiKey") if args.get("apiKey") is not None else args.get("api_key")
    override_s = override.strip() if isinstance(override, str) else None
    api_key = resolve_api_key(cfg, override_s)
    try:
        pack = _load_pack(args)
        payload = build_listing_payload(
            kind=args.get("kind"),
            name=args.get("name"),
            title=args.get("title"),
            description=args.get("description"),
            category=args.get("category"),
            price_cents=args.get("priceCents") if "priceCents" in args else args.get("price_cents"),
            pack=pack,
        )
    except FarmError as exc:
        return _err(str(exc))

    summary = listing_payload_summary(payload)
    base = resolve_base_url(cfg)
    if dry_run:
        key_note = "configured (redacted)" if api_key else "missing (POST would fail)"
        lines = [
            "Dry-run: listing payload is valid (not posted)",
            f"kind: {payload['kind']}",
            f"name: {payload['name']}",
            f"title: {payload['title']}",
            f"category: {payload['category']}",
            f"priceCents: {payload['priceCents']}",
            f"pack format: {(summary.get('pack') or {}).get('format') or '(none)'}",
            f"pack skills: {(summary.get('pack') or {}).get('skillCount')}",
            f"pack encoded chars: {(summary.get('pack') or {}).get('encodedChars')}",
            f"POST {base}/api/listings",
            f"apiKey: {key_note}",
        ]
        return _ok(
            {
                "ok": True,
                "dryRun": True,
                "text": "\n".join(lines),
                "payload": summary,
                "endpoint": f"{base}/api/listings",
                "apiKey": key_note,
            }
        )

    if not api_key:
        return _err(
            "seller API key required (set MYBOT_FARM_API_KEY, plugin config apiKey, "
            "or pass apiKey). Create a key at https://mybot.farm/sell — see docs/api-keys.md"
        )
    try:
        result = create_listing(base, payload, api_key)
    except FarmError as exc:
        extra: dict[str, Any] = {}
        if exc.status is not None:
            extra["status"] = exc.status
        return _err(str(exc), **extra)

    slug = str(result.get("slug") or "").strip()
    kind = str(result.get("kind") or payload["kind"])
    page_path = str(result.get("pagePath") or "")
    page_url = listing_page_url(base, page_path) if page_path else f"{base}/{kind}s/{slug}"
    lines = [
        f"Posted {kind} `{slug}`",
        page_url,
    ]
    if result.get("hasReadme"):
        lines.append("README extracted from pack.")
    return _ok(
        {
            "ok": True,
            "text": "\n".join(lines),
            "slug": slug,
            "kind": kind,
            "pagePath": page_path,
            "pageUrl": page_url,
            "hasReadme": bool(result.get("hasReadme")),
        }
    )


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
