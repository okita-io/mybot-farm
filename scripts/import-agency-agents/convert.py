#!/usr/bin/env python3
"""Convert msitarzewski/agency-agents markdown into mybot.farm GAF packs.

Reads upstream agent files (YAML frontmatter + markdown body), splits
personality/soul from procedural skills, stamps MIT attribution, and writes:

  packs/agency-agents/{slug}.json
  web/public/packs/agents/{slug}.json
  web/src/data/agency-catalog.generated.json
  packs/agency-agents/ATTRIBUTION.md
  packs/agency-agents/import-report.json

See scripts/import-agency-agents/README.md.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

try:
    import yaml
except ImportError:  # pragma: no cover
    print("PyYAML is required: pip install pyyaml", file=sys.stderr)
    raise

REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_SOURCE = Path("/tmp/agency-agents-src")
UPSTREAM_REPO = "https://github.com/msitarzewski/agency-agents"
UPSTREAM_LICENSE_NOTICE = "Copyright (c) 2025 AgentLand Contributors"
LISTED_AT = "2026-09-14T00:00:00.000Z"
SITE_URL = "https://mybot.farm"
PACK_FORMAT = "mybot.farm/agent-pack"
PACK_VERSION = "0.2"

RESERVED_SLUGS = {
    "gift-day",
    "sprout-journal",
    "patch",
    "probe",
    "grant-research",
    "scholastic-research",
    "scout",
    "finders",
    "pitch",
    "pair-bench",
    "road-crew",
    "workbench",
}

SKIP_TOP_DIRS = {
    "integrations",
    "scripts",
    "examples",
    "strategy",
    ".git",
    ".github",
}

# Farm browse taxonomy (web/src/lib/site.ts).
DIVISION_CATEGORY = {
    "academic": "education",
    "design": "creative",
    "engineering": "coding",
    "finance": "finance-personal",
    "game-development": "creative",
    "gis": "research",
    "healthcare": "experimental",
    "marketing": "marketing",
    "paid-media": "marketing",
    "product": "productivity",
    "project-management": "ops",
    "research": "research",
    "sales": "sales",
    "security": "coding",
    "spatial-computing": "experimental",
    "specialized": "experimental",
    "support": "ops",
    "testing": "coding",
}

CATEGORY_LABEL = {
    "lifestyle": "Lifestyle",
    "productivity": "Productivity",
    "coding": "Coding",
    "writing": "Writing",
    "marketing": "Marketing",
    "sales": "Sales",
    "research": "Research",
    "finance-personal": "Personal finance",
    "creative": "Creative",
    "music": "Music",
    "education": "Education",
    "ops": "Ops / admin",
    "experimental": "Experimental",
}

CATEGORY_TONE = {
    "lifestyle": "find",
    "productivity": "share",
    "coding": "share",
    "writing": "share",
    "marketing": "agent",
    "sales": "agent",
    "research": "share",
    "finance-personal": "find",
    "creative": "find",
    "music": "find",
    "education": "find",
    "ops": "share",
    "experimental": "agent",
}

COLOR_MAP = {
    "cyan": "blue",
    "blue": "blue",
    "sky": "blue",
    "indigo": "blue",
    "teal": "green",
    "green": "green",
    "emerald": "green",
    "lime": "green",
    "magenta": "magenta",
    "pink": "magenta",
    "fuchsia": "magenta",
    "purple": "magenta",
    "violet": "magenta",
    "orange": "orange",
    "red": "orange",
    "rose": "orange",
    "amber": "amber",
    "yellow": "amber",
    "gold": "amber",
}

SHAPES = (
    "circle",
    "hex",
    "diamond",
    "triangle",
    "gem",
    "shield",
    "teardrop",
    "leaf",
)

PERSONALITY_KEYS = (
    "identity",
    "memory",
    "personality",
    "communication style",
    "communication",
    "learning",
    "success metrics",
    "role definition",
    "role",
    "when not to use",
    "what this agent does not do",
    "executive summary",
)

# (match-substring, skill-slug, use-when)
SKILL_ROUTES: list[tuple[str, str, str]] = [
    ("core mission", "core-mission", "Use when starting work in this agent's specialty or setting the job."),
    ("core capabilities", "core-capabilities", "Use when you need this agent's primary capabilities."),
    ("core competencies", "core-competencies", "Use when applying this agent's standing competencies."),
    ("critical rules", "critical-rules", "Use when checking constraints, safety rules, or must-follow policies."),
    ("workflow process", "workflow", "Use when running this agent's step-by-step process."),
    ("your workflow", "workflow", "Use when running this agent's step-by-step process."),
    ("your process", "workflow", "Use when running this agent's step-by-step process."),
    ("workflow", "workflow", "Use when running this agent's step-by-step process."),
    ("technical deliverables", "deliverables", "Use when producing templates, examples, or technical artifacts."),
    ("deliverable template", "deliverable-template", "Use when filling this agent's standard deliverable template."),
    ("deliverables", "deliverables", "Use when producing templates, examples, or technical artifacts."),
    ("specialized skills", "specialized-skills", "Use when a task needs this agent's deeper specialized techniques."),
    ("decision framework", "decision-framework", "Use when deciding whether and how to apply this agent."),
    ("domain expertise", "domain-expertise", "Use when you need domain-specific patterns for this specialty."),
    ("advanced capabilities", "advanced-capabilities", "Use when the task needs advanced or edge-case techniques."),
    ("tooling", "tooling", "Use when setting up or choosing tools and automation for this specialty."),
    ("tech stack", "tech-stack", "Use when choosing or applying this agent's default tech stack."),
]

INSTALL_HOST_REWRITES = [
    (re.compile(r"\bClaude Code\b"), "your agent host"),
    (re.compile(r"\bClaude Desktop\b"), "your agent host"),
    (re.compile(r"~/?\.claude/agents/?"), "this farm pack"),
    (re.compile(r"\bactivate ([A-Za-z0-9][A-Za-z0-9 \-/]{0,60}) mode\b", re.I), r"work as \1"),
    (re.compile(r"\./scripts/install\.sh\b"), "the farm plant / install-prompt flow"),
    (re.compile(r"\bCursor(?: IDE)?\b"), "your editor"),
]

SECRET_PATTERNS = [
    re.compile(r"sk-[A-Za-z0-9]{20,}"),
    re.compile(r"ghp_[A-Za-z0-9]{20,}"),
    re.compile(r"github_pat_[A-Za-z0-9_]{20,}"),
    re.compile(r"AKIA[0-9A-Z]{16}"),
    re.compile(r"xox[baprs]-[0-9A-Za-z-]{10,}"),
    re.compile(r"eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+"),
    re.compile(r"-----BEGIN (?:RSA |OPENSSH |EC |DSA )?PRIVATE KEY-----"),
    re.compile(r"(?i)\b(?:api[_-]?key|password|passwd|secret|token)\s*[:=]\s*['\"]?[^\s'\"#]{8,}"),
    re.compile(r"[a-zA-Z][a-zA-Z0-9+.-]*://[^/\s:'\"]+:[^/\s@'\"]+@"),
]

EMOJI_RE = re.compile(
    "["
    "\U0001f300-\U0001faff"
    "\U00002700-\U000027bf"
    "\U0001f900-\U0001f9ff"
    "\U00002600-\U000026ff"
    "]+",
    flags=re.UNICODE,
)

SLUG_RE = re.compile(r"^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$")
MAX_SKILL_CHARS = 4500
MAX_MEMORY_CHARS = 700
MAX_CODE_LINES = 40


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--source",
        type=Path,
        default=DEFAULT_SOURCE,
        help="Path to a clone of msitarzewski/agency-agents",
    )
    parser.add_argument(
        "--divisions",
        default="all",
        help="Comma-separated division slugs, or 'all'",
    )
    parser.add_argument(
        "--out",
        type=Path,
        default=REPO_ROOT / "packs" / "agency-agents",
        help="Canonical generated pack directory",
    )
    parser.add_argument(
        "--public",
        type=Path,
        default=REPO_ROOT / "web" / "public" / "packs" / "agents",
        help="Public download directory (web/public/packs/agents)",
    )
    parser.add_argument(
        "--catalog",
        type=Path,
        default=REPO_ROOT / "web" / "src" / "data" / "agency-catalog.generated.json",
        help="Generated catalog JSON imported by the Next.js app",
    )
    parser.add_argument(
        "--validate-only",
        action="store_true",
        help="Validate existing generated packs without rewriting",
    )
    parser.add_argument(
        "--clean",
        action="store_true",
        help="Delete previously generated agency packs before writing",
    )
    return parser.parse_args()


def load_divisions(source: Path) -> dict[str, Any]:
    path = source / "divisions.json"
    if not path.is_file():
        raise SystemExit(f"Missing {path} — clone {UPSTREAM_REPO} first")
    data = json.loads(path.read_text(encoding="utf-8"))
    return data["divisions"]


def upstream_ref(source: Path) -> str:
    head = source / ".git" / "HEAD"
    if not (source / ".git").exists():
        return "unknown"
    try:
        import subprocess

        sha = subprocess.check_output(
            ["git", "-C", str(source), "rev-parse", "HEAD"],
            text=True,
        ).strip()
        return sha
    except Exception:
        if head.is_file():
            return head.read_text(encoding="utf-8").strip()
        return "unknown"


def parse_frontmatter(text: str) -> tuple[dict[str, Any], str]:
    if not text.startswith("---"):
        return {}, text
    match = re.match(r"^---\n(.*?)\n---\n?(.*)$", text, flags=re.S)
    if not match:
        return {}, text
    meta = yaml.safe_load(match.group(1)) or {}
    if not isinstance(meta, dict):
        return {}, match.group(2)
    return meta, match.group(2)


def strip_emoji(text: str) -> str:
    return EMOJI_RE.sub("", text).strip()


def normalize_heading(raw: str) -> str:
    text = strip_emoji(raw)
    text = re.sub(r"^#+\s*", "", text)
    text = re.sub(r"\s+", " ", text).strip().lower()
    text = re.sub(r"^your\s+", "your ", text)
    return text


def slugify(value: str, max_len: int = 64) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    slug = re.sub(r"-{2,}", "-", slug)
    if len(slug) > max_len:
        slug = slug[:max_len].rstrip("-")
    return slug or "agent"


def filename_slug(path: Path, division: str) -> str:
    stem = path.stem
    prefix = f"{division}-"
    if stem.startswith(prefix):
        stem = stem[len(prefix) :]
    slug = slugify(stem)
    if slug in RESERVED_SLUGS or not SLUG_RE.match(slug):
        slug = slugify(f"{division}-{stem}")
    if slug in RESERVED_SLUGS:
        slug = slugify(f"agency-{stem}")
    if len(slug) > 64:
        slug = slug[:64].rstrip("-")
    if not SLUG_RE.match(slug):
        slug = slugify(f"agency-{hashlib.sha1(stem.encode()).hexdigest()[:10]}")
    return slug


def split_sections(body: str) -> list[tuple[str, str]]:
    """Split markdown body into (heading, content) pairs.

    The preface before the first ## heading is stored as heading ''.
    """
    lines = body.splitlines()
    sections: list[tuple[str, str]] = []
    current_heading = ""
    current_lines: list[str] = []
    fence = False

    def flush() -> None:
        content = "\n".join(current_lines).strip()
        if content or current_heading:
            sections.append((current_heading, content))

    for line in lines:
        if line.strip().startswith("```"):
            fence = not fence
        if not fence and re.match(r"^##\s+", line):
            flush()
            current_heading = line.strip()
            current_lines = []
            continue
        current_lines.append(line)
    flush()
    return sections


def heading_is_personality(heading: str) -> bool:
    norm = normalize_heading(heading)
    return any(key in norm for key in PERSONALITY_KEYS)


def route_skill(heading: str) -> tuple[str, str] | None:
    norm = normalize_heading(heading)
    for needle, slug, description in SKILL_ROUTES:
        if needle in norm:
            return slug, description
    return None


def collapse_ws(text: str) -> str:
    return re.sub(r"[ \t]+\n", "\n", text).strip()


def farm_rewrite(text: str) -> str:
    out = text
    for pattern, repl in INSTALL_HOST_REWRITES:
        out = pattern.sub(repl, out)
    return out


def redact_secrets(text: str) -> str:
    out = text
    for pattern in SECRET_PATTERNS:
        out = pattern.sub("[REDACTED]", out)
    return out


def truncate_code_fences(text: str) -> str:
    def trim_fence(match: re.Match[str]) -> str:
        fence = match.group(1)
        lang = match.group(2) or ""
        body = match.group(3)
        lines = body.splitlines()
        if len(lines) <= MAX_CODE_LINES:
            return match.group(0)
        kept = "\n".join(lines[:MAX_CODE_LINES])
        return f"{fence}{lang}\n{kept}\n# … truncated for farm planting — see upstream for the full sample\n```"

    return re.sub(
        r"(```)([^\n]*)\n(.*?)```",
        trim_fence,
        text,
        flags=re.S,
    )


def clip(text: str, limit: int) -> str:
    text = text.strip()
    if len(text) <= limit:
        return text
    cut = text[: limit - 1].rsplit("\n", 1)[0]
    if len(cut) < limit // 2:
        cut = text[: limit - 1]
    return cut.rstrip() + "…"


BOILERPLATE_LINE_RE = re.compile(
    r"(?i)(instructions reference|core training|refer to comprehensive|"
    r"your detailed .+ methodology is in)"
)


def bullets_or_prose(text: str, limit: int = MAX_MEMORY_CHARS) -> str:
    """Prefer a tight persona paragraph from a section."""
    cleaned = farm_rewrite(redact_secrets(text))
    cleaned = re.sub(r"```.*?```", "", cleaned, flags=re.S)
    parts: list[str] = []
    for raw_line in cleaned.splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or BOILERPLATE_LINE_RE.search(line):
            continue
        line = re.sub(r"^[-*]\s+", "", line)

        def unbold(match: re.Match[str]) -> str:
            label = match.group(1)
            return f"{label}: " if match.group(2) else label

        line = re.sub(r"\*\*([^*]+)\*\*(\s*:)?\s*", unbold, line)
        line = re.sub(r"\s+", " ", line).strip(" -")
        if re.match(r"(?i)^(?:you(?:'re| are) successful when):?$", line):
            continue
        if line and len(line) > 18:
            parts.append(line.rstrip("."))
    return clip(". ".join(parts), limit)


def skill_body(heading: str, content: str) -> str:
    title = strip_emoji(re.sub(r"^#+\s*", "", heading)).strip() or "Skill"
    body = truncate_code_fences(farm_rewrite(redact_secrets(collapse_ws(content))))
    body = "\n".join(
        line for line in body.splitlines() if not BOILERPLATE_LINE_RE.search(line)
    )
    body = clip(body.strip(), MAX_SKILL_CHARS)
    body = re.sub(r"^#+\s+", "", body, count=1)
    return f"# {title}\n\n{body}".strip()


def hex_or_name_color(value: Any) -> str:
    if not value:
        return "blue"
    raw = str(value).strip().lower()
    if raw in COLOR_MAP:
        return COLOR_MAP[raw]
    if raw.startswith("#") and len(raw) in (4, 7):
        hex_value = raw[1:]
        if len(hex_value) == 3:
            hex_value = "".join(ch * 2 for ch in hex_value)
        try:
            r = int(hex_value[0:2], 16)
            g = int(hex_value[2:4], 16)
            b = int(hex_value[4:6], 16)
        except ValueError:
            return "blue"
        if g >= r and g >= b:
            return "green"
        if r >= g and r >= b and r - b > 30:
            return "orange" if g > 80 else "magenta"
        if b >= r and b >= g:
            return "blue"
        return "magenta"
    return COLOR_MAP.get(raw.split()[0], "blue")


def avatar_for(slug: str, color: Any, emoji: Any) -> dict[str, str]:
    digest = hashlib.sha1(f"{slug}:{emoji}".encode()).digest()
    shape = SHAPES[digest[0] % len(SHAPES)]
    return {"kind": "geometric", "shape": shape, "color": hex_or_name_color(color)}


def title_from(meta: dict[str, Any], name: str) -> str:
    vibe = str(meta.get("vibe") or "").strip()
    if vibe and len(vibe) <= 80:
        return vibe.rstrip(".")
    desc = str(meta.get("description") or "").strip()
    if desc:
        first = re.split(r"(?<=[.!?])\s+", desc)[0]
        if len(first) <= 90:
            return first.rstrip(".")
        return clip(first, 80).rstrip(".…")
    return name


def description_from(meta: dict[str, Any], name: str) -> str:
    desc = str(meta.get("description") or "").strip()
    vibe = str(meta.get("vibe") or "").strip()
    if desc and vibe:
        desc_l = desc.lower()
        vibe_l = vibe.lower().rstrip(".")
        overlap = vibe_l[:40] in desc_l or desc_l[:40] in vibe_l
        if not overlap:
            return clip(f"{desc.rstrip('.')}. {vibe.rstrip('.')}.", 320)
    return desc or f"{name} specialist, adapted from the Agency Agents roster."


def tags_for(division: str, category: str, name: str, extra: list[str]) -> list[str]:
    tags = [division, category, "agency-agents"]
    for word in re.findall(r"[A-Za-z][A-Za-z0-9+]{2,}", name):
        token = word.lower()
        if token not in tags and token not in {"the", "and", "for"}:
            tags.append(token)
        if len(tags) >= 8:
            break
    for item in extra:
        if item and item not in tags:
            tags.append(item)
    return tags[:10]


def attribution_text(rel_path: str) -> str:
    return (
        f"Adapted from {UPSTREAM_REPO} (`{rel_path}`) under the MIT License. "
        f"{UPSTREAM_LICENSE_NOTICE}."
    )


def build_memory(
    *,
    name: str,
    slug: str,
    meta: dict[str, Any],
    personality_sections: list[tuple[str, str]],
    preface: str,
    division: str,
    rel_path: str,
) -> list[dict[str, Any]]:
    memory: list[dict[str, Any]] = []
    vibe = str(meta.get("vibe") or "").strip()
    identity_bits: list[str] = []
    if preface:
        identity_bits.append(bullets_or_prose(preface, 360))
    for heading, content in personality_sections:
        norm = normalize_heading(heading)
        if "communication" in norm or "success" in norm or "learning" in norm:
            continue
        if "when not" in norm or "does not" in norm:
            continue
        if any(key in norm for key in ("identity", "personality", "role")):
            identity_bits.append(bullets_or_prose(content, 280))
    # Deduplicate overlapping sentences.
    seen: set[str] = set()
    unique_bits: list[str] = []
    for part in identity_bits:
        key = part[:80].lower()
        if part and key not in seen:
            seen.add(key)
            unique_bits.append(part)
    identity = ". ".join(unique_bits)
    if vibe:
        lead = f"{name}: {vibe.rstrip('.')}."
    else:
        lead = f"{name} is a specialist agent."
    if identity and vibe.lower().rstrip(".") not in identity.lower():
        lead = f"{lead} {identity}"
    elif identity and not vibe:
        lead = identity
    memory.append(
        {
            "kind": "profile",
            "content": clip(
                f"{lead} Personality stays in memory; procedures live in skills. "
                "Plant via mybot.farm GAF — not Claude/Cursor install scripts.",
                MAX_MEMORY_CHARS,
            ),
        }
    )

    comm = next(
        (
            content
            for heading, content in personality_sections
            if "communication" in normalize_heading(heading)
        ),
        "",
    )
    if comm:
        memory.append(
            {
                "kind": "profile",
                "content": clip(
                    f"Voice — {bullets_or_prose(comm, MAX_MEMORY_CHARS - 10)}",
                    MAX_MEMORY_CHARS,
                ),
            }
        )

    success = next(
        (
            content
            for heading, content in personality_sections
            if "success" in normalize_heading(heading)
        ),
        "",
    )
    if success:
        memory.append(
            {
                "kind": "profile",
                "content": clip(
                    f"Done looks like: {bullets_or_prose(success, MAX_MEMORY_CHARS - 16)}",
                    MAX_MEMORY_CHARS,
                ),
            }
        )

    boundaries = [
        content
        for heading, content in personality_sections
        if "when not" in normalize_heading(heading) or "does not" in normalize_heading(heading)
    ]
    if boundaries:
        memory.append(
            {
                "kind": "profile",
                "content": clip(
                    f"Stay in lane: {bullets_or_prose(' '.join(boundaries), MAX_MEMORY_CHARS - 14)}",
                    MAX_MEMORY_CHARS,
                ),
            }
        )

    healthish = division == "healthcare" or any(
        token in f"{name} {slug}".lower()
        for token in ("healthcare", "clinical", "medical")
    )
    if healthish:
        memory.append(
            {
                "kind": "profile",
                "content": (
                    "Not medical advice and not a clinician. Research and draft only. "
                    "Never diagnose, prescribe, or invent patient facts."
                ),
            }
        )
    if division == "finance":
        memory.append(
            {
                "kind": "profile",
                "content": (
                    "Not financial, tax, or investment advice. Never invent balances, "
                    "account numbers, or credentials. The user approves every money move."
                ),
            }
        )
    if division == "security":
        memory.append(
            {
                "kind": "profile",
                "content": (
                    "Defensive and hardening guidance only. Do not write exploit PoCs, "
                    "malware, or attack procedures. Never invent credentials."
                ),
            }
        )

    memory.append(
        {
            "kind": "log",
            "createdAt": "2026-09-15",
            "content": attribution_text(rel_path),
        }
    )
    return memory


def build_skills(sections: list[tuple[str, str]]) -> list[dict[str, str]]:
    skills: list[dict[str, str]] = []
    used_slugs: set[str] = set()

    def add(slug: str, description: str, heading: str, content: str) -> None:
        if len(content.strip()) < 40:
            return
        unique = slug
        n = 2
        while unique in used_slugs:
            unique = f"{slug}-{n}"
            n += 1
        used_slugs.add(unique)
        skills.append(
            {
                "name": unique,
                "description": description,
                "content": skill_body(heading or unique, content),
            }
        )

    for heading, content in sections:
        if not heading:
            continue
        if heading_is_personality(heading):
            continue
        routed = route_skill(heading)
        if routed:
            slug, description = routed
            add(slug, description, heading, content)
            continue
        slug = slugify(normalize_heading(heading), max_len=48) or "specialty"
        title = strip_emoji(re.sub(r"^#+\s*", "", heading)).strip() or slug
        add(
            slug,
            f"Use when the task matches this agent's {title.lower()} work.",
            heading,
            content,
        )

    if not skills:
        leftover = "\n\n".join(
            content for heading, content in sections if content.strip() and not heading_is_personality(heading)
        )
        add(
            "core-mission",
            "Use when starting work in this agent's specialty.",
            "Core mission",
            leftover or "Help with this specialty. Prefer the user's repo patterns. Do not invent secrets.",
        )
    return skills


def convert_agent(
    path: Path,
    *,
    source_root: Path,
    division: str,
    division_label: str,
) -> tuple[dict[str, Any], dict[str, Any]]:
    raw = path.read_text(encoding="utf-8")
    meta, body = parse_frontmatter(raw)
    name = str(meta.get("name") or "").strip()
    description = str(meta.get("description") or "").strip()
    if not name or not description:
        raise ValueError("missing name or description frontmatter")

    rel_path = path.relative_to(source_root).as_posix()
    slug = filename_slug(path, division)
    category = DIVISION_CATEGORY.get(division, "experimental")
    sections = split_sections(body)
    preface = next((content for heading, content in sections if heading == ""), "")
    personality = [(h, c) for h, c in sections if h and heading_is_personality(h)]
    skills = build_skills(sections)
    memory = build_memory(
        name=name,
        slug=slug,
        meta=meta,
        personality_sections=personality,
        preface=preface,
        division=division,
        rel_path=rel_path,
    )
    title = title_from(meta, name)
    profile_description = description_from(meta, name)
    tags = tags_for(division, category, name, [division_label.lower()])
    pack = {
        "format": PACK_FORMAT,
        "version": PACK_VERSION,
        "packVersion": 1,
        "runtime": ["grok-bot", "openclaw"],
        "slug": slug,
        "category": category,
        "tags": tags,
        "profile": {
            "name": name,
            "title": title,
            "description": profile_description,
            "avatar": avatar_for(slug, meta.get("color"), meta.get("emoji")),
        },
        "memory": memory,
        "skills": skills,
        "routines": [],
        "plugins": [],
        "gettingStarted": {"skill": skills[0]["name"]},
        "manifest": {
            "author": "agency-agents (adapted)",
            "license": "MIT",
            "homepage": f"{SITE_URL}/agents/{slug}",
            "tags": tags,
            "scrubbed": True,
            "sourceNote": attribution_text(rel_path),
            "sourceRepo": UPSTREAM_REPO,
            "sourcePath": rel_path,
            "attribution": (
                f"{UPSTREAM_LICENSE_NOTICE}. MIT License. "
                f"Adapted from {UPSTREAM_REPO}."
            ),
            "skillCount": len(skills),
        },
    }

    stall = {
        "kind": "agent",
        "slug": slug,
        "name": name,
        "title": title,
        "description": clip(profile_description, 220),
        "seoDescription": clip(
            f"Install {name} from mybot.farm: {profile_description} Adapted from Agency Agents (MIT).",
            280,
        ),
        "category": CATEGORY_LABEL[category],
        "tone": CATEGORY_TONE[category],
        "downloadHref": f"/packs/agents/{slug}.json",
        "priceCents": 0,
        "listedAt": LISTED_AT,
        "author": {
            "username": "agency-agents",
            "href": "/catalog?q=agency",
        },
    }
    return pack, stall


def iter_agent_files(source: Path, divisions: dict[str, Any], wanted: set[str] | None) -> list[tuple[str, Path]]:
    found: list[tuple[str, Path]] = []
    for division in sorted(divisions):
        if wanted is not None and division not in wanted:
            continue
        directory = source / division
        if not directory.is_dir():
            continue
        for path in sorted(directory.rglob("*.md")):
            if path.name.lower() == "readme.md":
                continue
            found.append((division, path))
    return found


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def attribution_markdown(ref: str, counts: dict[str, int], skipped: list[dict[str, str]]) -> str:
    lines = [
        "# Attribution — Agency Agents packs",
        "",
        "These farm packs are **adapted** from the MIT-licensed roster:",
        "",
        f"- Source: [{UPSTREAM_REPO}]({UPSTREAM_REPO})",
        f"- Upstream revision: `{ref}`",
        f"- {UPSTREAM_LICENSE_NOTICE}",
        "",
        "The MIT License requires that the copyright notice and permission",
        "notice be included in all copies or substantial portions of the Software.",
        "The upstream LICENSE text is reproduced in `scripts/import-agency-agents/UPSTREAM-LICENSE`.",
        "",
        "Each generated pack repeats this notice in `manifest.sourceNote`,",
        "`manifest.attribution`, and a `memory` log entry, and links the original",
        "filename via `manifest.sourcePath`.",
        "",
        "Personality (identity, voice, vibe, success tone) is stored in `memory`.",
        "Procedures live in `skills[]` as agentskills-style recipes.",
        "Claude/Cursor install scripts are **not** the farm product — plant via",
        "the mybot.farm share / GAF / install-prompt flow.",
        "",
        "## Packs generated",
        "",
        f"- **Total:** {sum(counts.values())}",
        "",
    ]
    for division, count in sorted(counts.items()):
        lines.append(f"- `{division}`: {count}")
    lines.extend(["", "## Skipped", ""])
    if not skipped:
        lines.append("None.")
    else:
        for item in skipped:
            lines.append(f"- `{item['path']}` — {item['reason']}")
    lines.append("")
    return "\n".join(lines)


def validate_pack(pack: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    if pack.get("format") != PACK_FORMAT:
        errors.append("bad format")
    slug = pack.get("slug")
    if not isinstance(slug, str) or not SLUG_RE.match(slug):
        errors.append(f"bad slug: {slug!r}")
    if slug in RESERVED_SLUGS:
        errors.append(f"reserved slug: {slug}")
    profile = pack.get("profile") or {}
    for field in ("name", "title", "description"):
        if not profile.get(field):
            errors.append(f"missing profile.{field}")
    memory = pack.get("memory") or []
    if not memory:
        errors.append("no memory")
    joined = " ".join(str(item.get("content") or "") for item in memory)
    manifest = pack.get("manifest") or {}
    if "agency-agents" not in joined and "agency-agents" not in str(manifest.get("sourceNote") or ""):
        errors.append("missing attribution")
    if manifest.get("license") != "MIT":
        errors.append("license must be MIT")
    if not manifest.get("sourcePath"):
        errors.append("missing sourcePath")
    skills = pack.get("skills") or []
    if not skills:
        errors.append("no skills")
    for skill in skills:
        desc = str(skill.get("description") or "")
        if not desc.lower().startswith("use "):
            errors.append(f"skill {skill.get('name')!r} description should start with 'Use '")
        if not skill.get("content"):
            errors.append(f"skill {skill.get('name')!r} missing content")
        blob = str(skill.get("content") or "")
        for pattern in SECRET_PATTERNS[:7]:
            if pattern.search(blob):
                errors.append(f"skill {skill.get('name')!r} still has a secret-like value")
                break
    if pack.get("category") not in CATEGORY_LABEL:
        errors.append(f"unknown category {pack.get('category')!r}")
    return errors


def clean_previous(out_dir: Path, public_dir: Path, catalog_path: Path, slugs: set[str]) -> None:
    if out_dir.is_dir():
        for path in out_dir.glob("*.json"):
            if path.name in {"import-report.json"}:
                continue
            if path.stem in slugs or path.name.endswith(".json"):
                # Only delete generated agency packs we own, not seed files.
                try:
                    data = json.loads(path.read_text(encoding="utf-8"))
                except Exception:
                    continue
                if data.get("manifest", {}).get("sourceRepo") == UPSTREAM_REPO:
                    path.unlink()
    if public_dir.is_dir():
        for path in public_dir.glob("*.json"):
            try:
                data = json.loads(path.read_text(encoding="utf-8"))
            except Exception:
                continue
            if data.get("manifest", {}).get("sourceRepo") == UPSTREAM_REPO:
                path.unlink()
    if catalog_path.is_file():
        catalog_path.unlink()


def convert(args: argparse.Namespace) -> int:
    source = args.source.resolve()
    if not source.is_dir():
        print(f"Source not found: {source}", file=sys.stderr)
        print(f"Clone first: git clone --depth 1 {UPSTREAM_REPO} {source}", file=sys.stderr)
        return 2

    divisions = load_divisions(source)
    wanted: set[str] | None
    if args.divisions.strip().lower() == "all":
        wanted = None
    else:
        wanted = {item.strip() for item in args.divisions.split(",") if item.strip()}
        unknown = wanted - set(divisions)
        if unknown:
            print(f"Unknown divisions: {', '.join(sorted(unknown))}", file=sys.stderr)
            return 2

    ref = upstream_ref(source)
    files = iter_agent_files(source, divisions, wanted)
    packs: dict[str, dict[str, Any]] = {}
    stalls: list[dict[str, Any]] = []
    skipped: list[dict[str, str]] = []
    counts: Counter[str] = Counter()

    for division, path in files:
        rel = path.relative_to(source).as_posix()
        try:
            pack, stall = convert_agent(
                path,
                source_root=source,
                division=division,
                division_label=divisions[division]["label"],
            )
        except ValueError as exc:
            skipped.append({"path": rel, "reason": str(exc)})
            continue
        slug = pack["slug"]
        if slug in packs:
            skipped.append({"path": rel, "reason": f"slug collision with {packs[slug]['manifest']['sourcePath']}"})
            continue
        errors = validate_pack(pack)
        if errors:
            skipped.append({"path": rel, "reason": "; ".join(errors)})
            continue
        packs[slug] = pack
        stalls.append(stall)
        counts[division] += 1

    stalls.sort(key=lambda item: item["slug"])

    if args.clean:
        clean_previous(args.out, args.public, args.catalog, set(packs))

    args.out.mkdir(parents=True, exist_ok=True)
    args.public.mkdir(parents=True, exist_ok=True)

    for slug, pack in packs.items():
        write_json(args.out / f"{slug}.json", pack)
        write_json(args.public / f"{slug}.json", pack)

    report = {
        "tool": "import-agency-agents",
        "version": "0.1.0",
        "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "upstreamRepo": UPSTREAM_REPO,
        "upstreamRef": ref,
        "copyright": UPSTREAM_LICENSE_NOTICE,
        "license": "MIT",
        "divisionCounts": dict(sorted(counts.items())),
        "totalPacks": len(packs),
        "skipped": skipped,
        "slugs": sorted(packs),
    }
    write_json(args.out / "import-report.json", report)
    (args.out / "ATTRIBUTION.md").write_text(
        attribution_markdown(ref, dict(counts), skipped),
        encoding="utf-8",
    )

    catalog = {
        "generatedAt": report["generatedAt"],
        "upstreamRepo": UPSTREAM_REPO,
        "upstreamRef": ref,
        "totalPacks": len(packs),
        "divisionCounts": report["divisionCounts"],
        "skipped": skipped,
        "stalls": stalls,
        "packs": packs,
    }
    write_json(args.catalog, catalog)

    print(f"Wrote {len(packs)} packs from {source} @ {ref[:12]}")
    for division, count in sorted(counts.items()):
        print(f"  {division}: {count}")
    if skipped:
        print(f"Skipped {len(skipped)}:")
        for item in skipped:
            print(f"  {item['path']}: {item['reason']}")
    return 0 if packs else 1


def validate_existing(args: argparse.Namespace) -> int:
    catalog_path = args.catalog
    if not catalog_path.is_file():
        print(f"Missing catalog {catalog_path}", file=sys.stderr)
        return 2
    catalog = json.loads(catalog_path.read_text(encoding="utf-8"))
    errors = 0
    packs = catalog.get("packs") or {}
    for slug, pack in packs.items():
        problems = validate_pack(pack)
        public = args.public / f"{slug}.json"
        canonical = args.out / f"{slug}.json"
        if not public.is_file():
            problems.append("missing public json")
        if not canonical.is_file():
            problems.append("missing canonical json")
        if problems:
            errors += 1
            print(f"{slug}: {'; '.join(problems)}")
    print(f"Validated {len(packs)} packs, {errors} with errors")
    return 1 if errors else 0


def main() -> int:
    args = parse_args()
    if args.validate_only:
        return validate_existing(args)
    return convert(args)


if __name__ == "__main__":
    raise SystemExit(main())
