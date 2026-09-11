import { jsonResponse, optionsResponse } from "@/lib/http";
import {
  inputFromRequest,
  requestHostFrom,
  resolveShare,
} from "@/lib/resolve-share";

/**
 * Auth + persistence are placeholders (Clerk/session later).
 * Unauthenticated clients should use GET|POST /api/resolve-share for preview-only.
 */
export async function POST(request: Request) {
  const input = await inputFromRequest(request);
  const preview =
    input.url || input.slug
      ? resolveShare(input, { requestHost: requestHostFrom(request) })
      : undefined;

  return jsonResponse(
    {
      ok: false,
      error: "auth_required",
      message:
        "Plant into library needs a signed-in buyer. Auth is a placeholder (Clerk/session later). Use GET or POST /api/resolve-share for preview-only.",
      ...(preview ? { preview } : {}),
    },
    {
      status: 401,
      headers: { "Cache-Control": "no-store" },
    },
  );
}

export function OPTIONS() {
  return optionsResponse();
}
