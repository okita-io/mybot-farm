import { jsonResponse, notFoundResponse, optionsResponse } from "@/lib/http";
import { getStallDetail } from "@/lib/stall-detail";

export async function GET(
  _request: Request,
  context: RouteContext<"/api/stalls/[slug]">,
) {
  const { slug } = await context.params;
  const detail = await getStallDetail(slug);

  if (!detail) {
    return notFoundResponse(slug);
  }

  return jsonResponse({
    tool: "get_stall",
    ...detail,
  });
}

export function OPTIONS() {
  return optionsResponse();
}
