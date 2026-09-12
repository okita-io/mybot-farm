CREATE TABLE "listings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"seller_user_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"kind" text NOT NULL,
	"name" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"category" text NOT NULL,
	"price_cents" integer NOT NULL,
	"currency" text DEFAULT 'usd' NOT NULL,
	"pack" jsonb NOT NULL,
	"published" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"buyer_user_id" uuid NOT NULL,
	"listing_id" uuid NOT NULL,
	"stripe_checkout_session_id" text NOT NULL,
	"stripe_payment_intent_id" text,
	"amount_cents" integer NOT NULL,
	"application_fee_cents" integer NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "stripe_connect_account_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "stripe_connect_transfers_active" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_seller_user_id_users_id_fk" FOREIGN KEY ("seller_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_buyer_user_id_users_id_fk" FOREIGN KEY ("buyer_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "listings_slug_idx" ON "listings" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "listings_seller_idx" ON "listings" USING btree ("seller_user_id");--> statement-breakpoint
CREATE INDEX "listings_published_idx" ON "listings" USING btree ("published");--> statement-breakpoint
CREATE UNIQUE INDEX "purchases_checkout_session_idx" ON "purchases" USING btree ("stripe_checkout_session_id");--> statement-breakpoint
CREATE INDEX "purchases_buyer_listing_idx" ON "purchases" USING btree ("buyer_user_id","listing_id");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_stripe_connect_account_id_unique" UNIQUE("stripe_connect_account_id");