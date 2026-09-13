import { cache } from "react";
import { auth, currentUser } from "@clerk/nextjs/server";
import { and, eq, inArray, isNotNull, isNull, ne, sql } from "drizzle-orm";
import { getDb, hasDatabase } from "@/lib/db";
import { listings, processedEvents, users } from "@/lib/db/schema";
import type { StallAuthor } from "@/lib/packs";
import { getStripe, hasStripeConfig } from "@/lib/stripe";

export type ClerkUserInput = {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
  username?: string | null;
};

export type AppUser = typeof users.$inferSelect;

export type { StallAuthor };

export const FARM_AUTHOR: StallAuthor = {
  username: "mybot.farm",
  href: "/about",
};

const MAX_BIO_LENGTH = 280;

export function authorHref(username: string) {
  return `/authors/${encodeURIComponent(username)}`;
}

export function slugifyUsername(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

export function shortClerkId(clerkUserId: string) {
  return clerkUserId.replace(/^user_/, "").slice(0, 8).toLowerCase();
}

export function preferredUsernameBase(input: ClerkUserInput) {
  if (input.username) {
    const fromClerk = slugifyUsername(input.username);
    if (fromClerk) return fromClerk;
  }

  const fromName = slugifyUsername(
    [input.firstName, input.lastName].filter(Boolean).join(" "),
  );
  if (fromName) return fromName;

  return `grower-${shortClerkId(input.id)}`;
}

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
  const existingByClerk = await getUserByClerkId(input.id);
  const stripeCustomerId =
    existingByClerk?.stripeCustomerId ?? (await ensureStripeCustomer(input));
  const existing =
    existingByClerk ??
    (stripeCustomerId ? await getUserByStripeCustomerId(stripeCustomerId) : null) ??
    (input.email ? await getUserByEmail(input.email) : null);
  const username =
    existing?.username ??
    (await allocateUsername(preferredUsernameBase(input), input.id));
  const customerId = existing?.stripeCustomerId ?? stripeCustomerId ?? null;

  const update = {
    clerkUserId: input.id,
    email: input.email,
    firstName: input.firstName,
    lastName: input.lastName,
    imageUrl: input.imageUrl,
    username,
    lastSeenAt: now,
    updatedAt: now,
    deletedAt: null,
    ...(customerId ? { stripeCustomerId: customerId } : {}),
  };

  if (existing) {
    const [row] = await db
      .update(users)
      .set(update)
      .where(eq(users.id, existing.id))
      .returning();
    return row;
  }

  const [row] = await db
    .insert(users)
    .values({
      clerkUserId: input.id,
      stripeCustomerId: customerId,
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
  if (!hasDatabase()) {
    return null;
  }

  try {
    const db = getDb();
    const [row] = await db
      .select()
      .from(users)
      .where(eq(users.clerkUserId, clerkUserId))
      .limit(1);

    return row ?? null;
  } catch (error) {
    console.error("getUserByClerkId failed:", error);
    return null;
  }
}

async function getUserByStripeCustomerId(stripeCustomerId: string) {
  if (!hasDatabase() || !stripeCustomerId) {
    return null;
  }

  try {
    const db = getDb();
    const [row] = await db
      .select()
      .from(users)
      .where(eq(users.stripeCustomerId, stripeCustomerId))
      .limit(1);

    return row ?? null;
  } catch (error) {
    console.error("getUserByStripeCustomerId failed:", error);
    return null;
  }
}

async function getUserByEmail(email: string) {
  const needle = email.trim().toLowerCase();
  if (!hasDatabase() || !needle) {
    return null;
  }

  try {
    const db = getDb();
    const [row] = await db
      .select()
      .from(users)
      .where(eq(sql`lower(${users.email})`, needle))
      .limit(1);

    return row ?? null;
  } catch (error) {
    console.error("getUserByEmail failed:", error);
    return null;
  }
}

export async function getUserById(id: string) {
  if (!hasDatabase()) {
    return null;
  }

  try {
    const db = getDb();
    const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return row ?? null;
  } catch (error) {
    console.error("getUserById failed:", error);
    return null;
  }
}

export async function getUserByUsername(username: string) {
  if (!hasDatabase()) {
    return null;
  }

  const needle = username.trim().toLowerCase();
  if (!needle) {
    return null;
  }

  try {
    const db = getDb();
    const [row] = await db
      .select()
      .from(users)
      .where(
        and(
          eq(sql`lower(${users.username})`, needle),
          isNull(users.deletedAt),
        ),
      )
      .limit(1);

    return row ?? null;
  } catch (error) {
    console.error("getUserByUsername failed:", error);
    return null;
  }
}

export async function getUsersByIds(ids: string[]) {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length || !hasDatabase()) {
    return new Map<string, AppUser>();
  }

  try {
    const db = getDb();
    const rows = await db
      .select()
      .from(users)
      .where(inArray(users.id, unique));

    return new Map(rows.map((row) => [row.id, row]));
  } catch (error) {
    console.error("getUsersByIds failed:", error);
    return new Map<string, AppUser>();
  }
}

export function stallAuthorFromUser(user: Pick<AppUser, "username"> | null | undefined): StallAuthor | undefined {
  if (!user?.username) {
    return undefined;
  }

  return {
    username: user.username,
    href: authorHref(user.username),
  };
}

export async function listAuthorUsernamesWithListings() {
  if (!hasDatabase()) {
    return [] as string[];
  }

  try {
    const db = getDb();
    const rows = await db
      .selectDistinct({ username: users.username })
      .from(users)
      .innerJoin(listings, eq(listings.sellerUserId, users.id))
      .where(
        and(
          eq(listings.published, true),
          isNull(listings.deletedAt),
          isNotNull(users.username),
          isNull(users.deletedAt),
        ),
      );

    return rows
      .map((row) => row.username)
      .filter((username): username is string => Boolean(username));
  } catch (error) {
    console.error("listAuthorUsernamesWithListings failed:", error);
    return [];
  }
}

export function parseBio(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const bio = value.trim();
  if (bio.length > MAX_BIO_LENGTH) {
    return null;
  }

  return bio;
}

export async function updateUserBio(userId: string, bio: string) {
  const db = getDb();
  const now = new Date();
  const [row] = await db
    .update(users)
    .set({
      bio: bio.length ? bio : null,
      updatedAt: now,
    })
    .where(and(eq(users.id, userId), isNull(users.deletedAt)))
    .returning();

  return row ?? null;
}

export const getCachedViewer = cache(async () => {
  const { userId } = await auth();
  if (!userId) {
    return null;
  }

  return getUserByClerkId(userId);
});

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
    username: user.username,
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
  const owner = await getUserByStripeCustomerId(stripeCustomerId);

  if (owner) {
    await db
      .update(users)
      .set({ clerkUserId, stripeCustomerId, updatedAt: now })
      .where(eq(users.id, owner.id));
    return;
  }

  await db
    .update(users)
    .set({ stripeCustomerId, updatedAt: now })
    .where(eq(users.clerkUserId, clerkUserId));
}

async function allocateUsername(base: string, excludeClerkUserId?: string) {
  let candidate = base || `grower-${Math.random().toString(36).slice(2, 8)}`;
  let n = 2;

  while (await usernameTaken(candidate, excludeClerkUserId)) {
    candidate = `${base.slice(0, 28)}-${n}`;
    n += 1;
  }

  return candidate;
}

async function usernameTaken(username: string, excludeClerkUserId?: string) {
  const db = getDb();
  const conditions = [eq(sql`lower(${users.username})`, username.toLowerCase())];
  if (excludeClerkUserId) {
    conditions.push(ne(users.clerkUserId, excludeClerkUserId));
  }

  const [row] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(...conditions))
    .limit(1);

  return Boolean(row);
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
