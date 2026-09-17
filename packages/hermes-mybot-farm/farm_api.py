"""Live mybot.farm API helpers (stdlib only)."""

from __future__ import annotations

import json
import os
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urljoin
from urllib.request import Request, urlopen

DEFAULT_BASE = "https://mybot.farm"
USER_AGENT = "hermes-mybot-farm/0.2.0"
TIMEOUT_S = 60

# Exact category *labels* from web/src/lib/site.ts `categories[].label`.
CATEGORY_LABELS = frozenset(
    {
        "Lifestyle",
        "Productivity",
        "Coding",
        "Writing",
        "Marketing",
        "Sales",
        "Research",
        "Personal finance",
        "Creative",
        "Music",
        "Education",
        "Ops / admin",
        "Experimental",
    }
)
LISTING_KINDS = frozenset({"agent", "team"})
AGENT_PACK_FORMAT = "mybot.farm/agent-pack"
TEAM_PACK_FORMAT = "mybot.farm/team-pack"
MIN_TEAM_MEMBERS = 2
MIN_PAID_PRICE_CENTS = 200
MAX_PRICE_CENTS = 999_900
MAX_PACK_CHARS = 500_000
PRICE_HINT = "Choose Free, or a price between $2.00 and $9,999.00."


class FarmError(Exception):
    """HTTP or pack-shape error from mybot.farm."""

    def __init__(self, message: str, status: int | None = None) -> None:
        super().__init__(message)
        self.status = status


def resolve_base_url(plugin_config: dict[str, Any] | None = None) -> str:
    env = (os.environ.get("MYBOT_FARM_URL") or "").strip()
    cfg = plugin_config or {}
    cfg_url = str(cfg.get("baseUrl") or cfg.get("base_url") or "").strip()
    base = env or cfg_url or DEFAULT_BASE
    return base.rstrip("/")


def resolve_api_key(
    plugin_config: dict[str, Any] | None = None,
    override: str | None = None,
) -> str:
    """Seller key: per-call override, else env MYBOT_FARM_API_KEY, else config apiKey.

    Never log the returned value.
    """
    if isinstance(override, str) and override.strip():
        return override.strip()
    env = (os.environ.get("MYBOT_FARM_API_KEY") or "").strip()
    if env:
        return env
    cfg = plugin_config or {}
    return str(cfg.get("apiKey") or cfg.get("api_key") or "").strip()


def _short_error_body(raw: str) -> str:
    text = (raw or "").strip()
    if not text:
        return ""
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        return text[:200]
    if not isinstance(data, dict):
        return text[:200]
    parts: list[str] = []
    for key in ("error", "message"):
        value = data.get(key)
        if isinstance(value, str) and value.strip():
            parts.append(value.strip())
    return ": ".join(parts)[:200] if parts else text[:200]


def _request(
    url: str,
    *,
    accept: str = "application/json",
    data: bytes | None = None,
    headers: dict[str, str] | None = None,
    method: str | None = None,
) -> bytes:
    req_headers = {
        "Accept": accept,
        "User-Agent": USER_AGENT,
    }
    if headers:
        req_headers.update(headers)
    req = Request(url, data=data, headers=req_headers, method=method)
    try:
        with urlopen(req, timeout=TIMEOUT_S) as resp:
            return resp.read()
    except HTTPError as exc:
        body = ""
        try:
            body = exc.read().decode("utf-8", errors="replace")[:240]
        except Exception:
            body = ""
        short = _short_error_body(body)
        raise FarmError(
            f"mybot.farm {exc.code} for {url}{(': ' + short) if short else ''}",
            status=exc.code,
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


def _runtime_list(*sources: Any) -> list[str]:
    values: list[str] = []
    for source in sources:
        if isinstance(source, list):
            values.extend(str(item) for item in source)
    return values


def resolve_agent_archive_href(stall: dict[str, Any], pack: dict[str, Any]) -> str:
    """Prefer stall.hermesHref, then a .tar.gz downloadHref, then /packs/{kind}/{slug}.hermes.tar.gz."""
    for key in ("hermesHref", "hermesUrl"):
        value = stall.get(key)
        if is_hermes_archive(str(value or "")):
            return str(value)
    download_href = str(stall.get("downloadHref") or stall.get("packUrl") or "")
    if is_hermes_archive(download_href):
        return download_href
    nested = stall.get("pack") if isinstance(stall.get("pack"), dict) else {}
    runtimes = _runtime_list(pack.get("runtime"), nested.get("runtime"))
    if "hermes" not in {item.lower() for item in runtimes}:
        return ""
    slug = str(pack.get("slug") or stall.get("slug") or "")
    if not slug:
        return ""
    kind = stall.get("kind") or (
        "team" if str(pack.get("format") or "").endswith("team-pack") else "agent"
    )
    folder = "teams" if kind == "team" else "agents"
    return f"/packs/{folder}/{slug}.hermes.tar.gz"


def stall_summary(stall: dict[str, Any]) -> dict[str, Any]:
    slug = stall.get("slug") or ""
    nested_pack = stall.get("pack") if isinstance(stall.get("pack"), dict) else {}
    pack_version = stall.get("packVersion")
    if pack_version is None:
        pack_version = nested_pack.get("packVersion")
    return {
        "slug": slug,
        "stallId": stall.get("stallId") or stall.get("listingId") or "",
        "packVersion": pack_version,
        "kind": stall.get("kind") or "",
        "name": stall.get("name") or slug,
        "title": stall.get("title") or "",
        "pageUrl": stall.get("pageUrl") or f"{DEFAULT_BASE}/agents/{slug}",
        "packUrl": stall.get("packUrl") or "",
        "downloadHref": stall.get("downloadHref") or "",
        "hermesHref": stall.get("hermesHref") or "",
        "hermesUrl": stall.get("hermesUrl") or "",
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
        "packVersion": pack.get("packVersion"),
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


def parse_price_cents(value: Any) -> int | None:
    """Match web/src/lib/listings.ts parsePriceCents (plus string ints for CLI)."""
    if isinstance(value, bool):
        return None
    if isinstance(value, str):
        text = value.strip()
        if not text:
            return None
        try:
            value = float(text) if "." in text else int(text)
        except ValueError:
            return None
    if not isinstance(value, (int, float)):
        return None
    if isinstance(value, float) and (value != value or value in {float("inf"), float("-inf")}):
        return None
    cents = int(round(value))
    if cents == 0:
        return 0
    if cents < MIN_PAID_PRICE_CENTS or cents > MAX_PRICE_CENTS:
        return None
    return cents


def parse_listing_kind(value: Any) -> str | None:
    if isinstance(value, str) and value.strip() in LISTING_KINDS:
        return value.strip()
    return None


def parse_pack_object(value: Any) -> dict[str, Any]:
    if isinstance(value, str):
        try:
            value = json.loads(value)
        except json.JSONDecodeError as exc:
            raise FarmError("Pack JSON must be an object.") from exc
    if not isinstance(value, dict) or isinstance(value, list):
        raise FarmError("Pack JSON must be an object.")
    encoded = json.dumps(value, ensure_ascii=False, separators=(",", ":"))
    if len(encoded) > MAX_PACK_CHARS:
        raise FarmError("Pack JSON is too large (max 500 KB).")
    return value


def _member_pack_error(index: int, pack: Any) -> str | None:
    if isinstance(pack, str):
        return (
            None
            if pack.strip()
            else (
                f"members[{index}].pack must be a catalog path, slug, tarball URL, "
                "or nested agent-pack object"
            )
        )
    if not isinstance(pack, dict) or isinstance(pack, list):
        return (
            f"members[{index}].pack must be a catalog path, slug, tarball URL, "
            "or nested agent-pack object"
        )
    if pack.get("format") == TEAM_PACK_FORMAT:
        return f"members[{index}].pack nested object cannot be a team-pack"
    return None


def validate_listing_pack(kind: str, pack: dict[str, Any]) -> None:
    """Match web/src/lib/gaf-pack.ts validateListingPack for farm_post dry-run."""
    fmt = pack.get("format").strip() if isinstance(pack.get("format"), str) else ""
    if kind == "team":
        if fmt != TEAM_PACK_FORMAT:
            raise FarmError(f'kind "team" requires pack.format "{TEAM_PACK_FORMAT}"')
        members = pack.get("members")
        if not isinstance(members, list) or len(members) < MIN_TEAM_MEMBERS:
            raise FarmError(
                f'kind "team" requires members[] with at least {MIN_TEAM_MEMBERS} agents'
            )
        for i, member in enumerate(members):
            if not isinstance(member, dict) or isinstance(member, list):
                raise FarmError(
                    f"members[{i}] must be an object with role, summary, and pack"
                )
            role = member.get("role").strip() if isinstance(member.get("role"), str) else ""
            summary = (
                member.get("summary").strip()
                if isinstance(member.get("summary"), str)
                else ""
            )
            if not role:
                raise FarmError(f"members[{i}].role is required")
            if not summary:
                raise FarmError(f"members[{i}].summary is required")
            pack_error = _member_pack_error(i, member.get("pack"))
            if pack_error:
                raise FarmError(pack_error)
        shared = pack.get("shared")
        if shared is not None:
            if not isinstance(shared, dict) or isinstance(shared, list):
                raise FarmError("shared must be an object.")
            getting = shared.get("gettingStarted")
            if getting is not None and not isinstance(getting, str):
                raise FarmError(
                    "shared.gettingStarted must be a string (Hermes install steps)."
                )
        return
    if fmt == TEAM_PACK_FORMAT:
        raise FarmError(f'kind "agent" cannot use pack.format "{TEAM_PACK_FORMAT}"')
    members = pack.get("members")
    if isinstance(members, list) and members:
        raise FarmError('kind "agent" listings cannot include members[] — use kind "team"')


def build_listing_payload(
    *,
    kind: Any,
    name: Any,
    title: Any,
    description: Any,
    category: Any,
    price_cents: Any,
    pack: Any,
    slug: Any = None,
    pack_version: Any = None,
) -> dict[str, Any]:
    parsed_kind = parse_listing_kind(kind)
    if not parsed_kind:
        raise FarmError('kind must be "agent" or "team"')

    parsed_name = name.strip() if isinstance(name, str) else ""
    parsed_title = title.strip() if isinstance(title, str) else ""
    parsed_description = description.strip() if isinstance(description, str) else ""
    if not parsed_name or not parsed_title or not parsed_description:
        raise FarmError("name, title, and description are required")

    parsed_category = category.strip() if isinstance(category, str) else ""
    if parsed_category not in CATEGORY_LABELS:
        labels = ", ".join(sorted(CATEGORY_LABELS))
        raise FarmError(f"category must be an exact farm label ({labels})")

    parsed_price = parse_price_cents(price_cents)
    if parsed_price is None:
        raise FarmError(PRICE_HINT)

    parsed_pack = parse_pack_object(pack)
    validate_listing_pack(parsed_kind, parsed_pack)
    payload: dict[str, Any] = {
        "kind": parsed_kind,
        "name": parsed_name,
        "title": parsed_title,
        "description": parsed_description,
        "category": parsed_category,
        "priceCents": parsed_price,
        "pack": parsed_pack,
    }
    if isinstance(slug, str) and slug.strip():
        payload["slug"] = slug.strip().lower()
    if pack_version is not None and pack_version != "":
        payload["packVersion"] = pack_version
    return payload


def listing_payload_summary(payload: dict[str, Any]) -> dict[str, Any]:
    pack = payload.get("pack") if isinstance(payload.get("pack"), dict) else {}
    skills = pack.get("skills") if isinstance(pack.get("skills"), list) else []
    members = pack.get("members") if isinstance(pack.get("members"), list) else []
    encoded = json.dumps(pack, ensure_ascii=False, separators=(",", ":"))
    roles = [
        str(m.get("role")).strip()
        for m in members
        if isinstance(m, dict) and isinstance(m.get("role"), str) and str(m.get("role")).strip()
    ]
    return {
        "kind": payload.get("kind"),
        "name": payload.get("name"),
        "title": payload.get("title"),
        "category": payload.get("category"),
        "priceCents": payload.get("priceCents"),
        "slug": payload.get("slug"),
        "packVersion": payload.get("packVersion"),
        "pack": {
            "format": pack.get("format"),
            "version": pack.get("version"),
            "packVersion": pack.get("packVersion"),
            "runtime": pack.get("runtime") or [],
            "skillCount": len(skills),
            "memberCount": len(members),
            "memberRoles": roles,
            "encodedChars": len(encoded),
        },
    }


def listing_page_url(base_url: str, page_path: str) -> str:
    path = page_path if page_path.startswith("/") else f"/{page_path}"
    return f"{base_url.rstrip('/')}{path}"


def create_listing(
    base_url: str,
    payload: dict[str, Any],
    api_key: str,
) -> dict[str, Any]:
    key = (api_key or "").strip()
    if not key:
        raise FarmError(
            "seller API key required (env MYBOT_FARM_API_KEY or plugin config apiKey)"
        )
    url = f"{base_url.rstrip('/')}/api/listings"
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    raw = _request(
        url,
        data=body,
        method="POST",
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {key}",
        },
    )
    try:
        data = json.loads(raw.decode("utf-8"))
    except json.JSONDecodeError as exc:
        raise FarmError(f"non-JSON from {url}: {exc}") from exc
    if not isinstance(data, dict):
        raise FarmError(f"empty listing response from {url}")
    return data
