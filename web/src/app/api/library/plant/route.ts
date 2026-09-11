import { jsonResponse, optionsResponse } from "@/lib/http";
import {
  inputFromRequest,
  requestHostFrom,
  resolveShare,
} from "@/lib/resolve-share";

/**
 * Persist is plot/library ownership (Clerk later, behind Start a plot).
 * Landing and resolve/preview stay anonymous — no login wall.
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
        "Persisting a library item needs a plot (Start a plot / Clerk later). Browse, Copy install prompt, and resolve/preview stay anonymous. Use GET or POST /api/resolve-share for preview-only.",
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
