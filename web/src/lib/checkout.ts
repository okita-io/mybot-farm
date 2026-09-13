import type Stripe from "stripe";
import { applicationFeeCents } from "@/lib/fees";
import { getListingById } from "@/lib/listings";
import { hasPaidPurchase, upsertPurchase } from "@/lib/purchases";
import { getStripe } from "@/lib/stripe";
import { getUserById } from "@/lib/users";
import { stallPagePath } from "@/lib/packs";
import { listingToStall } from "@/lib/catalog";

function paymentIntentId(session: Stripe.Checkout.Session) {
  if (typeof session.payment_intent === "string") {
    return session.payment_intent;
  }

  return session.payment_intent?.id ?? null;
}

export async function fulfillCheckoutSession(session: Stripe.Checkout.Session) {
  const listingId = session.metadata?.listingId;
  const buyerUserId = session.metadata?.buyerUserId;

  if (!listingId || !buyerUserId) {
    return null;
  }

  const paid =
    session.payment_status === "paid" ||
    session.payment_status === "no_payment_required";

  if (!paid) {
    await upsertPurchase({
      buyerUserId,
      listingId,
      stripeCheckoutSessionId: session.id,
      stripePaymentIntentId: paymentIntentId(session),
      amountCents: session.amount_total ?? 0,
      applicationFeeCents: Number(session.metadata?.applicationFeeCents ?? 0),
      status: "pending",
    });
    return null;
  }

  return upsertPurchase({
    buyerUserId,
    listingId,
    stripeCheckoutSessionId: session.id,
    stripePaymentIntentId: paymentIntentId(session),
    amountCents: session.amount_total ?? 0,
    applicationFeeCents: Number(session.metadata?.applicationFeeCents ?? 0),
    status: "paid",
  });
}

export async function createListingCheckout(input: {
  listingId: string;
  buyerUserId: string;
  clerkUserId: string;
  origin: string;
  stripeCustomerId?: string | null;
}) {
  const listing = await getListingById(input.listingId);
  if (!listing?.published) {
    return { error: "not_found" as const };
  }

  if (listing.priceCents <= 0) {
    return { error: "free_listing" as const };
  }

  if (listing.sellerUserId === input.buyerUserId) {
    return { error: "own_listing" as const };
  }

  if (await hasPaidPurchase(input.buyerUserId, listing.id)) {
    return { error: "already_owned" as const };
  }

  const seller = await getUserById(listing.sellerUserId);
  if (!seller?.stripeConnectAccountId || !seller.stripeConnectTransfersActive) {
    return { error: "seller_not_ready" as const };
  }

  const fee = applicationFeeCents(listing.priceCents);
  const stall = listingToStall(listing);
  const path = stallPagePath(stall);
  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    ui_mode: "hosted_page",
    mode: "payment",
    billing_address_collection: "auto",
    phone_number_collection: { enabled: false },
    automatic_tax: { enabled: false },
    allow_promotion_codes: false,
    submit_type: "auto",
    integration_identifier: "hosted_web_0001",
    origin_context: "web",
    ...(input.stripeCustomerId ? { customer: input.stripeCustomerId } : {}),
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: listing.currency,
          unit_amount: listing.priceCents,
          product_data: {
            name: listing.name,
            description: listing.title,
          },
        },
      },
    ],
    payment_intent_data: {
      application_fee_amount: fee,
      transfer_data: {
        destination: seller.stripeConnectAccountId,
      },
    },
    success_url: `${input.origin}${path}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${input.origin}${path}?checkout=cancel`,
    metadata: {
      listingId: listing.id,
      buyerUserId: input.buyerUserId,
      clerkUserId: input.clerkUserId,
      slug: listing.slug,
      applicationFeeCents: String(fee),
    },
  });

  if (!session.url) {
    return { error: "checkout_failed" as const };
  }

  await upsertPurchase({
    buyerUserId: input.buyerUserId,
    listingId: listing.id,
    stripeCheckoutSessionId: session.id,
    amountCents: listing.priceCents,
    applicationFeeCents: fee,
    status: "pending",
  });

  return { url: session.url, sessionId: session.id };
}
