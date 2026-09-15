import { NextResponse } from "next/server";
import {
  createListing,
  listingWriteFromBody,
  uniqueListingSlug,
} from "@/lib/listings";
import { extractPackReadme, parseStallReadme } from "@/lib/readme";
import { stallPagePath } from "@/lib/packs";
import { requireAppUser } from "@/lib/users";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await requireAppUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

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
        message: "Finish Stripe payouts before listing a paid bot.",
      },
      { status: 403 },
    );
  }

  let readmeMarkdown: string | null = null;
  let readmeHtml: string | null = null;
  const packReadme = extractPackReadme(value.pack as Record<string, unknown>);
  if (packReadme) {
    const readme = parseStallReadme(packReadme);
    if (readme.ok) {
      readmeMarkdown = readme.markdown;
      readmeHtml = readme.html;
    }
  }

  const slug = await uniqueListingSlug(value.name);
  const listing = await createListing({
    sellerUserId: user.id,
    slug,
    ...value,
    readmeMarkdown,
    readmeHtml,
  });

  return NextResponse.json(
    {
      ok: true,
      slug: listing.slug,
      kind: listing.kind,
      pagePath: stallPagePath({
        kind: listing.kind === "team" ? "team" : "agent",
        slug: listing.slug,
      }),
      hasReadme: Boolean(readmeHtml),
    },
    { status: 201 },
  );
}
