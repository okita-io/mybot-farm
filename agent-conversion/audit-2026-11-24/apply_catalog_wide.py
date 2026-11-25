#!/usr/bin/env python3
"""2026-11-24 catalog-wide follow-up audit (branch audit/2026-11-24-catalog-wide).

Usage: apply_catalog_wide.py <repo-root>

Fixes, applied to packs/ and web/public/packs/ mirrors, web/src/data/agency-catalog.generated.json,
and every *.hermes.tar.gz (agents + workbench team members):
  1. Hermes config.yaml `approvals.mode: 'off'` -> `smart`
  2. Remove the author-specific `web_competitor_intel` skill (competitor cron template, unshipped helper
     script) and every mention of it in SOUL.md / memories/MEMORY.md
  3. Neutralize invented human credentials in personas (years of experience, $ managed/raised, named
     employer cohorts, "certified", "veteran") -> capability statements
  4. Archives: uid/gid 0, empty uname/gname (no local owner such as `alexokita`); the workbench cron
     wrapper scripts no longer hard-code /Users/alexokita
  5. packVersion +1 and top-level `updatedAt` (ISO date) on every pack whose content changed; `updatedAt` also
     set on the 3 teams from the earlier audit (the website shows "Updated <date> · v<N>" from these fields)

Reproducible: fixed gzip header mtime, original per-member mtimes kept. Safe to re-run only on a clean tree
(packVersion bumps are not idempotent)."""
import gzip, io, json, re, sys, tarfile
from pathlib import Path

ROOT = Path(sys.argv[1]).resolve()
MIRRORS = [ROOT / "packs", ROOT / "web" / "public" / "packs"]
AGENCY = ROOT / "web/src/data/agency-catalog.generated.json"
TEAMCAT = ROOT / "web/src/data/team-catalog.generated.json"
UPDATED_AT = "2026-11-24T00:00:00.000Z"  # pack-level `updatedAt` for every pack this audit changed
AUDITED_AGENTS = ["analyst", "ats-validator-architect", "bookkeeper-controller", "coach", "financial-analyst", "fpa-analyst",
                  "geoprocessing-specialist", "recruitment-specialist", "resume-tailor", "spatial-data-engineer",
                  "tax-strategist", "web-gis-developer"]  # changed by the team-packs audit (packVersion already 2)
AUDITED_TEAMS = ["gis-spatial-desk", "finance-office", "career-desk"]  # changed by the team-packs audit (packVersion already 2)
GZ_MTIME = 1795996800  # fixed gzip header time (same as the 2026-11-24 team-pack audit)

SMART = "approvals:\n  mode: smart  # Hermes default; 'off' (YOLO) must never ship in a shared pack"
OFF = "approvals:\n  mode: 'off'"

# ---- 3. persona credential rewrites: (old, new) substrings, applied to GAF JSON strings -------------------
JSON_EDITS = {
    "bookkeeper-controller": [(
        "a meticulous Controller with 13+ years of experience spanning startup bookkeeping through public company controllership. You've built accounting departments from scratch, taken companies through their first audits, survived Sarbanes-Oxley implementations, and close…",
        "a meticulous Controller experienced in everything from startup bookkeeping to public company controllership. You build accounting departments from scratch, take companies through their first audits, and support Sarbanes-Oxley implementations.")],
    "financial-analyst": [(
        "a seasoned Financial Analyst with 12+ years of experience across investment banking, corporate finance, and FP&A. You've built models that secured $500M+ in funding, advised C-suite executives on multi-billion-dollar capital allocation decisions, and turned aroun…",
        "a Financial Analyst experienced in investment banking, corporate finance, and FP&A. You build models that support funding decisions and advise C-suite executives on capital allocation.")],
    "fpa-analyst": [(
        "a sharp FP&A Analyst with 11+ years of experience across high-growth SaaS companies, manufacturing, and retail. You've built annual operating plans that guided $1B+ in spend, delivered rolling forecasts that C-suites actually trusted, and created budget frameworks…",
        "a sharp FP&A Analyst experienced across high-growth SaaS companies, manufacturing, and retail. You build annual operating plans, deliver rolling forecasts that C-suites can trust, and create budget frameworks.")],
    "tax-strategist": [(
        "a veteran Tax Strategist with 15+ years of experience across Big Four accounting firms, multinational corporate tax departments, and boutique tax advisory practices. You've structured cross-border transactions saving clients hundreds of millions in tax, guided…",
        "a Tax Strategist experienced across multinational corporate tax departments and tax advisory practices. You structure cross-border transactions to reduce tax exposure.")],
    "investment-researcher": [(
        "a veteran Investment Researcher with 14+ years across buy-side equity research, venture capital due diligence, and institutional asset management. You've covered sectors from fintech to biotech, written research that moved markets, conducted due diligence on 200+…",
        "an Investment Researcher experienced in buy-side equity research, venture capital due diligence, and institutional asset management. You cover sectors from fintech to biotech, write research meant to inform decisions, and conduct rigorous due diligence.")],
    "manager": [(
        "a seasoned Product Manager with 10+ years shipping products across B2B SaaS, consumer apps, and platform businesses. You've led products through",
        "a Product Manager experienced in shipping products across B2B SaaS, consumer apps, and platform businesses. You lead products through")],
    "change-management-consultant": [("a certified change management specialist", "a change management specialist")],
    "it-service-manager": [("a certified IT service management specialist", "an IT service management specialist")],
    "medical-billing-coding-specialist": [("a certified revenue cycle management expert", "a revenue cycle management expert")],
    "executive-summary-generator": [("senior strategy consultantwith Fortune 500 experience", "senior strategy consultant working with executive audiences")],
    "sales-outreach": [("You've opened doors at Fortune 500s with a single email, turned cold leads into…", "You write outreach that opens doors with a single email.")],
    "livestream-commerce-coach": [("Veteran livestream e-commerce coach", "Experienced livestream e-commerce coach")],
    # quantified track-record backstories -> present-tense capability statements
    "appsec-engineer": [("You have reviewed millions of lines of code across every major language, built security scanning pipelines that catch vulnerabilities before they reach production, and designed threat models that predicted real attack vectors months before they were exploite….",
                         "You review code across every major language, build security scanning pipelines that catch vulnerabilities before they reach production, and design threat models that anticipate real attack vectors.")],
    "blockchain-security-auditor": [("You have dissected hundreds of protocols, reproduced dozens of real-world exploits, and written audit reports that have prevented millions in losses.",
                                     "You dissect protocols, reproduce real-world exploits, and write audit reports that help prevent losses.")],
    "penetration-tester": [("You have breached hundreds of networks during authorized engagements, chained low-severity findings into domain compromise, and written reports that made CISOs cancel weekend plans.",
                            "You breach networks during authorized engagements, chain low-severity findings into domain compromise, and write reports that make CISOs cancel weekend plans.")],
    "incident-responder": [("You have led incident response for ransomware attacks at 3AM, coordinated containment of nation-state intrusions spanning months of dwell time, and written post-mortems that fundamentally changed how organizations think about security.",
                            "You lead incident response for ransomware attacks at 3AM, coordinate containment of intrusions with long dwell times, and write post-mortems that change how organizations think about security.")],
    "threat-intelligence-analyst": [("You have tracked nation-state APT groups across multi-year campaigns, produced intelligence briefings that changed defensive postures overnight, and written YARA rules that caught malware variants before any vendor had signatures.",
                                     "You track nation-state APT groups across multi-year campaigns, produce intelligence briefings that change defensive postures, and write YARA rules that catch malware variants early.")],
    "cloud-security-architect": [("You have designed zero trust architectures for organizations migrating from on-prem monoliths to cloud-native microservices, caught IAM misconfigurations that would have exposed production databases to the internet, and built se….",
                                  "You design zero trust architectures for organizations migrating from on-prem monoliths to cloud-native microservices, and catch IAM misconfigurations that would expose production databases to the internet.")],
    "ai-generated-code-auditor": [("You have audited thousands of applications scaffolded by", "You audit applications scaffolded by"),
                                  ("and you have learned that AI-written code fail…", "and you know that AI-written code fail…")],
    "code-reviewer": [("You've reviewed thousands of PRs and know…", "You review PRs closely and know…")],
    "customer-service": [("You've handled thousands of customer interactions across", "You handle customer interactions across")],
    "hr-onboarding": [("You've onboarded hundreds of employees a…", "You onboard new employees.")],
    "legal-document-review": [("You've reviewed thousands of contracts,…", "You review contracts and other legal documents.")],
    "cms-developer": [("You've built everything from brochure sites for local nonprofits to enterprise Drupal platforms serving millions of pageviews.",
                       "You build everything from brochure sites for local nonprofits to enterprise Drupal platforms serving high-traffic audiences.")],
}
# same rewrites for the archive SOUL.md identity paragraphs
SOUL_EDITS = {
    "financial-analyst": [("I am a seasoned financial analyst", "I am a financial analyst"),
                          (" — 12+ years across investment banking, corporate finance, and FP&A, with models that have secured $500M+ in funding.",
                           " — experienced across investment banking, corporate finance, and FP&A.")],
    "investment-researcher": [("I bring 14+ years across buy-side equity research, venture due diligence, and institutional asset management, covering sectors from fintech to biotech and having conducted due diligence on 200+ deals.",
                               "I am experienced in buy-side equity research, venture due diligence, and institutional asset management, covering sectors from fintech to biotech.")],
    "livestream-commerce-coach": [("I am a veteran livestream e-commerce coach", "I am an experienced livestream e-commerce coach")],
}
# workbench wrappers: no hard-coded author home directory
WRAPPER_OLD = '"/Users/alexokita/.hermes/scripts/workbench_cron.sh"'
WRAPPER_NEW = '"$HOME/.hermes/scripts/workbench_cron.sh"'

COMP = "web_competitor_intel"
stats = {k: 0 for k in ["approvals_changed", "competitor_archives", "owner_archives", "soul_edits", "json_text_edits",
                        "agent_json_bumped", "agent_json_dated", "archives_total", "wrapper_scripts"]}
touched_json_slugs = set()
edit_hits = {}

def jload(p): return json.loads(p.read_text(encoding="utf-8"))
def jdump(p, d, ascii_=False): p.write_text(json.dumps(d, indent=2, ensure_ascii=ascii_) + "\n", encoding="utf-8")

def walk_replace(obj, pairs, slug):
    """Replace substrings in every string of a JSON value; count hits."""
    if isinstance(obj, str):
        for old, new in pairs:
            if old in obj:
                edit_hits[(slug, old)] = edit_hits.get((slug, old), 0) + obj.count(old)
                obj = obj.replace(old, new)
        return obj
    if isinstance(obj, list): return [walk_replace(v, pairs, slug) for v in obj]
    if isinstance(obj, dict): return {k: walk_replace(v, pairs, slug) for k, v in obj.items()}
    return obj

def strip_competitor_list(text):
    """Drop `web_competitor_intel` from 'Matched Hermes skills (...)' lists in SOUL.md / MEMORY.md."""
    out = text
    for pat in (r", `web_competitor_intel`", r"`web_competitor_intel`, ", r", web_competitor_intel", r"web_competitor_intel, "):
        out = re.sub(pat, "", out, count=1) if COMP in out else out
    return out

def repack(path: Path, slug: str):
    src = tarfile.open(path)
    members = src.getmembers()
    buf = io.BytesIO()
    changed_competitor = False
    with tarfile.open(fileobj=buf, mode="w", format=tarfile.PAX_FORMAT) as out:
        for m in members:
            parts = m.name.split("/")
            rel = "/".join(parts[1:])
            if rel == f"skills/{COMP}" or rel.startswith(f"skills/{COMP}/"):
                changed_competitor = True
                continue
            data = src.extractfile(m).read() if m.isfile() else None
            if m.isfile() and rel in ("config.yaml", "SOUL.md", "memories/MEMORY.md"):
                text = data.decode("utf-8")
                if rel == "config.yaml" and OFF in text:
                    text = text.replace(OFF, SMART); stats["approvals_changed"] += 1
                if rel in ("SOUL.md", "memories/MEMORY.md") and COMP in text:
                    text = strip_competitor_list(text)
                    assert COMP not in text, (path, rel)
                if rel == "SOUL.md":
                    for old, new in SOUL_EDITS.get(slug, []):
                        assert old in text, (slug, old)
                        text = text.replace(old, new); stats["soul_edits"] += 1
                data = text.encode("utf-8")
                m.size = len(data)
            ni = tarfile.TarInfo(m.name)
            ni.size = len(data) if data is not None else 0
            ni.mtime, ni.mode, ni.type, ni.linkname = m.mtime, m.mode, m.type, m.linkname
            ni.uid = ni.gid = 0; ni.uname = ni.gname = ""
            ni.pax_headers = {k: v for k, v in m.pax_headers.items() if k not in ("uid", "gid", "uname", "gname")}
            out.addfile(ni, io.BytesIO(data) if data is not None else None)
    if changed_competitor: stats["competitor_archives"] += 1
    if any(m.uname or m.uid for m in members): stats["owner_archives"] += 1
    stats["archives_total"] += 1
    new_bytes = gzip.compress(buf.getvalue(), compresslevel=9, mtime=GZ_MTIME)
    changed = new_bytes != path.read_bytes()
    path.write_bytes(new_bytes)
    return changed

def main():
    changed_archives = set()
    # --- archives
    for m in MIRRORS:
        for p in sorted(m.rglob("*.hermes.tar.gz")):
            if repack(p, p.name[:-len(".hermes.tar.gz")]):
                changed_archives.add(p.name[:-len(".hermes.tar.gz")])
    agency = jload(AGENCY)
    # --- GAF JSON (both mirrors + catalog copy): persona edits
    json_slugs = sorted(p.stem for p in (MIRRORS[0] / "agents").glob("*.json"))
    tar_slugs = {p.name[:-len(".hermes.tar.gz")] for m in MIRRORS for p in (m / "agents").glob("*.hermes.tar.gz")}
    for slug in json_slugs:
        a = jload(MIRRORS[0] / "agents" / f"{slug}.json")
        assert a == jload(MIRRORS[1] / "agents" / f"{slug}.json"), slug
        in_catalog = slug in agency["packs"]  # hand-made agents (finders, gift-day, ...) are not in the generated catalog
        assert not in_catalog or agency["packs"][slug] == a, slug
        new = walk_replace(a, JSON_EDITS.get(slug, []), slug)
        if new != a: stats["json_text_edits"] += 1
        if new != a or slug in changed_archives:  # content really changed in this branch -> bump
            new["packVersion"] = int(new.get("packVersion", 1)) + 1; stats["agent_json_bumped"] += 1
        if new != a or slug in changed_archives or slug in AUDITED_AGENTS:  # changed by either audit -> date it
            new["updatedAt"] = UPDATED_AT; stats["agent_json_dated"] += 1
        for m in MIRRORS: jdump(m / "agents" / f"{slug}.json", new)
        if in_catalog: agency["packs"][slug] = new
    # catalog stalls (title/description/seoDescription copies)
    allpairs = {s: p for s, p in JSON_EDITS.items()}
    for st in agency["stalls"]:
        for k, v in list(st.items()):
            if isinstance(v, str) and st.get("slug") in allpairs:
                st[k] = walk_replace(v, allpairs[st["slug"]], st["slug"])
    jdump(AGENCY, agency)
    for (slug, old), n in edit_hits.items():
        pass
    # --- workbench team: wrapper scripts + packVersion
    for m in MIRRORS:
        for sh in sorted((m / "teams/workbench").glob("workbench_cron_*.sh")):
            t = sh.read_text(); assert WRAPPER_OLD in t, sh
            sh.write_text(t.replace(WRAPPER_OLD, WRAPPER_NEW)); stats["wrapper_scripts"] += 1
        tp = m / "teams/workbench.json"; tj = jload(tp)
        tj["packVersion"] = int(tj.get("packVersion", 1)) + 1; tj["updatedAt"] = UPDATED_AT; jdump(tp, tj)
        for team in AUDITED_TEAMS:
            tp2 = m / "teams" / f"{team}.json"; t2 = jload(tp2)
            assert t2["packVersion"] >= 2; t2["updatedAt"] = UPDATED_AT; jdump(tp2, t2)
    tc = jload(TEAMCAT)
    for team in AUDITED_TEAMS:
        tc["packs"][team] = jload(MIRRORS[0] / "teams" / f"{team}.json")
    if "workbench" in tc["packs"]:  # workbench is not in the generated team catalog today; keep in sync if it is added
        tc["packs"]["workbench"] = jload(MIRRORS[0] / "teams/workbench.json")
    jdump(TEAMCAT, tc, True)  # team catalog is ASCII-escaped
    missing = [(s, o[:50]) for s, pairs in JSON_EDITS.items() for o, _ in pairs if (s, o) not in edit_hits]
    print(json.dumps(stats, indent=2)); print("edit pairs never matched:", missing)

main()
