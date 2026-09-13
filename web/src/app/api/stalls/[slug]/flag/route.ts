import { NextResponse } from "next/server";
import { findStall } from "@/lib/catalog";
import {
  createStallFlag,
  parseFlagDetails,
} from "@/lib/moderation";
import { isFlagReason } from "@/lib/flag-reasons";
import { requireAppUser } from "@/lib/users";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: RouteContext<"/api/stalls/[slug]/flag">,
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

  const body: unknown = await request.json().catch(() => null);
  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  if (!isFlagReason(record.reason)) {
    return NextResponse.json({ error: "invalid_reason" }, { status: 400 });
  }

  const details = parseFlagDetails(record.details);
  if (details === null) {
    return NextResponse.json(
      { error: "invalid_details", message: "Details must be at most 500 characters." },
      { status: 400 },
    );
  }

  const result = await createStallFlag({
    slug,
    userId: user.id,
    reason: record.reason,
    details,
  });

  if (!result.ok) {
    if (result.error === "already_flagged") {
      return NextResponse.json({ error: "already_flagged" }, { status: 409 });
    }
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, slug });
}
