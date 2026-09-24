import {
  CatalogGithubError,
  putCatalogPack,
  revertCatalogPack,
} from "@/lib/catalog-github";
import { withTransaction } from "@/lib/db";
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

async function revertPublishedPack(input: {
  kind: StallKind;
  slug: string;
  previousPack: FarmPack | null;
}) {
  try {
    await revertCatalogPack(input);
  } catch (error) {
    console.error("catalog revert failed after DB write error:", error);
  }
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
  try {
    return await withTransaction(async (tx) => {
      const listing = await createListing(
        {
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
        },
        tx,
      );

      await insertStallRevision(
        {
          listingId: listing.id,
          slug: listing.slug,
          packVersion: packVersionOf(input.pack),
          source: input.source,
          summary: input.summary,
          commitSha: input.commitSha,
          githubPath: input.githubPath,
          actorUserId: input.sellerUserId,
          pack: input.pack,
        },
        tx,
      );

      return listing;
    });
  } catch (error) {
    await revertPublishedPack({
      kind: input.kind,
      slug: input.slug,
      previousPack: null,
    });
    throw error;
  }
}

export async function updatePublishedListing(input: {
  listingId: string;
  sellerUserId: string;
  slug: string;
  kind: StallKind;
  name: string;
  title: string;
  description: string;
  category: string;
  priceCents: number;
  pack: FarmPack;
  previousPack: FarmPack;
  source: StallRevisionSource;
  summary: string;
  commitSha: string;
  githubPath: string;
}): Promise<ListingRow | null> {
  try {
    return await withTransaction(async (tx) => {
      const listing = await updateListing(
        input.listingId,
        input.sellerUserId,
        {
          kind: input.kind,
          name: input.name,
          title: input.title,
          description: input.description,
          category: input.category,
          priceCents: input.priceCents,
          pack: input.pack,
        },
        tx,
      );
      if (!listing) {
        // Catalog was already updated; roll it back when the row is missing.
        throw new Error("listing_not_found_after_catalog_publish");
      }

      await insertStallRevision(
        {
          listingId: listing.id,
          slug: listing.slug,
          packVersion: packVersionOf(input.pack),
          source: input.source,
          summary: input.summary,
          commitSha: input.commitSha,
          githubPath: input.githubPath,
          actorUserId: input.sellerUserId,
          pack: input.pack,
        },
        tx,
      );

      return listing;
    });
  } catch (error) {
    await revertPublishedPack({
      kind: input.kind,
      slug: input.slug,
      previousPack: input.previousPack,
    });
    if (
      error instanceof Error &&
      error.message === "listing_not_found_after_catalog_publish"
    ) {
      return null;
    }
    throw error;
  }
}
