import { auth } from "@clerk/nextjs/server";
import { corsHeaders, jsonResponse, notFoundResponse, optionsResponse, paymentRequiredResponse } from "@/lib/http";
import { resolvePackAccess } from "@/lib/catalog";
import { gafToGrokTemplate, isGafTeamPack } from "@/lib/gaf-to-grok-template";

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
  const headers = new Headers(corsHeaders);
  headers.set(
    "Cache-Control",
    stall.listingId ? "private, no-store" : "public, max-age=60",
  );

  if (isGafTeamPack(pack)) {
    return jsonResponse(
      {
        error: "not_agent_pack",
        slug,
        message:
          "Team packs have no 1:1 create_bot_share_json equivalent. Export each members[].pack agent as its own template.",
      },
      { status: 400, headers },
    );
  }

  try {
    const template = gafToGrokTemplate(pack);
    return jsonResponse(
      {
        tool: "get_grok_template",
        slug,
        template,
      },
      { headers },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Pack cannot project to a Grok Bot template.";
    return jsonResponse(
      {
        error: "invalid_pack",
        slug,
        message,
      },
      { status: 400, headers },
    );
  }
}

export function OPTIONS() {
  return optionsResponse();
}
