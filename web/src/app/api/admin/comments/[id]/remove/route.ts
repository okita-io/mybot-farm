import { requireAdmin } from "@/lib/admin";
import { pruneStallComment } from "@/lib/comments";
import { noStoreJson } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  context: RouteContext<"/api/admin/comments/[id]/remove">,
) {
  const admin = await requireAdmin();
  if (!admin.ok) {
    return noStoreJson({ error: "unauthorized" }, { status: admin.status });
  }

  const { id } = await context.params;
  const result = await pruneStallComment({
    commentId: id,
    adminUserId: admin.user.id,
  });

  if (!result.ok) {
    return noStoreJson(
      { error: result.error },
      { status: result.error === "not_found" ? 404 : 409 },
    );
  }

  return noStoreJson({ ok: true, slug: result.slug });
}
