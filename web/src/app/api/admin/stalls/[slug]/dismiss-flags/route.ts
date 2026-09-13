import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { dismissOpenFlags } from "@/lib/moderation";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  context: RouteContext<"/api/admin/stalls/[slug]/dismiss-flags">,
) {
  const admin = await requireAdmin();
  if (!admin.ok) {
    return NextResponse.json({ error: "unauthorized" }, { status: admin.status });
  }

  const { slug } = await context.params;
  const count = await dismissOpenFlags(slug, admin.user.id);
  return NextResponse.json({ ok: true, slug, dismissed: count });
}
