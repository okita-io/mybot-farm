import { and, eq, inArray, sql } from "drizzle-orm";
import { cache } from "react";
import { getDb, hasDatabase } from "@/lib/db";
import { stallLikes, stallStats } from "@/lib/db/schema";

export type StallEngagement = {
  downloadCount: number;
  likeCount: number;
  liked: boolean;
};

const emptyEngagement: StallEngagement = {
  downloadCount: 0,
  likeCount: 0,
  liked: false,
};

export async function getStallStatsBySlugs(slugs: string[]) {
  const unique = [...new Set(slugs.filter(Boolean))];
  const stats = new Map<string, { downloadCount: number; likeCount: number }>();

  if (!unique.length || !hasDatabase()) {
    return stats;
  }

  try {
    const db = getDb();
    const rows = await db
      .select()
      .from(stallStats)
      .where(inArray(stallStats.slug, unique));

    for (const row of rows) {
      stats.set(row.slug, {
        downloadCount: row.downloadCount,
        likeCount: row.likeCount,
      });
    }
  } catch (error) {
    console.error("getStallStatsBySlugs failed:", error);
  }

  return stats;
}

export const getStallEngagement = cache(
  async (slug: string, userId?: string | null): Promise<StallEngagement> => {
    if (!slug || !hasDatabase()) {
      return emptyEngagement;
    }

    try {
      const db = getDb();
      const [[stats], [like]] = await Promise.all([
        db.select().from(stallStats).where(eq(stallStats.slug, slug)).limit(1),
        userId
          ? db
              .select({ id: stallLikes.id })
              .from(stallLikes)
              .where(and(eq(stallLikes.slug, slug), eq(stallLikes.userId, userId)))
              .limit(1)
          : Promise.resolve([] as { id: string }[]),
      ]);

      return {
        downloadCount: stats?.downloadCount ?? 0,
        likeCount: stats?.likeCount ?? 0,
        liked: Boolean(like),
      };
    } catch (error) {
      console.error("getStallEngagement failed:", error);
      return emptyEngagement;
    }
  },
);

export async function recordStallDownload(slug: string) {
  if (!slug || !hasDatabase()) {
    return;
  }

  try {
    const db = getDb();
    const now = new Date();
    await db
      .insert(stallStats)
      .values({
        slug,
        downloadCount: 1,
        likeCount: 0,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: stallStats.slug,
        set: {
          downloadCount: sql`${stallStats.downloadCount} + 1`,
          updatedAt: now,
        },
      });
  } catch (error) {
    console.error("recordStallDownload failed:", error);
  }
}

export async function toggleStallLike(slug: string, userId: string) {
  const db = getDb();
  const now = new Date();
  const [existing] = await db
    .select({ id: stallLikes.id })
    .from(stallLikes)
    .where(and(eq(stallLikes.slug, slug), eq(stallLikes.userId, userId)))
    .limit(1);

  if (existing) {
    await db.delete(stallLikes).where(eq(stallLikes.id, existing.id));
    await db
      .insert(stallStats)
      .values({
        slug,
        downloadCount: 0,
        likeCount: 0,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: stallStats.slug,
        set: {
          likeCount: sql`greatest(${stallStats.likeCount} - 1, 0)`,
          updatedAt: now,
        },
      });
  } else {
    await db.insert(stallLikes).values({ slug, userId, createdAt: now });
    await db
      .insert(stallStats)
      .values({
        slug,
        downloadCount: 0,
        likeCount: 1,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: stallStats.slug,
        set: {
          likeCount: sql`${stallStats.likeCount} + 1`,
          updatedAt: now,
        },
      });
  }

  const [stats] = await db
    .select()
    .from(stallStats)
    .where(eq(stallStats.slug, slug))
    .limit(1);

  return {
    downloadCount: stats?.downloadCount ?? 0,
    likeCount: stats?.likeCount ?? 0,
    liked: !existing,
  } satisfies StallEngagement;
}
