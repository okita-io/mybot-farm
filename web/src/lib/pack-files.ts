import finders from "../../public/packs/agents/finders.json";
import giftDay from "../../public/packs/agents/gift-day.json";
import grantResearch from "../../public/packs/agents/grant-research.json";
import patch from "../../public/packs/agents/patch.json";
import pitch from "../../public/packs/agents/pitch.json";
import probe from "../../public/packs/agents/probe.json";
import scholasticResearch from "../../public/packs/agents/scholastic-research.json";
import scout from "../../public/packs/agents/scout.json";
import sproutJournal from "../../public/packs/agents/sprout-journal.json";
import pairBench from "../../public/packs/teams/pair-bench.json";
import roadCrew from "../../public/packs/teams/road-crew.json";
import workbench from "../../public/packs/teams/workbench.json";
import { getStall, packPathStem, type Stall } from "@/lib/packs";
import { normalizeRuntimes, type RuntimeId } from "@/lib/runtimes";

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
  runtime?: string[];
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

export type StallCardStats = {
  runtimes: RuntimeId[];
  skillCount: number;
  memoryCount: number;
  memoryLineCount: number;
  soulLine: string | null;
  memberCount: number;
};

const SOUL_MAX_CHARS = 140;

function countContentLines(content: string | undefined): number {
  if (!content?.trim()) {
    return 0;
  }

  return content.split(/\r?\n/).filter((line) => line.trim().length > 0).length;
}

function countMemoryLines(entries: PackMemory[] | undefined): number {
  return (entries ?? []).reduce(
    (sum, entry) => sum + countContentLines(entry.content),
    0,
  );
}

export function soulOneLiner(text: string | undefined | null): string | null {
  if (!text?.trim()) {
    return null;
  }

  const collapsed = text.replace(/\s+/g, " ").trim();
  const sentenceEnd = collapsed.search(/[.!?](?:\s|$)/);
  const line = sentenceEnd === -1 ? collapsed : collapsed.slice(0, sentenceEnd + 1);

  if (line.length <= SOUL_MAX_CHARS) {
    return line;
  }

  return `${line.slice(0, SOUL_MAX_CHARS - 1).trimEnd()}…`;
}

export function packCardStats(pack: FarmPack): StallCardStats {
  const memberPacks = (pack.members ?? [])
    .map((member) => {
      const slug = member.pack ? memberSlugFromPackPath(member.pack) : undefined;
      return slug ? getPack(slug) : undefined;
    })
    .filter((memberPack): memberPack is FarmPack => Boolean(memberPack));

  const ownSkills = pack.skills?.length ?? 0;
  const memberSkills = memberPacks.reduce(
    (sum, memberPack) => sum + (memberPack.skills?.length ?? 0),
    0,
  );
  const memoryEntries = [...(pack.memory ?? []), ...(pack.shared?.memory ?? [])];

  return {
    runtimes: normalizeRuntimes(pack.runtime),
    skillCount: ownSkills + memberSkills,
    memoryCount: memoryEntries.length,
    memoryLineCount: countMemoryLines(memoryEntries),
    soulLine: soulOneLiner(pack.profile?.description),
    memberCount: pack.members?.length ?? 0,
  };
}

export function stallCardStats(slug: string): StallCardStats | null {
  const pack = getPack(slug);
  return pack ? packCardStats(pack) : null;
}

export function packSummaryFields(pack: FarmPack) {
  const stats = packCardStats(pack);

  return {
    format: pack.format,
    version: pack.version,
    profile: pack.profile
      ? {
          name: pack.profile.name,
          title: pack.profile.title,
          description: pack.profile.description,
        }
      : undefined,
    runtime: stats.runtimes,
    skillCount: stats.skillCount,
    memoryCount: stats.memoryCount,
    memoryLineCount: stats.memoryLineCount,
    soulLine: stats.soulLine,
    memberCount: stats.memberCount,
    scrubbed: pack.manifest?.scrubbed ?? true,
    homepage: pack.manifest?.homepage,
  };
}

const packsBySlug: Record<string, FarmPack> = {
  "gift-day": giftDay,
  "sprout-journal": sproutJournal,
  patch,
  probe,
  "grant-research": grantResearch,
  "scholastic-research": scholasticResearch,
  scout,
  finders,
  pitch,
  "pair-bench": pairBench,
  "road-crew": roadCrew,
  workbench,
};

function memberSlugFromPackPath(packPath: string): string {
  return packPathStem(packPath);
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
