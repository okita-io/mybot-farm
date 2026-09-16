import {
  createSellerApiKey,
  listSellerApiKeys,
  parseApiKeyName,
} from "@/lib/api-keys";
import { noStoreJson, optionsResponse } from "@/lib/http";
import { requireAppUser } from "@/lib/users";

export const runtime = "nodejs";

export async function GET() {
  const user = await requireAppUser();
  if (!user) {
    return noStoreJson({ error: "unauthorized" }, { status: 401 });
  }

  const keys = await listSellerApiKeys(user.id);
  return noStoreJson({ keys });
}

export async function POST(request: Request) {
  const user = await requireAppUser();
  if (!user) {
    return noStoreJson({ error: "unauthorized" }, { status: 401 });
  }

  const body: unknown = await request.json().catch(() => ({}));
  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const name = parseApiKeyName(record.name);
  if (name === null) {
    return noStoreJson(
      {
        error: "invalid_name",
        message: "Name must be at most 64 characters.",
      },
      { status: 400 },
    );
  }

  const created = await createSellerApiKey(user.id, name);
  if (!created.ok) {
    return noStoreJson(
      { error: created.error, message: created.message },
      { status: created.status },
    );
  }

  return noStoreJson(created.value, { status: 201 });
}

export function OPTIONS() {
  return optionsResponse();
}
