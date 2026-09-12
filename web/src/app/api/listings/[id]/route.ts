import { NextResponse } from "next/server";
import { setListingPublished } from "@/lib/listings";
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
      ? Boolean(body.published)
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
