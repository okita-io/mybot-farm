import { getAgencyPack, getAgencyStalls } from "@/lib/agency-catalog";
import type { FarmPack } from "@/lib/pack-files";
import { getPack, packCardStats, packSkillList, packSummaryFields } from "@/lib/pack-files";
import { getStallStatsBySlugs } from "@/lib/engagement";
import {
  getListingBySlug,
  listPublishedListings,
  listPublishedListingsBySeller,
  type ListingRow,
} from "@/lib/listings";
import { getTakenDownSlugSet } from "@/lib/moderation";
import {
  FARM_SEED_LISTED_AT,
  getStall,
  packPathStem,
  stalls,
  type Stall,
  type StallKind,
} from "@/lib/packs";
import { packVersionOf } from "@/lib/pack-version";
import { catalogStallId } from "@/lib/stall-id";
import { hasPaidPurchase } from "@/lib/purchases";
import { withSeedReadme } from "@/lib/seed-readme";
import {
  FARM_AUTHOR,
  getUserByClerkId,
  getUsersByIds,
  stallAuthorFromUser,
} from "@/lib/users";

export type CatalogSort = "newest" | "name" | "price";

export function listingToStall(
  listing: ListingRow,
  author?: Stall["author"],
): Stall {
  const pack = listing.pack as FarmPack;
  const members = (pack.members ?? []).map((member) => ({
    name: member.role ?? member.pack ?? "Member",
    href: member.pack ?? `/api/packs/${listing.slug}`,
  }));

  return {
    kind: listing.kind === "team" ? "team" : "agent",
    slug: listing.slug,
    stallId: listing.id,
    packVersion: packVersionOf(pack),
    name: listing.name,
    title: listing.title,
    description: listing.description,
    category: listing.category,
    tone: listing.kind === "team" ? "agent" : "share",
    downloadHref: `/api/packs/${listing.slug}?download=1`,
    members: members.length ? members : undefined,
    priceCents: listing.priceCents,
    currency: listing.currency,
    listingId: listing.id,
    sellerUserId: listing.sellerUserId,
    author,
    listedAt: listing.createdAt.toISOString(),
    updatedAt: listing.updatedAt.toISOString(),
    readmeMarkdown: listing.readmeMarkdown,
    readmeHtml: listing.readmeHtml,
  };
}

export function withSeedPrice(stall: Stall): Stall {
  const listedAt = stall.listedAt ?? FARM_SEED_LISTED_AT;
  const pack = getCatalogSeedPack(stall.slug);

  return {
    ...stall,
    stallId: stall.listingId ?? stall.stallId ?? catalogStallId(stall.kind, stall.slug),
    packVersion: stall.packVersion ?? packVersionOf(pack),
    priceCents: stall.priceCents ?? 0,
    currency: stall.currency ?? "usd",
    author: stall.author ?? FARM_AUTHOR,
    listedAt,
    updatedAt: stall.updatedAt ?? listedAt,
  };
}

async function withStallStats(stallsList: Stall[]): Promise<Stall[]> {
  if (!stallsList.length) {
    return stallsList;
  }

  const stats = await getStallStatsBySlugs(stallsList.map((stall) => stall.slug));
  return stallsList.map((stall) => {
    const row = stats.get(stall.slug);
    return {
      ...stall,
      downloadCount: row?.downloadCount ?? 0,
      likeCount: row?.likeCount ?? 0,
    };
  });
}

async function isHiddenStall(slug: string) {
  const takenDown = await getTakenDownSlugSet();
  return takenDown.has(slug);
}

async function hydrateListingStalls(listings: ListingRow[]): Promise<Stall[]> {
  const sellers = await getUsersByIds(listings.map((listing) => listing.sellerUserId));

  return listings.map((listing) =>
    listingToStall(listing, stallAuthorFromUser(sellers.get(listing.sellerUserId))),
  );
}

function getCatalogStall(slug: string): Stall | undefined {
  return getStall(slug) ?? getAgencyStalls().find((stall) => stall.slug === slug);
}

function getCatalogSeedPack(slug: string): FarmPack | undefined {
  return getPack(slug) ?? getAgencyPack(slug);
}

export async function findStall(slug: string): Promise<Stall | undefined> {
  if (await isHiddenStall(slug)) {
    return undefined;
  }

  const seed = getCatalogStall(slug);
  if (seed) {
    const [stall] = await withStallStats([withSeedPrice(seed)]);
    return stall;
  }

  const listing = await getListingBySlug(slug);
  if (!listing?.published || listing.deletedAt) {
    return undefined;
  }

  const hydrated = await hydrateListingStalls([listing]);
  const [stall] = await withStallStats(hydrated);
  return stall;
}

export async function getCatalogPack(slug: string): Promise<FarmPack | undefined> {
  if (await isHiddenStall(slug)) {
    return undefined;
  }

  const seed = getCatalogSeedPack(slug);
  if (seed) {
    return seed;
  }

  const listing = await getListingBySlug(slug);
  if (!listing?.published || listing.deletedAt) {
    return undefined;
  }

  return listing.pack as FarmPack;
}

export async function requireCatalogStallAndPack(slug: string) {
  const stall = await findStall(slug);
  const pack = await getCatalogPack(slug);

  if (!stall || !pack) {
    return null;
  }

  return { stall, pack };
}

export async function catalogStallCardStats(slug: string) {
  const pack = await getCatalogPack(slug);
  return pack ? packCardStats(pack) : null;
}

export async function catalogPackSkillList(slug: string) {
  const seed = packSkillList(slug);
  if (seed) {
    return seed;
  }

  const loaded = await requireCatalogStallAndPack(slug);
  if (!loaded) {
    return null;
  }

  const { stall, pack } = loaded;
  return {
    slug: stall.slug,
    kind: stall.kind,
    name: stall.name,
    format: pack.format,
    skills: pack.skills ?? [],
    memory: pack.memory ?? [],
    sharedMemory: pack.shared?.memory ?? [],
    members: (pack.members ?? []).map((member) => ({
      role: member.role,
      summary: member.summary,
      pack: member.pack,
      slug: member.pack ? packPathStem(member.pack) : undefined,
      name: undefined,
      skills: [] as FarmPack["skills"],
    })),
  };
}

export async function listCatalogStalls(): Promise<Stall[]> {
  const takenDown = await getTakenDownSlugSet();
  const published = await listPublishedListings();
  const extras = await hydrateListingStalls(
    published.filter(
      (listing) =>
        !getCatalogStall(listing.slug) && !takenDown.has(listing.slug),
    ),
  );
  const seeds = await Promise.all(
    [...stalls, ...getAgencyStalls()]
      .filter((stall) => !takenDown.has(stall.slug))
      .map(withSeedPrice)
      .map((stall) => withSeedReadme(stall)),
  );

  return withStallStats([...seeds, ...extras]);
}

export async function listAuthorStalls(sellerUserId: string): Promise<Stall[]> {
  const published = await listPublishedListingsBySeller(sellerUserId);
  return withStallStats(await hydrateListingStalls(published));
}

function stallMatchesQuery(stall: Stall, needle?: string, kind?: StallKind) {
  if (kind && stall.kind !== kind) {
    return false;
  }

  if (!needle) {
    return true;
  }

  const haystack = [
    stall.slug,
    stall.name,
    stall.title,
    stall.description,
    stall.category,
    stall.kind,
    stall.author?.username,
    stall.readmeMarkdown,
    ...(stall.members?.map((member) => member.name) ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(needle);
}

export function sortCatalogStalls(stallsList: Stall[], sort: CatalogSort = "newest") {
  const copy = [...stallsList];

  if (sort === "name") {
    return copy.sort((a, b) => a.name.localeCompare(b.name));
  }

  if (sort === "price") {
    return copy.sort((a, b) => {
      const priceDiff = (a.priceCents ?? 0) - (b.priceCents ?? 0);
      if (priceDiff !== 0) return priceDiff;
      return a.name.localeCompare(b.name);
    });
  }

  return copy.sort((a, b) => {
    const aTime = a.listedAt ? Date.parse(a.listedAt) : 0;
    const bTime = b.listedAt ? Date.parse(b.listedAt) : 0;
    if (aTime !== bTime) return bTime - aTime;
    return a.name.localeCompare(b.name);
  });
}

export async function searchCatalogStalls(
  query?: string,
  kind?: StallKind,
  sort: CatalogSort = "newest",
) {
  const all = await listCatalogStalls();
  const needle = query?.trim().toLowerCase();
  const matches = all.filter((stall) => stallMatchesQuery(stall, needle, kind));
  return sortCatalogStalls(matches, sort);
}

export async function catalogPackSummary(slug: string) {
  const pack = await getCatalogPack(slug);
  return pack ? packSummaryFields(pack) : null;
}

export type PackAccess =
  | { ok: true; stall: Stall; pack: FarmPack }
  | { ok: false; reason: "not_found" }
  | { ok: false; reason: "purchase_required"; stall: Stall };

export async function resolvePackAccess(
  slug: string,
  clerkUserId?: string | null,
): Promise<PackAccess> {
  const seedStall = getCatalogStall(slug);
  const seedPack = getCatalogSeedPack(slug);
  if (seedStall && seedPack) {
    if (await isHiddenStall(slug)) {
      return { ok: false, reason: "not_found" };
    }
    return { ok: true, stall: withSeedPrice(seedStall), pack: seedPack };
  }

  const listing = await getListingBySlug(slug);
  if (!listing || listing.deletedAt || (await isHiddenStall(slug))) {
    return { ok: false, reason: "not_found" };
  }

  const user = clerkUserId ? await getUserByClerkId(clerkUserId) : null;
  const isSeller = user?.id === listing.sellerUserId;

  if (!listing.published && !isSeller) {
    return { ok: false, reason: "not_found" };
  }

  const [stall] = await hydrateListingStalls([listing]);
  const pack = listing.pack as FarmPack;

  if (listing.priceCents <= 0 || isSeller) {
    return { ok: true, stall, pack };
  }

  if (user && (await hasPaidPurchase(user.id, listing.id))) {
    return { ok: true, stall, pack };
  }

  return { ok: false, reason: "purchase_required", stall };
}

export async function canDownloadStall(
  stall: Stall,
  clerkUserId?: string | null,
) {
  if ((stall.priceCents ?? 0) <= 0) {
    return true;
  }

  const access = await resolvePackAccess(stall.slug, clerkUserId);
  return access.ok;
}

export function isCatalogSort(value: string | null | undefined): value is CatalogSort {
  return value === "newest" || value === "name" || value === "price";
}
