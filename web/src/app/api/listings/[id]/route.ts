import { NextResponse } from "next/server";
import {
  listingWriteFromBody,
  setListingPublished,
  updateListing,
} from "@/lib/listings";
import { stallPagePath } from "@/lib/packs";
import { requireAppUser } from "@/lib/users";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: RouteContext<"/api/listings/[id]">,
) {
  const user = await requireAppUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const body: unknown = await request.json().catch(() => null);
  const published =
    body && typeof body === "object" && "published" in body
      ? Boolean((body as { published: unknown }).published)
      : null;

  if (published === null) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const listing = await setListingPublished(id, user.id, published);
  if (!listing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    id: listing.id,
    published: listing.published,
  });
}

export async function PATCH(
  request: Request,
  context: RouteContext<"/api/listings/[id]">,
) {
  const user = await requireAppUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const body: unknown = await request.json().catch(() => null);
  const parsed = listingWriteFromBody(body);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: parsed.error, message: parsed.message },
      { status: parsed.status },
    );
  }

  const { value } = parsed;
  if (
    value.priceCents > 0 &&
    (!user.stripeConnectAccountId || !user.stripeConnectTransfersActive)
  ) {
    return NextResponse.json(
      {
        error: "connect_required",
        message: "Finish Stripe payouts before listing a paid stall.",
      },
      { status: 403 },
    );
  }

  const listing = await updateListing(id, user.id, value);
  if (!listing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    slug: listing.slug,
    kind: listing.kind,
    pagePath: stallPagePath({
      kind: listing.kind === "team" ? "team" : "agent",
      slug: listing.slug,
    }),
  });
}
