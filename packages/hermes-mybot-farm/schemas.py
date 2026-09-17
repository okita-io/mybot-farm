"""Tool schemas — what the LLM sees."""

FARM_SEARCH = {
    "name": "farm_search",
    "description": (
        "Search mybot.farm stalls by query. Returns slug, kind, name, title, pageUrl, "
        "packUrl, hermesHref when a .hermes.tar.gz exists, and member tarball hrefs. "
        "Use this before planting."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": "Search query (e.g. workbench, scholastic, frontend).",
            },
            "limit": {
                "type": "number",
                "description": "Max stalls to return (optional).",
            },
        },
        "required": ["query"],
    },
}

FARM_GET_PACK = {
    "name": "farm_get_pack",
    "description": (
        "Fetch a mybot.farm GAF pack JSON by slug (GET /api/packs/{slug}). "
        "Returns format, runtime, members, skill names, and shared.gettingStarted. "
        "Does not download tarballs."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "slug": {
                "type": "string",
                "description": "Pack / stall slug (e.g. workbench, scholastic-research).",
            },
        },
        "required": ["slug"],
    },
}

FARM_GET_STALL = {
    "name": "farm_get_stall",
    "description": (
        "Fetch mybot.farm stall metadata by slug (GET /api/stalls/{slug}), including "
        "member tarball hrefs, packUrl, hermesHref when a .hermes.tar.gz exists, and api "
        "paths. Prefer this to find download URLs before farm_plant."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "slug": {
                "type": "string",
                "description": "Stall slug (e.g. workbench, scholastic-research).",
            },
        },
        "required": ["slug"],
    },
}

FARM_PLANT = {
    "name": "farm_plant",
    "description": (
        "Download a mybot.farm Hermes pack and import it with hermes profile import. "
        "Agent packs: one scrubbed .tar.gz (stall.hermesHref, or /packs/agents/<slug>.hermes.tar.gz "
        "when runtime includes hermes). Team packs: each member tarball, team workspace "
        "(TEAM.md/WORK.md/cron), and kanban board when gettingStarted says so. "
        "Always clears ~/.hermes/profiles/.deleted/<name> tombstones (GAP 2) before import. "
        "Does not delete live profiles unless force is true. Does not wipe team dir/board "
        "unless clean is true. Verify hermes profile list before declaring success. "
        "Does not email, spend money, or invent pack fields."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "slug": {
                "type": "string",
                "description": "Pack slug to plant (e.g. scholastic-research, workbench).",
            },
            "name": {
                "type": "string",
                "description": "Override profile name for a single-agent pack.",
            },
            "force": {
                "type": "boolean",
                "description": (
                    "Destructive. Delete existing profiles of the same names, clear their "
                    "tombstones, then re-import. Default false."
                ),
            },
            "clean": {
                "type": "boolean",
                "description": (
                    "Destructive. Also remove ~/.hermes/teams/<slug> and the kanban board. "
                    "Default false. Implies a wipe of team workspace/board only; still needs "
                    "force to delete live profiles."
                ),
            },
            "dry_run": {
                "type": "boolean",
                "description": "Fetch stall+pack and print the plant plan; do not import.",
            },
        },
        "required": ["slug"],
    },
}

FARM_REINSTALL = {
    "name": "farm_reinstall",
    "description": (
        "Clean re-install / upgrade of a previously planted Hermes stall. Clears GAP 2 "
        "tombstones under ~/.hermes/profiles/.deleted/<member>, then plants again. "
        "Default is safe: will not delete live profiles. Pass force=true to delete those "
        "profiles first (tombstones from delete are then cleared automatically). Pass "
        "clean=true to also wipe the team directory and kanban board. Always verifies "
        "hermes profile list before success."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "slug": {
                "type": "string",
                "description": "Pack slug to reinstall (e.g. workbench).",
            },
            "name": {
                "type": "string",
                "description": "Override profile name for a single-agent pack.",
            },
            "force": {
                "type": "boolean",
                "description": "Destructive. Delete existing profiles of the same names before import. Default false.",
            },
            "clean": {
                "type": "boolean",
                "description": "Destructive. Wipe team dir and kanban board before plant. Default false.",
            },
            "dry_run": {
                "type": "boolean",
                "description": "Show the reinstall plan without changing the machine.",
            },
        },
        "required": ["slug"],
    },
}

FARM_POST = {
    "name": "farm_post",
    "description": (
        "Publish a listing to mybot.farm (POST /api/listings) with a seller API key. "
        "If you already own that slug, this updates the same stall (same URL) and bumps packVersion. "
        "Omit packVersion to auto-increment; history appears on the stall and GET /api/stalls/{slug}/revisions. "
        "Auth: env MYBOT_FARM_API_KEY, else plugin config apiKey, else the apiKey argument. "
        "Create a key at https://mybot.farm/sell. Pack must be GAF JSON (object or packPath "
        "to a .json file) — not a Hermes tarball. Plant still imports Hermes .tar.gz; posting "
        "publishes GAF. kind \"team\" requires format mybot.farm/team-pack and members[] "
        "(at least two): each member needs role, summary, and pack (catalog path like "
        "agents/patch.json, a slug, a .hermes.tar.gz URL, or a nested agent-pack). "
        "kind \"agent\" uses mybot.farm/agent-pack and cannot include members[]. "
        "category is an exact farm label (Lifestyle, Coding, Experimental, …). "
        "priceCents is 0 (free) or 200–999900. Paid listings need Stripe Connect on the seller "
        "(403 connect_required). Prefer dryRun to validate without posting. "
        "Does not email or spend money. Catalog/agency slugs cannot be overwritten."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "kind": {
                "type": "string",
                "description": (
                    'Listing kind: "agent" or "team". Teams land on /teams/{slug} and '
                    "need a team-pack with members[]."
                ),
            },
            "name": {
                "type": "string",
                "description": "Listing name. Used to derive the slug on first publish.",
            },
            "title": {
                "type": "string",
                "description": "Short stall title shown on the farm.",
            },
            "description": {
                "type": "string",
                "description": "Stall description (non-empty).",
            },
            "category": {
                "type": "string",
                "description": (
                    "Exact farm category label: Lifestyle, Productivity, Coding, Writing, "
                    "Marketing, Sales, Research, Personal finance, Creative, Music, "
                    "Education, Ops / admin, Experimental."
                ),
            },
            "priceCents": {
                "type": "number",
                "description": "0 for free, or integer cents in [200, 999900] ($2.00–$9,999.00).",
            },
            "pack": {
                "type": "object",
                "description": (
                    "GAF JSON object. Agents: mybot.farm/agent-pack. Teams: "
                    "mybot.farm/team-pack with members[] (role, summary, pack). "
                    "Member pack may be agents/<slug>.json, a slug, a tarball path, "
                    "or a nested agent-pack. Export/convert elsewhere; this tool does "
                    "not translate Hermes tarballs."
                ),
            },
            "packPath": {
                "type": "string",
                "description": "Path to a .json GAF file. Use pack or packPath, not both.",
            },
            "apiKey": {
                "type": "string",
                "description": (
                    "Per-call seller key override. Prefer MYBOT_FARM_API_KEY or plugin "
                    "config apiKey for unattended use. Never log the key."
                ),
            },
            "dryRun": {
                "type": "boolean",
                "description": "Validate and show a payload summary without POSTing. Redacts any key.",
            },
            "slug": {
                "type": "string",
                "description": (
                    "Existing stall slug to update in place. If omitted, derived from name. "
                    "Same seller + same slug updates the pack (skills, soul/memory) and bumps packVersion."
                ),
            },
            "packVersion": {
                "type": "number",
                "description": (
                    "Optional content revision. On update must be greater than the live packVersion; "
                    "omit to auto-increment. Distinct from GAF format version."
                ),
            },
        },
        "required": ["kind", "name", "title", "description", "category", "priceCents"],
    },
}

FARM_UPDATE = {
    "name": "farm_update",
    "description": (
        "Update a seller-owned stall in place (same slug). Same fields as farm_post plus required slug. "
        "Replaces GAF pack JSON (skills, soul/memory) and bumps packVersion (omit packVersion to auto-increment). "
        "The farm publishes the pack to the catalog repo. Catalog slugs are reserved. "
        "Does not attach Hermes tarballs."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            **FARM_POST["parameters"]["properties"],
            "slug": {
                "type": "string",
                "description": "Existing stall slug to update.",
            },
        },
        "required": [
            "kind",
            "name",
            "title",
            "description",
            "category",
            "priceCents",
            "slug",
        ],
    },
}
