import { NextResponse } from "next/server";
import { createListingCheckout } from "@/lib/checkout";
import { getPublishedListingBySlug } from "@/lib/listings";
import { appOrigin } from "@/lib/origin";
import { hasStripeConfig } from "@/lib/stripe";
import { requireAppUser } from "@/lib/users";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!hasStripeConfig()) {
    return NextResponse.json({ error: "stripe_not_configured" }, { status: 503 });
  }

  const user = await requireAppUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body: unknown = await request.json().catch(() => null);
  const slug =
    body && typeof body === "object" && "slug" in body && typeof body.slug === "string"
      ? body.slug
      : "";

  if (!slug) {
    return NextResponse.json({ error: "slug_required" }, { status: 400 });
  }

  const listing = await getPublishedListingBySlug(slug);
  if (!listing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const result = await createListingCheckout({
    listingId: listing.id,
    buyerUserId: user.id,
    clerkUserId: user.clerkUserId,
    origin: appOrigin(request),
    stripeCustomerId: user.stripeCustomerId,
  });

  if ("error" in result) {
    const status =
      result.error === "not_found"
        ? 404
        : result.error === "own_listing" || result.error === "already_owned"
          ? 409
          : 400;
    return NextResponse.json(result, { status });
  }

  return NextResponse.json(result);
}
