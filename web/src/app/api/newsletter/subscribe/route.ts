import { NextResponse } from "next/server";
import {
  checkSubscribeRateLimit,
  clientIp,
  parseSubscribeBody,
  subscribeFarmNotes,
} from "@/lib/newsletter";

export const runtime = "nodejs";

function json(data: unknown, status = 200, extra?: HeadersInit) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      ...extra,
    },
  });
}

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = parseSubscribeBody(body);
  if (!parsed.ok) {
    // A filled honeypot looks like success so bots cannot probe the trap field.
    if (parsed.error === "honeypot") {
      return json({ ok: true });
    }
    return json({ ok: false, error: parsed.error }, 400);
  }

  const limited = checkSubscribeRateLimit(clientIp(request));
  if (!limited.ok) {
    return json(
      { ok: false, error: "rate_limited" },
      429,
      { "Retry-After": String(limited.retryAfter) },
    );
  }

  const result = await subscribeFarmNotes(parsed.email, parsed.source);
  if (!result.ok) {
    return json({ ok: false, error: "unavailable" }, 503);
  }

  return json({ ok: true });
}
