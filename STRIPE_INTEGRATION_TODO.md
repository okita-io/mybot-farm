# Stripe integration TODO

Checkout Studio settings were applied to the existing hosted Checkout Session in [`web/src/lib/checkout.ts`](web/src/lib/checkout.ts). Stripe SDK `22.6.2` is installed, so `ui_mode` is `hosted_page`.

## Stripe wizard sample (do not paste)

Stripe’s next-step snippet uses placeholders. Do **not** copy it into the app. Do **not** put `{{TEST_SECRET_KEY}}` in code.

| Stripe placeholder | Already wired in this repo |
|--------------------|----------------------------|
| `{{TEST_SECRET_KEY}}` | `STRIPE_SECRET_KEY` via [`web/src/lib/stripe.ts`](web/src/lib/stripe.ts) |
| `{{SUCCESS_URL}}` | Stall page `?checkout=success&session_id={CHECKOUT_SESSION_ID}` |
| `{{CANCEL_URL}}` | Stall page `?checkout=cancel` |
| `{{PRICE_ID}}` | Listing `price_data` (each stall has its own amount; not a Dashboard Price ID) |
| `res.redirect(303, session.url)` | [`web/src/components/buy-button.tsx`](web/src/components/buy-button.tsx) sends the buyer to `session.url` after `POST /api/checkout` |

The hosted session fields from that snippet (`mode`, `ui_mode`, `billing_address_collection`, `allow_promotion_codes`, `submit_type`, `integration_identifier`, `origin_context`) are already on the create call in [`web/src/lib/checkout.ts`](web/src/lib/checkout.ts).

## Values to Replace

No Checkout Studio `sample_only` placeholders were added. The existing session already uses real values:

| Field | Current Value | Notes |
|-------|--------------|-------|
| mode | `payment` | One-time stall purchases. `payment_method_collection` is omitted because it only applies to `subscription` mode. |
| success_url | Stall page `?checkout=success&session_id={CHECKOUT_SESSION_ID}` | Built from the listing path. |
| cancel_url | Stall page `?checkout=cancel` | Built from the listing path. |
| line_items | Dynamic `price_data` from the listing | Amount and name come from the stall, not a Dashboard Price ID. |

Marketplace fields that Checkout Studio does not configure were **kept** so Connect payouts and purchase unlocks still work: `customer`, `payment_intent_data` (application fee + destination), and `metadata`.

## Configured Parameters

These parameters were configured in Checkout Studio and are set on the existing session create call.

**Files containing these parameters:**
- [web/src/lib/checkout.ts](web/src/lib/checkout.ts)

| Parameter | Value |
|-----------|-------|
| ui_mode | hosted_page |
| billing_address_collection | auto |
| phone_number_collection.enabled | false |
| automatic_tax.enabled | false |
| allow_promotion_codes | false |
| submit_type | auto |
| integration_identifier | hosted_web_0001 |
| origin_context | web |

## Setup and next steps

### Environment variables

The app reads Stripe keys from the environment (typically `web/.env.local` for local Next.js, and Vercel project env for production):

| Variable | Used by |
|----------|---------|
| `STRIPE_SECRET_KEY` | Server Checkout + Connect |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Browser (if needed) |
| `STRIPE_WEBHOOK_SECRET` | [`web/src/app/api/webhooks/stripe/route.ts`](web/src/app/api/webhooks/stripe/route.ts) |
| `NEXT_PUBLIC_APP_URL` | Canonical origin / success URLs in production |

Do not commit live keys. Root `.env` is gitignored; Next.js loads `web/.env.local`.

### Project structure

No new Checkout routes were added. Existing pieces:

- Session create: [`web/src/lib/checkout.ts`](web/src/lib/checkout.ts)
- HTTP entry: [`web/src/app/api/checkout/route.ts`](web/src/app/api/checkout/route.ts)
- Webhooks: [`web/src/app/api/webhooks/stripe/route.ts`](web/src/app/api/webhooks/stripe/route.ts)

### How it works

1. A signed-in buyer clicks buy on a paid stall.
2. `POST /api/checkout` creates a hosted Checkout Session (`ui_mode: hosted_page`) and returns `url`.
3. The buyer pays on Stripe-hosted Checkout.
4. They return to the stall page; the webhook (and return-page fulfillment) marks the purchase paid and unlocks the pack.
5. The farm keeps 10% via `application_fee_amount`; the rest transfers to the seller’s Connect account.

### Testing

Use Stripe test mode keys and [test cards](https://docs.stripe.com/testing#cards), for example `4242 4242 4242 4242`. Live keys charge real money.

Forward webhooks locally with the Stripe CLI to `/api/webhooks/stripe`.

### Next steps

- Confirm `ADMIN_EMAILS` and Stripe env vars are set in Vercel for production.
- Confirm the live webhook endpoint and `STRIPE_WEBHOOK_SECRET` match the live mode Dashboard.
- Sellers still need Stripe Connect onboarding before a paid stall can check out.

### Resources

- https://support.stripe.com
- https://docs.stripe.com/mcp
- https://docs.stripe.com/payments/checkout
