import { jsonResponse, notFoundResponse, optionsResponse } from "@/lib/http";
import { getPack, packSummaryFields, requireStallAndPack } from "@/lib/pack-files";
import { stallRecord } from "@/lib/packs";

export async function GET(
  _request: Request,
  context: RouteContext<"/api/stalls/[slug]">,
) {
  const { slug } = await context.params;
  const loaded = requireStallAndPack(slug);

  if (!loaded) {
    return notFoundResponse(slug);
  }

  const { stall, pack } = loaded;
  const summary = packSummaryFields(pack);

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
        const memberSlug = member.pack
          ?.split("/")
          .pop()
          ?.replace(/\.json$/, "");
        const memberPack = memberSlug ? getPack(memberSlug) : undefined;

        return {
          role: member.role,
          summary: member.summary,
          pack: member.pack,
          slug: memberSlug,
          name: memberPack?.profile?.name,
        };
      }),
    },
  });
}

export function OPTIONS() {
  return optionsResponse();
}
