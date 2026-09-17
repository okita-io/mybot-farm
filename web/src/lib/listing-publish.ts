import {
  CatalogGithubError,
  putCatalogPack,
} from "@/lib/catalog-github";
import {
  createListing,
  updateListing,
  type ListingRow,
} from "@/lib/listings";
import { summarizePackChange } from "@/lib/pack-diff";
import type { FarmPack } from "@/lib/pack-files";
import type { StallKind } from "@/lib/packs";
import { packVersionOf } from "@/lib/pack-version";
import {
  insertStallRevision,
  type StallRevisionSource,
} from "@/lib/stall-revisions";

export { CatalogGithubError };

export async function publishListingPack(input: {
  kind: StallKind;
  slug: string;
  previousPack?: FarmPack | null;
  pack: FarmPack;
  created: boolean;
}): Promise<{ summary: string; commitSha: string; githubPath: string }> {
  const packVersion = packVersionOf(input.pack);
  const summary = summarizePackChange(input.previousPack, input.pack, {
    created: input.created,
  });
  const published = await putCatalogPack({
    kind: input.kind,
    slug: input.slug,
    pack: input.pack,
    message: `${input.slug} v${packVersion}: ${summary}`,
  });
  return {
    summary,
    commitSha: published.commitSha,
    githubPath: published.path,
  };
}

export async function createPublishedListing(input: {
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
  source: StallRevisionSource;
  summary: string;
  commitSha: string;
  githubPath: string;
}): Promise<ListingRow> {
  const listing = await createListing({
    sellerUserId: input.sellerUserId,
    slug: input.slug,
    kind: input.kind,
    name: input.name,
    title: input.title,
    description: input.description,
    category: input.category,
    priceCents: input.priceCents,
    pack: input.pack,
    readmeMarkdown: input.readmeMarkdown,
    readmeHtml: input.readmeHtml,
  });

  await insertStallRevision({
    listingId: listing.id,
    slug: listing.slug,
    packVersion: packVersionOf(input.pack),
    source: input.source,
    summary: input.summary,
    commitSha: input.commitSha,
    githubPath: input.githubPath,
    actorUserId: input.sellerUserId,
    pack: input.pack,
  });

  return listing;
}

export async function updatePublishedListing(input: {
  listingId: string;
  sellerUserId: string;
  kind: StallKind;
  name: string;
  title: string;
  description: string;
  category: string;
  priceCents: number;
  pack: FarmPack;
  source: StallRevisionSource;
  summary: string;
  commitSha: string;
  githubPath: string;
}): Promise<ListingRow | null> {
  const listing = await updateListing(input.listingId, input.sellerUserId, {
    kind: input.kind,
    name: input.name,
    title: input.title,
    description: input.description,
    category: input.category,
    priceCents: input.priceCents,
    pack: input.pack,
  });
  if (!listing) {
    return null;
  }

  await insertStallRevision({
    listingId: listing.id,
    slug: listing.slug,
    packVersion: packVersionOf(input.pack),
    source: input.source,
    summary: input.summary,
    commitSha: input.commitSha,
    githubPath: input.githubPath,
    actorUserId: input.sellerUserId,
    pack: input.pack,
  });

  return listing;
}
