import { findStall } from "@/lib/catalog";
import { parseCommentVote } from "@/lib/comment-text";
import { voteOnStallComment } from "@/lib/comments";
import { noStoreJson, optionsResponse } from "@/lib/http";
import { requireAppUser } from "@/lib/users";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: RouteContext<"/api/stalls/[slug]/comments/[id]/vote">,
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
  const value = parseCommentVote(record.value);
  if (!value) {
    return noStoreJson(
      { error: "invalid_vote", message: "Vote must be thumbs up or down." },
      { status: 400 },
    );
  }

  const result = await voteOnStallComment({
    slug,
    commentId: id,
    userId: user.id,
    value,
  });

  if (!result.ok) {
    const status =
      result.error === "not_found" ? 404 : result.error === "own_comment" ? 403 : 500;
    return noStoreJson({ error: result.error, message: result.message }, { status });
  }

  return noStoreJson({
    ok: true,
    upCount: result.upCount,
    downCount: result.downCount,
    vote: result.vote,
  });
}

export function OPTIONS() {
  return optionsResponse();
}
