"""Live mybot.farm API helpers (stdlib only)."""

from __future__ import annotations

import json
import os
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urljoin
from urllib.request import Request, urlopen

DEFAULT_BASE = "https://mybot.farm"
USER_AGENT = "hermes-mybot-farm/0.1.0"
TIMEOUT_S = 60


class FarmError(Exception):
    """HTTP or pack-shape error from mybot.farm."""


def resolve_base_url(plugin_config: dict[str, Any] | None = None) -> str:
    env = (os.environ.get("MYBOT_FARM_URL") or "").strip()
    cfg = plugin_config or {}
    cfg_url = str(cfg.get("baseUrl") or cfg.get("base_url") or "").strip()
    base = env or cfg_url or DEFAULT_BASE
    return base.rstrip("/")


def _request(url: str, *, accept: str = "application/json") -> bytes:
    req = Request(
        url,
        headers={
            "Accept": accept,
            "User-Agent": USER_AGENT,
        },
    )
    try:
        with urlopen(req, timeout=TIMEOUT_S) as resp:
            return resp.read()
    except HTTPError as exc:
        body = ""
        try:
            body = exc.read().decode("utf-8", errors="replace")[:240]
        except Exception:
            body = ""
        raise FarmError(
            f"mybot.farm {exc.code} for {url}{(': ' + body) if body else ''}"
        ) from exc
    except URLError as exc:
        raise FarmError(f"mybot.farm unreachable for {url}: {exc.reason}") from exc


def farm_fetch_json(base_url: str, path: str) -> Any:
    url = f"{base_url}{path if path.startswith('/') else '/' + path}"
    raw = _request(url)
    try:
        return json.loads(raw.decode("utf-8"))
    except json.JSONDecodeError as exc:
        raise FarmError(f"non-JSON from {url}: {exc}") from exc


def farm_fetch_bytes(url: str) -> bytes:
    return _request(url, accept="*/*")


def search_stalls(base_url: str, query: str, limit: int | None = None) -> dict[str, Any]:
    q = quote(query, safe="")
    data = farm_fetch_json(base_url, f"/api/stalls?q={q}")
    stalls = data.get("stalls") if isinstance(data.get("stalls"), list) else []
    if isinstance(limit, int) and limit > 0:
        stalls = stalls[:limit]
    count = data.get("count") if isinstance(data.get("count"), int) else len(stalls)
    return {"stalls": stalls, "count": count, "query": data.get("query", query)}


def get_stall(base_url: str, slug: str) -> dict[str, Any]:
    clean = slug.strip().strip("/")
    if not clean:
        raise FarmError("slug required")
    data = farm_fetch_json(base_url, f"/api/stalls/{quote(clean, safe='')}")
    if not isinstance(data, dict):
        raise FarmError(f"empty stall for {clean}")
    data.setdefault("slug", clean)
    return data


def get_pack(base_url: str, slug: str) -> dict[str, Any]:
    clean = slug.strip().strip("/")
    if not clean:
        raise FarmError("slug required")
    pack = farm_fetch_json(base_url, f"/api/packs/{quote(clean, safe='')}")
    if not isinstance(pack, dict):
        raise FarmError(f"empty pack for {clean}")
    pack.setdefault("slug", clean)
    return pack


def absolute_url(base_url: str, href: str) -> str:
    if href.startswith("http://") or href.startswith("https://"):
        return href
    return urljoin(base_url + "/", href.lstrip("/"))


def is_hermes_archive(path: str | None) -> bool:
    if not path:
        return False
    lower = path.split("?", 1)[0].lower()
    return lower.endswith(".hermes.tar.gz") or lower.endswith(".tar.gz")


def stall_summary(stall: dict[str, Any]) -> dict[str, Any]:
    slug = stall.get("slug") or ""
    return {
        "slug": slug,
        "kind": stall.get("kind") or "",
        "name": stall.get("name") or slug,
        "title": stall.get("title") or "",
        "pageUrl": stall.get("pageUrl") or f"{DEFAULT_BASE}/agents/{slug}",
        "packUrl": stall.get("packUrl") or "",
        "downloadHref": stall.get("downloadHref") or "",
        "description": stall.get("description") or "",
        "category": stall.get("category") or "",
        "members": stall.get("members") or [],
        "runtime": (stall.get("pack") or {}).get("runtime")
        if isinstance(stall.get("pack"), dict)
        else [],
    }


def pack_summary(pack: dict[str, Any]) -> dict[str, Any]:
    skills = pack.get("skills") if isinstance(pack.get("skills"), list) else []
    members = pack.get("members") if isinstance(pack.get("members"), list) else []
    manifest = pack.get("manifest") if isinstance(pack.get("manifest"), dict) else {}
    shared = pack.get("shared") if isinstance(pack.get("shared"), dict) else {}
    getting = shared.get("gettingStarted")
    if not isinstance(getting, str):
        getting = ""
    return {
        "slug": pack.get("slug"),
        "format": pack.get("format"),
        "version": pack.get("version"),
        "runtime": pack.get("runtime") or [],
        "profile": pack.get("profile") or {},
        "skillNames": [s.get("name") for s in skills if isinstance(s, dict) and s.get("name")],
        "skillCount": len(skills),
        "memberCount": len(members),
        "members": [
            {
                "role": m.get("role"),
                "summary": m.get("summary"),
                "pack": m.get("pack"),
                "slug": m.get("slug"),
            }
            for m in members
            if isinstance(m, dict)
        ],
        "gettingStarted": getting,
        "attribution": manifest.get("attribution") or "",
        "sourceNote": manifest.get("sourceNote") or "",
        "license": manifest.get("license") or "",
        "homepage": manifest.get("homepage") or "",
        "scrubbed": manifest.get("scrubbed"),
    }
