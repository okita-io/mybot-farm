import giftDay from "../../public/packs/agents/gift-day.json";
import grantResearch from "../../public/packs/agents/grant-research.json";
import patch from "../../public/packs/agents/patch.json";
import probe from "../../public/packs/agents/probe.json";
import sproutJournal from "../../public/packs/agents/sprout-journal.json";
import pairBench from "../../public/packs/teams/pair-bench.json";
import { getStall, type Stall } from "@/lib/packs";

export type PackSkill = {
  name: string;
  description?: string;
  content?: string;
};

export type PackMemory = {
  kind?: string;
  content: string;
  createdAt?: string;
};

export type PackProfile = {
  name?: string;
  title?: string;
  description?: string;
};

export type PackMemberRef = {
  role?: string;
  summary?: string;
  pack?: string;
};

export type FarmPack = {
  format?: string;
  version?: string;
  slug?: string;
  category?: string;
  tags?: string[];
  profile?: PackProfile;
  skills?: PackSkill[];
  memory?: PackMemory[];
  members?: PackMemberRef[];
  team?: unknown;
  shared?: {
    memory?: PackMemory[];
    gettingStarted?: string;
  };
  topology?: unknown;
  manifest?: {
    homepage?: string;
    scrubbed?: boolean;
    license?: string;
  };
};

const packsBySlug: Record<string, FarmPack> = {
  "gift-day": giftDay,
  "sprout-journal": sproutJournal,
  patch,
  probe,
  "grant-research": grantResearch,
  "pair-bench": pairBench,
};

function memberSlugFromPackPath(packPath: string): string {
  return packPath.split("/").pop()?.replace(/\.json$/, "") ?? packPath;
}

export function getPack(slug: string): FarmPack | undefined {
  return packsBySlug[slug];
}

export function requireStallAndPack(slug: string): {
  stall: Stall;
  pack: FarmPack;
} | null {
  const stall = getStall(slug);
  const pack = getPack(slug);

  if (!stall || !pack) {
    return null;
  }

  return { stall, pack };
}

export function packSkillList(slug: string) {
  const loaded = requireStallAndPack(slug);

  if (!loaded) {
    return null;
  }

  const { stall, pack } = loaded;
  const members = (pack.members ?? []).map((member) => {
    const memberSlug = member.pack ? memberSlugFromPackPath(member.pack) : undefined;
    const memberPack = memberSlug ? getPack(memberSlug) : undefined;

    return {
      role: member.role,
      summary: member.summary,
      pack: member.pack,
      slug: memberSlug,
      name: memberPack?.profile?.name,
      skills: memberPack?.skills ?? [],
    };
  });

  return {
    slug: stall.slug,
    kind: stall.kind,
    name: stall.name,
    format: pack.format,
    skills: pack.skills ?? [],
    memory: pack.memory ?? [],
    sharedMemory: pack.shared?.memory ?? [],
    members,
  };
}
