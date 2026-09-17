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
    readmeMarkdown: text("readme_markdown"),
    readmeHtml: text("readme_html"),
    published: boolean("published").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("listings_slug_idx").on(table.slug),
    index("listings_seller_idx").on(table.sellerUserId),
    index("listings_published_idx").on(table.published),
    index("listings_deleted_idx").on(table.deletedAt),
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

export const stallStats = pgTable("stall_stats", {
  slug: text("slug").primaryKey(),
  downloadCount: integer("download_count").notNull().default(0),
  likeCount: integer("like_count").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const stallLikes = pgTable(
  "stall_likes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("stall_likes_user_slug_idx").on(table.userId, table.slug),
    index("stall_likes_slug_idx").on(table.slug),
  ],
);

export const stallFlags = pgTable(
  "stall_flags",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    reason: text("reason").notNull(),
    details: text("details"),
    status: text("status").notNull().default("open"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolvedByUserId: uuid("resolved_by_user_id").references(() => users.id),
  },
  (table) => [
    uniqueIndex("stall_flags_user_slug_idx").on(table.userId, table.slug),
    index("stall_flags_slug_idx").on(table.slug),
    index("stall_flags_status_idx").on(table.status),
  ],
);

export const stallTakedowns = pgTable("stall_takedowns", {
  slug: text("slug").primaryKey(),
  listingId: uuid("listing_id").references(() => listings.id),
  takenDownByUserId: uuid("taken_down_by_user_id")
    .notNull()
    .references(() => users.id),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const apiKeys = pgTable(
  "api_keys",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    name: text("name").notNull(),
    prefix: text("prefix").notNull(),
    keyHash: text("key_hash").notNull(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("api_keys_hash_idx").on(table.keyHash),
    index("api_keys_user_idx").on(table.userId),
  ],
);

export const stallComments = pgTable(
  "stall_comments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    body: text("body").notNull(),
    upCount: integer("up_count").notNull().default(0),
    downCount: integer("down_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    deletedByUserId: uuid("deleted_by_user_id").references(() => users.id),
  },
  (table) => [
    index("stall_comments_slug_created_idx").on(table.slug, table.createdAt),
    index("stall_comments_user_created_idx").on(table.userId, table.createdAt),
    index("stall_comments_deleted_idx").on(table.deletedAt),
  ],
);

export const stallCommentVotes = pgTable(
  "stall_comment_votes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    commentId: uuid("comment_id")
      .notNull()
      .references(() => stallComments.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    value: integer("value").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("stall_comment_votes_user_comment_idx").on(
      table.userId,
      table.commentId,
    ),
    index("stall_comment_votes_comment_idx").on(table.commentId),
  ],
);

export const stallCommentFlags = pgTable(
  "stall_comment_flags",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    commentId: uuid("comment_id")
      .notNull()
      .references(() => stallComments.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    reason: text("reason").notNull(),
    details: text("details"),
    status: text("status").notNull().default("open"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolvedByUserId: uuid("resolved_by_user_id").references(() => users.id),
  },
  (table) => [
    uniqueIndex("stall_comment_flags_user_comment_idx").on(
      table.userId,
      table.commentId,
    ),
    index("stall_comment_flags_comment_idx").on(table.commentId),
    index("stall_comment_flags_status_idx").on(table.status),
  ],
);

export const stallRevisions = pgTable(
  "stall_revisions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id),
    slug: text("slug").notNull(),
    packVersion: integer("pack_version").notNull(),
    source: text("source").notNull(),
    summary: text("summary").notNull(),
    commitSha: text("commit_sha"),
    githubPath: text("github_path"),
    actorUserId: uuid("actor_user_id").references(() => users.id),
    pack: jsonb("pack").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("stall_revisions_listing_version_idx").on(
      table.listingId,
      table.packVersion,
    ),
    index("stall_revisions_slug_idx").on(table.slug),
    index("stall_revisions_listing_idx").on(table.listingId),
  ],
);
