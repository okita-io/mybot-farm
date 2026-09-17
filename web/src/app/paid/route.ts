import { jsonResponse, optionsResponse } from "@/lib/http";

export function GET() {
  return jsonResponse({
    protocol: "mpp",
    billed: "paid_stall_download",
    free: [
      "GET /api",
      "GET /api/stalls",
      "GET /api/stalls/{slug}",
      "POST /api/listings",
      "GET /api/packs/{slug} when priceCents is 0",
    ],
    paid: {
      path: "GET /api/packs/{slug}",
      when: "listing priceCents > 0 and the caller has not purchased",
      amount: "the stall price",
      hint: "Agents retry with an MPP Payment credential. Humans use Checkout on the stall page.",
    },
  });
}

export function OPTIONS() {
  return optionsResponse();
}
