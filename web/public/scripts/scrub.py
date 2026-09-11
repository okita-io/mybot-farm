#!/usr/bin/env python3
"""
scrub.py — Sanitize a Hermes agent profile export for sharing.

Turns a `hermes profile export` archive (or an unpacked profile directory) into
a clean, shareable tarball plus a machine-readable scrub report in GAF
"portable | needs_review | dropped" shape.

Design (see ../docs/generic-agent-format.md):
  - Scrubbing is DETERMINISTIC. No LLM touches the secret path.
  - Structural drop: files that never belong in a shared pack.
  - Field redaction: credentials in kept config/memory files.
  - Content scan: pattern scan over everything that survives → needs_review.
  - Re-scan gate: the output is re-scanned; high-confidence hits → exit 1.

Exit codes:
  0  clean pack produced, re-scan passed
  1  re-scan found a high-confidence secret in the output (DO NOT SHARE)
  2  input error / bad usage

Stdlib only. Python 3.9+.
"""

import argparse
import fnmatch
import hashlib
import io
import json
import os
import re
import sys
import tarfile
import tempfile
import time
from pathlib import Path

TOOL_NAME = "agent-scrub"
TOOL_VERSION = "0.1.0"
REDACTED = "[REDACTED]"

# ---------------------------------------------------------------- paths

# Whole-relative-path globs that are ALWAYS dropped from the pack.
DROP_GLOBS = [
    "state.db", "state.db-*", ".state.db",
    ".curator_backups", ".curator_backups/*",
    "audio_cache", "audio_cache/*",
    "cache", "cache/*",
    "logs", "logs/*",
    "auth.json", "auth.lock", ".auth",
    ".env", ".env.*",
    "bin", "bin/*",
    ".backup.lock", ".clean_shutdown", ".DS_Store",
    ".skills_prompt_snapshot.json", "channel_directory.json",
    "*.lock",
]

# Files worth a content scan (text). Everything else text-like is scanned too,
# but binaries are skipped via decode check.
TEXT_SUFFIXES = {".md", ".json", ".yaml", ".yml", ".txt", ".toml", ".ini", ".cfg"}

# ------------------------------------------------------- redaction rules

SECRET_KEY_RE = re.compile(
    r"^(api_key|apikey|secret|secret_key|token|access_token|refresh_token|auth_token|"
    r"password|passwd|dsn|connection_string|db_password|smtp_pass|private_key)$",
    re.IGNORECASE,
)
# Values in config.yaml that look like credentials even under other keys.
SECRET_VALUE_RE = re.compile(
    r"^(sk-[A-Za-z0-9_-]{10,}|gh[pousr]_[A-Za-z0-9]{20,}|AKIA[A-Z0-9]{12,}|"
    r"xox[baprs]-[A-Za-z0-9-]{10,}|eyJ[A-Za-z0-9_-]{10,}\.)",
    re.IGNORECASE,
)
HOME_PATH_RE = re.compile(r"/Users/[A-Za-z0-9._-]+|/home/[A-Za-z0-9._-]+|/root")

# ------------------------------------------------------- content scanner

# High confidence: presence ⇒ pack must not ship until a human decides.
HIGH_PATTERNS = {
    "private_key": re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----"),
    "openai_key": re.compile(r"\bsk-[A-Za-z0-9]{20,}\b"),
    "github_token": re.compile(r"\bgh[pousr]_[A-Za-z0-9]{36,}\b"),
    "aws_key": re.compile(r"\b(?:AKIA|ASIA)[A-Z0-9]{16}\b"),
    "slack_token": re.compile(r"\bxox[baprs]-[A-Za-z0-9-]{10,}\b"),
    "jwt": re.compile(r"\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,}\b"),
    "connection_string": re.compile(r"\b(postgres(?:ql)?|mysql|redis|amqp|mongodb|mongodb\+srv)://[^\s:@/]+:[^\s@/]+@"),
}
# Advisory: personal info, not credentials — reported, never auto-dropped.
REVIEW_PATTERNS = {
    "local_ip": re.compile(r"\b(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})\b"),
    "localhost_service": re.compile(r"\b(?:localhost|127\.0\.0\.1):\d{2,5}\b"),
    "email_address": re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b"),
    "home_path": re.compile(r"\b(?:/Users/|/home/)[A-Za-z0-9._-]+"),
    "lan_url": re.compile(r"\bhttps?://(?:10|192\.168|172\.(?:1[6-9]|2\d|3[01]))\.\d{1,3}\.\d{1,3}[:/][^\s\"']*"),
}

MAX_REVIEW_ITEMS = 200
SNIPPET_LEN = 80


def looks_binary(buf: bytes) -> bool:
    if not buf:
        return False
    return buf.count(0) > max(1, len(buf) // 512)


def snippet_for(text: str, match: re.Match) -> str:
    s = max(0, match.start() - 20)
    e = min(len(text), match.end() + 20)
    return text[s:e].replace("\n", " ").strip()[:SNIPPET_LEN]


def scan_text(rel_path: str, text: str, review: list, high: list, redact_paths=False) -> str:
    """Scan one text file. Returns redacted text when redact_paths."""
    redacted = text
    for m in HOME_PATH_RE.finditer(text):
        redacted = redacted.replace(m.group(0), "~")
    for cat, pat in {**HIGH_PATTERNS, **REVIEW_PATTERNS}.items():
        for m in pat.finditer(redacted):
            entry = {
                "file": rel_path,
                "line": redacted.count("\n", 0, m.start()) + 1,
                "pattern": cat,
                "severity": "high" if cat in HIGH_PATTERNS else "review",
                "snippet": snippet_for(redacted, m),
            }
            (high if entry["severity"] == "high" else review).append(entry)
    return redacted


# ------------------------------------------------------------- pipeline

def is_dropped(rel: str) -> bool:
    for g in DROP_GLOBS:
        if fnmatch.fnmatch(rel, g) or fnmatch.fnmatch(os.path.basename(rel), g):
            return True
    return False


def read_manifest(skill_dir: Path):
    """skills/.bundled_manifest → set of bundled skill names."""
    p = skill_dir / ".bundled_manifest"
    if not p.exists():
        return set()
    names = set()
    for line in p.read_text(encoding="utf-8", errors="replace").splitlines():
        line = line.strip()
        if line and not line.startswith("#"):
            names.add(line.split(":", 1)[0])
    return names


def read_used_skills(skill_dir: Path):
    p = skill_dir / ".usage.json"
    if not p.exists():
        return set()
    try:
        data = json.loads(p.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return set()
    used = set()
    for name, meta in data.items():
        if not isinstance(meta, dict):
            continue
        if (meta.get("use_count") or 0) > 0 or (meta.get("patch_count") or 0) > 0:
            used.add(name)
    return used


def redact_yaml_value(path: Path, review: list) -> bool:
    """Redact credential-looking values in a YAML-ish file, in place.
    Line-based on purpose: never rewrite the structure, only values."""
    text = path.read_text(encoding="utf-8", errors="replace")
    out_lines = []
    changed = False
    for line in text.splitlines():
        m = re.match(r"^(\s*)([A-Za-z_][\w-]*)(\s*:\s*)(.*)$", line)
        if m:
            indent, key, sep, value = m.groups()
            stripped = value.strip().strip("'\"")
            if (SECRET_KEY_RE.match(key) and stripped) or SECRET_VALUE_RE.match(stripped):
                if key.lower() == "base_url":
                    # personal infra, not a credential → flag, keep
                    review.append({"file": str(path.name), "pattern": "personal_endpoint",
                                   "severity": "review", "line": len(out_lines) + 1,
                                   "snippet": value.strip()[:SNIPPET_LEN]})
                    out_lines.append(line)
                    continue
                out_lines.append(f"{indent}{key}{sep}{REDACTED}")
                changed = True
                continue
        out_lines.append(line)
    if changed:
        path.write_text("\n".join(out_lines) + "\n", encoding="utf-8")
    return changed


def process(profile_dir: Path, args) -> dict:
    dropped, redacted_files, review, high = [], [], [], []
    stats = {"kept_files": 0, "kept_bytes": 0}

    skill_dir = profile_dir / "skills"
    if skill_dir.is_dir():
        bundled = read_manifest(skill_dir)
        used = read_used_skills(skill_dir)
        keep = set()
        for d in skill_dir.iterdir():
            if not d.is_dir():
                continue
            if (d / "SKILL.md").exists():
                if d.name in bundled:
                    if d.name in used or args.keep_all_skills:
                        keep.add(d.name)
                else:
                    keep.add(d.name)  # custom/agent-authored skill: always keep
        # drop bundled-but-unused skill trees
        for d in list(skill_dir.iterdir()):
            if d.is_dir() and d.name in bundled and d.name not in keep \
                    and (d / "SKILL.md").exists():
                _rm_tree(d)
                dropped.append(f"skills/{d.name}/ (bundled, unused)")
        # drop skill bookkeeping
        for f in [".usage.json", ".skills_prompt_snapshot.json"]:
            p = skill_dir / f
            if p.exists():
                _rm_tree(p)
                dropped.append(f"skills/{f}")

    # structural drop (root-level dirs/files first, then leftovers)
    for root, dirs, files in os.walk(profile_dir, topdown=False):
        rel_root = os.path.relpath(root, profile_dir)
        for name in files:
            rel = name if rel_root == "." else f"{rel_root}/{name}"
            if is_dropped(rel):
                p = Path(root) / name
                _rm_tree(p)
                dropped.append(rel)
        for name in dirs:
            rel = name if rel_root == "." else f"{rel_root}/{name}"
            if is_dropped(rel):
                _rm_tree(Path(root) / name)
                dropped.append(rel + "/")

    # field redaction in config + secrets-ish files
    for cfg in ["config.yaml", "SOUL.md", "USER.md", "memories/MEMORY.md", "memories/USER.md"]:
        p = profile_dir / cfg
        if p.is_file() and cfg.endswith((".yaml",)):
            if redact_yaml_value(p, review):
                redacted_files.append(cfg)
        # cron routines: keep, but always surface for GAF translation review
    cron_dir = profile_dir / "cron"
    if cron_dir.is_dir():
        for f in cron_dir.rglob("*"):
            if f.is_file():
                review.append({"file": f"cron/{f.relative_to(cron_dir)}", "line": 0,
                               "pattern": "routine_binding", "severity": "review",
                               "snippet": "cron routine kept — translate to GAF intent, verify host bindings"})

    # content scan over everything that survived
    for root, dirs, files in os.walk(profile_dir):
        for name in files:
            p = Path(root) / name
            rel = p.relative_to(profile_dir).as_posix()
            try:
                raw = p.read_bytes()
            except OSError:
                continue
            if looks_binary(raw):
                stats["kept_bytes"] += len(raw)
                stats["kept_files"] += 1
                continue
            text = raw.decode("utf-8", errors="replace")
            text = scan_text(rel, text, review, high)
            if p.suffix.lower() in TEXT_SUFFIXES or p.name in ("SOUL.md", "config.yaml"):
                p.write_text(text, encoding="utf-8")  # persists home-path redaction
            stats["kept_files"] += 1
            stats["kept_bytes"] += len(raw)

    review = review[:MAX_REVIEW_ITEMS]
    high = high[:MAX_REVIEW_ITEMS]
    return {"dropped": dropped, "redacted_files": redacted_files,
            "review": review, "high": high, "stats": stats}


def _rm_tree(p: Path):
    if p.is_dir():
        import shutil
        shutil.rmtree(p, ignore_errors=True)
    else:
        try:
            p.unlink()
        except OSError:
            pass


# ------------------------------------------------------------- I/O

def open_source(args):
    """Return (profile_dir, cleanup_fn)."""
    src = Path(args.input).expanduser()
    if src.is_dir():
        profile = src if (src / "SOUL.md").exists() or (src / "config.yaml").exists() else None
        if profile is None:
            candidates = [d for d in src.iterdir() if d.is_dir()
                          and (d / "SOUL.md").exists() or (d / "config.yaml").exists()]
            profile = candidates[0] if candidates else None
        if profile is None:
            raise SystemExit(f"input dir {src} does not look like a Hermes profile")
        return profile, (lambda: None)
    if not src.suffixes and not tarfile.is_tarfile(src):
        raise SystemExit(f"not a tar archive: {src}")
    tmp = Path(tempfile.mkdtemp(prefix="agent-scrub-"))
    with tarfile.open(src, "r:gz") as t:
        members = t.getmembers()
        tops = {m.name.split("/", 1)[0] for m in members if m.name}
        if not all(t in tops for t in tops):  # sanity
            pass
        for m in members:
            # guard: no absolute paths or .. traversal
            if m.name.startswith("/") or ".." in m.name.split("/"):
                continue
            t.extract(m, tmp, filter="data")
    tops = [d for d in tmp.iterdir() if d.is_dir()]
    profile = tops[0] if tops else tmp
    return profile, (lambda: __import__("shutil").rmtree(tmp, ignore_errors=True))


def pack(profile_dir: Path, out: Path) -> str:
    out.parent.mkdir(parents=True, exist_ok=True)
    with tarfile.open(out, "w:gz") as t:
        t.add(profile_dir, arcname=profile_dir.name)
    h = hashlib.sha256(out.read_bytes()).hexdigest()
    return h


def rescan(profile_dir: Path) -> list:
    """Re-scan the FINAL tree for high-confidence secrets only."""
    hits = []
    for root, dirs, files in os.walk(profile_dir):
        for name in files:
            p = Path(root) / name
            rel = p.relative_to(profile_dir).as_posix()
            try:
                raw = p.read_bytes()
            except OSError:
                continue
            if looks_binary(raw):
                continue
            text = raw.decode("utf-8", errors="replace")
            for cat, pat in HIGH_PATTERNS.items():
                for m in pat.finditer(text):
                    hits.append({"file": rel, "pattern": cat,
                                 "line": text.count("\n", 0, m.start()) + 1,
                                 "snippet": snippet_for(text, m)})
    return hits


def main():
    ap = argparse.ArgumentParser(description="Sanitize a Hermes profile export for sharing.")
    ap.add_argument("input", help="profile .tar.gz export or unpacked profile directory")
    ap.add_argument("-o", "--output", help="output tar.gz (default: <input>.clean.tar.gz)")
    ap.add_argument("--report", help="report .json path (default: alongside output, .scrub-report.json)")
    ap.add_argument("--keep-all-skills", action="store_true",
                    help="keep every bundled skill (default: only used + custom skills)")
    args = ap.parse_args()

    profile, cleanup = open_source(args)
    try:
        result = process(profile, args)
    finally:
        pass  # keep tree for rescan

    out = Path(args.output).expanduser() if args.output else \
        Path(str(Path(args.input).expanduser()) + ".clean.tar.gz")
    report_path = Path(args.report).expanduser() if args.report else \
        out.with_suffix("").with_suffix(".scrub-report.json") if out.suffix == ".tar.gz" \
        else out.with_suffix(".scrub-report.json")

    hits = rescan(profile)
    pack_ok = not hits
    sha = pack(profile, out) if pack_ok else None

    report = {
        "tool": TOOL_NAME, "version": TOOL_VERSION,
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
        "source": str(Path(args.input).expanduser()),
        "profile": profile.name,
        "output": str(out) if pack_ok else None,
        "output_sha256": sha,
        "status": "pass" if pack_ok else "FAIL",
        "summary": {
            "kept_files": result["stats"]["kept_files"],
            "kept_bytes": result["stats"]["kept_bytes"],
            "dropped_entries": len(result["dropped"]),
            "config_fields_redacted": len(result["redacted_files"]),
            "review_items": len(result["review"]),
            "high_confidence_hits": len(hits),
        },
        "dropped": result["dropped"][:500],
        "redacted_files": result["redacted_files"],
        "needs_review": result["review"],
        "high_confidence_hits": hits,
        "gaf_mapping": {
            "portable": ["SOUL.md", "memories/MEMORY.md", "memories/USER.md (review personal content)",
                         "skills/** (used + custom)", "assets/avatar.png", "config.yaml (redacted — model choice only)"],
            "needs_review": "see needs_review" if result["review"] else "none",
            "dropped": "see dropped (state.db, transcripts, curator backups, auth, caches, bins)",
        },
    }
    report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    cleanup()

    print(f"✔ scrub complete → {out}")
    print(f"  kept {report['summary']['kept_files']} files / {report['summary']['kept_bytes'] // 1024} KiB, "
          f"dropped {report['summary']['dropped_entries']} entries, "
          f"redacted {len(result['redacted_files'])} config files, "
          f"{report['summary']['review_items']} review items")
    print(f"  report: {report_path}")
    if hits:
        print(f"\n✖ RE-SCAN FAILED: {len(hits)} high-confidence secret(s) in the output. DO NOT SHARE.")
        for h in hits[:10]:
            print(f"    - {h['file']}:{h['line']} [{h['pattern']}] …{h['snippet']}…")
        return 1
    print("  re-scan: clean (0 high-confidence secrets)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
