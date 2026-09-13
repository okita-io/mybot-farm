import { NextResponse } from "next/server";
import { findStall } from "@/lib/catalog";
import { toggleStallLike } from "@/lib/engagement";
import { requireAppUser } from "@/lib/users";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  context: RouteContext<"/api/stalls/[slug]/like">,
) {
  const user = await requireAppUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { slug } = await context.params;
  const stall = await findStall(slug);
  if (!stall) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const engagement = await toggleStallLike(slug, user.id);
  return NextResponse.json({
    ok: true,
    slug,
    downloadCount: engagement.downloadCount,
    likeCount: engagement.likeCount,
    liked: engagement.liked,
  });
}
