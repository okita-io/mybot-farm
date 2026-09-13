import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clerkUserId: text("clerk_user_id").notNull().unique(),
    email: text("email"),
    firstName: text("first_name"),
    lastName: text("last_name"),
    imageUrl: text("image_url"),
    username: text("username"),
    bio: text("bio"),
    stripeCustomerId: text("stripe_customer_id").unique(),
    stripeConnectAccountId: text("stripe_connect_account_id").unique(),
    stripeConnectTransfersActive: boolean("stripe_connect_transfers_active")
      .notNull()
      .default(false),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [uniqueIndex("users_username_idx").on(table.username)],
);

export const listings = pgTable(
  "listings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sellerUserId: uuid("seller_user_id")
      .notNull()
      .references(() => users.id),
    slug: text("slug").notNull(),
    kind: text("kind").notNull(),
    name: text("name").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    category: text("category").notNull(),
    priceCents: integer("price_cents").notNull(),
    currency: text("currency").notNull().default("usd"),
    pack: jsonb("pack").$type<Record<string, unknown>>().notNull(),
    published: boolean("published").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("listings_slug_idx").on(table.slug),
    index("listings_seller_idx").on(table.sellerUserId),
    index("listings_published_idx").on(table.published),
  ],
);

export const purchases = pgTable(
  "purchases",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    buyerUserId: uuid("buyer_user_id")
      .notNull()
      .references(() => users.id),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id),
    stripeCheckoutSessionId: text("stripe_checkout_session_id").notNull(),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    amountCents: integer("amount_cents").notNull(),
    applicationFeeCents: integer("application_fee_cents").notNull(),
    status: text("status").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("purchases_checkout_session_idx").on(
      table.stripeCheckoutSessionId,
    ),
    index("purchases_buyer_listing_idx").on(table.buyerUserId, table.listingId),
  ],
);

export const processedEvents = pgTable("processed_events", {
  id: text("id").primaryKey(),
  source: text("source").notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
