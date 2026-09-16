import { auth } from "@clerk/nextjs/server";
import { gafToGrokTemplate, isGafAgentPack } from "@/lib/gaf-grok-template";
import { corsHeaders, jsonResponse, notFoundResponse, optionsResponse, paymentRequiredResponse } from "@/lib/http";
import { resolvePackAccess } from "@/lib/catalog";

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

  if (!isGafAgentPack(pack)) {
    return jsonResponse(
      {
        error: "not_an_agent_pack",
        slug: stall.slug,
        format: pack.format,
        message:
          "Team packs are not 1:1 with create_bot_share_json. Project each members[].pack agent separately.",
        members: pack.members ?? [],
      },
      { status: 400, headers },
    );
  }

  return jsonResponse(
    {
      tool: "get_grok_template",
      slug: stall.slug,
      kind: stall.kind,
      format: pack.format,
      enabled: pack.exports?.grokBotTemplate?.enabled === true,
      recipe: gafToGrokTemplate(pack),
    },
    { headers },
  );
}

export function OPTIONS() {
  return optionsResponse();
}
