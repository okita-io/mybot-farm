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

function packPathStem(packPath: string): string {
  const filename = packPath.split("/").pop()?.split("?")[0] ?? packPath;
  return filename
    .replace(/\.hermes\.tar\.gz$/i, "")
    .replace(/\.tar\.gz$/i, "")
    .replace(/\.json$/i, "");
}

/** Public href for a team member pack ref. Prefers a Hermes tarball when one exists. */
export function listingMemberHref(packRef: unknown): string | undefined {
  if (typeof packRef !== "string" || !packRef.trim()) {
    return undefined;
  }

  const raw = packRef.trim();
  if (/^https?:\/\//i.test(raw)) {
    return raw;
  }

  if (/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(raw)) {
    return existingHermesArchiveHref("agent", raw) ?? `/packs/agents/${raw}.json`;
  }

  const href = raw.startsWith("/")
    ? raw
    : `/packs/${raw.replace(/^\/?packs\//, "")}`;

  if (/\.tar\.gz$/i.test(href)) {
    return href;
  }

  if (href.includes("/agents/")) {
    const archive = existingHermesArchiveHref("agent", packPathStem(href));
    if (archive) {
      return archive;
    }
  }

  return href;
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
