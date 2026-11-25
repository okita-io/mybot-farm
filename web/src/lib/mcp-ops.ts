import { createHash } from "node:crypto";
import type { ToolClass } from "./mcp-tool-defs.ts";

/** Logging, rate-limit, and download-dedup helpers for /mcp. Pure. */

export type McpAuthType = "anon" | "api_key";

export type McpLogEntry = {
  event: "mcp_tool_call";
  requestId: string;
  tool: string;
  authType: McpAuthType;
  userId?: string;
  slug?: string;
  kind?: string;
  outcome: "ok" | "error" | "unauthorized" | "payment_required" | "not_found" | "rate_limited";
  status?: number;
  errorCode?: string;
  durationMs: number;
  protocolVersion?: string;
  counted?: boolean;
};

const SECRET_PATTERN = /mbf_[A-Za-z0-9_-]{8,}/g;

/** One JSON line to stdout (Vercel Runtime Logs). Scrubs anything that looks like a key. */
export function formatLogLine(entry: McpLogEntry) {
  return JSON.stringify(entry).replace(SECRET_PATTERN, "mbf_[redacted]");
}

export function logToolCall(entry: McpLogEntry) {
  console.log(formatLogLine(entry));
}

export function clientIpFromHeaders(headers: Headers) {
  const forwarded = headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  if (first) return first;
  return headers.get("x-real-ip")?.trim() || "unknown";
}

/** Rate-limit / dedup subject: seller id when authenticated, else client IP. */
export function callerIdentity(headers: Headers, userId?: string | null) {
  return userId ? `user:${userId}` : `ip:${clientIpFromHeaders(headers)}`;
}

/** Stored dedup key: salted SHA-256 so raw IPs never land in the database. */
export function hashCaller(identity: string, salt: string) {
  return createHash("sha256").update(`${salt}:${identity}`, "utf8").digest("hex");
}

export const DOWNLOAD_DEDUP_HOURS = 24;

/** Firewall rule IDs to create in Vercel (rate limit rules with a @vercel/firewall condition). */
export const FIREWALL_RULE_IDS: Record<ToolClass, string> = {
  read: "mcp-read",
  pack: "mcp-pack",
  write: "mcp-write",
};

/** Per-instance backstop limits (requests per window). Firewall rules are the real limit. */
export const BACKSTOP_LIMITS: Record<ToolClass, { max: number; windowMs: number }> = {
  read: { max: 30, windowMs: 60_000 },
  pack: { max: 20, windowMs: 60_000 },
  write: { max: 10, windowMs: 60 * 60_000 },
};

export type RateDecision = { limited: false } | { limited: true; retryAfter: number };

/**
 * Small sliding-window limiter. Used only as a per-instance backstop behind the
 * Vercel Firewall rules: Fluid Compute instances do not share this memory.
 */
export function createBackstopLimiter(limits = BACKSTOP_LIMITS, maxKeys = 10_000) {
  const hits = new Map<string, number[]>();

  return function check(toolClass: ToolClass, subject: string, now = Date.now()): RateDecision {
    const { max, windowMs } = limits[toolClass];
    const key = `${toolClass}:${subject}`;
    const recent = (hits.get(key) ?? []).filter((stamp) => stamp > now - windowMs);
    if (recent.length >= max) {
      hits.set(key, recent);
      return {
        limited: true,
        retryAfter: Math.max(1, Math.ceil((recent[0]! + windowMs - now) / 1000)),
      };
    }
    recent.push(now);
    if (!hits.has(key) && hits.size >= maxKeys) {
      const oldest = hits.keys().next().value;
      if (oldest !== undefined) hits.delete(oldest);
    }
    hits.set(key, recent);
    return { limited: false };
  };
}

/** Largest pack JSON returned inline; above this, return a URL (4.5 MB function body cap). */
export const MAX_INLINE_PACK_BYTES = 3_500_000;
