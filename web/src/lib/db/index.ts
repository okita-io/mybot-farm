import { neon, Pool } from "@neondatabase/serverless";
import { drizzle as drizzleHttp } from "drizzle-orm/neon-http";
import { drizzle as drizzleWs } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

type Database = ReturnType<typeof drizzleHttp<typeof schema>>;
export type TxDatabase = Parameters<
  Parameters<ReturnType<typeof drizzleWs<typeof schema>>["transaction"]>[0]
>[0];
export type DbLike = Database | TxDatabase;

let cached: Database | undefined;

export function hasDatabase() {
  return Boolean(process.env.DATABASE_URL);
}

export function getDb() {
  if (cached) return cached;

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }

  cached = drizzleHttp(neon(url), { schema });
  return cached;
}

/**
 * Interactive transaction via WebSocket Pool. neon-http cannot hold a tx across
 * round trips; callers that need atomic multi-statement work use this helper.
 */
export async function withTransaction<T>(
  fn: (tx: TxDatabase) => Promise<T>,
): Promise<T> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }

  const pool = new Pool({ connectionString: url });
  try {
    const db = drizzleWs(pool, { schema });
    return await db.transaction(async (tx) => fn(tx));
  } finally {
    await pool.end();
  }
}
