ALTER TABLE "stall_comments" ADD COLUMN "up_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "stall_comments" ADD COLUMN "down_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "stall_comments" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "stall_comments" ADD COLUMN "deleted_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "stall_comments" ADD CONSTRAINT "stall_comments_deleted_by_user_id_users_id_fk" FOREIGN KEY ("deleted_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "stall_comments_deleted_idx" ON "stall_comments" USING btree ("deleted_at");--> statement-breakpoint
CREATE TABLE "stall_comment_votes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"comment_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"value" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "stall_comment_votes" ADD CONSTRAINT "stall_comment_votes_comment_id_stall_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."stall_comments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stall_comment_votes" ADD CONSTRAINT "stall_comment_votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "stall_comment_votes_user_comment_idx" ON "stall_comment_votes" USING btree ("user_id","comment_id");--> statement-breakpoint
CREATE INDEX "stall_comment_votes_comment_idx" ON "stall_comment_votes" USING btree ("comment_id");--> statement-breakpoint
CREATE TABLE "stall_comment_flags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"comment_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"details" text,
	"status" text NOT NULL DEFAULT 'open',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	"resolved_by_user_id" uuid
);
--> statement-breakpoint
ALTER TABLE "stall_comment_flags" ADD CONSTRAINT "stall_comment_flags_comment_id_stall_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."stall_comments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stall_comment_flags" ADD CONSTRAINT "stall_comment_flags_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stall_comment_flags" ADD CONSTRAINT "stall_comment_flags_resolved_by_user_id_users_id_fk" FOREIGN KEY ("resolved_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "stall_comment_flags_user_comment_idx" ON "stall_comment_flags" USING btree ("user_id","comment_id");--> statement-breakpoint
CREATE INDEX "stall_comment_flags_comment_idx" ON "stall_comment_flags" USING btree ("comment_id");--> statement-breakpoint
CREATE INDEX "stall_comment_flags_status_idx" ON "stall_comment_flags" USING btree ("status");
