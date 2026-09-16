import { and, desc, eq, isNull, sql } from "drizzle-orm";
import {
  generateApiKeyMaterial,
  hashApiKey,
  hashesMatch,
  isFarmApiKey,
} from "@/lib/api-key-crypto";
import { getDb, hasDatabase } from "@/lib/db";
import { apiKeys } from "@/lib/db/schema";
import { getUserById, type AppUser } from "@/lib/users";

export const MAX_API_KEYS_PER_USER = 20;
export const MAX_API_KEY_NAME_LENGTH = 64;
export const DEFAULT_API_KEY_NAME = "Seller key";

export type ApiKeyPublic = {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt: string | null;
};

export type CreatedApiKey = ApiKeyPublic & {
  key: string;
};

function serializeKey(row: {
  id: string;
  name: string;
  prefix: string;
  createdAt: Date;
  lastUsedAt: Date | null;
}): ApiKeyPublic {
  return {
    id: row.id,
    name: row.name,
    prefix: row.prefix,
    createdAt: row.createdAt.toISOString(),
    lastUsedAt: row.lastUsedAt ? row.lastUsedAt.toISOString() : null,
  };
}

export function parseApiKeyName(value: unknown) {
  if (value == null) {
    return DEFAULT_API_KEY_NAME;
  }

  if (typeof value !== "string") {
    return null;
  }

  const name = value.trim();
  if (!name) {
    return DEFAULT_API_KEY_NAME;
  }

  if (name.length > MAX_API_KEY_NAME_LENGTH) {
    return null;
  }

  return name;
}

export async function listSellerApiKeys(userId: string): Promise<ApiKeyPublic[]> {
  if (!hasDatabase()) {
    return [];
  }

  const db = getDb();
  const rows = await db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      prefix: apiKeys.prefix,
      createdAt: apiKeys.createdAt,
      lastUsedAt: apiKeys.lastUsedAt,
    })
    .from(apiKeys)
    .where(and(eq(apiKeys.userId, userId), isNull(apiKeys.revokedAt)))
    .orderBy(desc(apiKeys.createdAt));

  return rows.map(serializeKey);
}

export async function countActiveApiKeys(userId: string) {
  const db = getDb();
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(apiKeys)
    .where(and(eq(apiKeys.userId, userId), isNull(apiKeys.revokedAt)));

  return Number(row?.count ?? 0);
}

export async function createSellerApiKey(
  userId: string,
  name: string,
): Promise<
  | { ok: true; value: CreatedApiKey }
  | { ok: false; error: string; message: string; status: number }
> {
  if (!hasDatabase()) {
    return {
      ok: false,
      error: "unavailable",
      message: "Database is not configured.",
      status: 503,
    };
  }

  const active = await countActiveApiKeys(userId);
  if (active >= MAX_API_KEYS_PER_USER) {
    return {
      ok: false,
      error: "key_limit",
      message: `You can have at most ${MAX_API_KEYS_PER_USER} active API keys.`,
      status: 400,
    };
  }

  const material = generateApiKeyMaterial();
  const db = getDb();
  const now = new Date();
  const [row] = await db
    .insert(apiKeys)
    .values({
      userId,
      name,
      prefix: material.prefix,
      keyHash: material.keyHash,
      createdAt: now,
    })
    .returning({
      id: apiKeys.id,
      name: apiKeys.name,
      prefix: apiKeys.prefix,
      createdAt: apiKeys.createdAt,
      lastUsedAt: apiKeys.lastUsedAt,
    });

  if (!row) {
    return {
      ok: false,
      error: "create_failed",
      message: "Could not create that key.",
      status: 500,
    };
  }

  return {
    ok: true,
    value: {
      ...serializeKey(row),
      key: material.key,
    },
  };
}

export async function revokeSellerApiKey(userId: string, id: string) {
  if (!hasDatabase()) {
    return null;
  }

  const db = getDb();
  const now = new Date();
  const [row] = await db
    .update(apiKeys)
    .set({ revokedAt: now })
    .where(
      and(
        eq(apiKeys.id, id),
        eq(apiKeys.userId, userId),
        isNull(apiKeys.revokedAt),
      ),
    )
    .returning({ id: apiKeys.id });

  return row ?? null;
}

export async function resolveApiKeyUser(presented: string): Promise<AppUser | null> {
  if (!hasDatabase() || !isFarmApiKey(presented)) {
    return null;
  }

  const keyHash = hashApiKey(presented);
  const db = getDb();
  const [row] = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.keyHash, keyHash), isNull(apiKeys.revokedAt)))
    .limit(1);

  if (!row || !hashesMatch(row.keyHash, keyHash)) {
    return null;
  }

  const user = await getUserById(row.userId);
  if (!user || user.deletedAt) {
    return null;
  }

  try {
    await db
      .update(apiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiKeys.id, row.id));
  } catch (error) {
    console.error("api key lastUsedAt update failed:", error);
  }

  return user;
}
