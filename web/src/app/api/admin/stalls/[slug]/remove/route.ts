import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { takeDownStall } from "@/lib/moderation";
import { getStall } from "@/lib/packs";
import { getListingBySlug } from "@/lib/listings";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: RouteContext<"/api/admin/stalls/[slug]/remove">,
) {
  const admin = await requireAdmin();
  if (!admin.ok) {
    return NextResponse.json({ error: "unauthorized" }, { status: admin.status });
  }

  const { slug } = await context.params;
  const listing = await getListingBySlug(slug);
  const seed = getStall(slug);
  if (!listing && !seed) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const body: unknown = await request.json().catch(() => null);
  const note =
    body && typeof body === "object" && "note" in body && typeof body.note === "string"
      ? body.note
      : "";

  const result = await takeDownStall({
    slug,
    adminUserId: admin.user.id,
    note,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 409 });
  }

  return NextResponse.json({ ok: true, slug });
}
