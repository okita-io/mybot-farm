#!/usr/bin/env python3
"""Rebuild the three audited team packs: real member names, logical pipeline order, lane briefs, packVersion 2."""
import json, sys
from pathlib import Path
ROOT = Path(sys.argv[1]).resolve()
PACKS = [ROOT / "packs/teams", ROOT / "web/public/packs/teams"]
TEAMCAT = ROOT / "web/src/data/team-catalog.generated.json"

def jload(p): return json.loads(p.read_text(encoding="utf-8"))
def jdump(p, d): p.write_text(json.dumps(d, indent=2, ensure_ascii=True) + "\n", encoding="utf-8")

TEAMS = {
  "gis-spatial-desk": {
    "order": [  # (agent slug, role, display name, summary)
      ("analyst", "gis-analysis", "GIS Analyst", "GIS Analyst — gis-analysis: scopes the question, inventories sources and CRS, and runs final QA and cartography."),
      ("spatial-data-engineer", "spatial-pipelines", "Spatial Data Engineer", "Spatial Data Engineer — spatial-pipelines: ingests, cleans, and validates the data; owns the refresh pipeline."),
      ("geoprocessing-specialist", "geoprocessing", "Geoprocessing Specialist", "Geoprocessing Specialist — geoprocessing: runs the analysis (service areas, overlays) as a repeatable tool, ArcPy or open-source."),
      ("web-gis-developer", "web-maps", "Web GIS Developer", "Web GIS Developer — web-maps: publishes the QA'd layers as a fast public web map."),
    ],
    "lane_briefs": [],
  },
  "finance-office": {
    "order": [
      ("bookkeeper-controller", "books", "Bookkeeper & Controller", "Bookkeeper & Controller — books: reconciliations, proposed journal entries, and the month-end close."),
      ("fpa-analyst", "fpa", "FP&A Analyst", "FP&A Analyst — fpa: budget, rolling forecast, and variance analysis on the closed books."),
      ("tax-strategist", "tax", "Tax Strategist", "Tax Strategist — tax: tax-planning questions and options for a qualified professional to review."),
      ("financial-analyst", "analysis", "Financial Analyst", "Financial Analyst — analysis: base/upside/downside models and the board-pack narrative."),
    ],
    "lane_briefs": [
      "- Not financial, tax, or investment advice. Nobody posts to the live ledger, files with a tax authority, or moves money; the human (and their CPA) approves every money move.",
    ],
  },
  "career-desk": {
    "order": [
      ("resume-tailor", "resume", "Resume Tailor", "Resume Tailor — resume: intake, target role, and a truthful tailored resume per posting."),
      ("ats-validator-architect", "ats", "ATS Validator Architect", "ATS Validator Architect — ats: checks the tailored resume parses cleanly and scores keyword recall against the posting."),
      ("recruitment-specialist", "sourcing", "Recruitment Specialist", "Recruitment Specialist — sourcing (candidate side): target-company list, channels, and the application tracker."),
      ("coach", "interview-coaching", "Sales Coach", "Sales Coach — interview-coaching: mock interviews and offer-negotiation prep, using its question-led coaching method."),
    ],
    "lane_briefs": [
      "- Lane briefs for this desk. Recruitment Specialist (an employer-side recruiter) and Sales Coach (a sales-team coach) are re-scoped here to work for the job seeker:",
      "  - Recruitment Specialist: work for the candidate, not an employer. Build the target-company list, pick channels, and keep the application tracker. Use the employer-side skills (campus recruiting, headhunter management, PRC labor law) only when the user asks.",
      "  - Sales Coach: coach the candidate for interviews and offer negotiation (STAR stories, mock questions, one behavioral takeaway per session). Don't run sales pipeline or deal reviews here.",
      "  - ATS Validator Architect: check the candidate's resume file. Don't design or build ATS software here.",
      "- Never invent jobs, credentials, or metrics. Never apply, message recruiters, or send anything on the user's behalf.",
    ],
  },
}

def names(order): return ", ".join(o[2] for o in order)

def rebuild(slug, pack, spec):
    order = spec["order"]
    p = pack["profile"]
    title = p["title"]
    n = len(order)
    p["description"] = f"A {n}-agent team (pipeline): {names(order)}. {title}"
    pack["members"] = [{"role": r, "summary": s, "pack": f"agents/{a}.hermes.tar.gz"} for a, r, _, s in order]
    chain = " → ".join(f"{r} ({nm})" for _, r, nm, _ in order)
    first, last = order[0][1], order[-1][1]
    pack["topology"]["handoffs"] = [
        f"User request → {chain} → human reviews and ships. Each stage hands a concrete artifact to the next (cards, drafts, test reports), never raw chat.",
        f"Re-work loop: if the {last} output is rejected (by the human or a downstream gate) → the failing stage gets a re-work note with the specific gap → re-runs only the failed stage → artifact flows down again. No stage silently rewrites an earlier stage's work.",
        f"Scope drift: if the request lands outside {first}'s lane → {first} says so in the first turn and re-scopes with the human before any member starts work.",
    ]
    rules = pack["skills"][0]
    old = rules["content"]
    sample = old.split("- Sample request this crew is tuned for: ", 1)[1].strip()
    lines = [
        f"{p['name']} standing rules:",
        "- The human owns the final decision. Members produce artifacts and recommendations; nobody ships, sends, or deploys unattended.",
        f"- Lane discipline: {names(order)} each stay in their role. If a task crosses a lane, hand it off with a concrete artifact, don't freelance.",
        "- First turn of a new request: state the plan (who does what, in what order) and the one question that blocks it, if any. Then work.",
        "- Quiet when idle: no status chatter unless a handoff, a conflict, or a decision-for-human actually happened.",
        *spec["lane_briefs"],
        f"- Sample request this crew is tuned for: {sample}",
    ]
    rules["content"] = "\n".join(lines) + "\n"
    rules["description"] = f"Use when working as a member of the {p['name']} crew: lanes, handoffs, and who decides."
    pack["shared"]["memory"][0]["content"] = f"{p['name']}: {names(order)} work as one crew. Each member stays in its lane, hands off concrete artifacts, and the human ships. Quiet when idle."
    imports = ", ".join(f"hermes profile import agents/{a}.hermes.tar.gz --name {a}" for a, *_ in order)
    gs = pack["shared"]["gettingStarted"]
    head, rest = gs.split("1. Import the member profiles: ", 1)
    tail = rest.split(". Verify all appear", 1)[1]
    gs = head + "1. Import the member profiles: " + imports + ". Verify all appear" + tail
    import re
    gs = re.sub(r"\(order: [^)]*\)", f"(order: {names(order)})", gs)
    gs = re.sub(r"the last member \([^)]*\) integrates", f"the last member ({order[-1][2]}) integrates", gs)
    pack["shared"]["gettingStarted"] = gs
    pack["packVersion"] = 2
    return pack

def main():
    cat = jload(TEAMCAT)
    for slug, spec in TEAMS.items():
        a = jload(PACKS[0] / f"{slug}.json")
        assert a == jload(PACKS[1] / f"{slug}.json") == cat["packs"][slug], slug
        new = rebuild(slug, a, spec)
        for d in PACKS:
            jdump(d / f"{slug}.json", new)
        cat["packs"][slug] = new
        for st in cat["stalls"]:
            if st["slug"] == slug:
                st["members"] = [{"name": nm, "href": f"/packs/agents/{ag}.hermes.tar.gz"} for ag, _, nm, _ in spec["order"]]
        print("team", slug, "ok")
    jdump(TEAMCAT, cat)

if __name__ == "__main__":
    main()
