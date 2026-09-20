export const SIGNUP_SOURCES = ["footer", "home", "about"] as const;
export type SignupSource = (typeof SIGNUP_SOURCES)[number];

const EMAIL_MAX = 254;

export type ParseSubscribeResult =
  | { ok: true; email: string; source: SignupSource }
  | { ok: false; error: "invalid_email" | "honeypot" };

function isSignupSource(value: string): value is SignupSource {
  return (SIGNUP_SOURCES as readonly string[]).includes(value);
}

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function isValidEmail(value: string) {
  if (value.length < 3 || value.length > EMAIL_MAX) {
    return false;
  }
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function parseSubscribeBody(value: unknown): ParseSubscribeResult {
  if (!value || typeof value !== "object") {
    return { ok: false, error: "invalid_email" };
  }

  const record = value as Record<string, unknown>;
  const website = typeof record.website === "string" ? record.website.trim() : "";
  if (website.length > 0) {
    return { ok: false, error: "honeypot" };
  }

  const rawEmail = typeof record.email === "string" ? record.email : "";
  const email = normalizeEmail(rawEmail);
  if (!isValidEmail(email)) {
    return { ok: false, error: "invalid_email" };
  }

  const rawSource = typeof record.source === "string" ? record.source.trim() : "";
  const source = isSignupSource(rawSource) ? rawSource : "footer";

  return { ok: true, email, source };
}
