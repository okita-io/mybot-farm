import { Resend } from "resend";
import { shouldAddExistingContactToSegment } from "./newsletter-consent.ts";
import {
  parseSubscribeBody,
  type SignupSource,
} from "./newsletter-parse.ts";
import {
  checkSubscribeRateLimit,
  clientIp,
  resetSubscribeRateLimitForTests,
} from "./newsletter-rate.ts";

export { parseSubscribeBody, shouldAddExistingContactToSegment };
export type { SignupSource };
export {
  checkSubscribeRateLimit,
  clientIp,
  resetSubscribeRateLimitForTests,
};

export type SubscribeResult =
  | { ok: true }
  | { ok: false; error: "misconfigured" | "upstream" };

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

  // Never clear an existing unsubscribe flag — update properties only.
  const updated = await resend.contacts.update({
    email,
    properties,
  });
  if (updated.error) {
    console.error("Farm Notes subscribe update failed:", updated.error.name);
    return { ok: false, error: "upstream" };
  }

  const existing = await resend.contacts.get({ email });
  if (existing.error) {
    console.error("Farm Notes subscribe get failed:", existing.error.name);
    return { ok: false, error: "upstream" };
  }

  if (!shouldAddExistingContactToSegment({ unsubscribed: existing.data.unsubscribed })) {
    return { ok: true };
  }

  const inSegment = await addToSegment(resend, email, config.segmentId);
  if (!inSegment) {
    console.error("Farm Notes subscribe segment add failed");
    return { ok: false, error: "upstream" };
  }

  return { ok: true };
}
