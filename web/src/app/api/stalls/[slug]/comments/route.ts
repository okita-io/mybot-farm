import { findStall } from "@/lib/catalog";
import { parseCommentBody } from "@/lib/comment-text";
import { createStallComment, listStallComments } from "@/lib/comments";
import { noStoreJson, optionsResponse } from "@/lib/http";
import { getCachedViewer, requireAppUser } from "@/lib/users";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: RouteContext<"/api/stalls/[slug]/comments">,
) {
  const { slug } = await context.params;
  const stall = await findStall(slug);
  if (!stall) {
    return noStoreJson({ error: "not_found" }, { status: 404 });
  }

  const viewer = await getCachedViewer();
  const comments = await listStallComments(slug, viewer?.id);
  return noStoreJson({ ok: true, slug, comments });
}

export async function POST(
  request: Request,
  context: RouteContext<"/api/stalls/[slug]/comments">,
) {
  const user = await requireAppUser();
  if (!user) {
    return noStoreJson({ error: "unauthorized" }, { status: 401 });
  }

  const { slug } = await context.params;
  const stall = await findStall(slug);
  if (!stall) {
    return noStoreJson({ error: "not_found" }, { status: 404 });
  }

  const body: unknown = await request.json().catch(() => null);
  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const parsed = parseCommentBody(record.body);
  if (!parsed.ok) {
    return noStoreJson(
      { error: parsed.error, message: parsed.message },
      { status: 400 },
    );
  }

  const result = await createStallComment({
    slug,
    userId: user.id,
    body: parsed.body,
    username: user.username,
    firstName: user.firstName,
    imageUrl: user.imageUrl,
  });

  if (!result.ok) {
    if (result.error === "rate_limited") {
      return noStoreJson(
        { error: result.error, message: result.message, retryAfter: result.retryAfter },
        {
          status: 429,
          headers: { "Retry-After": String(result.retryAfter) },
        },
      );
    }
    return noStoreJson({ error: result.error, message: result.message }, { status: 500 });
  }

  return noStoreJson({ ok: true, slug, comment: result.comment }, { status: 201 });
}

export function OPTIONS() {
  return optionsResponse();
}
