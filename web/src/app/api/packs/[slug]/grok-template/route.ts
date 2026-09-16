import { auth } from "@clerk/nextjs/server";
import { jsonResponse, notFoundResponse, optionsResponse, paymentRequiredResponse } from "@/lib/http";
import { resolvePackAccess } from "@/lib/catalog";
import { gafToGrokTemplate } from "@/lib/gaf-to-grok-template";

export async function GET(
  _request: Request,
  context: RouteContext<"/api/packs/[slug]/grok-template">,
) {
  const { slug } = await context.params;
  const { userId } = await auth();
  const access = await resolvePackAccess(slug, userId);

  if (!access.ok && access.reason === "not_found") {
    return notFoundResponse(slug);
  }

  if (!access.ok) {
    return paymentRequiredResponse(slug, access.stall.priceCents ?? 0);
  }

  const { stall, pack } = access;
  if (stall.kind === "team" || pack.format === "mybot.farm/team-pack") {
    return jsonResponse(
      {
        error: "not_a_single_bot_template",
        slug,
        message:
          "Team packs are not 1:1 create_bot_share_json recipes. Project each members[] agent pack with gafToGrokTemplate, or open that member's /api/packs/{slug}/grok-template.",
      },
      { status: 400 },
    );
  }

  return jsonResponse({
    recipe: gafToGrokTemplate(pack),
    catalog: {
      slug: stall.slug,
      stallId: stall.stallId ?? stall.listingId ?? null,
      packVersion: stall.packVersion ?? 1,
      kind: stall.kind,
    },
    note: "stallId and packVersion are marketplace/catalog metadata from GET /api/stalls. They are not create_bot_share_json fields. The farm does not call create_bot_share_json.",
  });
}

export function OPTIONS() {
  return optionsResponse();
}
