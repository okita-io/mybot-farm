"""Render TEAM.md from a GAF team-pack (the file that makes N agents read as a team)."""

from __future__ import annotations

import re
from typing import Any, Iterable

SAMPLE_IN_SKILL = re.compile(
    r"Sample request this crew is tuned for:\s*(.+?)(?:\n|$)",
    re.I,
)
SEED_IN_GS = re.compile(
    r"Seed it with a request in this shape:\s*[“\"']([^”\"']+)",
    re.I,
)
HANDMADE_TEAM_SLUGS = frozenset({"workbench", "pair-bench", "road-crew"})


def pack_dir_stem(path: str) -> str:
    filename = path.split("/")[-1].split("?")[0]
    for suffix in (".hermes.tar.gz", ".tar.gz", ".json"):
        if filename.lower().endswith(suffix):
            return filename[: -len(suffix)]
    return filename


def pack_title(pack: dict[str, Any]) -> str:
    profile = pack.get("profile") if isinstance(pack.get("profile"), dict) else {}
    for key in ("name", "title"):
        value = profile.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    slug = pack.get("slug")
    return str(slug).strip() if slug else "Team"


def pack_handoffs(pack: dict[str, Any]) -> list[str]:
    topology = pack.get("topology") if isinstance(pack.get("topology"), dict) else {}
    raw = topology.get("handoffs")
    if not isinstance(raw, list):
        return []
    return [str(item).strip() for item in raw if str(item).strip()]


def pack_topology_kind(pack: dict[str, Any]) -> str:
    topology = pack.get("topology") if isinstance(pack.get("topology"), dict) else {}
    kind = topology.get("kind")
    return str(kind).strip() if isinstance(kind, str) and kind.strip() else "pipeline"


def pack_skills(pack: dict[str, Any]) -> list[dict[str, Any]]:
    skills = pack.get("skills") if isinstance(pack.get("skills"), list) else []
    return [s for s in skills if isinstance(s, dict)]


def sample_request_from_pack(pack: dict[str, Any]) -> str:
    for skill in pack_skills(pack):
        content = skill.get("content")
        if not isinstance(content, str):
            continue
        match = SAMPLE_IN_SKILL.search(content)
        if match:
            return match.group(1).strip().rstrip(".")
    shared = pack.get("shared") if isinstance(pack.get("shared"), dict) else {}
    getting = shared.get("gettingStarted")
    if isinstance(getting, str):
        match = SEED_IN_GS.search(getting)
        if match:
            return match.group(1).strip().rstrip(".")
    return ""


def member_profile_name(member: dict[str, Any]) -> str:
    slug = member.get("slug")
    if isinstance(slug, str) and slug.strip():
        return slug.strip()
    pack_ref = member.get("pack")
    if isinstance(pack_ref, str) and pack_ref.strip():
        return pack_dir_stem(pack_ref)
    return ""


def team_rules_skill(pack: dict[str, Any], slug: str) -> dict[str, Any] | None:
    expected = f"{slug}-team-rules"
    for skill in pack_skills(pack):
        name = str(skill.get("name") or "").strip()
        if name == expected or name.endswith("-team-rules"):
            return skill
    skills = pack_skills(pack)
    return skills[0] if skills else None


def _member_rows(members: Iterable[Any]) -> list[str]:
    rows: list[str] = []
    for member in members:
        name = str(getattr(member, "name", "") or "")
        role = str(getattr(member, "role", "") or name)
        summary = str(getattr(member, "summary", "") or "")
        if isinstance(member, dict):
            name = member_profile_name(member) or str(member.get("name") or "")
            role = str(member.get("role") or name)
            summary = str(member.get("summary") or "")
        handle = f"@{name}" if name else "—"
        contract = summary or f"{role}."
        rows.append(f"| `{handle}` | `{name}` | **{role}** | {contract} |")
    return rows


def render_team_md(
    *,
    slug: str,
    title: str,
    topology_kind: str,
    members: Iterable[Any],
    handoffs: list[str],
    sample_request: str,
    rules_content: str = "",
) -> str:
    roster = "\n".join(_member_rows(members)) or "| — | — | — | — |"
    handoff_block = (
        "\n".join(f"- {line}" for line in handoffs)
        or "- Coordinate in the group chat; hand off concrete artifacts, never raw chat."
    )
    sample = sample_request.strip() or "(no sample request shipped)"
    rules = (rules_content or "").strip()
    if rules and not rules.endswith("\n"):
        rules += "\n"

    lines = [
        f"# {title}",
        "",
        "Portable team memory. If you are a fresh agent joining this crew, read this",
        "file **before your first turn**. It is what makes N agents read as a team",
        "instead of N solos.",
        "",
        f"- **Slug:** `{slug}`",
        f"- **Topology:** {topology_kind}",
        f"- **Team dir:** `~/.hermes/teams/{slug}/`",
        "- **Coordination:** one Group Chat with every member seated. The room transcript",
        "  is the source of truth for “where are we?”",
        "",
        "## Roster",
        "",
        "| Handle | Profile | Role | One-line contract |",
        "|--------|---------|------|-------------------|",
        roster,
        "",
        "All members run on the same Hermes install. They coordinate in the shared",
        "group chat (and via `message_agent` DMs when Bot Mode is on). Nobody ships,",
        "sends, or deploys unattended — the human owns the final decision.",
        "",
        "## Handoffs",
        "",
        handoff_block,
        "",
        "## Quality bar",
        "",
        "- The human ships. Members produce artifacts and recommendations.",
        "- Lane discipline: stay in role. If a task crosses a lane, hand off a concrete",
        "  artifact (card, draft, test report) — do not freelance.",
        "- First turn of a new request: state the plan (who does what, in what order)",
        "  and the one question that blocks it, if any. Then work.",
        "- Quiet when idle: no status chatter unless a handoff, a conflict, or a",
        "  decision-for-human actually happened.",
        "",
        "## Sample request",
        "",
        f"This crew is tuned for: *{sample}*",
        "",
        "When a new request lands, co-generate the workflow (plan, lane assignments,",
        "first handoffs) in the group chat before doing the work.",
        "",
        "## Escalation",
        "",
        "- Bounce more than twice, stuck, or a spec-level decision → ask the human.",
        "- Scope drift: if the request is outside the lead's lane, say so in the first",
        "  turn and re-scope with the human before anyone starts work.",
        "",
    ]
    if rules:
        lines.extend(["## Standing rules (from the team-rules skill)", "", rules, ""])
    return "\n".join(lines)


def render_team_md_for_plan(plan: Any) -> str:
    rules = ""
    expected = f"{plan.slug}-team-rules"
    for skill in getattr(plan, "skills", None) or []:
        if not isinstance(skill, dict):
            continue
        name = str(skill.get("name") or "")
        if name == expected or name.endswith("-team-rules"):
            rules = str(skill.get("content") or "")
            break
    return render_team_md(
        slug=plan.slug,
        title=getattr(plan, "title", "") or plan.slug,
        topology_kind=getattr(plan, "topology_kind", "") or "pipeline",
        members=plan.members,
        handoffs=list(getattr(plan, "handoffs", None) or []),
        sample_request=str(getattr(plan, "sample_request", "") or ""),
        rules_content=rules,
    )


def render_team_md_for_pack(pack: dict[str, Any]) -> str:
    slug = str(pack.get("slug") or "").strip()
    rules = team_rules_skill(pack, slug)
    raw_members = pack.get("members") if isinstance(pack.get("members"), list) else []
    return render_team_md(
        slug=slug,
        title=pack_title(pack),
        topology_kind=pack_topology_kind(pack),
        members=raw_members,
        handoffs=pack_handoffs(pack),
        sample_request=sample_request_from_pack(pack),
        rules_content=str((rules or {}).get("content") or ""),
    )
