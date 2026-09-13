import { jsonResponse, notFoundResponse, optionsResponse } from "@/lib/http";
import { catalogPackSummary, findStall, getCatalogPack } from "@/lib/catalog";
import { packPathStem, stallRecord } from "@/lib/packs";

export async function GET(
  _request: Request,
  context: RouteContext<"/api/stalls/[slug]">,
) {
  const { slug } = await context.params;
  const stall = await findStall(slug);
  const pack = await getCatalogPack(slug);
  const summary = await catalogPackSummary(slug);

  if (!stall || !pack || !summary) {
    return notFoundResponse(slug);
  }

  return jsonResponse({
    tool: "get_stall",
    ...stallRecord(stall),
    pack: {
      format: summary.format,
      version: summary.version,
      profile: pack.profile,
      runtime: summary.runtime,
      skillCount: summary.skillCount,
      memoryCount: summary.memoryCount,
      memoryLineCount: summary.memoryLineCount,
      soulLine: summary.soulLine,
      memberCount: summary.memberCount,
      scrubbed: summary.scrubbed,
      homepage: summary.homepage,
      members: (pack.members ?? []).map((member) => {
        const memberSlug = member.pack ? packPathStem(member.pack) : undefined;

        return {
          role: member.role,
          summary: member.summary,
          pack: member.pack,
          slug: memberSlug,
          name: member.role,
        };
      }),
    },
  });
}

export function OPTIONS() {
  return optionsResponse();
}
