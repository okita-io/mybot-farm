"""Readable world doc and per-member character skin for a planted world-pack.

Mirrors the KiroCrew world install: WORLD.md is the scene the crew can read,
and each member's MEMORY.md gains a skin naming their character and home.
Cast capabilities (web, files, schedule) are documentation only. This module
does not grant tools or schedule ambient routines.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

ADVISORY_CAPABILITIES = frozenset({"web", "files", "schedule"})
WORLD_BEGIN = "<!-- mybot.farm world:{slug} -->"
WORLD_END = "<!-- /mybot.farm world:{slug} -->"


def place_name(world: dict[str, Any], place_id: str) -> str:
    for place in world.get("places") or []:
        if isinstance(place, dict) and place.get("id") == place_id:
            name = place.get("name")
            return str(name) if name else place_id
    return place_id


def place_label(world: dict[str, Any], place_id: str) -> str:
    for place in world.get("places") or []:
        if isinstance(place, dict) and place.get("id") == place_id:
            name = place.get("name")
            return f"{name} ({place_id})" if name else place_id
    return place_id


def cast_for_role(world: dict[str, Any], role: str) -> dict[str, Any] | None:
    for item in world.get("cast") or []:
        if isinstance(item, dict) and item.get("role") == role:
            return item
    return None


def compose_world_doc(world: dict[str, Any], slug: str) -> str:
    """Projection of a worlds/v1 block: title, places, cast, turn model, entry."""
    title = str(world.get("title") or slug)
    lines = [f"# {title} — world"]
    theme = world.get("theme") if isinstance(world.get("theme"), dict) else {}
    render = world.get("render") if isinstance(world.get("render"), dict) else {}
    mood = theme.get("mood") or render.get("theme")
    if mood:
        lines.append(f"\n_Setting: {mood}._")
    thumbnail = world.get("thumbnail")
    if isinstance(thumbnail, str) and thumbnail.strip():
        lines.append(f"\nThumbnail: `{thumbnail.strip()}`")

    rules = world.get("rules") if isinstance(world.get("rules"), dict) else {}
    turn_model = str(rules.get("turnModel") or "defer")
    handoff = f", handoff by {rules.get('handoff')}" if rules.get("handoff") else ""
    lines.append(
        f"\n**Turn model:** {turn_model}{handoff}. Characters speak in the shared scene; "
        "wait for an @mention unless you are the greeter."
    )
    if rules.get("ambient"):
        lines.append(
            "\n_This world declares ambient life, but routines are NOT scheduled on install "
            "— ask to schedule them explicitly._"
        )

    entry = world.get("entrypoint") if isinstance(world.get("entrypoint"), dict) else {}
    if entry.get("place"):
        greeter = f" — the **{entry.get('greeter')}** greets first" if entry.get("greeter") else ""
        lines.append(f"\n**Entry:** scene opens in {place_label(world, str(entry['place']))}{greeter}.")

    places = [p for p in (world.get("places") or []) if isinstance(p, dict)]
    if places:
        lines.append("\n## Places")
        for place in places:
            present = place.get("present") if isinstance(place.get("present"), list) else []
            connects = place.get("connects") if isinstance(place.get("connects"), list) else []
            present_bit = f" — present: {', '.join(str(x) for x in present)}" if present else ""
            connect_bit = f" — connects to {', '.join(str(x) for x in connects)}" if connects else ""
            label = place.get("name") or place.get("id")
            lines.append(f"- **{label}** (`{place.get('id')}`){present_bit}{connect_bit}")

    cast = [c for c in (world.get("cast") or []) if isinstance(c, dict)]
    if cast:
        lines.append("\n## Cast")
        for member in cast:
            role = member.get("role")
            parts = [f"**{member.get('name') or role}** plays the **{role}**"]
            if member.get("home"):
                parts.append(f"home: {place_label(world, str(member['home']))}")
            if member.get("memoryScope"):
                parts.append(f"memory: {member.get('memoryScope')}")
            caps = member.get("capabilities") if isinstance(member.get("capabilities"), list) else []
            known = [str(cap) for cap in caps if cap in ADVISORY_CAPABILITIES]
            if known:
                parts.append(f"capabilities (advisory only): {', '.join(known)}")
            lines.append(f"- {' — '.join(parts)}")
            rel = member.get("relationships")
            if isinstance(rel, dict):
                for who, how in rel.items():
                    lines.append(f"  - {who}: {how}")

    lines.extend(
        [
            "\n## Safety",
            "Cast capabilities above are advisory documentation. Planting this world "
            "does not add tools, shell access, or file-write access, and it does not "
            "schedule ambient routines.",
        ]
    )
    return "\n".join(lines) + "\n"


def world_skin_block(
    world: dict[str, Any],
    slug: str,
    *,
    role: str,
    profile_name: str,
    world_doc_path: str,
) -> str:
    """Idempotent MEMORY.md block: character name, home, greeter, pointer to WORLD.md."""
    title = str(world.get("title") or slug)
    skin = cast_for_role(world, role) if role else None
    char_name = str((skin or {}).get("name") or role or profile_name)
    role_label = role or profile_name
    home = (skin or {}).get("home")
    home_line = f" You live in **{place_name(world, str(home))}**." if home else ""
    entry = world.get("entrypoint") if isinstance(world.get("entrypoint"), dict) else {}
    greeter = " You greet newcomers when the scene opens." if role and entry.get("greeter") == role else ""
    begin = WORLD_BEGIN.format(slug=slug)
    end = WORLD_END.format(slug=slug)
    lines = [
        begin,
        f"## In the world: {title}",
        "",
        f"You are **{char_name}**, embodied as the **{role_label}** in this world.{home_line}{greeter}",
        f"The scene, places, cast, and turn model are in `{world_doc_path}`.",
        "Speak in character in the shared scene; wait for an @mention unless you are the greeter.",
        "Your Hermes tools are unchanged. Capabilities listed in the world are advisory only. "
        "This install does not schedule ambient routines.",
        end,
        "",
    ]
    return "\n".join(lines)


def append_world_memory(profile_path: Path, slug: str, block: str) -> bool:
    """Insert or replace the world skin in a profile MEMORY.md. Missing profile is a no-op."""
    if not profile_path.is_dir():
        return False
    memory_dir = profile_path / "memories"
    memory_dir.mkdir(parents=True, exist_ok=True)
    path = memory_dir / "MEMORY.md"
    existing = path.read_text(encoding="utf-8") if path.is_file() else ""
    begin = WORLD_BEGIN.format(slug=slug)
    end = WORLD_END.format(slug=slug)
    if begin in existing and end in existing:
        before, rest = existing.split(begin, 1)
        _, after = rest.split(end, 1)
        after = after.lstrip("\n")
        text = before.rstrip() + "\n\n" + block + after
    else:
        text = existing.rstrip() + ("\n\n" if existing.strip() else "") + block
    path.write_text(text if text.endswith("\n") else text + "\n", encoding="utf-8")
    return True
