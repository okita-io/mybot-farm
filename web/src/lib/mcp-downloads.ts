import { sql } from "drizzle-orm";
import { getDb, hasDatabase } from "@/lib/db";
import { stallDownloadEvents } from "@/lib/db/schema";
import { recordStallDownload } from "@/lib/engagement";
import { DOWNLOAD_DEDUP_HOURS, hashCaller } from "@/lib/mcp-ops";

/**
 * Count an MCP pack download in stall_stats at most once per (slug, caller)
 * per 24h. Needs drizzle/0010_stall_download_events.sql. Until that migration
 * is applied the dedup insert fails and nothing is counted (by design: no
 * dedup means no count, so crawlers cannot inflate download_count).
 */

let warnedMissingTable = false;

function dedupSalt() {
  return process.env.MCP_DEDUP_SALT || "mybot.farm/mcp-download-dedup/v1";
}

function isMissingTable(error: unknown) {
  const code = (error as { code?: unknown; cause?: { code?: unknown } })?.code ??
    (error as { cause?: { code?: unknown } })?.cause?.code;
  return code === "42P01" || /stall_download_events/.test(String(error));
}

export async function countMcpDownload(slug: string, caller: string): Promise<boolean> {
  if (!slug || !hasDatabase()) {
    return false;
  }

  const callerHash = hashCaller(caller, dedupSalt());
  const now = new Date();

  try {
    const db = getDb();
    const rows = await db
      .insert(stallDownloadEvents)
      .values({ slug, callerHash, source: "mcp", countedAt: now })
      .onConflictDoUpdate({
        target: [stallDownloadEvents.slug, stallDownloadEvents.callerHash],
        set: { countedAt: now },
        setWhere: sql`${stallDownloadEvents.countedAt} < now() - make_interval(hours => ${DOWNLOAD_DEDUP_HOURS})`,
      })
      .returning({ id: stallDownloadEvents.id });

    if (rows.length === 0) {
      return false;
    }
  } catch (error) {
    if (isMissingTable(error)) {
      if (!warnedMissingTable) {
        warnedMissingTable = true;
        console.warn(
          "mcp download dedup table missing (apply drizzle/0010_stall_download_events.sql); MCP downloads are not counted.",
        );
      }
    } else {
      console.error("mcp download dedup failed:", error);
    }
    return false;
  }

  await recordStallDownload(slug);
  return true;
}
