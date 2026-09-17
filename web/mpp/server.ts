import { serve } from "@hono/node-server";
import { config } from "dotenv";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { discovery } from "mppx/hono";
import { getMppx, hasMppConfig, MPP_MIN_USD, paidCharge } from "@/lib/mpp";

config({ path: ".env.local" });
config();

if (!hasMppConfig()) {
  console.error(
    "MPP requires STRIPE_MPP_SECRET_KEY or STRIPE_SECRET_KEY, STRIPE_PROFILE_ID, and TEMPO_DEPOSIT_ADDRESS",
  );
  process.exit(1);
}

const app = new Hono();
const mppx = getMppx();
const paid = paidCharge();
const port = Number(process.env.PORT || 4242);

app.use(
  "*",
  cors({
    origin: "*",
    allowHeaders: [
      "Authorization",
      "Payment-Authorization",
      "Content-Type",
      "Accept",
    ],
    exposeHeaders: ["WWW-Authenticate", "Payment-Receipt"],
    allowMethods: ["GET", "POST", "OPTIONS"],
  }),
);

app.get("/llms.txt", (c) =>
  c.text(`# mybot.farm machine payments

MPP charges agents only when they download a paid stall. Catalog search, stall metadata, seller uploads, and free pack downloads stay free.

Today every live stall is free. POST /paid is a protocol fixture for a future paid stall at the $0.50 card minimum.

- Fixture paid download: POST http://localhost:${port}/paid
- Discovery: GET http://localhost:${port}/openapi.json
- Production catalog: https://mybot.farm/api
- Production paid download: GET https://mybot.farm/api/packs/{slug}

Card payments use Stripe Shared Payment Tokens. Stablecoin payments settle on Tempo.
`),
);

app.get("/", (c) =>
  c.json({
    name: "mybot.farm",
    protocol: "mpp",
    billed: "paid_stall_download",
    free: ["catalog search", "stall metadata", "uploads", "free pack downloads"],
    fixture: {
      path: "/paid",
      amount: { amount: MPP_MIN_USD, currency: "usd" },
      note: "Simulates purchasing a paid stall. Live stalls are free until a seller sets a price.",
    },
    production: "GET /api/packs/{slug}",
    openapi: "/openapi.json",
  }),
);

app.post("/paid", async (c) => {
  const request = c.req.raw;
  const response = await paid(request);

  if (response.status === 402) {
    return response.challenge;
  }

  return response.withReceipt(
    Response.json({
      service: "mybot.farm",
      billed: {
        amount: MPP_MIN_USD,
        currency: "usd",
        per: "paid_stall_download",
      },
      data: {
        name: "mybot.farm",
        message: "Paid stall download",
        catalog: "https://mybot.farm/api",
      },
    }),
  );
});

discovery(app, mppx, {
  info: { title: "mybot.farm MPP API", version: "1.0.0" },
  routes: [
    {
      handler: paid,
      method: "POST",
      path: "/paid",
      requestBody: {
        content: { "application/json": { schema: { type: "object" } } },
        description: "Optional JSON request data.",
        required: false,
      },
      summary: "Fixture paid stall download (0.50 USD)",
    },
  ],
});

if (process.env.MPP_SKIP_LISTEN !== "1") {
  serve({
    fetch: app.fetch,
    port,
  });

  console.log(`MPP API listening at http://localhost:${port}`);
}

export { app };
