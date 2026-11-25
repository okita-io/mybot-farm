#!/usr/bin/env python3
"""Career Desk v3: add Job Search Scout + Interview Coach, rewire the career-desk team (packVersion 3).

    python3 agent-conversion/career-desk-v3/build.py .
    python3 scripts/gen_team_md.py

Writes (identically) to packs/ and web/public/packs/: agent JSON, .hermes.tar.gz, team JSON; plus
web/src/data/{agency,team}-catalog.generated.json. recruitment-specialist and coach are NOT touched:
they stay in the catalog as standalone agents and only leave the career-desk team.
Archives are reproducible: uid/gid 0, no owner names, fixed mtime/gzip header.
"""
import gzip, io, json, re, sys, tarfile, tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from agents import AGENTS, UPDATED  # noqa: E402

ROOT = Path(sys.argv[1]).resolve()
PACKS = [ROOT / "packs", ROOT / "web" / "public" / "packs"]
AGENCY = ROOT / "web/src/data/agency-catalog.generated.json"
TEAMCAT = ROOT / "web/src/data/team-catalog.generated.json"
MTIME = 1795996800  # 2026-11-24T00:00:00Z
UPDATED_ISO = f"{UPDATED}T00:00:00.000Z"
TEAM_SLUG = "career-desk"
PLANT_BASE = "resume-tailor"  # audited archive supplies the matched Hermes skills

# Hermes: read/web only. Everything else is switched off globally (agent.disabled_toolsets).
DISABLED_TOOLSETS = [
    "terminal", "browser", "code_execution", "cronjob", "delegation", "computer_use",
    "connections", "catalog", "kanban", "image_gen", "video_gen", "tts", "desktop_ui", "project",
]
CONFIG_TAIL = (
    "agent:\n"
    "  # Read/web only: no shell, browser automation, code execution, scheduling, or messaging connectors.\n"
    "  # Kept on: web (search + fetch), file (local tracker/notes), memory, skills, todo, clarify, vision.\n"
    "  disabled_toolsets:\n" + "".join(f"    - {t}\n" for t in DISABLED_TOOLSETS)
)


def jload(p): return json.loads(p.read_text(encoding="utf-8"))
def jdump(p, d, ascii_=False): p.write_text(json.dumps(d, indent=2, ensure_ascii=ascii_) + "\n", encoding="utf-8")


def gaf_pack(a):
    return {
        "format": "mybot.farm/agent-pack",
        "version": "0.2",
        "runtime": ["grok-bot", "openclaw", "hermes", "kirocrew"],
        "slug": a["slug"],
        "category": "lifestyle",
        "tags": a["tags"],
        "profile": {
            "name": a["name"], "title": a["title"], "description": a["description"],
            "avatar": a["avatar"],
        },
        "memory": a["memory"],
        "skills": a["skills"],
        "routines": a["routines"],
        "plugins": [],
        "gettingStarted": {"skill": a["gettingStarted"]},
        "manifest": {
            "author": "okita-farm",
            "license": "MIT",
            "homepage": f"https://mybot.farm/agents/{a['slug']}",
            "tags": a["tags"],
            "scrubbed": True,
            "skillCount": len(a["skills"]),
        },
        "exports": {"grokBotTemplate": {"enabled": True}},
        "packVersion": 1,
        "updatedAt": UPDATED_ISO,
    }


def soul_md(a):
    s = a["soul"]
    how = "\n".join(f"- {x}" for x in s["how"])
    bounds = "\n".join(f"- {x}" for x in s["boundaries"])
    routines = "\n".join(f"- `{r['slug']}`: {r['description']}" for r in a["routines"])
    return (
        f"# SOUL.md\n\nYou are **{a['name']}** ({a['slug']}) — {a['title'].rstrip('.')}.\n\n"
        f"## Identity\n\n{s['identity']}\n\n## How you work\n\n{how}\n\n## Boundaries\n\n{bounds}\n\n"
        f"## Routines (off by default)\n\n{routines}\n\nDo not create a cron job or run a routine unless the user explicitly asks.\n\n"
        "## Runtime\n\nYou run on Hermes Agent. Your agent-specific skills live under `skills/` in your profile, and matched "
        "Hermes skills (hermes-agent, ocr-and-documents) are available alongside them. Start any session by consulting your "
        "`memories/MEMORY.md` for who you are and where your knowledge lives.\n\n"
        f"## Voice\n\n{s['voice']}\n"
    )


def memory_md(a):
    n = len(a["skills"])
    return (
        f"# MEMORY.md\n\nI am **{a['name']}** ({a['slug']}) — {a['title'].rstrip('.')}.\n\n"
        "## Where my knowledge lives\n\n"
        f"- My agent skills (published from the mybot.farm GAF pack, {n} skills) are under `skills/` in this profile — one directory per skill, each with a `SKILL.md`.\n"
        "- Matched Hermes skills (`hermes-agent`, `ocr-and-documents`) live alongside them under their category directories.\n"
        "- Read the skill `SKILL.md` files when doing work in my specialty; they are my operating manual.\n\n"
        "## How to use me\n\n"
        "- I follow the workflows defined in my skills: start from my core mission, check my critical rules, then run the step-by-step workflow.\n"
        "- Ask me for outputs in the shape my deliverables skills define.\n\n"
        "## Security\n\n"
        "- Never include API keys, tokens, passwords, or connection strings in outputs; endpoint values stay redacted.\n"
        "- Resume text, contact details, salary numbers, and interview dates stay local. Never put them in public search queries.\n"
    )


def build_archive(a, dests):
    base_tar = PACKS[0] / "agents" / f"{PLANT_BASE}.hermes.tar.gz"
    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        with tarfile.open(base_tar) as tf:
            tf.extractall(tmp / "base", filter="data")
        base = tmp / "base" / PLANT_BASE
        root = tmp / a["slug"]
        (root / "memories").mkdir(parents=True)
        # matched Hermes skills, copied verbatim from the audited archive
        for rel in ("skills/autonomous-ai-agents", "skills/productivity/ocr-and-documents"):
            dst = root / rel
            dst.parent.mkdir(parents=True, exist_ok=True)
            import shutil
            shutil.copytree(base / rel, dst)
        cfg = (base / "config.yaml").read_text()
        assert "mode: smart" in cfg and "mode: 'off'" not in cfg
        (root / "config.yaml").write_text(cfg.rstrip("\n") + "\n" + CONFIG_TAIL)
        (root / "SOUL.md").write_text(soul_md(a))
        (root / "memories/MEMORY.md").write_text(memory_md(a))
        for s in a["skills"]:
            p = root / "skills" / s["name"] / "SKILL.md"
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_text(f'---\nname: {s["name"]}\ndescription: "{s["description"]}"\nversion: 1.0.0\n---\n\n{s["content"]}')
        buf = io.BytesIO()
        with tarfile.open(fileobj=buf, mode="w", format=tarfile.PAX_FORMAT) as out:
            for path in [root] + sorted(root.rglob("*")):
                info = out.gettarinfo(str(path), arcname=str(path.relative_to(tmp)))
                info.uid = info.gid = 0; info.uname = info.gname = ""; info.mtime = MTIME
                info.mode = 0o755 if path.is_dir() else 0o644
                if path.is_file():
                    with open(path, "rb") as fh: out.addfile(info, fh)
                else:
                    out.addfile(info)
        data = gzip.compress(buf.getvalue(), compresslevel=9, mtime=MTIME)
        for d in dests:
            d.write_bytes(data)


def stall_for(a):
    desc = a["description"]
    return {
        "kind": "agent", "slug": a["slug"], "name": a["name"], "title": a["title"],
        "description": desc,
        "seoDescription": f"Install {a['name']} from mybot.farm: {desc}"[:260],
        "category": "Lifestyle", "tone": "agent",
        "downloadHref": f"/packs/agents/{a['slug']}.json",
        "hermesHref": f"/packs/agents/{a['slug']}.hermes.tar.gz",
        "priceCents": 0, "listedAt": UPDATED_ISO, "updatedAt": UPDATED_ISO,
        "author": {"username": "okita-farm", "href": "/catalog?q=okita-farm"},
    }


TEAM_ORDER = [  # (slug, role, display name, summary)
    ("resume-tailor", "resume", "Resume Tailor", "Resume Tailor — resume: intake, target role, and a truthful tailored resume per posting."),
    ("ats-validator-architect", "ats", "ATS Validator Architect", "ATS Validator Architect — ats: checks the tailored resume parses cleanly and scores keyword recall against the posting."),
    ("job-search-scout", "sourcing", "Job Search Scout", "Job Search Scout — sourcing: sourced target-company list, screened postings, and the application tracker. Drafts outreach; never applies."),
    ("interview-coach", "interview-coaching", "Interview Coach", "Interview Coach — interview-coaching: story bank, mock interviews, company briefs, and offer-conversation prep. Never contacts anyone."),
]
SAMPLE = "Get me interview-ready in 30 days: tailored resumes, tracker for 40 target companies, and two mock interviews"


def names(order):
    return ", ".join(n for _, _, n, _ in order)


def rebuild_team(pack):
    order = TEAM_ORDER
    p = pack["profile"]
    p["description"] = (
        f"A {len(order)}-agent team (pipeline): {names(order)}. Tailor a truthful resume, check that it parses, run a "
        "sourced search with a tracker, and prep mocks. You apply and show up."
    )
    pack["members"] = [
        {"role": r, "summary": s, "pack": f"agents/{a}.hermes.tar.gz"} for a, r, _, s in order
    ]
    chain = " → ".join(f"{r} ({n})" for _, r, n, _ in order)
    first, last = order[0][1], order[-1][1]
    pack["topology"]["handoffs"] = [
        f"User request → {chain} → human reviews and ships. Each stage hands a concrete artifact to the next (tailored resume + change log, ATS scorecard, tracker + posting slate, mock recap + story bank), never raw chat.",
        f"Re-work loop: if the {last} output is rejected (by the human or a downstream gate) → the failing stage gets a re-work note with the specific gap → re-runs only the failed stage → artifact flows down again. An ATS fail or weak keyword recall goes back to resume with the scorecard. No stage silently rewrites an earlier stage's work.",
        "New posting: when sourcing finds a posting worth its own variant, it hands the JD and gap list to resume, then ats, in a batch the human agreed to. Never all targets unattended.",
        "Interview date: when the tracker gets one, sourcing hands a card (company, URL, date, resume pointer) to interview-coaching.",
        f"Scope drift: if the request lands outside {first}'s lane → {first} says so in the first turn and re-scopes with the human before any member starts work. A user with a settled resume may start at sourcing; a user with an interview this week may start at interview-coaching.",
    ]
    rules = pack["skills"][0]
    rules["description"] = f"Use when working as a member of the {p['name']} crew: lanes, handoffs, and who decides."
    rules["content"] = "\n".join([
        f"{p['name']} standing rules:",
        "- The human owns the final decision. Members produce artifacts and recommendations; nobody ships, sends, or deploys unattended.",
        f"- Lane discipline: {names(order)} each stay in their role. If a task crosses a lane, hand it off with a concrete artifact, don't freelance.",
        "- First turn of a new request: state the plan (who does what, in what order) and the one question that blocks it, if any. Then work.",
        "- Quiet when idle: no status chatter unless a handoff, a conflict, or a decision-for-human actually happened.",
        "- Lanes: Resume Tailor writes the truthful resume. ATS Validator Architect checks the candidate's resume file parses and scores keyword recall; it does not design ATS software here. Job Search Scout finds and tracks roles and drafts outreach. Interview Coach prepares the candidate from their real stories.",
        "- Never invent jobs, credentials, or metrics. Never apply, message recruiters, or send anything on the user's behalf. Drafts only.",
        "- Resume text, contact details, salary numbers, and interview dates stay local. Job Search Scout and Interview Coach use read, web search, and web fetch only.",
        f"- Sample request this crew is tuned for: {SAMPLE}.",
    ]) + "\n"
    pack["shared"]["memory"][0]["content"] = (
        f"{p['name']}: {names(order)} work as one crew. Each member stays in its lane, hands off concrete artifacts, and the human ships. Quiet when idle."
    )
    imports = ", ".join(f"hermes profile import agents/{a}.hermes.tar.gz --name {a}" for a, *_ in order)
    gs = pack["shared"]["gettingStarted"]
    head, rest = gs.split("1. Import the member profiles: ", 1)
    tail = rest.split(". Verify all appear", 1)[1]
    gs = head + "1. Import the member profiles: " + imports + ". Verify all appear" + tail
    gs = re.sub(r"\(order: [^)]*\)", f"(order: {names(order)})", gs)
    gs = re.sub(r"the last member \([^)]*\) integrates", f"the last member ({order[-1][2]}) integrates", gs)
    pack["shared"]["gettingStarted"] = gs
    pack["packVersion"] = 3
    pack["updatedAt"] = UPDATED_ISO
    return pack


def main():
    agency = jload(AGENCY)
    for a in AGENTS:
        pack = gaf_pack(a)
        for root in PACKS:
            jdump(root / "agents" / f"{a['slug']}.json", pack)
        build_archive(a, [root / "agents" / f"{a['slug']}.hermes.tar.gz" for root in PACKS])
        agency["packs"][a["slug"]] = pack
        agency["stalls"] = [s for s in agency["stalls"] if s["slug"] != a["slug"]] + [stall_for(a)]
        print("agent", a["slug"], "ok")
    agency["stalls"].sort(key=lambda s: s["slug"])
    agency["totalPacks"] = len(agency["packs"])
    agency["divisionCounts"]["farm-original"] = len(AGENTS)
    agency["divisionCounts"] = dict(sorted(agency["divisionCounts"].items()))
    jdump(AGENCY, agency)

    cat = jload(TEAMCAT)
    tp = [ROOT / "packs/teams", ROOT / "web/public/packs/teams"]
    base = jload(tp[0] / f"{TEAM_SLUG}.json")
    assert base == jload(tp[1] / f"{TEAM_SLUG}.json")
    assert base["packVersion"] == 3, "career-desk team must be at packVersion 3 before catalog rebuild"
    new = rebuild_team(base)
    for d in tp:
        jdump(d / f"{TEAM_SLUG}.json", new, True)
    cat["packs"][TEAM_SLUG] = new
    for st in cat["stalls"]:
        if st["slug"] == TEAM_SLUG:
            st["members"] = [{"name": n, "href": f"/packs/agents/{a}.hermes.tar.gz"} for a, _, n, _ in TEAM_ORDER]
            st["updatedAt"] = UPDATED_ISO
    jdump(TEAMCAT, cat, True)
    print("team", TEAM_SLUG, "ok")


if __name__ == "__main__":
    main()
