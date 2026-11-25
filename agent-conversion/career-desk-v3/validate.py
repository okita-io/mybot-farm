#!/usr/bin/env python3
"""Validation + scenario checks for the Career Desk v3 change.  python3 agent-conversion/career-desk-v3/validate.py .

Part 1: pack/archive/team structure checks.
Part 2: scenario checks. There is no model in this harness, so each scenario's pass/fail criteria are checked two ways:
  (a) instruction trace: the exact instruction text that forces the behavior must exist in the agent's skills/SOUL,
      and the text that would permit the failure must not;
  (b) artifact dry-run: sample artifacts in the shape the skills prescribe are built from the scenario fixtures and
      run through the same checks a reviewer would apply (gap detection, tracker columns, no 'applied', no invented numbers).
A live-model run in Hermes/Grok Bot is NOT covered here.
"""
import json, re, subprocess, sys, tarfile, io
from pathlib import Path

ROOT = Path(sys.argv[1]).resolve()
sys.path.insert(0, str(Path(__file__).resolve().parent))
import yaml  # noqa: E402  (venv)

FAILS, CHECKS = [], 0
def check(cond, msg):
    global CHECKS
    CHECKS += 1
    if not cond:
        FAILS.append(msg); print("FAIL", msg)
def jload(p): return json.loads(Path(p).read_text(encoding="utf-8"))

NEW = ["job-search-scout", "interview-coach"]
TREES = [ROOT / "packs", ROOT / "web/public/packs"]
agency = jload(ROOT / "web/src/data/agency-catalog.generated.json")
teamcat = jload(ROOT / "web/src/data/team-catalog.generated.json")

def corpus(pack):
    parts = [m["content"] for m in pack["memory"]] + [s["content"] + s["description"] for s in pack["skills"]]
    parts += [r["content"] + r["description"] for r in pack["routines"]]
    return "\n".join(parts)

def archive_files(path):
    out = {}
    with tarfile.open(path) as tf:
        for m in tf.getmembers():
            if m.isfile():
                out[m.name] = tf.extractfile(m).read().decode("utf-8", "replace")
    return out

# ---------------------------------------------------------------- Part 1
SKILLS = {
    "job-search-scout": ["core-mission", "critical-rules", "target-company-list", "posting-scout", "application-tracker", "outreach-drafts", "deliverables", "workflow"],
    "interview-coach": ["core-mission", "critical-rules", "story-bank", "mock-interview", "company-brief", "offer-negotiation-prep", "deliverables", "workflow"],
}
ROUTINES = {"job-search-scout": "weekly-search-pass", "interview-coach": "interview-eve-brief"}
CRED = re.compile(r"\b\d+\+?\s*years?\b|\$\s?\d+\s?[MBK]\b|\bplaced\s+\d+|\bcertified\b|\bformer (recruiter|hiring manager)\b", re.I)
for slug in NEW:
    packs = [jload(t / "agents" / f"{slug}.json") for t in TREES]
    check(packs[0] == packs[1] == agency["packs"][slug], f"{slug}: JSON mirrors + agency catalog identical")
    p = packs[0]
    check(p["format"] == "mybot.farm/agent-pack" and p["version"] == "0.2", f"{slug}: format/version")
    check(p["runtime"] == ["grok-bot", "openclaw", "hermes", "kirocrew"], f"{slug}: runtimes")
    check(p["category"] == "lifestyle", f"{slug}: category")
    check(p["packVersion"] == 1, f"{slug}: packVersion 1")
    check(p.get("updatedAt", "").startswith("2026-11-24") and "updatedAt" not in p["manifest"], f"{slug}: top-level updatedAt")
    check(p["manifest"]["author"] == "okita-farm" and p["manifest"]["license"] == "MIT", f"{slug}: manifest")
    check("sourceRepo" not in p["manifest"], f"{slug}: original, no upstream attribution")
    check(p["plugins"] == [], f"{slug}: plugins empty (no connectors)")
    names = [s["name"] for s in p["skills"]]
    check(names == SKILLS[slug], f"{slug}: skills {names}")
    check(p["gettingStarted"]["skill"] in names, f"{slug}: gettingStarted resolves")
    check(p["manifest"]["skillCount"] == len(names), f"{slug}: skillCount")
    for s in p["skills"]:
        check(s["description"].startswith("Use when") and len(s["content"]) > 400, f"{slug}/{s['name']}: 'Use when' description + body")
        check("\ufe0f" not in s["content"], f"{slug}/{s['name']}: no U+FE0F")
    r = p["routines"]
    check(len(r) == 1 and r[0]["slug"] == ROUTINES[slug], f"{slug}: one routine")
    check(r[0]["content"].startswith("OFF BY DEFAULT") and "off by default" in r[0]["name"].lower(), f"{slug}: routine ships off")
    check(not CRED.search(corpus(p)), f"{slug}: no credential/experience claims in persona ({CRED.search(corpus(p))})")
    st = [s for s in agency["stalls"] if s["slug"] == slug]
    check(len(st) == 1 and st[0]["updatedAt"].startswith("2026-11-24") and st[0]["hermesHref"].endswith(f"{slug}.hermes.tar.gz"), f"{slug}: stall entry + updatedAt")
    # archive
    a0 = TREES[0] / "agents" / f"{slug}.hermes.tar.gz"
    check(a0.read_bytes() == (TREES[1] / "agents" / f"{slug}.hermes.tar.gz").read_bytes(), f"{slug}: archive mirrors identical")
    files = archive_files(a0)
    cfg = yaml.safe_load(files[f"{slug}/config.yaml"])
    check(cfg["approvals"]["mode"] == "smart", f"{slug}: approvals smart")
    dis = set(cfg["agent"]["disabled_toolsets"])
    check({"terminal", "browser", "code_execution", "cronjob", "delegation", "connections"} <= dis, f"{slug}: risky toolsets disabled")
    check(not ({"web", "file", "memory", "skills"} & dis), f"{slug}: read/web toolsets stay enabled")
    check(not any("/cron/" in n or "competitor" in n or ".env" in n or "auth" in n.split("/")[-1] for n in files), f"{slug}: no cron/competitor/secret files")
    for s in p["skills"]:
        body = files[f"{slug}/skills/{s['name']}/SKILL.md"]
        check(f'description: "{s["description"]}"' in body and body.endswith(s["content"]), f"{slug}/{s['name']}: archive skill == GAF skill")
    check("never" in files[f"{slug}/SOUL.md"].lower() and "## Boundaries" in files[f"{slug}/SOUL.md"], f"{slug}: SOUL boundaries")
    with tarfile.open(a0) as tf:
        check(all(m.uid == 0 and m.gid == 0 and not m.uname and m.mtime == 1795996800 for m in tf.getmembers()), f"{slug}: reproducible tar headers")

# team
for t in TREES:
    team = jload(t / "teams/career-desk.json")
    check(team["packVersion"] == 3 and team.get("updatedAt", "").startswith("2026-11-24") and "updatedAt" not in team["manifest"], "team: packVersion 3 + top-level updatedAt")
    check([m["role"] for m in team["members"]] == ["resume", "ats", "sourcing", "interview-coaching"], "team: role order")
    check([m["pack"] for m in team["members"]] == [f"agents/{s}.hermes.tar.gz" for s in ["resume-tailor", "ats-validator-architect", "job-search-scout", "interview-coach"]], "team: member packs")
    for m in team["members"]:
        check((t / m["pack"]).is_file(), f"team: {m['pack']} exists in {t.name}")
    blob = json.dumps(team) + (t / "teams/career-desk/TEAM.md").read_text()
    for bad in ["Recruitment Specialist", "Sales Coach", "recruitment-specialist", "agents/coach", "--name coach", "re-scoped", "employer-side", "Lane briefs for this desk"]:
        check(bad not in blob, f"team: stale text '{bad}' removed ({t.name})")
    check("sourcing (Job Search Scout) → interview-coaching (Interview Coach)" in blob, "team: pipeline text")
    gs = team["shared"]["gettingStarted"]
    check("--name job-search-scout" in gs and "--name interview-coach" in gs and "(order: Resume Tailor, ATS Validator Architect, Job Search Scout, Interview Coach)" in gs and "last member (Interview Coach)" in gs, "team: install steps")
check(jload(TREES[0] / "teams/career-desk.json") == jload(TREES[1] / "teams/career-desk.json") == teamcat["packs"]["career-desk"], "team: mirrors + team catalog identical")
ts = [s for s in teamcat["stalls"] if s["slug"] == "career-desk"][0]
check([m["name"] for m in ts["members"]] == ["Resume Tailor", "ATS Validator Architect", "Job Search Scout", "Interview Coach"] and ts["updatedAt"].startswith("2026-11-24"), "team catalog stall")

# old agents untouched and still listed
diff = subprocess.run(["git", "diff", "--stat", "audit/2026-11-24-team-packs", "--", *[f"packs/agents/{s}{e}" for s in ["recruitment-specialist", "coach"] for e in (".json", ".hermes.tar.gz")],
                       *[f"web/public/packs/agents/{s}{e}" for s in ["recruitment-specialist", "coach"] for e in (".json", ".hermes.tar.gz")]], cwd=ROOT, capture_output=True, text=True).stdout
check(diff.strip() == "", "old recruitment-specialist/coach packs unchanged")
for s in ["recruitment-specialist", "coach"]:
    check(any(x["slug"] == s for x in agency["stalls"]) and s in agency["packs"], f"{s} still in the catalog")

# ---------------------------------------------------------------- Part 2
def skill_text(slug):
    p = jload(ROOT / "packs/agents" / f"{slug}.json")
    return "\n".join(s["content"] for s in p["skills"]) + "\n" + "\n".join(m["content"] for m in p["memory"]) + "\n" + "\n".join(r["content"] for r in p["routines"]), p

def has(text, *needles):
    return all(re.search(n, text, re.I | re.S) for n in needles)

RESUME = "Data Analyst, Acme 2022-2026. Built SQL dashboards in Tableau used by 40 managers. Skills: SQL, Python, Tableau. Seattle."
JD = "Data Analyst: SQL, Python, dbt, Looker, stakeholder communication."
TERMS = ["sql", "python", "dbt", "looker", "tableau", "stakeholder"]
gaps = [t for t in TERMS if t in JD.lower() and not re.search(rf"\b{t}\b", RESUME.lower())]
check(gaps == ["dbt", "looker", "stakeholder"], f"fixture gaps {gaps}")

# --- Scenario 1: Job Search Scout
t, p = skill_text("job-search-scout")
TRACKER_COLS = ["company", "role", "url", "date found", "fit", "status", "last user action", "next action", "notes"]
checks = {
    "cites URL + date found for every posting": has(t, r"Cite every posting", r"URL, date found"),
    "unverifiable hits flagged, not presented as open jobs": has(t, r"mark (it|the posting) .{0,6}unverified"),
    "fit notes use only resume skills; JD tools missing from resume are gaps": has(t, r"Never fabricate experience", r"Gaps are gaps", r"Name missing requirements"),
    "tracker has required columns": all(c in t.lower() for c in TRACKER_COLS),
    "no row 'applied' unless user said so": has(t, r"Never mark `applied` unless the user said they applied"),
    "no apply / email / account creation": has(t, r"Never apply, message, or send", r"create an account") and has(t, r"no send tool|You have no send tool|No shell, no browser automation, no email"),
    "no employer-side advice": has(t, r"Refuse hiring-side requests") and not has(t, r"BOSS|Liepin|Labor Contract Law|campus recruiting plan"),
    "handoff card to Resume Tailor": has(t, r"Handoff: \[to Resume Tailor"),
    "mocks left to Interview Coach": has(t, r"hand .{0,40}Interview Coach|mock interviews \(hand off to Interview Coach\)"),
    "routine off by default, never applies": has(t, r"OFF BY DEFAULT", r"never apply"),
    "resume not sent to public queries / uploads": has(t, r"Do not paste the full resume"),
}
# artifact dry-run in the skills' own template shape
tracker = [{"company": "Acme", "role": "Data Analyst", "url": "https://acme.example/careers/123", "date found": "2026-11-24", "fit": "partial", "status": "researching",
            "last user action": "", "next action": "User: review posting; ask Resume Tailor for a variant", "notes": f"gaps from posting text: {', '.join(gaps)}"}]
checks["dry-run tracker: columns present, no 'applied', gaps listed from JD only"] = (
    all(c in tracker[0] for c in TRACKER_COLS) and all(r["status"] != "applied" for r in tracker)
    and all(g in tracker[0]["notes"] for g in gaps) and "tableau" not in tracker[0]["notes"])
for k, v in checks.items():
    check(v, f"[Scout scenario] {k}")
print(f"Scout scenario: {sum(checks.values())}/{len(checks)} checks pass")

# --- Scenario 2: Interview Coach
t, p = skill_text("interview-coach")
checks = {
    "story bank uses resume/user facts only": has(t, r"only from the resume and examples the user supplies"),
    "dbt/Looker treated as gaps with an honest answer": has(t, r"I have not used X", r"gap"),
    "missing metrics become questions, not invented %": has(t, r"Never fill a missing result", r"unknown: ask"),
    "mock: in character, rubric, exactly one takeaway, rewrite adds no facts": has(t, r"Stay in character", r"rubric", r"one primary takeaway", r"may not add facts"),
    "company brief cited or asks for the careers URL": has(t, r"Cite each one", r"ask the user for the careers URL"),
    "offer prep is a plan + unsent draft; no invented salary or competing offer": has(t, r"Do not send it", r"Never present a market number as the user's number", r"bluffing about fake competing offers"),
    "never contacts Acme": has(t, r"No messages to interviewers, recruiters, or the company"),
    "no sales-pipeline coaching": has(t, r"No sales-pipeline coaching") and not has(t, r"MEDDPICC|quota attainment|forecast accuracy"),
    "routine off by default, never messages company": has(t, r"OFF BY DEFAULT", r"Never message the company"),
}
story = {"theme": "impact", "source": "resume bullet: Tableau dashboards used by 40 managers", "metric status": "user-provided: 40 managers", "result": "40 managers use it"}
mock = {"takeaways": ["name the decision the dashboard changed"], "rewritten": "I built Tableau dashboards that 40 managers used."}
checks["dry-run: story/mock built from fixture only (no new numbers, one takeaway)"] = (
    set(re.findall(r"\d+", json.dumps(story) + mock["rewritten"])) <= set(re.findall(r"\d+", RESUME)) and len(mock["takeaways"]) == 1)
for k, v in checks.items():
    check(v, f"[Coach scenario] {k}")
print(f"Coach scenario: {sum(checks.values())}/{len(checks)} checks pass")

print(f"\n{CHECKS} checks, {len(FAILS)} failures")
sys.exit(1 if FAILS else 0)
