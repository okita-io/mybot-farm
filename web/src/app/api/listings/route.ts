import { readApiKeyFromRequest } from "@/lib/api-key-crypto";
import {
  getListingBySlug,
  isReservedCatalogSlug,
  listingWriteFromBody,
  listingWriteResponse,
  packForListingWrite,
  slugifyName,
} from "@/lib/listings";
import { CatalogGithubError } from "@/lib/catalog-github";
import {
  createPublishedListing,
  publishListingPack,
  updatePublishedListing,
} from "@/lib/listing-publish";
import { noStoreJson, optionsResponse } from "@/lib/http";
import { packVersionOf } from "@/lib/pack-version";
import { extractPackReadme, parseStallReadme } from "@/lib/readme";
import { requireSeller } from "@/lib/seller-auth";
import type { FarmPack } from "@/lib/pack-files";
import type { StallRevisionSource } from "@/lib/stall-revisions";

export const runtime = "nodejs";

function packReadmeFields(pack: FarmPack) {
  const packReadme = extractPackReadme(pack as Record<string, unknown>);
  if (!packReadme) {
    return { readmeMarkdown: null as string | null, readmeHtml: null as string | null };
  }

  const readme = parseStallReadme(packReadme);
  if (!readme.ok) {
    return { readmeMarkdown: null, readmeHtml: null };
  }

  return { readmeMarkdown: readme.markdown, readmeHtml: readme.html };
}

function writeSource(request: Request): StallRevisionSource {
  return readApiKeyFromRequest(request) ? "api_key" : "session";
}

function publishErrorResponse(error: unknown) {
  if (error instanceof CatalogGithubError) {
    return noStoreJson(
      { error: error.code, message: error.message },
      { status: error.status === 409 ? 409 : error.status },
    );
  }
  throw error;
}

export async function POST(request: Request) {
  const user = await requireSeller(request);
  if (!user) {
    return noStoreJson({ error: "unauthorized" }, { status: 401 });
  }

  const body: unknown = await request.json().catch(() => null);
  const parsed = listingWriteFromBody(body);
  if (!parsed.ok) {
    return noStoreJson(
      { error: parsed.error, message: parsed.message },
      { status: parsed.status },
    );
  }

  const { value } = parsed;
  if (
    value.priceCents > 0 &&
    (!user.stripeConnectAccountId || !user.stripeConnectTransfersActive)
  ) {
    return noStoreJson(
      {
        error: "connect_required",
        message: "Finish Stripe payouts before listing a paid bot.",
      },
      { status: 403 },
    );
  }

  const slug = value.slug ?? slugifyName(value.name);
  if (isReservedCatalogSlug(slug)) {
    return noStoreJson(
      {
        error: "catalog_reserved",
        message:
          "That slug is a farm catalog stall. Seller keys cannot overwrite it; ship catalog updates via git.",
        slug,
      },
      { status: 409 },
    );
  }

  const existing = await getListingBySlug(slug);
  if (existing?.deletedAt) {
    return noStoreJson(
      {
        error: "slug_taken",
        message: "That slug is not available.",
        slug,
      },
      { status: 409 },
    );
  }

  if (existing && existing.sellerUserId !== user.id) {
    return noStoreJson(
      {
        error: "slug_taken",
        message: "That slug already belongs to another seller.",
        slug,
      },
      { status: 409 },
    );
  }

  const { readmeMarkdown, readmeHtml } = packReadmeFields(value.pack);
  const source = writeSource(request);

  if (existing) {
    const finalized = packForListingWrite(
      value,
      existing.slug,
      packVersionOf(existing.pack as FarmPack),
    );
    if (!finalized.ok) {
      return noStoreJson(
        { error: finalized.error, message: finalized.message },
        { status: finalized.status },
      );
    }

    let published;
    try {
      published = await publishListingPack({
        kind: value.kind,
        slug: existing.slug,
        previousPack: existing.pack as FarmPack,
        pack: finalized.pack,
        created: false,
      });
    } catch (error) {
      return publishErrorResponse(error);
    }

    const listing = await updatePublishedListing({
      listingId: existing.id,
      sellerUserId: user.id,
      slug: existing.slug,
      kind: value.kind,
      name: value.name,
      title: value.title,
      description: value.description,
      category: value.category,
      priceCents: value.priceCents,
      pack: finalized.pack,
      previousPack: existing.pack as FarmPack,
      source,
      summary: published.summary,
      commitSha: published.commitSha,
      githubPath: published.githubPath,
    });
    if (!listing) {
      return noStoreJson({ error: "not_found" }, { status: 404 });
    }

    return noStoreJson(
      listingWriteResponse(listing, {
        created: false,
        updated: true,
        hasReadme: Boolean(listing.readmeHtml),
        summary: published.summary,
        commitSha: published.commitSha,
        githubPath: published.githubPath,
      }),
    );
  }

  const finalized = packForListingWrite(value, slug, null);
  if (!finalized.ok) {
    return noStoreJson(
      { error: finalized.error, message: finalized.message },
      { status: finalized.status },
    );
  }

  let published;
  try {
    published = await publishListingPack({
      kind: value.kind,
      slug,
      previousPack: null,
      pack: finalized.pack,
      created: true,
    });
  } catch (error) {
    return publishErrorResponse(error);
  }

  const listing = await createPublishedListing({
    sellerUserId: user.id,
    slug,
    kind: value.kind,
    name: value.name,
    title: value.title,
    description: value.description,
    category: value.category,
    priceCents: value.priceCents,
    pack: finalized.pack,
    readmeMarkdown,
    readmeHtml,
    source,
    summary: published.summary,
    commitSha: published.commitSha,
    githubPath: published.githubPath,
  });

  return noStoreJson(
    listingWriteResponse(listing, {
      created: true,
      updated: false,
      hasReadme: Boolean(readmeHtml),
      summary: published.summary,
      commitSha: published.commitSha,
      githubPath: published.githubPath,
    }),
    { status: 201 },
  );
}

export function OPTIONS() {
  return optionsResponse();
}
