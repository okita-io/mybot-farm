import { jsonResponse, notFoundResponse, optionsResponse } from "@/lib/http";
import { getPack, requireStallAndPack } from "@/lib/pack-files";
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
  const memberCount = pack.members?.length ?? 0;

  return jsonResponse({
    tool: "get_stall",
    ...stallRecord(stall),
    pack: {
      format: pack.format,
      version: pack.version,
      profile: pack.profile,
      skillCount: pack.skills?.length ?? 0,
      memoryCount: pack.memory?.length ?? 0,
      memberCount,
      scrubbed: pack.manifest?.scrubbed ?? true,
      homepage: pack.manifest?.homepage,
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
