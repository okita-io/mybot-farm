# scripts/ — agent-scrub

**Canonical source:** this file on `main` in [`okita-io/mybot-farm`](https://github.com/okita-io/mybot-farm/tree/main/scripts).
Farm mirror (same bytes when deployed): `https://mybot.farm/scripts/scrub.py`.
Prefer pinning a commit SHA when agents `curl` the raw GitHub URL.

Tooling for the mybot.farm sharing pipeline. Right now one tool:

| File | What it is |
|---|---|
| [`scrub.py`](./scrub.py) | Sanitizes a Hermes agent profile export so it can be safely shared |
| `share-agent-scrub/SKILL.md` | Hermes skill that drives it (persona-facing workflow) — landing next |

---

## What `scrub.py` does

Hermes agents are exportable (`hermes profile export <name>` → a `.tar.gz` of
the whole profile: persona, memory, skills, config, **and** chat history,
auth tokens, machine paths, caches). An export is the wrong shape to share.

`scrub.py` turns an export into a **clean pack** + a machine-readable report,
using the GAF doctrine from
[`docs/generic-agent-format.md`](../docs/generic-agent-format.md): every field
lands as `portable | needs_review | dropped`. Scrubbing is **deterministic** —
no LLM decides what a secret is.

Three layers, in order:

1. **Structural drop** — files that never belong in a shared pack:
   `state.db` (all chat transcripts), `.curator_backups/` (can hold prompt
   fragments), `auth.json`/`auth.lock`, `.env*`, `cache/`, `audio_cache/`,
   `bin/`, logs, lock files.
2. **Field redaction** — credential-looking values in `config.yaml`
   (`api_key`, `token`, `password`, `connection_string`, …, plus value
   patterns like `sk-…`, `ghp_…`, `AKIA…`, `xox…`, JWTs) are replaced with
   `[REDACTED]`. Personal LAN endpoints (`base_url`) are *flagged*, not
   rewritten — the target install may or may not have the same topology.
3. **Content scan** — everything that survives is scanned:
   private-key blocks, OpenAI/GitHub/AWS/Slack/JWT patterns, connection
   strings, plus advisory patterns (emails, home paths, LAN IPs/URLs).
   High-confidence hits **fail the run** (exit 1, no pack written);
   advisory hits land in `needs_review` for a human.

After writing the pack, the output is **re-scanned** for high-confidence
secrets. A pack with any hit is not written and the run exits non-zero.
That re-scan gate is the difference between "I think this is clean" and
"I verified this is clean."

### Skill selection

Bundled skills ship in every export (~100+ of them, most never used). By
default only **used** skills (per the profile's `skills/.usage.json`) and
**custom** skills (agent-authored, not in `.bundled_manifest`) survive —
that's the "what makes this agent *this* agent" set. Use
`--keep-all-skills` for a heavier pack.

## Usage

```bash
# 0. export the profile (read-only, does not touch the live agent)
hermes profile export my-agent
#    → ~/.hermes/profile-exports/my-agent-20260911-142553.tar.gz

# 1. scrub it
python3 scripts/scrub.py ~/.hermes/profile-exports/my-agent-20260911-142553.tar.gz \
  -o /tmp/my-agent-share.tar.gz \
  --report /tmp/my-agent.scrub-report.json

# 2. check the report
python3 -c "import json; r=json.load(open('/tmp/my-agent.scrub-report.json'))
print(r['status'], r['output_sha256'], r['summary'])"

# 3. spot-check the pack
tar -tzf /tmp/my-agent-share.tar.gz | grep -E 'state\.db|auth\.json|\.curator_backups' || echo clean
```

### Options

| Flag | Default | Meaning |
|---|---|---|
| `input` | — | the `.tar.gz` export, **or** an unpacked profile directory (or a dir containing one) |
| `-o / --output` | `<input>.clean.tar.gz` | clean pack destination |
| `--report` | `<output>.scrub-report.json` | report destination |
| `--keep-all-skills` | off | keep every bundled skill, not just used+custom |

### Exit codes

| Code | Meaning |
|---|---|
| `0` | clean pack written; re-scan passed — safe to share |
| `1` | re-scan found a high-confidence secret — **do not share**; inspect `high_confidence_hits` in the report |
| `2` | input error (not an export, unreadable, no profile found) |

## Report shape

```jsonc
{
  "tool": "agent-scrub", "version": "0.1.0",
  "status": "pass",                    // or "FAIL"
  "output": "/tmp/my-agent-share.tar.gz",
  "output_sha256": "…",
  "summary": {
    "kept_files": 412, "kept_bytes": 812345,
    "dropped_entries": 7500,
    "config_fields_redacted": 1,
    "review_items": 14,
    "high_confidence_hits": 0
  },
  "dropped": [ "state.db", "auth.json", "skills/claude-code/ (bundled, unused)", … ],
  "redacted_files": [ "config.yaml" ],
  "needs_review": [
    { "file": "cron/jobs.json", "pattern": "routine_binding", "severity": "review",
      "snippet": "cron routine kept — translate to GAF intent, verify host bindings" }
  ],
  "high_confidence_hits": [],
  "gaf_mapping": { "portable": […], "needs_review": "…", "dropped": "…" }
}
```

## Relationship to the site pipeline

```
hermes profile export ──► scrub.py ──► clean pack ──► mybot.farm upload/normalize ──► GAF
   (raw, private)        (this tool)   (shareable)      (server-side, GAF doc)         (agent.gaf.json)
```

`scrub.py` is the Hermes→GAF **edge translator's first step** — the same
code path works client-side (this script) and can run server-side on uploads,
so what a farmer sees locally is exactly what the bot page serves. The GAF JSON
itself is *not* built here; the marketplace translator maps `SOUL.md` +
`memories/` → `memory[]`, kept skills → `skills[]`, `cron/` → `routines[]`,
identity → `profile`, per the translator contract in
[`docs/generic-agent-format.md`](../docs/generic-agent-format.md)
(`toGAF(source) -> {gaf, report}`, fields `portable | needs_review | dropped`).

## Safety notes

- **Never ship the original export.** It contains `auth.json` and full
  session history. Only the scrubbed output leaves the machine.
- **Don't hand-edit the clean pack** — any change invalidates the re-scan.
  Fix the source profile, re-export, re-scrub.
- **Binary blobs inside skills are not content-scanned** (binary detection
  skips them). If a kept skill ships a binary (`bin/`, model weights,
  precompiled helpers), open it before publishing.
- `needs_review` items are a **conversation with the author**, not silent
  rewrites. Personal endpoints, emails, and routine bindings survive until a
  human says otherwise — that's deliberate.

## Testing

The repo ships no unit suite for this yet; the contract to test against:

1. **Canary**: plant `api_key: sk-abcdef0123456789abcdef` in a fixture
   profile's `config.yaml` → expect `[REDACTED]` in output, entry in
   `redacted_files`.
2. **High-confidence**: plant a JWT in `SOUL.md` → expect exit 1, no pack,
   hit in `high_confidence_hits`.
3. **Structural**: fixture with `state.db`, `auth.json`, `.env` → none appear
   in the clean pack (`tar -tzf` grep).
4. **Skill selection**: fixture with one used bundled skill + one unused →
   only the used one kept; `--keep-all-skills` keeps both.
5. **Home paths**: `/Users/someone/x` in a kept skill → rewritten to `~/x`.

Run `scrub.py` against a real `hermes profile export` of a disposable test
profile first — that's the only input with all the edge cases (curator blobs,
usage tracking, host-only frontmatter).
