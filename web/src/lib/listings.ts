import { and, desc, eq, isNull } from "drizzle-orm";
import { getDb, hasDatabase } from "@/lib/db";
import { listings } from "@/lib/db/schema";
import { isAgencyPackSlug } from "@/lib/agency-catalog";
import { getStall, isStallKind, stallPagePath, type StallKind } from "@/lib/packs";
import { validateGafPack } from "@/lib/gaf-pack";
import type { FarmPack } from "@/lib/pack-files";
import {
  applyPackVersion,
  packVersionOf,
  readOptionalPackVersion,
  resolveCreatePackVersion,
  resolveUpdatePackVersion,
} from "@/lib/pack-version";
import { categories } from "@/lib/site";

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

  return slug || "bot";
}

export function parseListingSlug(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const slug = value.trim().toLowerCase();
  if (!slug || slug.length > 64) {
    return null;
  }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return null;
  }

  return slug;
}

export function isReservedCatalogSlug(slug: string) {
  return Boolean(getStall(slug) || isAgencyPackSlug(slug));
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

  const gaf = validateGafPack(value);
  if (!gaf.ok) {
    return { ok: false, error: gaf.error };
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
      .where(and(eq(listings.published, true), isNull(listings.deletedAt)))
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
        and(
          eq(listings.sellerUserId, sellerUserId),
          eq(listings.published, true),
          isNull(listings.deletedAt),
        ),
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
  return listing?.published && !listing.deletedAt ? listing : null;
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
  if (isReservedCatalogSlug(slug)) {
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

const categoryLabels = new Set<string>(categories.map((category) => category.label));

export type ListingWriteInput = {
  kind: StallKind;
  name: string;
  title: string;
  description: string;
  category: string;
  priceCents: number;
  pack: FarmPack;
  slug: string | null;
  packVersion: number | null;
};

export function listingWriteFromBody(
  body: unknown,
):
  | { ok: true; value: ListingWriteInput }
  | { ok: false; error: string; message?: string; status: number } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "invalid_body", status: 400 };
  }

  const parsed = parseListingPayload(body as Record<string, unknown>);
  if (!parsed.kind) {
    return { ok: false, error: "invalid_kind", status: 400 };
  }

  if (!parsed.name || !parsed.title || !parsed.description) {
    return { ok: false, error: "missing_fields", status: 400 };
  }

  if (!categoryLabels.has(parsed.category)) {
    return { ok: false, error: "invalid_category", status: 400 };
  }

  if (parsed.priceCents === null) {
    return {
      ok: false,
      error: "invalid_price",
      message: "Choose Free, or a price between $2.00 and $9,999.00.",
      status: 400,
    };
  }

  if (!parsed.packResult.ok) {
    return {
      ok: false,
      error: "invalid_pack",
      message: parsed.packResult.error,
      status: 400,
    };
  }

  const pack: FarmPack = {
    ...parsed.packResult.pack,
    slug: parsed.packResult.pack.slug,
    category: parsed.packResult.pack.category,
    profile: {
      ...parsed.packResult.pack.profile,
      name: parsed.packResult.pack.profile?.name ?? parsed.name,
      title: parsed.packResult.pack.profile?.title ?? parsed.title,
      description: parsed.packResult.pack.profile?.description ?? parsed.description,
    },
  };

  const slugField = (body as Record<string, unknown>).slug;
  let slug: string | null = null;
  if (slugField !== undefined && slugField !== null && slugField !== "") {
    slug = parseListingSlug(slugField);
    if (!slug) {
      return {
        ok: false,
        error: "invalid_slug",
        message: "slug must be lowercase letters, numbers, and hyphens.",
        status: 400,
      };
    }
  }

  const versionField = (body as Record<string, unknown>).packVersion;
  const requestedVersion = readOptionalPackVersion(versionField);
  if (!requestedVersion.ok) {
    return {
      ok: false,
      error: "invalid_pack_version",
      message: "packVersion must be a positive integer.",
      status: 400,
    };
  }

  return {
    ok: true,
    value: {
      kind: parsed.kind,
      name: parsed.name,
      title: parsed.title,
      description: parsed.description,
      category: parsed.category,
      priceCents: parsed.priceCents,
      pack,
      slug,
      packVersion: requestedVersion.value,
    },
  };
}

export function readListingString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function parseListingPayload(record: Record<string, unknown>) {
  return {
    kind: parseListingKind(record.kind),
    name: readListingString(record.name),
    title: readListingString(record.title),
    description: readListingString(record.description),
    category: readListingString(record.category),
    priceCents: parsePriceCents(record.priceCents),
    packResult: parsePackJson(record.pack),
  };
}

export function listingWriteResponse(
  listing: ListingRow,
  extra: { created?: boolean; updated?: boolean; hasReadme?: boolean },
) {
  const pack = listing.pack as FarmPack;
  return {
    ok: true as const,
    id: listing.id,
    stallId: listing.id,
    slug: listing.slug,
    kind: listing.kind,
    pagePath: stallPagePath({
      kind: listing.kind === "team" ? "team" : "agent",
      slug: listing.slug,
    }),
    packVersion: packVersionOf(pack),
    created: Boolean(extra.created),
    updated: Boolean(extra.updated),
    hasReadme:
      extra.hasReadme ?? Boolean(listing.readmeHtml ?? listing.readmeMarkdown),
  };
}

export function packForListingWrite(
  value: ListingWriteInput,
  slug: string,
  currentPackVersion: number | null,
):
  | { ok: true; pack: FarmPack; packVersion: number }
  | { ok: false; error: "stale_version"; message: string; status: 409 } {
  const next =
    currentPackVersion == null
      ? { ok: true as const, version: resolveCreatePackVersion(value.packVersion, value.pack) }
      : resolveUpdatePackVersion(currentPackVersion, value.packVersion, value.pack);

  if (!next.ok) {
    return { ...next, status: 409 };
  }

  return {
    ok: true,
    pack: applyPackVersion(value.pack, slug, next.version),
    packVersion: next.version,
  };
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
  readmeMarkdown?: string | null;
  readmeHtml?: string | null;
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
      readmeMarkdown: input.readmeMarkdown ?? null,
      readmeHtml: input.readmeHtml ?? null,
      published: true,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return row;
}

export async function updateListingReadme(
  id: string,
  sellerUserId: string,
  input: { readmeMarkdown: string; readmeHtml: string },
) {
  const db = getDb();
  const now = new Date();
  const [row] = await db
    .update(listings)
    .set({
      readmeMarkdown: input.readmeMarkdown,
      readmeHtml: input.readmeHtml,
      updatedAt: now,
    })
    .where(
      and(
        eq(listings.id, id),
        eq(listings.sellerUserId, sellerUserId),
        isNull(listings.deletedAt),
      ),
    )
    .returning();

  return row ?? null;
}

export async function clearListingReadme(id: string, sellerUserId: string) {
  const db = getDb();
  const now = new Date();
  const [row] = await db
    .update(listings)
    .set({
      readmeMarkdown: null,
      readmeHtml: null,
      updatedAt: now,
    })
    .where(
      and(
        eq(listings.id, id),
        eq(listings.sellerUserId, sellerUserId),
        isNull(listings.deletedAt),
      ),
    )
    .returning();

  return row ?? null;
}

export async function updateListing(
  id: string,
  sellerUserId: string,
  input: {
    kind: StallKind;
    name: string;
    title: string;
    description: string;
    category: string;
    priceCents: number;
    pack: FarmPack;
  },
) {
  const db = getDb();
  const now = new Date();
  const [row] = await db
    .update(listings)
    .set({
      kind: input.kind,
      name: input.name,
      title: input.title,
      description: input.description,
      category: input.category,
      priceCents: input.priceCents,
      pack: input.pack as Record<string, unknown>,
      updatedAt: now,
    })
    .where(
      and(
        eq(listings.id, id),
        eq(listings.sellerUserId, sellerUserId),
        isNull(listings.deletedAt),
      ),
    )
    .returning();

  return row ?? null;
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
    .where(
      and(
        eq(listings.id, id),
        eq(listings.sellerUserId, sellerUserId),
        isNull(listings.deletedAt),
      ),
    )
    .returning();

  return row ?? null;
}
