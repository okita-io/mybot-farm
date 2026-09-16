"""Plant / reinstall mybot.farm Hermes packs.

Agent packs: download a scrubbed .hermes.tar.gz and `hermes profile import`.
Team packs: import each member, recreate ~/.hermes/teams/<slug>, fetch TEAM.md /
WORK.md / cron scripts, create a kanban board when gettingStarted says so.

GAP 2: always clear matching ~/.hermes/profiles/.deleted/<name> tombstones
before import. Never delete live profiles unless force=True. Never wipe a
team dir or board unless clean=True.
"""

from __future__ import annotations

import re
import shutil
import stat
from dataclasses import dataclass, field
from datetime import date
from pathlib import Path
from typing import Any

from farm_api import (
    FarmError,
    absolute_url,
    farm_fetch_bytes,
    get_pack,
    get_stall,
    is_hermes_archive,
    pack_summary,
    resolve_agent_archive_href,
    resolve_base_url,
)
from hermes_bin import (
    HermesCliError,
    create_board,
    delete_board,
    delete_profile,
    import_profile,
    list_boards,
    list_profiles,
)
from tombstones import clear_tombstones, hermes_home, list_tombstones

ENDPOINT_PLACEHOLDER = "https://SET_YOUR_ENDPOINT/v1"
KANBAN_RE = re.compile(
    r"hermes\s+kanban\s+boards\s+create\s+([A-Za-z0-9._-]+)(?:\s+--name\s+[\"']([^\"']+)[\"'])?",
    re.I,
)
MKDIR_RE = re.compile(r"mkdir\s+-p\s+(\S+)")
PACK_DIR_RE = re.compile(r"https?://[^\s]+/packs/teams/([A-Za-z0-9._-]+)/?", re.I)
TEAM_FILE_RE = re.compile(r"\b((?:TEAM|WORK|README)\.md|[\w.-]+\.sh)\b")
BRACE_RE = re.compile(r"\{([^{}]+)\}")


@dataclass
class MemberPlan:
    name: str
    href: str
    role: str = ""
    summary: str = ""


@dataclass
class KanbanPlan:
    slug: str
    name: str | None = None


@dataclass
class PlantPlan:
    slug: str
    kind: str  # "agent" | "team"
    profile_name: str | None
    members: list[MemberPlan]
    team_dirs: list[str]
    team_files: list[str]
    pack_dir_url: str | None
    kanban: KanbanPlan | None
    getting_started: str
    endpoint_note: str
    homepage: str
    stall_id: str = ""
    pack_version: int | str = 1
    reason: str = ""


@dataclass
class PlantResult:
    ok: bool
    slug: str
    kind: str
    profiles: list[str] = field(default_factory=list)
    missing_profiles: list[str] = field(default_factory=list)
    tombstones_cleared: list[str] = field(default_factory=list)
    team_dir: str | None = None
    team_files: list[str] = field(default_factory=list)
    kanban: str | None = None
    endpoint_note: str = ""
    notes: list[str] = field(default_factory=list)
    dry_run: bool = False
    error: str | None = None

    def as_dict(self) -> dict[str, Any]:
        return {
            "ok": self.ok,
            "slug": self.slug,
            "kind": self.kind,
            "profiles": self.profiles,
            "missing_profiles": self.missing_profiles,
            "tombstones_cleared": self.tombstones_cleared,
            "team_dir": self.team_dir,
            "team_files": self.team_files,
            "kanban": self.kanban,
            "endpoint_note": self.endpoint_note,
            "notes": self.notes,
            "dry_run": self.dry_run,
            "error": self.error,
        }


class PlantError(Exception):
    """Plant aborted before or during Hermes import."""


def expand_home(path: str, home: Path | None = None) -> str:
    hermes = str(home or hermes_home())
    user_home = str(Path.home())
    out = path.replace("${HOME}", user_home).replace("$HOME", user_home)
    if out.startswith("~/"):
        out = str(Path.home() / out[2:])
    elif out == "~":
        out = user_home
    out = out.replace("~/.hermes", hermes)
    return out


def expand_braces(path: str) -> list[str]:
    match = BRACE_RE.search(path)
    if not match:
        return [path]
    prefix, suffix = path[: match.start()], path[match.end() :]
    return [prefix + part.strip() + suffix for part in match.group(1).split(",")]


def pack_dir_stem(path: str) -> str:
    filename = path.split("/")[-1].split("?")[0]
    for suffix in (".hermes.tar.gz", ".tar.gz", ".json"):
        if filename.lower().endswith(suffix):
            return filename[: -len(suffix)]
    return filename


def _getting_started(pack: dict[str, Any]) -> str:
    shared = pack.get("shared") if isinstance(pack.get("shared"), dict) else {}
    text = shared.get("gettingStarted")
    if isinstance(text, str):
        return text
    gs = pack.get("gettingStarted")
    if isinstance(gs, str):
        return gs
    return ""


def parse_kanban(getting_started: str, fallback_slug: str) -> KanbanPlan | None:
    match = KANBAN_RE.search(getting_started or "")
    if match:
        return KanbanPlan(slug=match.group(1), name=match.group(2))
    if re.search(r"\bkanban\b", getting_started or "", re.I):
        return KanbanPlan(slug=fallback_slug, name=None)
    return None


def parse_team_dirs(getting_started: str, slug: str) -> list[str]:
    dirs: list[str] = []
    for match in MKDIR_RE.finditer(getting_started or ""):
        raw = match.group(1).rstrip(".,;:")
        for expanded in expand_braces(raw):
            dirs.append(expanded)
    if dirs:
        return dirs
    return [
        f"~/.hermes/teams/{slug}/reports",
        f"~/.hermes/teams/{slug}/repos",
        f"~/.hermes/teams/{slug}/state",
    ]


def parse_pack_dir_url(getting_started: str, base_url: str, slug: str) -> str:
    match = PACK_DIR_RE.search(getting_started or "")
    if match:
        return match.group(0).rstrip("/") + "/"
    return f"{base_url}/packs/teams/{slug}/"


def parse_team_files(getting_started: str, slug: str) -> list[str]:
    names = ["TEAM.md", "WORK.md"]
    for match in TEAM_FILE_RE.finditer(getting_started or ""):
        name = match.group(1)
        if "*" in name:
            continue
        if name not in names:
            names.append(name)
    if f"{slug}_cron" in (getting_started or ""):
        for extra in (
            f"{slug}_cron.sh",
            f"{slug}_cron_standup.sh",
            f"{slug}_cron_qa-sweep.sh",
            f"{slug}_cron_harvest.sh",
        ):
            if extra not in names:
                names.append(extra)
    return names


def _member_plans_from_stall(stall: dict[str, Any], base_url: str) -> list[MemberPlan]:
    members = stall.get("members") if isinstance(stall.get("members"), list) else []
    plans: list[MemberPlan] = []
    for member in members:
        if not isinstance(member, dict):
            continue
        href = member.get("href") or ""
        if not is_hermes_archive(href):
            continue
        name = pack_dir_stem(href)
        plans.append(
            MemberPlan(
                name=name,
                href=absolute_url(base_url, href),
                role=str(member.get("name") or member.get("role") or name),
                summary="",
            )
        )
    return plans


def _member_plans_from_pack(pack: dict[str, Any], base_url: str) -> list[MemberPlan]:
    members = pack.get("members") if isinstance(pack.get("members"), list) else []
    plans: list[MemberPlan] = []
    for member in members:
        if not isinstance(member, dict):
            continue
        rel = member.get("pack") or ""
        if not is_hermes_archive(rel):
            continue
        href = rel if rel.startswith("http") else f"{base_url}/packs/{rel.lstrip('/')}"
        name = str(member.get("slug") or pack_dir_stem(rel))
        plans.append(
            MemberPlan(
                name=name,
                href=href,
                role=str(member.get("role") or name),
                summary=str(member.get("summary") or ""),
            )
        )
    return plans


def build_plant_plan(
    stall: dict[str, Any],
    pack: dict[str, Any],
    base_url: str,
    *,
    name_override: str | None = None,
) -> PlantPlan:
    slug = str(pack.get("slug") or stall.get("slug") or "")
    stall_id = str(stall.get("stallId") or stall.get("listingId") or "")
    pack_version = stall.get("packVersion")
    if pack_version is None:
        pack_version = pack.get("packVersion")
    if pack_version is None:
        pack_version = 1
    getting = _getting_started(pack)
    stall_members = _member_plans_from_stall(stall, base_url)
    pack_members = _member_plans_from_pack(pack, base_url)
    members = stall_members or pack_members
    download_href = str(stall.get("downloadHref") or stall.get("packUrl") or "")
    archive_href = resolve_agent_archive_href(stall, pack) or download_href
    is_team = (
        stall.get("kind") == "team"
        or str(pack.get("format") or "").endswith("team-pack")
        or bool(members)
    )

    if is_team and members:
        return PlantPlan(
            slug=slug,
            kind="team",
            profile_name=None,
            members=members,
            team_dirs=parse_team_dirs(getting, slug),
            team_files=parse_team_files(getting, slug),
            pack_dir_url=parse_pack_dir_url(getting, base_url, slug),
            kanban=parse_kanban(getting, slug),
            getting_started=getting,
            endpoint_note=(
                "After import, in each ~/.hermes/profiles/<member>/config.yaml replace "
                f"{ENDPOINT_PLACEHOLDER} with your LLM endpoint. auth.json and .env never ship."
            ),
            homepage=str((pack.get("manifest") or {}).get("homepage") or stall.get("pageUrl") or ""),
            stall_id=stall_id,
            pack_version=pack_version,
        )

    if is_hermes_archive(archive_href):
        profile_name = name_override or pack_dir_stem(archive_href) or slug
        href = absolute_url(base_url, archive_href)
        return PlantPlan(
            slug=slug,
            kind="agent",
            profile_name=profile_name,
            members=[MemberPlan(name=profile_name, href=href, role=profile_name)],
            team_dirs=[],
            team_files=[],
            pack_dir_url=None,
            kanban=None,
            getting_started=getting,
            endpoint_note=(
                f"After import, in ~/.hermes/profiles/{profile_name}/config.yaml replace "
                f"{ENDPOINT_PLACEHOLDER} with your LLM endpoint. auth.json and .env never ship."
            ),
            homepage=str((pack.get("manifest") or {}).get("homepage") or stall.get("pageUrl") or ""),
            stall_id=stall_id,
            pack_version=pack_version,
        )

    runtimes = pack.get("runtime") if isinstance(pack.get("runtime"), list) else []
    runtime_note = ", ".join(str(r) for r in runtimes) or "unknown"
    raise PlantError(
        f"Pack '{slug}' is not a Hermes profile archive (runtime: {runtime_note}). "
        "Hermes plant needs a .hermes.tar.gz (e.g. scholastic-research) or a team with "
        "member tarballs (e.g. workbench). For GAF JSON use the OpenClaw plugin or Grok Bot."
    )


def target_profile_names(plan: PlantPlan) -> list[str]:
    return [m.name for m in plan.members]


def _write_farm_md(path: Path, plan: PlantPlan, planted_at: str) -> None:
    lines = [
        "# FARM.md",
        "",
        f"Planted from [mybot.farm](https://mybot.farm) on {planted_at}.",
        "",
        f"- **Slug:** {plan.slug}",
        f"- **Stall id:** {plan.stall_id or '(none)'}",
        f"- **Pack version:** {plan.pack_version}",
        f"- **Kind:** {plan.kind}",
        f"- **Homepage:** {plan.homepage or ('https://mybot.farm/teams/' if plan.kind == 'team' else 'https://mybot.farm/agents/') + plan.slug}",
        f"- **Profiles:** {', '.join(target_profile_names(plan))}",
        "",
        "Replace SET_YOUR_ENDPOINT in each imported profile's config.yaml.",
        "Do not send emails or spend money. Do not invent pack fields.",
        "",
    ]
    path.write_text("\n".join(lines), encoding="utf-8")


def _download(url: str, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    data = farm_fetch_bytes(url)
    dest.write_bytes(data)


def _try_download(url: str, dest: Path) -> bool:
    try:
        _download(url, dest)
        return dest.stat().st_size > 0
    except (FarmError, OSError):
        return False


def _copy_executable(src: Path, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dest)
    mode = dest.stat().st_mode
    dest.chmod(mode | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH)


def _ensure_team_dirs(plan: PlantPlan, home: Path) -> Path:
    team_root = home / "teams" / plan.slug
    for raw in plan.team_dirs:
        Path(expand_home(raw, home)).mkdir(parents=True, exist_ok=True)
    team_root.mkdir(parents=True, exist_ok=True)
    return team_root


def _fetch_team_files(plan: PlantPlan, staging: Path, team_root: Path, home: Path) -> list[str]:
    installed: list[str] = []
    if not plan.pack_dir_url:
        return installed
    scripts_dir = home / "scripts"
    for name in plan.team_files:
        dest = staging / name
        url = plan.pack_dir_url.rstrip("/") + "/" + name
        if not _try_download(url, dest):
            continue
        if name.lower().endswith(".md"):
            shutil.copy2(dest, team_root / name)
        elif name.lower().endswith(".sh"):
            _copy_executable(dest, scripts_dir / name)
        else:
            shutil.copy2(dest, team_root / name)
        installed.append(name)
    return installed


def _wipe_team_dir(slug: str, home: Path) -> bool:
    path = home / "teams" / slug
    if path.is_dir():
        shutil.rmtree(path)
        return True
    return False


def _verify_profiles(names: list[str]) -> tuple[list[str], list[str]]:
    listed = list_profiles()
    present = [n for n in names if n in listed]
    missing = [n for n in names if n not in listed]
    return present, missing


def plant(
    slug: str,
    *,
    base_url: str | None = None,
    name: str | None = None,
    force: bool = False,
    clean: bool = False,
    dry_run: bool = False,
    plugin_config: dict[str, Any] | None = None,
    reinstall: bool = False,
) -> PlantResult:
    origin = resolve_base_url(plugin_config if base_url is None else {"baseUrl": base_url})
    stall = get_stall(origin, slug)
    pack = get_pack(origin, slug)
    plan = build_plant_plan(stall, pack, origin, name_override=name)
    names = target_profile_names(plan)
    home = hermes_home()
    notes: list[str] = []
    if reinstall:
        notes.append("reinstall path: clear GAP 2 tombstones, then plant")
    if force:
        notes.append("force=true: will delete existing profiles of these names, then import")
    if clean:
        notes.append(f"clean=true: will wipe ~/.hermes/teams/{plan.slug} and kanban board {plan.kanban.slug if plan.kanban else plan.slug}")

    existing_tombstones = list_tombstones(names, home)
    result = PlantResult(
        ok=True,
        slug=plan.slug,
        kind=plan.kind,
        profiles=names,
        tombstones_cleared=[],
        endpoint_note=plan.endpoint_note,
        notes=notes,
        dry_run=dry_run,
        kanban=plan.kanban.slug if plan.kanban else None,
    )

    if dry_run:
        result.notes.append(
            f"dry-run: would import {len(names)} profile(s): {', '.join(names)}"
        )
        if existing_tombstones:
            result.notes.append(
                f"dry-run: would clear tombstones: {', '.join(existing_tombstones)}"
            )
        result.notes.append(pack_summary(pack).get("homepage") or plan.homepage)
        return result

    existing_profiles: list[str] = []
    try:
        listed = list_profiles()
        existing_profiles = [n for n in names if n in listed]
    except HermesCliError as exc:
        raise PlantError(str(exc)) from exc

    if existing_profiles and not force:
        raise PlantError(
            f"Profile(s) already exist: {', '.join(existing_profiles)}. "
            "Pass force=true (destructive) to delete them and re-import, or farm_reinstall with force. "
            "Default is safe and will not delete live profiles."
        )

    if force and existing_profiles:
        for profile_name in existing_profiles:
            delete_profile(profile_name)
            notes.append(f"deleted profile {profile_name}")

    if clean:
        if plan.kind == "team":
            if _wipe_team_dir(plan.slug, home):
                notes.append(f"removed team dir ~/.hermes/teams/{plan.slug}")
        board_slug = plan.kanban.slug if plan.kanban else plan.slug
        try:
            delete_board(board_slug)
            notes.append(f"removed kanban board {board_slug} (if it existed)")
        except HermesCliError as exc:
            notes.append(f"board delete skipped: {exc}")

    # GAP 2: delete creates tombstones; import will look successful but stay invisible
    # unless these are cleared *after* any delete and *before* import.
    result.tombstones_cleared = clear_tombstones(names, home)
    if result.tombstones_cleared:
        notes.append(
            "cleared GAP 2 tombstones under ~/.hermes/profiles/.deleted/: "
            + ", ".join(result.tombstones_cleared)
        )

    staging = home / "farm" / plan.slug
    staging.mkdir(parents=True, exist_ok=True)

    for member in plan.members:
        archive = staging / f"{member.name}.hermes.tar.gz"
        _download(member.href, archive)
        import_profile(str(archive), member.name)

    present, missing = _verify_profiles(names)
    if missing:
        # Retry once: import sometimes writes files without clearing a racey tombstone.
        extra = clear_tombstones(missing, home)
        result.tombstones_cleared = sorted(set(result.tombstones_cleared + extra))
        for member in plan.members:
            if member.name not in missing:
                continue
            archive = staging / f"{member.name}.hermes.tar.gz"
            import_profile(str(archive), member.name)
        present, missing = _verify_profiles(names)

    result.profiles = present
    result.missing_profiles = missing
    if missing:
        result.ok = False
        result.error = (
            f"import reported success but hermes profile list is missing: {', '.join(missing)}. "
            "This is GAP 2 (name tombstone). Cleared ~/.hermes/profiles/.deleted/<name> and retried; "
            "profiles still not spawnable. Check hermes profile list and the .deleted directory."
        )
        result.notes = notes
        return result

    if plan.kind == "team":
        team_root = _ensure_team_dirs(plan, home)
        result.team_dir = str(team_root)
        result.team_files = _fetch_team_files(plan, staging, team_root, home)
        _write_farm_md(team_root / "FARM.md", plan, date.today().isoformat())
        if plan.kanban:
            boards = list_boards()
            if plan.kanban.slug in boards:
                notes.append(f"kanban board {plan.kanban.slug} already exists (left in place)")
            else:
                create_board(plan.kanban.slug, plan.kanban.name)
                notes.append(
                    f"created kanban board {plan.kanban.slug}"
                    + (f' ({plan.kanban.name})' if plan.kanban.name else "")
                )
            result.kanban = plan.kanban.slug
        notes.append("cron scripts copied to ~/.hermes/scripts when present; schedule them yourself")

    result.notes = notes
    result.ok = True
    return result


def reinstall(
    slug: str,
    *,
    force: bool = False,
    clean: bool = False,
    dry_run: bool = False,
    name: str | None = None,
    plugin_config: dict[str, Any] | None = None,
) -> PlantResult:
    return plant(
        slug,
        name=name,
        force=force,
        clean=clean,
        dry_run=dry_run,
        plugin_config=plugin_config,
        reinstall=True,
    )
