import { and, desc, eq, inArray } from "drizzle-orm";
import { cache } from "react";
import { getDb, hasDatabase } from "@/lib/db";
import { listings, stallFlags, stallTakedowns, users } from "@/lib/db/schema";
import { getListingBySlug } from "@/lib/listings";
import { getStall } from "@/lib/packs";
import { type FlagReasonId } from "@/lib/flag-reasons";

export type { FlagReasonId };
export type FlagStatus = "open" | "dismissed" | "actioned";

const MAX_FLAG_DETAILS = 500;

export function parseFlagDetails(value: unknown) {
  if (value == null) {
    return "";
  }

  if (typeof value !== "string") {
    return null;
  }

  const details = value.trim();
  if (details.length > MAX_FLAG_DETAILS) {
    return null;
  }

  return details;
}

export const getTakenDownSlugSet = cache(async () => {
  const slugs = new Set<string>();
  if (!hasDatabase()) {
    return slugs;
  }

  try {
    const db = getDb();
    const rows = await db.select({ slug: stallTakedowns.slug }).from(stallTakedowns);
    for (const row of rows) {
      slugs.add(row.slug);
    }
  } catch (error) {
    console.error("getTakenDownSlugSet failed:", error);
  }

  return slugs;
});

export async function isSlugTakenDown(slug: string) {
  const taken = await getTakenDownSlugSet();
  return taken.has(slug);
}

export const hasUserFlaggedStall = cache(async (slug: string, userId: string) => {
  if (!slug || !userId || !hasDatabase()) {
    return false;
  }

  try {
    const db = getDb();
    const [row] = await db
      .select({ id: stallFlags.id })
      .from(stallFlags)
      .where(and(eq(stallFlags.slug, slug), eq(stallFlags.userId, userId)))
      .limit(1);
    return Boolean(row);
  } catch (error) {
    console.error("hasUserFlaggedStall failed:", error);
    return false;
  }
});

export async function createStallFlag(input: {
  slug: string;
  userId: string;
  reason: FlagReasonId;
  details: string;
}) {
  const db = getDb();
  const now = new Date();

  try {
    const [row] = await db
      .insert(stallFlags)
      .values({
        slug: input.slug,
        userId: input.userId,
        reason: input.reason,
        details: input.details || null,
        status: "open",
        createdAt: now,
      })
      .returning();
    return { ok: true as const, flag: row };
  } catch (error) {
    console.error("createStallFlag failed:", error);
    const already = await hasUserFlaggedStall(input.slug, input.userId);
    if (already) {
      return { ok: false as const, error: "already_flagged" as const };
    }
    return { ok: false as const, error: "failed" as const };
  }
}

export type AdminFlagRow = {
  id: string;
  slug: string;
  reason: string;
  details: string | null;
  status: string;
  createdAt: string;
  reporter: {
    id: string;
    username: string | null;
    email: string | null;
  };
};

export type AdminFlagGroup = {
  slug: string;
  name: string;
  kind: "agent" | "team";
  listingId: string | null;
  removable: boolean;
  takenDown: boolean;
  flags: AdminFlagRow[];
};

function stallPreview(slug: string, listing: typeof listings.$inferSelect | null) {
  const seed = getStall(slug);
  if (listing) {
    return {
      name: listing.name,
      kind: listing.kind === "team" ? ("team" as const) : ("agent" as const),
      listingId: listing.id,
    };
  }

  if (seed) {
    return {
      name: seed.name,
      kind: seed.kind,
      listingId: null as string | null,
    };
  }

  return {
    name: slug,
    kind: "agent" as const,
    listingId: null as string | null,
  };
}

export async function listOpenFlagGroups(): Promise<AdminFlagGroup[]> {
  if (!hasDatabase()) {
    return [];
  }

  const db = getDb();
  const rows = await db
    .select({
      id: stallFlags.id,
      slug: stallFlags.slug,
      reason: stallFlags.reason,
      details: stallFlags.details,
      status: stallFlags.status,
      createdAt: stallFlags.createdAt,
      reporterId: users.id,
      reporterUsername: users.username,
      reporterEmail: users.email,
    })
    .from(stallFlags)
    .innerJoin(users, eq(users.id, stallFlags.userId))
    .where(eq(stallFlags.status, "open"))
    .orderBy(desc(stallFlags.createdAt));

  const slugs = [...new Set(rows.map((row) => row.slug))];
  const listingRows = slugs.length
    ? await db.select().from(listings).where(inArray(listings.slug, slugs))
    : [];
  const listingBySlug = new Map(listingRows.map((row) => [row.slug, row]));
  const takenDown = await getTakenDownSlugSet();

  const groups = new Map<string, AdminFlagGroup>();
  for (const row of rows) {
    const existing = groups.get(row.slug);
    const flag: AdminFlagRow = {
      id: row.id,
      slug: row.slug,
      reason: row.reason,
      details: row.details,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
      reporter: {
        id: row.reporterId,
        username: row.reporterUsername,
        email: row.reporterEmail,
      },
    };

    if (existing) {
      existing.flags.push(flag);
      continue;
    }

    const preview = stallPreview(row.slug, listingBySlug.get(row.slug) ?? null);
    groups.set(row.slug, {
      slug: row.slug,
      name: preview.name,
      kind: preview.kind,
      listingId: preview.listingId,
      removable: !takenDown.has(row.slug),
      takenDown: takenDown.has(row.slug),
      flags: [flag],
    });
  }

  return [...groups.values()];
}

export async function listRecentTakedowns(limit = 20) {
  if (!hasDatabase()) {
    return [];
  }

  const db = getDb();
  const rows = await db
    .select({
      slug: stallTakedowns.slug,
      listingId: stallTakedowns.listingId,
      note: stallTakedowns.note,
      createdAt: stallTakedowns.createdAt,
      adminEmail: users.email,
      adminUsername: users.username,
    })
    .from(stallTakedowns)
    .innerJoin(users, eq(users.id, stallTakedowns.takenDownByUserId))
    .orderBy(desc(stallTakedowns.createdAt))
    .limit(limit);

  const listingRows = rows.length
    ? await db
        .select()
        .from(listings)
        .where(inArray(listings.slug, rows.map((row) => row.slug)))
    : [];
  const listingBySlug = new Map(listingRows.map((row) => [row.slug, row]));

  return rows.map((row) => {
    const preview = stallPreview(row.slug, listingBySlug.get(row.slug) ?? null);
    return {
      slug: row.slug,
      name: preview.name,
      kind: preview.kind,
      note: row.note,
      createdAt: row.createdAt.toISOString(),
      adminEmail: row.adminEmail,
      adminUsername: row.adminUsername,
    };
  });
}

export async function dismissOpenFlags(slug: string, adminUserId: string) {
  const db = getDb();
  const now = new Date();
  const rows = await db
    .update(stallFlags)
    .set({
      status: "dismissed",
      resolvedAt: now,
      resolvedByUserId: adminUserId,
    })
    .where(and(eq(stallFlags.slug, slug), eq(stallFlags.status, "open")))
    .returning({ id: stallFlags.id });

  return rows.length;
}

export async function takeDownStall(input: {
  slug: string;
  adminUserId: string;
  note?: string;
}) {
  const db = getDb();
  const now = new Date();
  const listing = await getListingBySlug(input.slug);

  if (listing && !listing.deletedAt) {
    await db
      .update(listings)
      .set({
        published: false,
        deletedAt: now,
        updatedAt: now,
      })
      .where(eq(listings.id, listing.id));
  }

  try {
    await db.insert(stallTakedowns).values({
      slug: input.slug,
      listingId: listing?.id ?? null,
      takenDownByUserId: input.adminUserId,
      note: input.note?.trim() || null,
      createdAt: now,
    });
  } catch (error) {
    console.error("takeDownStall insert failed:", error);
    return { ok: false as const, error: "already_removed" as const };
  }

  await db
    .update(stallFlags)
    .set({
      status: "actioned",
      resolvedAt: now,
      resolvedByUserId: input.adminUserId,
    })
    .where(and(eq(stallFlags.slug, input.slug), eq(stallFlags.status, "open")));

  return { ok: true as const, listingId: listing?.id ?? null };
}
