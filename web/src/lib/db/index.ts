import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

type Database = ReturnType<typeof drizzle<typeof schema>>;

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

  cached = drizzle(neon(url), { schema });
  return cached;
}
