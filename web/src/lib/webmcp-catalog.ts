export const packTools = [
  {
    name: "search_stalls",
    title: "Search stalls",
    description:
      "Search mybot.farm stalls (agents and teams). Optional query matches name, slug, title, description, category, author, and member names. Optional sort: newest, name, price. Returns page, pack, and API URLs. Read-only.",
    method: "GET",
    path: "/api/stalls",
    query: ["q", "kind", "sort"],
  },
  {
    name: "get_stall",
    title: "Get stall",
    description:
      "Get one mybot.farm stall by slug (gift-day, sprout-journal, patch, probe, grant-research, pair-bench). Returns metadata plus download_pack and install-prompt API paths. Read-only.",
    method: "GET",
    path: "/api/stalls/{slug}",
    query: [],
  },
  {
    name: "download_pack",
    title: "Download pack",
    description:
      "Download the Generic Agent Format (GAF) JSON pack for a stall slug. Free seed packs are public. Paid listings return 402 until the signed-in buyer has purchased. Read-only.",
    method: "GET",
    path: "/api/packs/{slug}",
    query: ["download"],
  },
  {
    name: "list_pack_skills",
    title: "List pack skills",
    description:
      "List skills (name, description, content) in a stall GAF pack. Team stalls include each member's skills. Read-only.",
    method: "GET",
    path: "/api/packs/{slug}/skills",
    query: [],
  },
  {
    name: "get_install_prompt",
    title: "Get install prompt",
    description:
      "Return the ready-to-paste Grok Bot install prompt for a stall slug, including the canonical stall URL, plus a short variant. Read-only.",
    method: "GET",
    path: "/api/install-prompt/{slug}",
    query: ["short"],
  },
] as const;
