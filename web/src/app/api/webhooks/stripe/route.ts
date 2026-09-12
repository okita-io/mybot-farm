import { markPurchaseFailed } from "@/lib/purchases";
import { fulfillCheckoutSession } from "@/lib/checkout";
import { refreshConnectStatus } from "@/lib/connect";
import { linkStripeCustomer, markEventProcessed } from "@/lib/users";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = req.headers.get("stripe-signature");

  if (!secret || !signature) {
    return new Response("Webhook secret missing", { status: 400 });
  }

  const body = await req.text();
  let event;

  try {
    event = getStripe().webhooks.constructEvent(body, signature, secret);
  } catch (error) {
    console.error("Stripe webhook verification failed:", error);
    return new Response("Verification failed", { status: 400 });
  }

  try {
    if (
      event.type === "customer.created" ||
      event.type === "customer.updated"
    ) {
      const customer = event.data.object;
      const clerkUserId =
        typeof customer.metadata?.clerkUserId === "string"
          ? customer.metadata.clerkUserId
          : null;

      await linkStripeCustomer(customer.id, clerkUserId);
    }

    if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded"
    ) {
      await fulfillCheckoutSession(event.data.object);
    }

    if (event.type === "checkout.session.async_payment_failed") {
      await markPurchaseFailed(event.data.object.id);
    }

    if (event.type === "account.updated") {
      const account = event.data.object;
      if (account.id) {
        await refreshConnectStatus(account.id).catch((error) => {
          console.error("Connect status refresh failed:", error);
        });
      }
    }

    await markEventProcessed(event.id, "stripe");
  } catch (error) {
    console.error("Stripe webhook handling failed:", error);
    return new Response("Handler failed", { status: 500 });
  }

  return new Response("OK", { status: 200 });
}
