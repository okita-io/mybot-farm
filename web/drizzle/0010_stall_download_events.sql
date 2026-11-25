CREATE TABLE "stall_download_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"caller_hash" text NOT NULL,
	"source" text DEFAULT 'mcp' NOT NULL,
	"counted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "stall_download_events_slug_caller_idx" ON "stall_download_events" USING btree ("slug","caller_hash");--> statement-breakpoint
CREATE INDEX "stall_download_events_counted_at_idx" ON "stall_download_events" USING btree ("counted_at");
