"""Subprocess wrappers for the Hermes CLI. Do not invent APIs."""

from __future__ import annotations

import json
import os
import shutil
import subprocess
from typing import Any


class HermesCliError(Exception):
    def __init__(self, message: str, stdout: str = "", stderr: str = "", code: int | None = None):
        super().__init__(message)
        self.stdout = stdout
        self.stderr = stderr
        self.code = code


def hermes_executable() -> str:
    env = (os.environ.get("HERMES_BIN") or "").strip()
    if env:
        return env
    found = shutil.which("hermes")
    if not found:
        raise HermesCliError(
            "hermes CLI not found on PATH. Install Hermes Agent first: "
            "https://hermes-agent.nousresearch.com/docs/getting-started/installation"
        )
    return found


def run_hermes(
    args: list[str],
    *,
    timeout: int = 120,
    check: bool = True,
) -> subprocess.CompletedProcess[str]:
    cmd = [hermes_executable(), *args]
    try:
        proc = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout,
            env=os.environ.copy(),
        )
    except FileNotFoundError as exc:
        raise HermesCliError(str(exc)) from exc
    except subprocess.TimeoutExpired as exc:
        raise HermesCliError(f"hermes {' '.join(args)} timed out after {timeout}s") from exc
    if check and proc.returncode != 0:
        err = (proc.stderr or proc.stdout or "").strip() or f"exit {proc.returncode}"
        raise HermesCliError(
            f"hermes {' '.join(args)} failed: {err[:800]}",
            stdout=proc.stdout or "",
            stderr=proc.stderr or "",
            code=proc.returncode,
        )
    return proc


def parse_profile_list(text: str) -> list[str]:
    names: list[str] = []
    for raw in text.splitlines():
        line = raw.strip()
        if not line or line.startswith("Profile") or line.startswith("-"):
            continue
        if line.startswith("*"):
            line = line[1:].strip()
        # Table rows from newer CLIs: "name | ..."
        name = line.split()[0] if line.split() else ""
        name = name.strip("|*")
        if name and name.lower() not in {"name", "profile", "distribution"}:
            names.append(name)
    return names


def list_profiles() -> list[str]:
    proc = run_hermes(["profile", "list"], check=True)
    return parse_profile_list(proc.stdout or "")


def profile_exists(name: str, names: list[str] | None = None) -> bool:
    found = names if names is not None else list_profiles()
    return name in found


def import_profile(archive: str, name: str) -> str:
    proc = run_hermes(["profile", "import", archive, "--name", name], timeout=180)
    return (proc.stdout or "").strip()


def delete_profile(name: str) -> str:
    if name == "default":
        raise HermesCliError("refusing to delete the default profile")
    proc = run_hermes(["profile", "delete", name, "--yes"], timeout=60)
    return (proc.stdout or "").strip()


def parse_boards_list(text: str) -> list[str]:
    slugs: list[str] = []
    stripped = text.strip()
    if stripped.startswith("{") or stripped.startswith("["):
        try:
            data = json.loads(stripped)
        except json.JSONDecodeError:
            data = None
        rows: list[Any]
        if isinstance(data, list):
            rows = data
        elif isinstance(data, dict):
            rows = data.get("boards") or data.get("items") or []
        else:
            rows = []
        for row in rows:
            if isinstance(row, str):
                slugs.append(row)
            elif isinstance(row, dict):
                slug = row.get("slug") or row.get("id") or row.get("name")
                if slug:
                    slugs.append(str(slug))
        return slugs
    for raw in text.splitlines():
        line = raw.strip()
        if not line:
            continue
        slug = line.split()[0].strip("|*")
        if slug and slug.lower() not in {"slug", "board", "name", "boards"}:
            slugs.append(slug)
    return slugs


def list_boards() -> list[str]:
    proc = run_hermes(["kanban", "boards", "list", "--json"], check=False)
    if proc.returncode == 0 and (proc.stdout or "").strip():
        parsed = parse_boards_list(proc.stdout)
        if parsed:
            return parsed
    proc = run_hermes(["kanban", "boards", "list"], check=False)
    if proc.returncode != 0:
        return []
    return parse_boards_list(proc.stdout or "")


def create_board(slug: str, name: str | None = None) -> str:
    args = ["kanban", "boards", "create", slug]
    if name:
        args.extend(["--name", name])
    proc = run_hermes(args, check=False, timeout=60)
    out = ((proc.stdout or "") + "\n" + (proc.stderr or "")).strip()
    if proc.returncode == 0:
        return out
    lower = out.lower()
    if "exist" in lower or "already" in lower or "idempotent" in lower:
        return out
    raise HermesCliError(
        f"hermes kanban boards create {slug} failed: {out[:800]}",
        stdout=proc.stdout or "",
        stderr=proc.stderr or "",
        code=proc.returncode,
    )


def delete_board(slug: str) -> str:
    proc = run_hermes(["kanban", "boards", "rm", slug, "--delete"], check=False, timeout=60)
    out = ((proc.stdout or "") + "\n" + (proc.stderr or "")).strip()
    if proc.returncode == 0:
        return out
    lower = out.lower()
    if "not found" in lower or "does not exist" in lower or "no such" in lower:
        return out
    raise HermesCliError(
        f"hermes kanban boards rm {slug} --delete failed: {out[:800]}",
        stdout=proc.stdout or "",
        stderr=proc.stderr or "",
        code=proc.returncode,
    )
