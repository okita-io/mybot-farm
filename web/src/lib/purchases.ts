import { and, eq } from "drizzle-orm";
import { getDb, hasDatabase } from "@/lib/db";
import { purchases } from "@/lib/db/schema";

export async function hasPaidPurchase(buyerUserId: string, listingId: string) {
  if (!hasDatabase()) {
    return false;
  }

  const db = getDb();
  const [row] = await db
    .select({ id: purchases.id })
    .from(purchases)
    .where(
      and(
        eq(purchases.buyerUserId, buyerUserId),
        eq(purchases.listingId, listingId),
        eq(purchases.status, "paid"),
      ),
    )
    .limit(1);

  return Boolean(row);
}

export async function listPaidListingIds(buyerUserId: string) {
  if (!hasDatabase()) {
    return new Set<string>();
  }

  const db = getDb();
  const rows = await db
    .select({ listingId: purchases.listingId })
    .from(purchases)
    .where(
      and(eq(purchases.buyerUserId, buyerUserId), eq(purchases.status, "paid")),
    );

  return new Set(rows.map((row) => row.listingId));
}

export async function upsertPurchase(input: {
  buyerUserId: string;
  listingId: string;
  stripeCheckoutSessionId: string;
  stripePaymentIntentId?: string | null;
  amountCents: number;
  applicationFeeCents: number;
  status: "pending" | "paid" | "failed";
}) {
  const db = getDb();
  const now = new Date();

  const [row] = await db
    .insert(purchases)
    .values({
      buyerUserId: input.buyerUserId,
      listingId: input.listingId,
      stripeCheckoutSessionId: input.stripeCheckoutSessionId,
      stripePaymentIntentId: input.stripePaymentIntentId ?? null,
      amountCents: input.amountCents,
      applicationFeeCents: input.applicationFeeCents,
      status: input.status,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: purchases.stripeCheckoutSessionId,
      set: {
        status: input.status,
        stripePaymentIntentId: input.stripePaymentIntentId ?? null,
        amountCents: input.amountCents,
        applicationFeeCents: input.applicationFeeCents,
        updatedAt: now,
      },
    })
    .returning();

  return row;
}

export async function markPurchaseFailed(stripeCheckoutSessionId: string) {
  const db = getDb();
  const now = new Date();

  await db
    .update(purchases)
    .set({ status: "failed", updatedAt: now })
    .where(eq(purchases.stripeCheckoutSessionId, stripeCheckoutSessionId));
}
