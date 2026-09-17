import { desc, eq } from "drizzle-orm";
import { getDb, hasDatabase } from "@/lib/db";
import { stallRevisions } from "@/lib/db/schema";
import type { FarmPack } from "@/lib/pack-files";

export type StallRevisionSource = "api_key" | "session" | "catalog";

export type StallRevision = {
  packVersion: number;
  summary: string;
  source: StallRevisionSource;
  commitSha: string | null;
  githubPath: string | null;
  createdAt: string;
};

export async function insertStallRevision(input: {
  listingId: string;
  slug: string;
  packVersion: number;
  source: StallRevisionSource;
  summary: string;
  commitSha?: string | null;
  githubPath?: string | null;
  actorUserId?: string | null;
  pack: FarmPack;
}) {
  const db = getDb();
  const [row] = await db
    .insert(stallRevisions)
    .values({
      listingId: input.listingId,
      slug: input.slug,
      packVersion: input.packVersion,
      source: input.source,
      summary: input.summary,
      commitSha: input.commitSha ?? null,
      githubPath: input.githubPath ?? null,
      actorUserId: input.actorUserId ?? null,
      pack: input.pack as Record<string, unknown>,
    })
    .returning();
  return row;
}

export async function listStallRevisions(slug: string): Promise<StallRevision[]> {
  if (!hasDatabase()) {
    return [];
  }

  try {
    const db = getDb();
    const rows = await db
      .select({
        packVersion: stallRevisions.packVersion,
        summary: stallRevisions.summary,
        source: stallRevisions.source,
        commitSha: stallRevisions.commitSha,
        githubPath: stallRevisions.githubPath,
        createdAt: stallRevisions.createdAt,
      })
      .from(stallRevisions)
      .where(eq(stallRevisions.slug, slug))
      .orderBy(desc(stallRevisions.packVersion));

    return rows.map((row) => ({
      packVersion: row.packVersion,
      summary: row.summary,
      source: row.source as StallRevisionSource,
      commitSha: row.commitSha,
      githubPath: row.githubPath,
      createdAt: row.createdAt.toISOString(),
    }));
  } catch (error) {
    console.error("listStallRevisions failed:", error);
    return [];
  }
}
