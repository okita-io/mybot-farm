CREATE TABLE "stall_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"pack_version" integer NOT NULL,
	"source" text NOT NULL,
	"summary" text NOT NULL,
	"commit_sha" text,
	"github_path" text,
	"actor_user_id" uuid,
	"pack" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "stall_revisions" ADD CONSTRAINT "stall_revisions_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stall_revisions" ADD CONSTRAINT "stall_revisions_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "stall_revisions_listing_version_idx" ON "stall_revisions" USING btree ("listing_id","pack_version");--> statement-breakpoint
CREATE INDEX "stall_revisions_slug_idx" ON "stall_revisions" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "stall_revisions_listing_idx" ON "stall_revisions" USING btree ("listing_id");
