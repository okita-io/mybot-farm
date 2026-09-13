import { NextResponse } from "next/server";
import { findStall } from "@/lib/catalog";
import { recordStallDownload } from "@/lib/engagement";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  context: RouteContext<"/api/stalls/[slug]/download">,
) {
  const { slug } = await context.params;
  const stall = await findStall(slug);
  if (!stall) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  await recordStallDownload(slug);
  return NextResponse.json({ ok: true, slug });
}
