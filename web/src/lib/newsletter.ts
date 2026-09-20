import { Resend } from "resend";
import {
  parseSubscribeBody,
  type SignupSource,
} from "./newsletter-parse.ts";

export { parseSubscribeBody };
export type { SignupSource };

const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 5;

const hitsByIp = new Map<string, number[]>();

export type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfter: number };

export type SubscribeResult =
  | { ok: true }
  | { ok: false; error: "misconfigured" | "upstream" };

export function clientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

export function checkSubscribeRateLimit(ip: string, now = Date.now()): RateLimitResult {
  const windowStart = now - RATE_WINDOW_MS;
  const previous = (hitsByIp.get(ip) ?? []).filter((stamp) => stamp > windowStart);
  if (previous.length >= RATE_MAX) {
    const retryAfter = Math.max(1, Math.ceil((previous[0]! + RATE_WINDOW_MS - now) / 1000));
    hitsByIp.set(ip, previous);
    return { ok: false, retryAfter };
  }
  previous.push(now);
  hitsByIp.set(ip, previous);
  return { ok: true };
}

function newsletterConfig() {
  const apiKey = process.env.RESEND_API_KEY?.trim() ?? "";
  const segmentId = process.env.RESEND_SEGMENT_ID?.trim() ?? "";
  if (!apiKey || !segmentId) {
    return null;
  }
  return { apiKey, segmentId };
}

function alreadyExists(error: { statusCode: number | null; message: string }) {
  if (error.statusCode === 409) {
    return true;
  }
  return /already exists/i.test(error.message);
}

async function addToSegment(resend: Resend, email: string, segmentId: string) {
  const { error } = await resend.contacts.segments.add({ email, segmentId });
  if (!error) {
    return true;
  }
  if (error.statusCode === 409 || /already/i.test(error.message)) {
    return true;
  }
  return false;
}

export async function subscribeFarmNotes(
  email: string,
  source: SignupSource,
): Promise<SubscribeResult> {
  const config = newsletterConfig();
  if (!config) {
    return { ok: false, error: "misconfigured" };
  }

  const resend = new Resend(config.apiKey);
  const properties = { signup_source: source };

  const created = await resend.contacts.create({
    email,
    unsubscribed: false,
    properties,
    segments: [{ id: config.segmentId }],
  });

  if (!created.error) {
    return { ok: true };
  }

  if (!alreadyExists(created.error)) {
    console.error("Farm Notes subscribe create failed:", created.error.name);
    return { ok: false, error: "upstream" };
  }

  const updated = await resend.contacts.update({
    email,
    unsubscribed: false,
    properties,
  });
  if (updated.error) {
    console.error("Farm Notes subscribe update failed:", updated.error.name);
    return { ok: false, error: "upstream" };
  }

  const inSegment = await addToSegment(resend, email, config.segmentId);
  if (!inSegment) {
    console.error("Farm Notes subscribe segment add failed");
    return { ok: false, error: "upstream" };
  }

  return { ok: true };
}
