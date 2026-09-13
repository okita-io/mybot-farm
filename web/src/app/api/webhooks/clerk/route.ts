import { verifyWebhook } from "@clerk/nextjs/webhooks";
import type { NextRequest } from "next/server";
import {
  markClerkUserDeleted,
  markEventProcessed,
  syncClerkUser,
} from "@/lib/users";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let event;

  try {
    event = await verifyWebhook(req);
  } catch (error) {
    console.error("Clerk webhook verification failed:", error);
    return new Response("Verification failed", { status: 400 });
  }

  try {
    if (event.type === "user.created" || event.type === "user.updated") {
      await syncClerkUser({
        id: event.data.id,
        email: event.data.email_addresses[0]?.email_address ?? null,
        firstName: event.data.first_name,
        lastName: event.data.last_name,
        imageUrl: event.data.image_url,
        username: event.data.username,
      });
    }

    if (event.type === "user.deleted" && event.data.id) {
      await markClerkUserDeleted(event.data.id);
    }

    const eventId = req.headers.get("svix-id");
    if (eventId) {
      await markEventProcessed(eventId, "clerk");
    }
  } catch (error) {
    console.error("Clerk webhook handling failed:", error);
    return new Response("Handler failed", { status: 500 });
  }

  return new Response("OK", { status: 200 });
}
