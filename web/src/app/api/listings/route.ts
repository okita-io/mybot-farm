import { NextResponse } from "next/server";
import { categories } from "@/lib/site";
import {
  createListing,
  parseListingKind,
  parsePackJson,
  parsePriceCents,
  uniqueListingSlug,
} from "@/lib/listings";
import { requireAppUser } from "@/lib/users";
import type { FarmPack } from "@/lib/pack-files";

export const runtime = "nodejs";

const categoryLabels = new Set<string>(categories.map((category) => category.label));

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  const user = await requireAppUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!user.stripeConnectAccountId || !user.stripeConnectTransfersActive) {
    return NextResponse.json(
      { error: "connect_required", message: "Finish Stripe payouts before listing a stall." },
      { status: 403 },
    );
  }

  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const record = body as Record<string, unknown>;
  const kind = parseListingKind(record.kind);
  const name = readString(record.name);
  const title = readString(record.title);
  const description = readString(record.description);
  const category = readString(record.category);
  const priceCents = parsePriceCents(record.priceCents);
  const packResult = parsePackJson(record.pack);

  if (!kind) {
    return NextResponse.json({ error: "invalid_kind" }, { status: 400 });
  }

  if (!name || !title || !description) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  if (!categoryLabels.has(category)) {
    return NextResponse.json({ error: "invalid_category" }, { status: 400 });
  }

  if (priceCents === null) {
    return NextResponse.json(
      { error: "invalid_price", message: "Price must be between $1.00 and $9,999.00." },
      { status: 400 },
    );
  }

  if (!packResult.ok) {
    return NextResponse.json({ error: "invalid_pack", message: packResult.error }, { status: 400 });
  }

  const pack: FarmPack = {
    ...packResult.pack,
    slug: packResult.pack.slug,
    category: packResult.pack.category,
    profile: {
      name: packResult.pack.profile?.name ?? name,
      title: packResult.pack.profile?.title ?? title,
      description: packResult.pack.profile?.description ?? description,
    },
  };

  const slug = await uniqueListingSlug(name);
  const listing = await createListing({
    sellerUserId: user.id,
    slug,
    kind,
    name,
    title,
    description,
    category,
    priceCents,
    pack,
  });

  return NextResponse.json(
    {
      ok: true,
      slug: listing.slug,
      kind: listing.kind,
      pagePath: listing.kind === "team" ? `/teams/${listing.slug}` : `/agents/${listing.slug}`,
    },
    { status: 201 },
  );
}
