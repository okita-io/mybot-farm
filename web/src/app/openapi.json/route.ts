import { discovery } from "mppx/nextjs";
import { getMppx, hasMppConfig, paidCharge } from "@/lib/mpp";

export function GET(request: Request) {
  if (!hasMppConfig()) {
    return Response.json({ error: "mpp_not_configured" }, { status: 503 });
  }

  const paid = paidCharge();
  return discovery(getMppx(), {
    info: { title: "mybot.farm MPP API", version: "1.0.0" },
    routes: [
      {
        handler: paid,
        method: "GET",
        path: "/api/packs/{slug}",
        summary:
          "Download a paid stall pack. Free stalls return the pack with no charge. Paid stalls return HTTP 402 with an MPP challenge for the listing price.",
      },
    ],
  })(request);
}
