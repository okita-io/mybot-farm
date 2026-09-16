import { revokeSellerApiKey } from "@/lib/api-keys";
import { noStoreJson, optionsResponse } from "@/lib/http";
import { requireAppUser } from "@/lib/users";

export const runtime = "nodejs";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await requireAppUser();
  if (!user) {
    return noStoreJson({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const revoked = await revokeSellerApiKey(user.id, id);
  if (!revoked) {
    return noStoreJson({ error: "not_found" }, { status: 404 });
  }

  return noStoreJson({ ok: true });
}

export function OPTIONS() {
  return optionsResponse();
}
