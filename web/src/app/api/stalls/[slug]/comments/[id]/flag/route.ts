import { findStall } from "@/lib/catalog";
import { flagStallComment } from "@/lib/comments";
import { isCommentFlagReason } from "@/lib/flag-reasons";
import { noStoreJson, optionsResponse } from "@/lib/http";
import { parseFlagDetails } from "@/lib/moderation";
import { requireAppUser } from "@/lib/users";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: RouteContext<"/api/stalls/[slug]/comments/[id]/flag">,
) {
  const user = await requireAppUser();
  if (!user) {
    return noStoreJson({ error: "unauthorized" }, { status: 401 });
  }

  const { slug, id } = await context.params;
  const stall = await findStall(slug);
  if (!stall) {
    return noStoreJson({ error: "not_found" }, { status: 404 });
  }

  const body: unknown = await request.json().catch(() => null);
  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  if (!isCommentFlagReason(record.reason)) {
    return noStoreJson({ error: "invalid_reason" }, { status: 400 });
  }

  const details = parseFlagDetails(record.details);
  if (details === null) {
    return noStoreJson(
      { error: "invalid_details", message: "Details must be at most 500 characters." },
      { status: 400 },
    );
  }

  const result = await flagStallComment({
    slug,
    commentId: id,
    userId: user.id,
    reason: record.reason,
    details,
  });

  if (!result.ok) {
    const status =
      result.error === "not_found"
        ? 404
        : result.error === "own_comment"
          ? 403
          : result.error === "already_flagged"
            ? 409
            : 500;
    return noStoreJson({ error: result.error, message: result.message }, { status });
  }

  return noStoreJson({ ok: true });
}

export function OPTIONS() {
  return optionsResponse();
}
