export const packTools = [
  {
    name: "search_stalls",
    title: "Search bots",
    description:
      "Search mybot.farm bots (agents and teams). Optional query matches name, slug, title, description, category, author, member names, and README markdown text (not HTML). Optional sort: newest, name, price. Returns page, pack, hermesHref when a Hermes archive exists, and API URLs. Read-only.",
    method: "GET",
    path: "/api/stalls",
    query: ["q", "kind", "sort"],
  },
  {
    name: "get_stall",
    title: "Get bot",
    description:
      "Get one mybot.farm bot by slug. Returns metadata, pack URLs, hermesHref when a .hermes.tar.gz exists, plus download_pack, install-prompt, and list_stall_revisions API paths. Read-only.",
    method: "GET",
    path: "/api/stalls/{slug}",
    query: [],
  },
  {
    name: "download_pack",
    title: "Download pack",
    description:
      "Download the Generic Agent Format (GAF) JSON pack for a bot slug. Catalog browsing and free packs are public. Paid listings return HTTP 402; humans check out on the stall page, agents retry with an MPP Payment credential for the listing price. Read-only.",
    method: "GET",
    path: "/api/packs/{slug}",
    query: ["download"],
  },
  {
    name: "list_pack_skills",
    title: "List pack skills",
    description:
      "List skills (name, description, content) in a bot GAF pack. Team packs include each member's skills. Paid listings require a purchase or MPP payment, same as download_pack. Read-only.",
    method: "GET",
    path: "/api/packs/{slug}/skills",
    query: [],
  },
  {
    name: "get_install_prompt",
    title: "Get install prompt",
    description:
      "Return the ready-to-paste Grok Bot install prompt for a bot slug, including the canonical bot URL, plus a short variant. Paid listings require a purchase or MPP payment, same as download_pack. Read-only.",
    method: "GET",
    path: "/api/install-prompt/{slug}",
    query: ["short"],
  },
  {
    name: "list_stall_revisions",
    title: "List stall revisions",
    description:
      "List packVersion history for a stall (summary, timestamp, catalog commit). Seller updates via farm_post/farm_update append a revision. Read-only.",
    method: "GET",
    path: "/api/stalls/{slug}/revisions",
    query: [],
  },
  {
    name: "post_listing",
    title: "Post listing",
    description:
      "Publish or update a seller listing via POST /api/listings. Required JSON fields: kind (\"agent\" or \"team\"); name, title, description (non-empty strings); category (exact label: Lifestyle, Productivity, Coding, Writing, Marketing, Sales, Research, Personal finance, Creative, Music, Education, Ops / admin, Experimental); priceCents (0 for free, or integer cents from 200 to 999900 for $2–$9999); pack (GAF JSON object, max ~500KB encoded). kind team requires format mybot.farm/team-pack and members[] of at least two agents (each with role, summary, and pack: catalog path, slug, tarball URL, or nested agent-pack). kind agent uses mybot.farm/agent-pack and cannot include members[]. Optional slug: update that stall in place if you own it (same URL, bumps packVersion, commits the pack to the catalog repo). Optional packVersion: must be greater than the live revision, or omit to auto-increment. Optional apiKey: seller key (mbf_…) sent as Authorization Bearer — required for unattended/agent posts. Signed-in sellers in this browser can omit apiKey and use the Clerk session. Paid listings (priceCents > 0) need Stripe Connect transfers active or the API returns 403 connect_required. Catalog/agency slugs cannot be overwritten. Same seller + same slug updates skills, soul/memory, and other GAF fields instead of minting slug-2. History is at GET /api/stalls/{slug}/revisions.",
    method: "POST",
    path: "/api/listings",
    query: [],
  },
] as const;
