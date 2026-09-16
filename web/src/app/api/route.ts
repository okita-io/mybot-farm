import { jsonResponse, optionsResponse } from "@/lib/http";
import { packTools } from "@/lib/webmcp-catalog";

export function GET() {
  return jsonResponse({
    name: "mybot.farm",
    readOnly: false,
    tools: packTools,
    endpoints: {
      search_stalls: "/api/stalls",
      get_stall: "/api/stalls/{slug}",
      download_pack: "/api/packs/{slug}",
      list_pack_skills: "/api/packs/{slug}/skills",
      get_install_prompt: "/api/install-prompt/{slug}",
      post_listing: "/api/listings",
      resolve_share: "/api/resolve-share",
    },
    writes: {
      post_listing: "/api/listings",
    },
    plannedWrites: {
      plant_into_library: "/api/library/plant",
    },
  });
}

export function OPTIONS() {
  return optionsResponse();
}
