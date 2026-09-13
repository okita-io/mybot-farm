import { NextResponse } from "next/server";
import { parseBio, requireAppUser, updateUserBio } from "@/lib/users";

export const runtime = "nodejs";

export async function PATCH(request: Request) {
  const user = await requireAppUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const record = body as Record<string, unknown>;
  const bio = parseBio(record.bio);
  if (bio === null) {
    return NextResponse.json(
      {
        error: "invalid_bio",
        message: "Bio must be at most 280 characters.",
      },
      { status: 400 },
    );
  }

  const updated = await updateUserBio(user.id, bio);
  if (!updated) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    username: updated.username,
    bio: updated.bio,
  });
}
