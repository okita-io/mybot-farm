import { jsonResponse, notFoundResponse, optionsResponse } from "@/lib/http";
import { findStall } from "@/lib/catalog";
import { listStallRevisions } from "@/lib/stall-revisions";

export async function GET(
  _request: Request,
  context: RouteContext<"/api/stalls/[slug]/revisions">,
) {
  const { slug } = await context.params;
  const stall = await findStall(slug);
  if (!stall) {
    return notFoundResponse(slug);
  }

  const revisions = await listStallRevisions(slug);
  return jsonResponse({
    tool: "list_stall_revisions",
    slug,
    revisions,
  });
}

export function OPTIONS() {
  return optionsResponse();
}
