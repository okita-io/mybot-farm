import { existsSync } from "node:fs";
import path from "node:path";
import type { StallKind } from "@/lib/packs";

export function hermesArchivePublicHref(kind: StallKind, slug: string): string {
  const dir = kind === "team" ? "teams" : "agents";
  return `/packs/${dir}/${slug}.hermes.tar.gz`;
}

function publicRootCandidates(): string[] {
  const cwd = process.cwd();
  return [path.join(cwd, "public"), path.join(cwd, "web/public")];
}

/** Public path for a stall's Hermes profile archive, if the file is on disk. */
export function existingHermesArchiveHref(
  kind: StallKind,
  slug: string,
): string | undefined {
  const href = hermesArchivePublicHref(kind, slug);
  const relative = href.replace(/^\//, "");
  for (const root of publicRootCandidates()) {
    if (existsSync(path.join(root, relative))) {
      return href;
    }
  }
  return undefined;
}

export function withHermesRuntime<T extends { runtime?: string[] }>(
  pack: T,
  kind: StallKind,
  slug: string,
): T {
  if (!existingHermesArchiveHref(kind, slug)) {
    return pack;
  }

  const runtime = pack.runtime ?? [];
  if (runtime.includes("hermes")) {
    return pack;
  }

  return { ...pack, runtime: [...runtime, "hermes"] };
}
