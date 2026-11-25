#!/usr/bin/env python3
"""2026-11-24 audit edits for gis-spatial-desk, finance-office, career-desk (+ their 12 member agents).
Applies identical edits to: packs/ + web/public/packs/ JSON, agency/team generated catalogs,
and the member .hermes.tar.gz archives (both mirrors). Idempotent-ish: run once on a clean tree."""
import gzip, io, json, re, shutil, sys, tarfile, tempfile
from pathlib import Path

ROOT = Path(sys.argv[1]).resolve()
PACKS = [ROOT / "packs", ROOT / "web" / "public" / "packs"]
AGENCY = ROOT / "web/src/data/agency-catalog.generated.json"
TEAMCAT = ROOT / "web/src/data/team-catalog.generated.json"
NEW_PACK_VERSION = 2
MTIME = 1795996800  # 2026-11-24T00:00:00Z, fixed for reproducible archives

def jload(p): return json.loads(p.read_text(encoding="utf-8"))
def jdump(p, d, ascii_): p.write_text(json.dumps(d, indent=2, ensure_ascii=ascii_) + "\n", encoding="utf-8")

DOMAIN = {
    "analyst": "GIS mapping, layer QC, and spatial query",
    "web-gis-developer": "web map",
    "spatial-data-engineer": "spatial data pipeline (ETL)",
    "geoprocessing-specialist": "geoprocessing automation",
    "bookkeeper-controller": "bookkeeping, reconciliation, and month-end close",
    "fpa-analyst": "budgeting, forecasting, and variance analysis",
    "tax-strategist": "tax planning",
    "financial-analyst": "financial modeling and scenario analysis",
    "resume-tailor": "resume tailoring",
    "recruitment-specialist": "recruiting operations",
    "ats-validator-architect": "ATS parsing and resume-scoring validation",
    "coach": "sales coaching",
}
ROUTE_DESC = {
    "core-mission": "Use when starting or scoping {d} work: what this agent owns and what done looks like.",
    "critical-rules": "Use when checking the must-follow rules before acting on or handing off {d} work.",
    "workflow": "Use when running the step-by-step {d} process.",
    "deliverables": "Use when producing {d} templates, examples, or finished artifacts.",
    "advanced-capabilities": "Use when {d} work needs advanced or edge-case techniques.",
}
CUSTOM_DESC = {
    ("analyst", "core-tool-proficiency"): "Use when choosing desktop or web GIS tools (ArcGIS Pro, QGIS, ArcGIS Online) or data formats for a mapping task.",
    ("web-gis-developer", "tech-stack"): "Use when choosing a web mapping library, tile server, or vector-tile tooling.",
    ("spatial-data-engineer", "core-tools"): "Use when picking Python, GDAL, or orchestration tools for a spatial ETL or validation step.",
    ("geoprocessing-specialist", "core-skills"): "Use when writing ArcPy, ModelBuilder, or open-source geoprocessing (network service areas, batch clip/reproject).",
    ("recruitment-specialist", "interview-process-design"): "Use when designing interview stages, scorecards, or structured interview questions.",
    ("recruitment-specialist", "campus-recruiting"): "Use when planning campus or early-career recruiting.",
    ("recruitment-specialist", "headhunter-management"): "Use when briefing, managing, or paying external headhunters and agencies.",
    ("recruitment-specialist", "china-labor-law-compliance"): "Use when a hiring step touches PRC labor-law rules (contracts, probation, social insurance).",
    ("recruitment-specialist", "employer-brand-building"): "Use when improving employer brand content or candidate-facing job pages.",
    ("recruitment-specialist", "onboarding-management"): "Use when planning a new hire's onboarding and probation check-ins.",
    ("recruitment-specialist", "recruitment-data-analytics"): "Use when measuring funnel, channel ROI, or time-to-hire metrics.",
    ("ats-validator-architect", "the-x-y-z-mathematical-formulation-calibrations"): "Use when scoring resume bullets with the X-Y-Z (accomplished X, measured by Y, by doing Z) formula.",
    ("ats-validator-architect", "modern-ats-parsing-architecture-layout-failure-m"): "Use when checking whether a resume PDF/DOCX parses cleanly (columns, tables, text layer, fonts).",
    ("ats-validator-architect", "client-side-ats-scoring-engine-architecture"): "Use when designing a local keyword-recall or resume-scoring engine.",
    ("ats-validator-architect", "regulatory-compliance-legal-safeguards"): "Use when a resume-scoring system may fall under EU AI Act or NYC Local Law 144 rules (flag for legal review).",
    ("ats-validator-architect", "best-practices-pro-tips"): "Use when giving quick, practical ATS-friendly resume formatting tips.",
    ("ats-validator-architect", "collaboration-with-other-agents"): "Use when handing ATS findings to another agent (e.g. a resume tailor) as a concrete artifact.",
}

def clean_fe0f(s: str) -> str:
    s = s.replace("\ufe0f", "").replace("\u200d", "")
    s = re.sub(r"^(#+) +", r"\1 ", s, flags=re.M)          # "# ️ Title" -> "# Title"
    return s

def restore_first_subheading(content: str) -> str:
    m = re.match(r"(# [^\n]*\n\n)([^\n]+)(\n.*)?$", content, flags=re.S)
    if not m or "\n### " not in content:
        return content
    first = m.group(2)
    if first.startswith(("#", "-", "*", "|", "`", ">")) or len(first) > 100:
        return content
    return m.group(1) + "### " + first + (m.group(3) or "")

FINANCE_GUARD = "Not financial, tax, or investment advice. Never invent balances, account numbers, or credentials. The user approves every money move."

TEXT_EDITS = {  # (agent, skill) -> list of (old, new)
    ("spatial-data-engineer", "core-tools"): [
        ("- PyCRS / pyproj: CRS handling and reprojection", "- pyproj: CRS handling and reprojection (PyCRS is unmaintained since 2019; don't use it)"),
        ("- GeoLinter: geometry quality checks", "- Shapely `is_valid` / `make_valid`, QGIS \"Check Validity\": geometry quality checks"),
    ],
    ("web-gis-developer", "core-mission"): [("ArcGIS JS API", "ArcGIS Maps SDK for JavaScript")],
    ("web-gis-developer", "tech-stack"): [
        ("- ArcGIS JS API 4.x: Esri web mapping SDK", "- ArcGIS Maps SDK for JavaScript (`@arcgis/core`, formerly ArcGIS API for JavaScript): Esri web mapping SDK"),
        ("- Tippecanoe: create vector tiles", "- Tippecanoe (maintained fork: felt/tippecanoe): create vector tiles"),
    ],
    ("web-gis-developer", "workflow"): [
        ("ArcGIS JS (Esri ecosystem)", "ArcGIS Maps SDK for JavaScript (Esri ecosystem)"),
        ("| ArcGIS JS API 4.x |", "| ArcGIS Maps SDK for JavaScript |"),
    ],
    ("geoprocessing-specialist", "core-skills"): [
        ("- Network analyst: arcpy.na (routing, service areas, closest facility)",
         "- Network analyst: arcpy.nax in ArcGIS Pro (arcpy.na is the legacy module): routing, service areas, closest facility"),
        ("- ArcGIS Data Interoperability: FME-based format support",
         "- ArcGIS Data Interoperability: FME-based format support\n\n"
         "### Open-source path (no ArcGIS license)\n"
         "- Ask which stack the user is licensed for before writing ArcPy.\n"
         "- Service areas / isochrones: OSMnx + NetworkX (`ego_graph` with `distance=\"travel_time\"`), pgRouting `pgr_drivingDistance`, or Valhalla / openrouteservice isochrones\n"
         "- Batch geoprocessing: GeoPandas, Shapely, GDAL/OGR, QGIS Processing (`qgis_process`)"),
    ],
    ("geoprocessing-specialist", "workflow"): [("| Map series | arcpy.mp layout export | Data Driven Pages |", "| Map series | arcpy.mp layout export | Map Series (Data Driven Pages in legacy ArcMap) |")],
    ("tax-strategist", "critical-rules"): [
        ("8. **Maintain arm's length pricing.** Transfer pricing must be defensible with benchmarking studies and economic analysis.",
         "8. **Maintain arm's length pricing.** Transfer pricing must be defensible with benchmarking studies and economic analysis.\n"
         "9. **Pin jurisdiction and tax year first.** Ask for both before any number. Check current-year rates, thresholds, and deadlines against the official tax authority source before quoting them.\n"
         "10. **Drafts, not filings.** You are not a licensed CPA, EA, or tax attorney. A qualified professional reviews positions before anything is filed, elected, or paid. Never file returns or move money."),
    ],
    ("bookkeeper-controller", "critical-rules"): [
        ("8. **Audit readiness is a daily practice.** If an auditor walked in today, you should be able to produce support for any balance within 24 hours.",
         "8. **Audit readiness is a daily practice.** If an auditor walked in today, you should be able to produce support for any balance within 24 hours.\n"
         "9. **Drafts, not postings.** Propose journal entries and reconciliations for the human to approve. Never post to the live ledger, pay bills, or move money yourself."),
    ],
    ("ats-validator-architect", "core-mission"): [
        ("5. **Guarantee Regulatory Compliance & Auditability**: Ensure all scoring systems comply with",
         "5. **Check Regulatory Compliance & Auditability**: Check scoring systems against"),
        ("(AEDT bias audits and Four-Fifths selection rate ratios).",
         "(AEDT bias audits and Four-Fifths selection rate ratios), and flag gaps for legal review. This is not legal advice."),
    ],
}

TITLE_FIX = {  # full, word-boundary titles for truncated ones
    "bookkeeper-controller": "Day-to-day accounting, reconciliations, and a reliable month-end close",
    "tax-strategist": "Tax optimization and multi-jurisdictional compliance planning",
    "financial-analyst": "Financial modeling, forecasting, and scenario analysis",
    "recruitment-specialist": "Recruitment operations and talent acquisition, with deep China-market channels",
    "ats-validator-architect": "Architect and validator for applicant tracking systems (ATS) and resume parsers",
}
REMOVE_DIRS = {
    "spatial-data-engineer": ["skills/research"],               # ML paper-writing skill + ~780 KB LaTeX templates: off-role
    "coach": ["skills/web_competitor_intel"],                   # author-specific competitor cron (tactic.studio etc.), missing helper script
}
MATCHED_LIST_EDITS = {
    "spatial-data-engineer": [("hermes-agent, jupyter-live-kernel, research-paper-writing", "hermes-agent, jupyter-live-kernel"),
                              ("(`hermes-agent`, `jupyter-live-kernel`, `research-paper-writing`)", "(`hermes-agent`, `jupyter-live-kernel`)")],
    "coach": [("hermes-agent, marketing-agi, web_competitor_intel", "hermes-agent, marketing-agi"),
              ("(`hermes-agent`, `marketing-agi`, `web_competitor_intel`)", "(`hermes-agent`, `marketing-agi`)")],
}
FINANCE = {"bookkeeper-controller", "fpa-analyst", "tax-strategist", "financial-analyst"}

def edit_skill(agent, skill):
    c = restore_first_subheading(clean_fe0f(skill["content"]))
    for old, new in TEXT_EDITS.get((agent, skill["name"]), []):
        if old not in c:
            raise SystemExit(f"edit anchor missing: {agent}/{skill['name']}: {old[:60]}")
        c = c.replace(old, new)
    skill["content"] = c
    d = DOMAIN[agent]
    if (agent, skill["name"]) in CUSTOM_DESC:
        skill["description"] = CUSTOM_DESC[(agent, skill["name"])]
    elif skill["name"] in ROUTE_DESC:
        skill["description"] = ROUTE_DESC[skill["name"]].format(d=d)
    else:
        raise SystemExit(f"no description rule for {agent}/{skill['name']}")
    return skill

def edit_agent_json(agent, pack):
    pack["packVersion"] = NEW_PACK_VERSION
    if agent in TITLE_FIX:
        pack["profile"]["title"] = TITLE_FIX[agent]
    pack["skills"] = [edit_skill(agent, dict(s)) for s in pack["skills"]]
    return pack

def soul_edits(agent, soul, title):
    soul = re.sub(r"^(You are \*\*.+?\*\* \([^)]+\) — ).*$", lambda m: m.group(1) + title.rstrip(".") + ".", soul, count=1, flags=re.M)
    for old, new in MATCHED_LIST_EDITS.get(agent, []):
        soul = soul.replace(old, new)
    if agent in FINANCE and "## Boundaries" not in soul:
        soul = soul.replace("\n## Voice\n", f"\n## Boundaries\n\n- {FINANCE_GUARD}\n\n## Voice\n", 1)
    return soul

def repack_archive(agent, pack, src: Path, dests):
    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        with tarfile.open(src) as tf:
            tf.extractall(tmp, filter="data")
        root = tmp / agent
        for rel in REMOVE_DIRS.get(agent, []):
            shutil.rmtree(root / rel)
        cfg = root / "config.yaml"
        t = cfg.read_text()
        assert "mode: 'off'" in t
        cfg.write_text(t.replace("approvals:\n  mode: 'off'", "approvals:\n  mode: smart  # Hermes default; 'off' (YOLO) must never ship in a shared pack"))
        soul = root / "SOUL.md"
        soul.write_text(soul_edits(agent, soul.read_text(), pack["profile"]["title"]))
        mem = root / "memories/MEMORY.md"
        m = mem.read_text()
        for old, new in MATCHED_LIST_EDITS.get(agent, []):
            m = m.replace(old, new)
        m = re.sub(r"^(I am \*\*.+?\*\* \([^)]+\) — ).*$", lambda mm: mm.group(1) + pack["profile"]["title"].rstrip(".") + ".", m, count=1, flags=re.M)
        mem.write_text(m)
        for s in pack["skills"]:
            p = root / "skills" / s["name"] / "SKILL.md"
            old = p.read_text()
            nl = "\n" if old.endswith("\n") else ""
            p.write_text(f'---\nname: {s["name"]}\ndescription: "{s["description"]}"\nversion: 1.1.0\n---\n\n{s["content"]}{nl}')
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
        data = gzip.compress(buf.getvalue(), compresslevel=9, mtime=MTIME)  # fixed gzip header: reproducible
        for d in dests:
            d.write_bytes(data)

def main():
    agency = jload(AGENCY)
    agents = list(DOMAIN)
    for agent in agents:
        base = jload(PACKS[0] / "agents" / f"{agent}.json")
        assert base == jload(PACKS[1] / "agents" / f"{agent}.json") == agency["packs"][agent], agent
        new = edit_agent_json(agent, base)
        for root in PACKS:
            jdump(root / "agents" / f"{agent}.json", new, False)
        agency["packs"][agent] = new
        for st in agency["stalls"]:
            if st["slug"] == agent:
                st["title"] = new["profile"]["title"]
        repack_archive(agent, new, PACKS[0] / "agents" / f"{agent}.hermes.tar.gz",
                       [root / "agents" / f"{agent}.hermes.tar.gz" for root in PACKS])
        print("agent", agent, "ok")
    jdump(AGENCY, agency, False)

if __name__ == "__main__":
    main()
