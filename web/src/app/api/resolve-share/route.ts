import { jsonResponse, optionsResponse } from "@/lib/http";
import {
  inputFromRequest,
  inputFromSearchParams,
  requestHostFrom,
  resolveShare,
  resolveShareStatus,
} from "@/lib/resolve-share";

export function GET(request: Request) {
  const result = resolveShare(inputFromSearchParams(new URL(request.url)), {
    requestHost: requestHostFrom(request),
  });

  return jsonResponse(result, { status: resolveShareStatus(result) });
}

export async function POST(request: Request) {
  const result = resolveShare(await inputFromRequest(request), {
    requestHost: requestHostFrom(request),
  });

  return jsonResponse(result, {
    status: resolveShareStatus(result),
    headers: { "Cache-Control": "no-store" },
  });
}

export function OPTIONS() {
  return optionsResponse();
}
