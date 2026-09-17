import { requireAdmin } from "@/lib/admin";
import { dismissOpenCommentFlags } from "@/lib/comments";
import { noStoreJson } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  context: RouteContext<"/api/admin/comments/[id]/dismiss-flags">,
) {
  const admin = await requireAdmin();
  if (!admin.ok) {
    return noStoreJson({ error: "unauthorized" }, { status: admin.status });
  }

  const { id } = await context.params;
  const count = await dismissOpenCommentFlags(id, admin.user.id);
  return noStoreJson({ ok: true, dismissed: count });
}
