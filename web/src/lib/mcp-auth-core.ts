import { MCP_DOCS_URL, SELLER_KEY_URL, WRITE_TOOL_NAMES } from "./mcp-tool-defs.ts";

/**
 * Auth for the remote MCP endpoint (v1): anonymous reads, seller API key
 * (mbf_…) for writes. No OAuth yet. Pure: the key resolver is injected.
 */

export const API_KEY_PREFIX = "mbf_";
const MIN_KEY_LENGTH = API_KEY_PREFIX.length + 32;

export type PresentedCredential =
  | { kind: "none" }
  | { kind: "api_key"; key: string }
  | { kind: "malformed_api_key" }
  | { kind: "other_bearer" };

/** Same acceptance rule as readApiKeyFromRequest, but also reports non-farm bearers. */
export function readPresentedCredential(headers: Headers): PresentedCredential {
  const authorization = headers.get("authorization")?.trim();
  if (authorization) {
    const match = /^Bearer\s+(\S+)/i.exec(authorization);
    const token = match?.[1];
    if (token) {
      if (token.startsWith(API_KEY_PREFIX)) {
        return token.length >= MIN_KEY_LENGTH
          ? { kind: "api_key", key: token }
          : { kind: "malformed_api_key" };
      }
      return { kind: "other_bearer" };
    }
  }

  const headerKey = headers.get("x-api-key")?.trim();
  if (headerKey) {
    return headerKey.startsWith(API_KEY_PREFIX) && headerKey.length >= MIN_KEY_LENGTH
      ? { kind: "api_key", key: headerKey }
      : { kind: "malformed_api_key" };
  }

  return { kind: "none" };
}

export type FarmSeller = {
  id: string;
  clerkUserId?: string | null;
  keyPrefix: string;
};

/** Shape the MCP SDK carries as ctx.http.authInfo. Never holds the raw key. */
export type FarmAuthInfo = {
  token: string;
  clientId: string;
  scopes: string[];
  extra: {
    authType: "api_key";
    userId: string;
    clerkUserId: string | null;
  };
};

export function authInfoForSeller(seller: FarmSeller): FarmAuthInfo {
  return {
    token: seller.keyPrefix,
    clientId: seller.keyPrefix,
    scopes: ["farm:read", "farm:write"],
    extra: {
      authType: "api_key",
      userId: seller.id,
      clerkUserId: seller.clerkUserId ?? null,
    },
  };
}

export function isFarmAuthInfo(value: unknown): value is FarmAuthInfo {
  if (!value || typeof value !== "object") return false;
  const extra = (value as { extra?: unknown }).extra;
  return (
    Boolean(extra) &&
    typeof extra === "object" &&
    (extra as { authType?: unknown }).authType === "api_key" &&
    typeof (extra as { userId?: unknown }).userId === "string"
  );
}

/** Tool names called by a JSON-RPC message or batch (tools/call only). */
export function calledToolNames(body: unknown): string[] {
  const messages = Array.isArray(body) ? body : [body];
  const names: string[] = [];
  for (const message of messages) {
    if (!message || typeof message !== "object") continue;
    const { method, params } = message as { method?: unknown; params?: unknown };
    if (method !== "tools/call" || !params || typeof params !== "object") continue;
    const name = (params as { name?: unknown }).name;
    if (typeof name === "string") names.push(name);
  }
  return names;
}

export function callsWriteTool(body: unknown) {
  return calledToolNames(body).some((name) => WRITE_TOOL_NAMES.has(name));
}

export type ChallengeReason = "missing" | "invalid_key" | "oauth_unsupported";

const CHALLENGE_TEXT: Record<ChallengeReason, string> = {
  missing: `This tool needs a seller API key. Send Authorization: Bearer mbf_… or X-Api-Key: mbf_… (create one at ${SELLER_KEY_URL}).`,
  invalid_key: "That mybot.farm API key is not valid or was revoked.",
  oauth_unsupported: `OAuth is not enabled on this server yet. Browse without a token, or use a seller API key (mbf_…) from ${SELLER_KEY_URL}.`,
};

/** Header values must be ByteStrings: drop non-ASCII and quotes. */
export function asciiHeaderText(text: string) {
  return text.replace(/\u2026/g, "...").replace(/[^\x20-\x7e]/g, "").replace(/["\\]/g, "'");
}

export function unauthorizedResponse(reason: ChallengeReason) {
  const description = CHALLENGE_TEXT[reason];
  const error = reason === "missing" ? "invalid_request" : "invalid_token";
  return new Response(
    JSON.stringify({ error: "unauthorized", reason, message: description, docs: MCP_DOCS_URL }),
    {
      status: 401,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "WWW-Authenticate": `Bearer realm="mybot.farm", error="${error}", error_description="${asciiHeaderText(description)}"`,
      },
    },
  );
}

async function peekJson(request: Request): Promise<unknown> {
  if (request.method !== "POST") return undefined;
  const type = request.headers.get("content-type") ?? "";
  if (!type.toLowerCase().includes("application/json")) return undefined;
  try {
    return await request.clone().json();
  } catch {
    return undefined;
  }
}

export type ResolveSeller = (key: string) => Promise<FarmSeller | null>;

/**
 * Wrap an MCP handler:
 * - valid mbf_ key → authInfo attached (req.auth → ctx.http.authInfo)
 * - invalid/revoked mbf_ key → 401 on every request
 * - other bearer → 401 (OAuth not enabled in v1)
 * - no credential → reads pass; a tools/call to farm_post / farm_update gets 401
 */
export function withFarmMcpAuth(
  handler: (request: Request) => Promise<Response>,
  resolveSeller: ResolveSeller,
) {
  return async (request: Request): Promise<Response> => {
    const credential = readPresentedCredential(request.headers);

    if (credential.kind === "other_bearer") {
      return unauthorizedResponse("oauth_unsupported");
    }
    if (credential.kind === "malformed_api_key") {
      return unauthorizedResponse("invalid_key");
    }

    if (credential.kind === "api_key") {
      let seller: FarmSeller | null = null;
      try {
        seller = await resolveSeller(credential.key);
      } catch (error) {
        console.error("mcp api key lookup failed:", error);
        return new Response(JSON.stringify({ error: "auth_unavailable" }), {
          status: 503,
          headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
        });
      }
      if (!seller) {
        return unauthorizedResponse("invalid_key");
      }
      (request as Request & { auth?: FarmAuthInfo }).auth = authInfoForSeller(seller);
      return handler(request);
    }

    const body = await peekJson(request);
    if (body !== undefined && callsWriteTool(body)) {
      return unauthorizedResponse("missing");
    }

    return handler(request);
  };
}
