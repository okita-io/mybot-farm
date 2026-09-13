CREATE TABLE "stall_flags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"user_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"details" text,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	"resolved_by_user_id" uuid
);
--> statement-breakpoint
CREATE TABLE "stall_takedowns" (
	"slug" text PRIMARY KEY NOT NULL,
	"listing_id" uuid,
	"taken_down_by_user_id" uuid NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "stall_flags" ADD CONSTRAINT "stall_flags_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stall_flags" ADD CONSTRAINT "stall_flags_resolved_by_user_id_users_id_fk" FOREIGN KEY ("resolved_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stall_takedowns" ADD CONSTRAINT "stall_takedowns_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stall_takedowns" ADD CONSTRAINT "stall_takedowns_taken_down_by_user_id_users_id_fk" FOREIGN KEY ("taken_down_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "stall_flags_user_slug_idx" ON "stall_flags" USING btree ("user_id","slug");--> statement-breakpoint
CREATE INDEX "stall_flags_slug_idx" ON "stall_flags" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "stall_flags_status_idx" ON "stall_flags" USING btree ("status");--> statement-breakpoint
CREATE INDEX "listings_deleted_idx" ON "listings" USING btree ("deleted_at");