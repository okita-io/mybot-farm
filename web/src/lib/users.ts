import { auth, currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { processedEvents, users } from "@/lib/db/schema";
import { getStripe, hasStripeConfig } from "@/lib/stripe";

export type ClerkUserInput = {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
};

export async function markEventProcessed(
  id: string,
  source: "clerk" | "stripe",
) {
  const db = getDb();
  const inserted = await db
    .insert(processedEvents)
    .values({ id, source })
    .onConflictDoNothing()
    .returning({ id: processedEvents.id });

  return inserted.length > 0;
}

export async function syncClerkUser(input: ClerkUserInput) {
  const db = getDb();
  const now = new Date();
  const stripeCustomerId = await ensureStripeCustomer(input);
  const update = {
    email: input.email,
    firstName: input.firstName,
    lastName: input.lastName,
    imageUrl: input.imageUrl,
    lastSeenAt: now,
    updatedAt: now,
    deletedAt: null,
    ...(stripeCustomerId ? { stripeCustomerId } : {}),
  };

  const [row] = await db
    .insert(users)
    .values({
      clerkUserId: input.id,
      stripeCustomerId,
      ...update,
    })
    .onConflictDoUpdate({
      target: users.clerkUserId,
      set: update,
    })
    .returning();

  return row;
}

export async function markClerkUserDeleted(clerkUserId: string) {
  const db = getDb();
  const now = new Date();

  await db
    .update(users)
    .set({ deletedAt: now, updatedAt: now })
    .where(eq(users.clerkUserId, clerkUserId));
}

export async function getUserByClerkId(clerkUserId: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(users)
    .where(eq(users.clerkUserId, clerkUserId))
    .limit(1);

  return row ?? null;
}

export async function getUserById(id: string) {
  const db = getDb();
  const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return row ?? null;
}

export async function requireAppUser() {
  const { userId } = await auth();
  if (!userId) {
    return null;
  }

  const user = await currentUser();
  if (!user) {
    return null;
  }

  const primaryEmail =
    user.emailAddresses.find((address) => address.id === user.primaryEmailAddressId)
      ?.emailAddress ??
    user.emailAddresses[0]?.emailAddress ??
    null;

  return syncClerkUser({
    id: user.id,
    email: primaryEmail,
    firstName: user.firstName,
    lastName: user.lastName,
    imageUrl: user.imageUrl,
  });
}

export async function linkConnectAccount(
  clerkUserId: string,
  stripeConnectAccountId: string,
  transfersActive: boolean,
) {
  const db = getDb();
  const now = new Date();

  await db
    .update(users)
    .set({
      stripeConnectAccountId,
      stripeConnectTransfersActive: transfersActive,
      updatedAt: now,
    })
    .where(eq(users.clerkUserId, clerkUserId));
}

export async function setConnectTransfersActive(
  stripeConnectAccountId: string,
  transfersActive: boolean,
) {
  const db = getDb();
  const now = new Date();

  await db
    .update(users)
    .set({
      stripeConnectTransfersActive: transfersActive,
      updatedAt: now,
    })
    .where(eq(users.stripeConnectAccountId, stripeConnectAccountId));
}

export async function linkStripeCustomer(
  stripeCustomerId: string,
  clerkUserId?: string | null,
) {
  if (!clerkUserId) return;

  const db = getDb();
  const now = new Date();

  await db
    .update(users)
    .set({ stripeCustomerId, updatedAt: now })
    .where(eq(users.clerkUserId, clerkUserId));
}

async function ensureStripeCustomer(input: ClerkUserInput) {
  const db = getDb();
  const [existing] = await db
    .select({ stripeCustomerId: users.stripeCustomerId })
    .from(users)
    .where(eq(users.clerkUserId, input.id))
    .limit(1);

  if (existing?.stripeCustomerId) {
    return existing.stripeCustomerId;
  }

  if (!hasStripeConfig()) {
    return null;
  }

  const stripe = getStripe();

  if (input.email) {
    const matches = await stripe.customers.list({
      email: input.email,
      limit: 1,
    });
    const known = matches.data[0];
    if (known) {
      if (known.metadata?.clerkUserId !== input.id) {
        await stripe.customers.update(known.id, {
          metadata: { ...known.metadata, clerkUserId: input.id },
        });
      }
      return known.id;
    }
  }

  const name = [input.firstName, input.lastName].filter(Boolean).join(" ");
  const customer = await stripe.customers.create({
    email: input.email ?? undefined,
    name: name || undefined,
    metadata: { clerkUserId: input.id },
  });

  return customer.id;
}
