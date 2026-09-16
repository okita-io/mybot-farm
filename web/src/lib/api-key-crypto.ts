import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const API_KEY_PREFIX = "mbf_";
const SECRET_BYTES = 32;
const DISPLAY_SECRET_CHARS = 8;

export type ApiKeyMaterial = {
  key: string;
  prefix: string;
  keyHash: string;
};

export function generateApiKeyMaterial(): ApiKeyMaterial {
  const secret = randomBytes(SECRET_BYTES).toString("base64url");
  const key = `${API_KEY_PREFIX}${secret}`;

  return {
    key,
    prefix: `${API_KEY_PREFIX}${secret.slice(0, DISPLAY_SECRET_CHARS)}`,
    keyHash: hashApiKey(key),
  };
}

export function hashApiKey(key: string) {
  return createHash("sha256").update(key, "utf8").digest("hex");
}

export function hashesMatch(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) {
    return false;
  }

  return timingSafeEqual(a, b);
}

export function isFarmApiKey(value: string) {
  return (
    value.startsWith(API_KEY_PREFIX) &&
    value.length >= API_KEY_PREFIX.length + SECRET_BYTES
  );
}

export function readApiKeyFromRequest(request: Request) {
  const authorization = request.headers.get("authorization");
  if (authorization) {
    const match = /^Bearer\s+(\S+)/i.exec(authorization.trim());
    const token = match?.[1];
    if (token && isFarmApiKey(token)) {
      return token;
    }
  }

  const headerKey = request.headers.get("x-api-key")?.trim();
  if (headerKey && isFarmApiKey(headerKey)) {
    return headerKey;
  }

  return null;
}
