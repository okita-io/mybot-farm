CREATE TABLE "stall_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"user_id" uuid NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "stall_comments" ADD CONSTRAINT "stall_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "stall_comments_slug_created_idx" ON "stall_comments" USING btree ("slug","created_at");--> statement-breakpoint
CREATE INDEX "stall_comments_user_created_idx" ON "stall_comments" USING btree ("user_id","created_at");
