import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";
import type { FarmPack } from "@/lib/pack-files";
import type { Stall } from "@/lib/packs";

export type AgencyCatalogFile = {
  generatedAt: string;
  upstreamRepo: string;
  upstreamRef: string;
  totalPacks: number;
  divisionCounts: Record<string, number>;
  skipped: { path: string; reason: string }[];
  stalls: Stall[];
  packs: Record<string, FarmPack>;
};

const CATALOG_CANDIDATES = [
  path.join(process.cwd(), "src/data/agency-catalog.generated.json"),
  path.join(process.cwd(), "web/src/data/agency-catalog.generated.json"),
];

let cached: AgencyCatalogFile | null = null;

function catalogPath(): string {
  for (const candidate of CATALOG_CANDIDATES) {
    try {
      readFileSync(candidate);
      return candidate;
    } catch {
      continue;
    }
  }
  throw new Error(
    "Missing agency-catalog.generated.json. Re-run scripts/import-agency-agents/convert.py",
  );
}

export function loadAgencyCatalog(): AgencyCatalogFile {
  if (cached) {
    return cached;
  }

  cached = JSON.parse(readFileSync(catalogPath(), "utf8")) as AgencyCatalogFile;
  return cached;
}

export function getAgencyStalls(): Stall[] {
  try {
    return loadAgencyCatalog().stalls;
  } catch {
    return [];
  }
}

export function getAgencyPack(slug: string): FarmPack | undefined {
  try {
    return loadAgencyCatalog().packs[slug];
  } catch {
    return undefined;
  }
}

export function isAgencyPackSlug(slug: string): boolean {
  try {
    return slug in loadAgencyCatalog().packs;
  } catch {
    return false;
  }
}
