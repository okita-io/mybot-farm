import { auth, currentUser } from "@clerk/nextjs/server";
import { syncClerkUser } from "@/lib/users";

export const runtime = "nodejs";

export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const user = await currentUser();
  if (!user) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const primaryEmail =
    user.emailAddresses.find((address) => address.id === user.primaryEmailAddressId)
      ?.emailAddress ??
    user.emailAddresses[0]?.emailAddress ??
    null;

  const record = await syncClerkUser({
    id: user.id,
    email: primaryEmail,
    firstName: user.firstName,
    lastName: user.lastName,
    imageUrl: user.imageUrl,
  });

  if (!record) {
    return Response.json({ error: "sync_failed" }, { status: 500 });
  }

  return Response.json(
    { ok: true, userId: record.id },
    { headers: { "Cache-Control": "no-store" } },
  );
}
