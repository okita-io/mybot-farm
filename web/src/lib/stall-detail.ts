import { catalogPackSummary, findStall, getCatalogPack } from "@/lib/catalog";
import { memberPackPath } from "@/lib/pack-files";
import { packPathStem, stallRecord } from "@/lib/packs";

/** Stall metadata + pack summary (no pack body). Shared by GET /api/stalls/{slug} and MCP farm_get_stall. */
export async function getStallDetail(slug: string) {
  const stall = await findStall(slug);
  const pack = await getCatalogPack(slug);
  const summary = await catalogPackSummary(slug);

  if (!stall || !pack || !summary) {
    return null;
  }

  return {
    ...stallRecord(stall),
    pack: {
      format: summary.format,
      version: summary.version,
      packVersion: summary.packVersion,
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
        const path = memberPackPath(member.pack);
        const memberSlug = path ? packPathStem(path) : undefined;

        return {
          role: member.role,
          summary: member.summary,
          pack: member.pack,
          slug: memberSlug,
          name: member.role,
        };
      }),
    },
  };
}
