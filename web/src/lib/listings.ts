import { and, desc, eq } from "drizzle-orm";
import { getDb, hasDatabase } from "@/lib/db";
import { listings } from "@/lib/db/schema";
import { getStall, isStallKind, type StallKind } from "@/lib/packs";
import type { FarmPack } from "@/lib/pack-files";

const MAX_PACK_CHARS = 500_000;
const MIN_PAID_PRICE_CENTS = 200;
const MAX_PRICE_CENTS = 999_900;

export type ListingRow = typeof listings.$inferSelect;

export function slugifyName(name: string) {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return slug || "stall";
}

export function parseListingKind(value: unknown): StallKind | null {
  return typeof value === "string" && isStallKind(value) ? value : null;
}

export function parsePriceCents(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  const cents = Math.round(value);
  if (cents === 0) {
    return 0;
  }

  if (cents < MIN_PAID_PRICE_CENTS || cents > MAX_PRICE_CENTS) {
    return null;
  }

  return cents;
}

export function parsePackJson(
  value: unknown,
): { ok: true; pack: FarmPack } | { ok: false; error: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "Pack JSON must be an object." };
  }

  const encoded = JSON.stringify(value);
  if (encoded.length > MAX_PACK_CHARS) {
    return { ok: false, error: "Pack JSON is too large (max 500 KB)." };
  }

  return { ok: true, pack: value as FarmPack };
}

export async function listPublishedListings(): Promise<ListingRow[]> {
  if (!hasDatabase()) {
    return [];
  }

  try {
    const db = getDb();
    return await db
      .select()
      .from(listings)
      .where(eq(listings.published, true))
      .orderBy(desc(listings.createdAt));
  } catch (error) {
    console.error("listPublishedListings failed:", error);
    return [];
  }
}

export async function listSellerListings(sellerUserId: string) {
  const db = getDb();
  return db
    .select()
    .from(listings)
    .where(eq(listings.sellerUserId, sellerUserId))
    .orderBy(desc(listings.createdAt));
}

export async function listPublishedListingsBySeller(sellerUserId: string) {
  if (!hasDatabase()) {
    return [];
  }

  try {
    const db = getDb();
    return await db
      .select()
      .from(listings)
      .where(
        and(eq(listings.sellerUserId, sellerUserId), eq(listings.published, true)),
      )
      .orderBy(desc(listings.createdAt));
  } catch (error) {
    console.error("listPublishedListingsBySeller failed:", error);
    return [];
  }
}

export async function getListingBySlug(slug: string) {
  if (!hasDatabase()) {
    return null;
  }

  try {
    const db = getDb();
    const [row] = await db
      .select()
      .from(listings)
      .where(eq(listings.slug, slug))
      .limit(1);
    return row ?? null;
  } catch (error) {
    console.error("getListingBySlug failed:", error);
    return null;
  }
}

export async function getPublishedListingBySlug(slug: string) {
  const listing = await getListingBySlug(slug);
  return listing?.published ? listing : null;
}

export async function getListingById(id: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(listings)
    .where(eq(listings.id, id))
    .limit(1);
  return row ?? null;
}

export async function isSlugTaken(slug: string) {
  if (getStall(slug)) {
    return true;
  }

  const existing = await getListingBySlug(slug);
  return Boolean(existing);
}

export async function uniqueListingSlug(name: string) {
  const base = slugifyName(name);
  let slug = base;
  let n = 2;

  while (await isSlugTaken(slug)) {
    slug = `${base}-${n}`.slice(0, 62);
    n += 1;
  }

  return slug;
}

export async function createListing(input: {
  sellerUserId: string;
  slug: string;
  kind: StallKind;
  name: string;
  title: string;
  description: string;
  category: string;
  priceCents: number;
  pack: FarmPack;
}) {
  const db = getDb();
  const now = new Date();
  const [row] = await db
    .insert(listings)
    .values({
      sellerUserId: input.sellerUserId,
      slug: input.slug,
      kind: input.kind,
      name: input.name,
      title: input.title,
      description: input.description,
      category: input.category,
      priceCents: input.priceCents,
      currency: "usd",
      pack: input.pack as Record<string, unknown>,
      published: true,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return row;
}

export async function setListingPublished(
  id: string,
  sellerUserId: string,
  published: boolean,
) {
  const db = getDb();
  const now = new Date();
  const [row] = await db
    .update(listings)
    .set({ published, updatedAt: now })
    .where(and(eq(listings.id, id), eq(listings.sellerUserId, sellerUserId)))
    .returning();

  return row ?? null;
}
