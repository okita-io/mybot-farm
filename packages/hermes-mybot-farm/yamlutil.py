"""Atomic YAML helpers. Prefer PyYAML when present (Hermes installs have it).

Never truncate profile.yaml with a bare open("w") — write a temp file and replace.
"""

from __future__ import annotations

import json
import os
import tempfile
from pathlib import Path
from typing import Any

try:
    import yaml  # type: ignore
except ImportError:
    yaml = None  # type: ignore[assignment]


def _scalar(value: Any) -> str:
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, int) and not isinstance(value, bool):
        return str(value)
    text = str(value)
    if (
        text == ""
        or text.lower() in {"true", "false", "null", "yes", "no"}
        or any(ch in text for ch in ":#{}[]&*!|>%@`'\",\n")
        or text[:1] in "-?"
        or text.strip() != text
    ):
        return json.dumps(text, ensure_ascii=False)
    return text


def dump_yaml(data: dict[str, Any], indent: int = 0) -> str:
    """Dump a nested dict/list/scalar document. Good enough for profile.yaml."""
    lines: list[str] = []
    pad = "  " * indent

    def emit_list(items: list[Any], level: int) -> None:
        sp = "  " * level
        for item in items:
            if isinstance(item, dict):
                keys = list(item.items())
                if not keys:
                    lines.append(f"{sp}- {{}}")
                    continue
                first_k, first_v = keys[0]
                if isinstance(first_v, (dict, list)):
                    lines.append(f"{sp}-")
                    emit_mapping(item, level + 1)
                else:
                    lines.append(f"{sp}- {first_k}: {_scalar(first_v)}")
                    emit_mapping(dict(keys[1:]), level + 1)
            elif isinstance(item, list):
                lines.append(f"{sp}-")
                emit_list(item, level + 1)
            else:
                lines.append(f"{sp}- {_scalar(item)}")

    def emit_mapping(mapping: dict[str, Any], level: int) -> None:
        sp = "  " * level
        for key, value in mapping.items():
            if value is None:
                continue
            if isinstance(value, dict):
                lines.append(f"{sp}{key}:")
                emit_mapping(value, level + 1)
            elif isinstance(value, list):
                lines.append(f"{sp}{key}:")
                if not value:
                    lines[-1] = f"{sp}{key}: []"
                else:
                    emit_list(value, level + 1)
            else:
                lines.append(f"{sp}{key}: {_scalar(value)}")

    emit_mapping(data, indent)
    return ("\n".join(lines) + "\n") if lines else "{}\n"


def load_yaml_dict(path: Path) -> dict[str, Any]:
    if not path.is_file():
        return {}
    raw = path.read_text(encoding="utf-8")
    if not raw.strip():
        return {}
    if yaml is not None:
        data = yaml.safe_load(raw)
        return data if isinstance(data, dict) else {}
    # Minimal fallback: only used when PyYAML is absent and the file is ours.
    data = _simple_load(raw)
    return data if isinstance(data, dict) else {}


def _simple_load(raw: str) -> dict[str, Any]:
    """Indent-based loader for the subset dump_yaml emits."""
    parsed: list[tuple[int, str]] = []
    for ln in raw.splitlines():
        if not ln.strip() or ln.strip().startswith("#"):
            continue
        parsed.append((len(ln) - len(ln.lstrip(" ")), ln.strip()))
    root: dict[str, Any] = {}
    stack: list[tuple[int, Any]] = [(-1, root)]

    def parse_value(text: str) -> Any:
        text = text.strip()
        if text in {"{}", "[]"}:
            return {} if text == "{}" else []
        if text in {"true", "false"}:
            return text == "true"
        if text.startswith('"') or text.startswith("'"):
            try:
                return json.loads(text)
            except json.JSONDecodeError:
                return text.strip("'\"")
        if text.isdigit() or (text.startswith("-") and text[1:].isdigit()):
            return int(text)
        return text

    def parent_at(indent: int) -> Any:
        while len(stack) > 1 and indent <= stack[-1][0]:
            stack.pop()
        return stack[-1][1]

    for index, (indent, stripped) in enumerate(parsed):
        nxt_indent, nxt_stripped = parsed[index + 1] if index + 1 < len(parsed) else (None, "")
        parent = parent_at(indent)
        if stripped.startswith("- ") or stripped == "-":
            if not isinstance(parent, list):
                continue
            rest = "" if stripped == "-" else stripped[2:]
            if not rest:
                item: dict[str, Any] = {}
                parent.append(item)
                stack.append((indent, item))
            else:
                parent.append(parse_value(rest))
            continue
        if ":" not in stripped:
            continue
        key, _, val = stripped.partition(":")
        key, val = key.strip(), val.strip()
        if not isinstance(parent, dict):
            continue
        if val:
            parent[key] = parse_value(val)
            continue
        child: Any
        if nxt_indent is not None and nxt_indent > indent and nxt_stripped.startswith("-"):
            child = []
        else:
            child = {}
        parent[key] = child
        stack.append((indent, child))
    return root


def atomic_yaml_write(path: Path, data: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    text = yaml.safe_dump(data, sort_keys=False, allow_unicode=True) if yaml is not None else dump_yaml(data)
    fd, tmp_name = tempfile.mkstemp(prefix=f".{path.name}.", dir=str(path.parent), text=True)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            handle.write(text)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(tmp_name, path)
    except Exception:
        try:
            os.unlink(tmp_name)
        except OSError:
            pass
        raise
