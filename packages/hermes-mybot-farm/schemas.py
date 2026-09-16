"""Tool schemas — what the LLM sees."""

FARM_SEARCH = {
    "name": "farm_search",
    "description": (
        "Search mybot.farm stalls by query. Returns slug, kind, name, title, pageUrl, "
        "packUrl, and member tarball hrefs when present. Use this before planting."
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
        "member tarball hrefs, packUrl, and api paths. Prefer this to find download URLs "
        "before farm_plant."
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
        "Agent packs: one scrubbed .tar.gz. Team packs: each member tarball, team workspace "
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
