const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 5;

const hitsByIp = new Map<string, number[]>();

export type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfter: number };

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
  if (previous.length === 0) {
    hitsByIp.delete(ip);
  }

  if (previous.length >= RATE_MAX) {
    const retryAfter = Math.max(1, Math.ceil((previous[0]! + RATE_WINDOW_MS - now) / 1000));
    hitsByIp.set(ip, previous);
    return { ok: false, retryAfter };
  }

  previous.push(now);
  hitsByIp.set(ip, previous);
  return { ok: true };
}

/** Clear the in-memory limiter (tests only). */
export function resetSubscribeRateLimitForTests() {
  hitsByIp.clear();
}
