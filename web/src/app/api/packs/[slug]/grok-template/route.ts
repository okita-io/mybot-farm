import { auth } from "@clerk/nextjs/server";
import { jsonResponse, notFoundResponse, optionsResponse } from "@/lib/http";
import { getCatalogPack, resolvePackAccess } from "@/lib/catalog";
import { gafToGrokTemplate } from "@/lib/gaf-to-grok-template";
import { withPaidStallPayment } from "@/lib/mpp-pack";
import type { FarmPack } from "@/lib/pack-files";
import type { Stall } from "@/lib/packs";

function grokTemplateResponse(slug: string, stall: Stall, pack: FarmPack) {
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

export async function GET(
  request: Request,
  context: RouteContext<"/api/packs/[slug]/grok-template">,
) {
  const { slug } = await context.params;
  const { userId } = await auth();
  const access = await resolvePackAccess(slug, userId);

  if (!access.ok && access.reason === "not_found") {
    return notFoundResponse(slug);
  }

  if (!access.ok) {
    return withPaidStallPayment(request, access.stall, async () => {
      const pack = await getCatalogPack(slug);
      if (!pack) {
        return notFoundResponse(slug);
      }
      return grokTemplateResponse(slug, access.stall, pack);
    });
  }

  return grokTemplateResponse(slug, access.stall, access.pack);
}

export function OPTIONS() {
  return optionsResponse();
}
