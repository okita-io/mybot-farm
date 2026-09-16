import {
  getListingById,
  listingWriteFromBody,
  listingWriteResponse,
  packForListingWrite,
  setListingPublished,
  updateListing,
} from "@/lib/listings";
import { noStoreJson, optionsResponse } from "@/lib/http";
import { packVersionOf } from "@/lib/pack-version";
import { requireSeller } from "@/lib/seller-auth";
import type { FarmPack } from "@/lib/pack-files";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: RouteContext<"/api/listings/[id]">,
) {
  const user = await requireSeller(request);
  if (!user) {
    return noStoreJson({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const body: unknown = await request.json().catch(() => null);
  const published =
    body && typeof body === "object" && "published" in body
      ? Boolean((body as { published: unknown }).published)
      : null;

  if (published === null) {
    return noStoreJson({ error: "invalid_body" }, { status: 400 });
  }

  const listing = await setListingPublished(id, user.id, published);
  if (!listing) {
    return noStoreJson({ error: "not_found" }, { status: 404 });
  }

  return noStoreJson({
    ok: true,
    id: listing.id,
    published: listing.published,
  });
}

export async function PATCH(
  request: Request,
  context: RouteContext<"/api/listings/[id]">,
) {
  const user = await requireSeller(request);
  if (!user) {
    return noStoreJson({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
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

  const existing = await getListingById(id);
  if (
    !existing ||
    existing.sellerUserId !== user.id ||
    existing.deletedAt
  ) {
    return noStoreJson({ error: "not_found" }, { status: 404 });
  }

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

  const listing = await updateListing(id, user.id, {
    kind: value.kind,
    name: value.name,
    title: value.title,
    description: value.description,
    category: value.category,
    priceCents: value.priceCents,
    pack: finalized.pack,
  });
  if (!listing) {
    return noStoreJson({ error: "not_found" }, { status: 404 });
  }

  return noStoreJson(
    listingWriteResponse(listing, {
      created: false,
      updated: true,
      hasReadme: Boolean(listing.readmeHtml),
    }),
  );
}

export function OPTIONS() {
  return optionsResponse();
}
