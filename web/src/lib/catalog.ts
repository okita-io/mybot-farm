import type { FarmPack } from "@/lib/pack-files";
import { getPack, packCardStats, packSkillList, packSummaryFields } from "@/lib/pack-files";
import {
  getListingBySlug,
  listPublishedListings,
  type ListingRow,
} from "@/lib/listings";
import {
  getStall,
  searchStalls,
  stalls,
  type Stall,
  type StallKind,
} from "@/lib/packs";
import { hasPaidPurchase } from "@/lib/purchases";
import { getUserByClerkId } from "@/lib/users";

export function listingToStall(listing: ListingRow): Stall {
  const pack = listing.pack as FarmPack;
  const members = (pack.members ?? []).map((member) => ({
    name: member.role ?? member.pack ?? "Member",
    href: member.pack ?? `/api/packs/${listing.slug}`,
  }));

  return {
    kind: listing.kind === "team" ? "team" : "agent",
    slug: listing.slug,
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
  };
}

export function withSeedPrice(stall: Stall): Stall {
  return {
    ...stall,
    priceCents: stall.priceCents ?? 0,
    currency: stall.currency ?? "usd",
  };
}

export async function findStall(slug: string): Promise<Stall | undefined> {
  const seed = getStall(slug);
  if (seed) {
    return withSeedPrice(seed);
  }

  const listing = await getListingBySlug(slug);
  if (!listing?.published) {
    return undefined;
  }

  return listingToStall(listing);
}

export async function getCatalogPack(slug: string): Promise<FarmPack | undefined> {
  const seed = getPack(slug);
  if (seed) {
    return seed;
  }

  const listing = await getListingBySlug(slug);
  if (!listing?.published) {
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
      slug: member.pack
        ?.split("/")
        .pop()
        ?.replace(/\.json$/, ""),
      name: undefined,
      skills: [] as FarmPack["skills"],
    })),
  };
}

export async function listCatalogStalls(): Promise<Stall[]> {
  const published = await listPublishedListings();
  const extras = published
    .filter((listing) => !getStall(listing.slug))
    .map(listingToStall);

  return [...stalls.map(withSeedPrice), ...extras];
}

export async function searchCatalogStalls(query?: string, kind?: StallKind) {
  const extra = (await listCatalogStalls()).filter((stall) => !getStall(stall.slug));
  const seedMatches = searchStalls(query, kind).map(withSeedPrice);
  const needle = query?.trim().toLowerCase();

  const extraMatches = extra.filter((stall) => {
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
      ...(stall.members?.map((member) => member.name) ?? []),
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(needle);
  });

  return [...seedMatches, ...extraMatches];
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
  const seedStall = getStall(slug);
  const seedPack = getPack(slug);
  if (seedStall && seedPack) {
    return { ok: true, stall: withSeedPrice(seedStall), pack: seedPack };
  }

  const listing = await getListingBySlug(slug);
  if (!listing) {
    return { ok: false, reason: "not_found" };
  }

  const user = clerkUserId ? await getUserByClerkId(clerkUserId) : null;
  const isSeller = user?.id === listing.sellerUserId;

  if (!listing.published && !isSeller) {
    return { ok: false, reason: "not_found" };
  }

  const stall = listingToStall(listing);
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
