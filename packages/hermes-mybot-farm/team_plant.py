"""Post-import team setup: Bot markers, TEAM.md memory, team-rules skill, group chat."""

from __future__ import annotations

import json
import os
import uuid
from pathlib import Path
from typing import Any, Callable
from urllib.error import URLError
from urllib.request import Request, urlopen

from hermes_bin import HermesCliError, run_hermes
from team_md import render_team_md_for_plan
from yamlutil import atomic_yaml_write, load_yaml_dict

GatewayRpc = Callable[[str, dict[str, Any]], dict[str, Any]]

MEMORY_BEGIN = "<!-- mybot.farm team:{slug} -->"
MEMORY_END = "<!-- /mybot.farm team:{slug} -->"
WARM_BOT_DEFAULT = 3


def profile_dir(home: Path, name: str) -> Path:
    return home / "profiles" / name


def bot_title_for_member(member) -> str:
    summary = str(getattr(member, "summary", "") or "").strip()
    if "—" in summary:
        return summary.split("—", 1)[0].strip()
    if summary:
        return summary
    role = str(getattr(member, "role", "") or "").strip()
    return role or str(getattr(member, "name", "") or "Bot")


def mark_member_bot(profile_path: Path, *, title: str, team_slug: str) -> bool:
    """Merge ui_meta.hermes-bots so the profile is a Bot seated in the team group.

    Returns True when the file was written.
    """
    if not profile_path.is_dir():
        return False
    path = profile_path / "profile.yaml"
    data = load_yaml_dict(path)
    ui_meta = data.get("ui_meta")
    if not isinstance(ui_meta, dict):
        ui_meta = {}
        data["ui_meta"] = ui_meta
    bots = ui_meta.get("hermes-bots")
    if not isinstance(bots, dict):
        bots = {}
        ui_meta["hermes-bots"] = bots
    bots.setdefault("custom", True)
    if title and not str(bots.get("title") or "").strip():
        bots["title"] = title
    groups = bots.get("groups")
    if isinstance(groups, dict):
        groups = [str(item) for item in groups.values() if item] or [
            str(key) for key in groups.keys()
        ]
    elif not isinstance(groups, list):
        legacy = bots.get("group")
        groups = [legacy] if isinstance(legacy, str) and legacy.strip() else []
    groups = [str(item) for item in groups if str(item).strip()]
    if team_slug not in groups:
        groups.append(team_slug)
    bots["groups"] = groups
    revisions = data.get("_ui_meta_revisions")
    if not isinstance(revisions, dict):
        revisions = {}
        data["_ui_meta_revisions"] = revisions
    current = revisions.get("hermes-bots")
    revisions["hermes-bots"] = (int(current) if isinstance(current, int) else 0) + 1
    atomic_yaml_write(path, data)
    return True


def team_orientation_block(plan, team_dir: Path) -> str:
    roster = ", ".join(
        f"{m.name} ({m.role})" if m.role and m.role != m.name else m.name
        for m in plan.members
    )
    begin = MEMORY_BEGIN.format(slug=plan.slug)
    end = MEMORY_END.format(slug=plan.slug)
    lines = [
        begin,
        f"## Team: {plan.title or plan.slug} (`{plan.slug}`)",
        "",
        f"You are a member of this crew. Read `{team_dir / 'TEAM.md'}` before your first turn.",
        f"Roster: {roster or '(see TEAM.md)'}.",
        "Stay in your lane, hand off concrete artifacts, stay quiet when idle.",
        "The human ships — nobody deploys unattended.",
        end,
        "",
    ]
    return "\n".join(lines)


def append_team_memory(profile_path: Path, plan, team_dir: Path) -> bool:
    if not profile_path.is_dir():
        return False
    memory_dir = profile_path / "memories"
    memory_dir.mkdir(parents=True, exist_ok=True)
    path = memory_dir / "MEMORY.md"
    existing = path.read_text(encoding="utf-8") if path.is_file() else ""
    begin = MEMORY_BEGIN.format(slug=plan.slug)
    end = MEMORY_END.format(slug=plan.slug)
    block = team_orientation_block(plan, team_dir)
    if begin in existing and end in existing:
        before, rest = existing.split(begin, 1)
        _, after = rest.split(end, 1)
        after = after.lstrip("\n")
        text = before.rstrip() + "\n\n" + block + after
    else:
        text = existing.rstrip() + ("\n\n" if existing.strip() else "") + block
    path.write_text(text if text.endswith("\n") else text + "\n", encoding="utf-8")
    return True


def install_team_rules_skill(profile_path: Path, plan) -> bool:
    if not profile_path.is_dir():
        return False
    skill = None
    expected = f"{plan.slug}-team-rules"
    for item in plan.skills:
        name = str(item.get("name") or "")
        if name == expected or name.endswith("-team-rules"):
            skill = item
            break
    if skill is None:
        return False
    name = str(skill.get("name") or expected).strip() or expected
    content = str(skill.get("content") or "").strip()
    description = str(skill.get("description") or f"Standing rules for {plan.title or plan.slug}.")
    dest = profile_path / "skills" / name
    dest.mkdir(parents=True, exist_ok=True)
    body = "\n".join(
        [
            "---",
            f"name: {name}",
            f'description: "{description.replace(chr(34), chr(39))}"',
            "version: 1.0.0",
            "---",
            "",
            f"# {plan.title or plan.slug} team rules",
            "",
            content,
            "",
        ]
    )
    (dest / "SKILL.md").write_text(body, encoding="utf-8")
    return True


def room_fallback_note(plan) -> str:
    names = ", ".join(m.name for m in plan.members) or "(members)"
    sample = plan.sample_request or "the team's sample request"
    title = plan.title or plan.slug
    return (
        f"Create the room in Hermes Desktop: New Group Chat named “{title}” "
        f"with members {names} (already seated via ui_meta.hermes-bots.groups: "
        f"{plan.slug}). Seed it with: “{sample}”."
    )


def warm_bot_note(member_count: int) -> str | None:
    if member_count <= WARM_BOT_DEFAULT:
        return None
    return (
        f"Raise Desktop Settings → Advanced → Warm Bot Backends to at least "
        f"{member_count} so every member can run a room turn concurrently "
        f"(default is {WARM_BOT_DEFAULT})."
    )


def gateway_looks_running() -> bool:
    try:
        proc = run_hermes(["gateway", "status"], check=False, timeout=20)
    except HermesCliError:
        return False
    text = ((proc.stdout or "") + (proc.stderr or "")).lower()
    if "not running" in text or "inactive" in text:
        return False
    return "running" in text or proc.returncode == 0


def http_gateway_rpc(method: str, params: dict[str, Any]) -> dict[str, Any]:
    url = (os.environ.get("HERMES_GATEWAY_RPC_URL") or "").strip()
    if not url:
        raise HermesCliError("HERMES_GATEWAY_RPC_URL is not set")
    payload = json.dumps(
        {"jsonrpc": "2.0", "id": str(uuid.uuid4()), "method": method, "params": params}
    ).encode("utf-8")
    headers = {"Content-Type": "application/json", "User-Agent": "hermes-mybot-farm/0.2.0"}
    token = (os.environ.get("HERMES_GATEWAY_TOKEN") or "").strip()
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = Request(url, data=payload, headers=headers, method="POST")
    try:
        with urlopen(req, timeout=20) as resp:
            body = json.loads(resp.read().decode("utf-8"))
    except (URLError, TimeoutError, json.JSONDecodeError, OSError) as exc:
        raise HermesCliError(f"gateway RPC {method} failed: {exc}") from exc
    if not isinstance(body, dict):
        raise HermesCliError(f"gateway RPC {method} returned a non-object")
    if body.get("error"):
        err = body["error"]
        message = err.get("message") if isinstance(err, dict) else str(err)
        raise HermesCliError(f"gateway RPC {method} error: {message}")
    result = body.get("result")
    return result if isinstance(result, dict) else {}


def try_create_group_chat(
    plan,
    *,
    rpc: GatewayRpc | None = None,
    gateway_up: bool | None = None,
) -> tuple[str | None, list[str]]:
    notes: list[str] = []
    names = [m.name for m in plan.members if m.name]
    if len(names) < 2:
        notes.append(room_fallback_note(plan))
        return None, notes
    up = gateway_looks_running() if gateway_up is None else gateway_up
    call = rpc
    if call is None and (os.environ.get("HERMES_GATEWAY_RPC_URL") or "").strip():
        call = http_gateway_rpc
    if not up or call is None:
        if up and call is None:
            notes.append(
                "Gateway looks running but HERMES_GATEWAY_RPC_URL is unset; "
                "seated members via profile.yaml. " + room_fallback_note(plan)
            )
        else:
            notes.append(room_fallback_note(plan))
        return None, notes
    try:
        created = call(
            "groups.create",
            {
                "room_id": plan.slug,
                "name": plan.title or plan.slug,
                "members": [{"profile": name} for name in names],
            },
        )
        room = created.get("room") if isinstance(created, dict) else None
        room_id = plan.slug
        if isinstance(room, dict) and room.get("room_id"):
            room_id = str(room.get("room_id"))
        if plan.sample_request:
            call(
                "groups.send",
                {
                    "room_id": room_id,
                    "payload": {"text": plan.sample_request},
                },
            )
        notes.append(f"created group chat {room_id}")
        return room_id, notes
    except Exception as exc:  # noqa: BLE001 — plant must still succeed
        notes.append(
            f"groups.create skipped: {exc}. " + room_fallback_note(plan)
        )
        return None, notes


def ensure_team_md(plan, team_root: Path, installed: list[str]) -> list[str]:
    if "TEAM.md" in installed and (team_root / "TEAM.md").is_file():
        return installed
    (team_root / "TEAM.md").write_text(render_team_md_for_plan(plan), encoding="utf-8")
    if "TEAM.md" not in installed:
        installed = [*installed, "TEAM.md"]
    return installed


def configure_planted_team(
    plan,
    home: Path,
    *,
    team_root: Path,
    notes: list[str],
    gateway_rpc: GatewayRpc | None = None,
    gateway_up: bool | None = None,
) -> str | None:
    """Bot marker + memory + team-rules + optional groups.create. Idempotent."""
    marked = 0
    memories = 0
    skills = 0
    for member in plan.members:
        path = profile_dir(home, member.name)
        if mark_member_bot(path, title=bot_title_for_member(member), team_slug=plan.slug):
            marked += 1
        if append_team_memory(path, plan, team_root):
            memories += 1
        if install_team_rules_skill(path, plan):
            skills += 1
    notes.append(
        f"Bot-mode marker on {marked}/{len(plan.members)} members "
        f"(ui_meta.hermes-bots.groups: {plan.slug})"
    )
    notes.append(f"team orientation written to {memories} member MEMORY.md file(s)")
    if skills:
        notes.append(f"installed {plan.slug}-team-rules on {skills} member(s)")
    room, room_notes = try_create_group_chat(
        plan, rpc=gateway_rpc, gateway_up=gateway_up
    )
    notes.extend(room_notes)
    hint = warm_bot_note(len(plan.members))
    if hint:
        notes.append(hint)
    return room
