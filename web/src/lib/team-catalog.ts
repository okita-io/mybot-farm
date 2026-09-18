import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";
import type { FarmPack } from "@/lib/pack-files";
import type { Stall } from "@/lib/packs";

export type TeamCatalogFile = {
  generatedAt: string;
  upstreamRepo: string;
  totalPacks: number;
  stalls: Stall[];
  packs: Record<string, FarmPack>;
};

const CATALOG_CANDIDATES = [
  path.join(process.cwd(), "src/data/team-catalog.generated.json"),
  path.join(process.cwd(), "web/src/data/team-catalog.generated.json"),
];

let cached: TeamCatalogFile | null = null;

function catalogPath(): string {
  for (const candidate of CATALOG_CANDIDATES) {
    try {
      readFileSync(candidate);
      return candidate;
    } catch {
      continue;
    }
  }
  return "";
}

export function loadTeamCatalog(): TeamCatalogFile | null {
  if (cached) {
    return cached;
  }

  const p = catalogPath();
  if (!p) {
    return null;
  }

  cached = JSON.parse(readFileSync(p, "utf8")) as TeamCatalogFile;
  return cached;
}

export function getTeamStalls(): Stall[] {
  try {
    return loadTeamCatalog()?.stalls ?? [];
  } catch {
    return [];
  }
}

export function getTeamPack(slug: string): FarmPack | undefined {
  try {
    return loadTeamCatalog()?.packs[slug];
  } catch {
    return undefined;
  }
}

export function isTeamPackSlug(slug: string): boolean {
  try {
    return Boolean(loadTeamCatalog()?.packs[slug]);
  } catch {
    return false;
  }
}
