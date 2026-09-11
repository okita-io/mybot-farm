import { jsonResponse, optionsResponse } from "@/lib/http";
import { packTools } from "@/lib/webmcp-catalog";

export function GET() {
  return jsonResponse({
    name: "mybot.farm",
    readOnly: true,
    tools: packTools,
    endpoints: {
      search_stalls: "/api/stalls",
      get_stall: "/api/stalls/{slug}",
      download_pack: "/api/packs/{slug}",
      list_pack_skills: "/api/packs/{slug}/skills",
      get_install_prompt: "/api/install-prompt/{slug}",
    },
  });
}

export function OPTIONS() {
  return optionsResponse();
}
