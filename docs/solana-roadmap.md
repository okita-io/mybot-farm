# Solana payments & agent identity — implementation roadmap

Product intent lives in `~/.openclaw/workspace/PROJECTS/mybot-farm-solana.md`.
This doc is the **code plan**: what to change in this repo, in what order, how
to prove it, and how to isolate the work on GitHub.

**One-liner:** append Solana as a third Machine Payments Protocol (MPP) rail
next to Stripe cards and Tempo. Metaplex NFTs, Identity PDAs, and Nori are a
later license/identity layer on the same purchase — not a second checkout
protocol.

**Non-goals (all phases):** farm token, agent-token speculation, Virtuals-style
revenue staking, custom Solana programs in Phase 1.

---

## Current stack (do not fork)

Two buyers already exist:

| Buyer | Path | Unlock |
|---|---|---|
| Human | `POST /api/checkout` → Stripe hosted Checkout | `purchases` row, `status = paid` |
| Agent | `GET /api/packs/{slug}` → HTTP 402 via `mppx` | In-request fulfill; **no** `purchases` row |

Agent rail today (`web/src/lib/mpp-pack.ts`):

```ts
getMppx().compose(
  ["stripe/charge", { amount, description, connect: { … } }],
  ["tempo/charge", { amount, description }],
)
```

Solana is a documented MPP method (`solana.charge`) with native **splits**,
SOL/USDC, and optional HTML payment links. It belongs in that `compose()` list.

Reference:

- <https://mpp.dev/payment-methods/solana>
- <https://solana.com/docs/payments/agentic-payments/mpp>
- Package direction: `@solana/pay-kit` supersedes `@solana/mpp`. CP1a spike
  must confirm it registers as an `mppx` method so one 402 can list
  `stripe/charge`, `tempo/charge`, and `solana/charge`. If it cannot, use
  `@solana/mpp` for the compose path and revisit pay-kit later.

---

## Branch plan (GitHub)

Repo: `okita-io/mybot-farm` (`main`). Isolate **all** Solana code on one
long-lived integration branch. Land work as stacked PRs *into* that branch.
Do not merge to `main` until a checkpoint is e2e-green **and** Solana stays
off unless its env is set (Stripe + Tempo must keep working with Solana unset).

### Branch layout

```
main
  └── feat/solana-mpp          # integration branch; open draft PR → main
        ├── feat/solana-mpp-cp0-spike
        ├── feat/solana-mpp-cp1a-rail
        ├── feat/solana-mpp-cp1b-splits
        ├── feat/solana-mpp-cp1c-purchases
        ├── feat/solana-mpp-cp1e-plugin
        ├── feat/solana-mpp-cp1d-wallet-ui   # optional; skip if HTML links suffice
        ├── feat/solana-mpp-cp2-nft
        └── feat/solana-mpp-cp3-identity
```

### Create the integration branch

```bash
git checkout main
git pull origin main
git checkout -b feat/solana-mpp
git push -u origin feat/solana-mpp
```

Open a **draft** PR (`feat/solana-mpp` → `main`) titled
`feat: Solana MPP rail (integration)` with this doc linked. Keep it draft until
Phase 1 is production-ready. Update the PR body at each checkpoint.

Each checkpoint:

```bash
git checkout feat/solana-mpp
git pull origin feat/solana-mpp
git checkout -b feat/solana-mpp-cp1a-rail
# … implement, test …
git push -u origin HEAD
gh pr create --base feat/solana-mpp --title "feat: Solana MPP charge on pack download" --body "…"
```

After review **and** the checkpoint e2e list below is green:

```bash
gh pr merge --squash
git checkout feat/solana-mpp && git pull
git tag -a solana/cp1a-rail -m "e2e green: Solana method on 402, Stripe/Tempo unchanged"
git push origin solana/cp1a-rail
```

Do not skip tags. Tags are the rollback points if a later checkpoint breaks a
preview.

### Rules for the integration branch

- Conventional commits (`feat`, `fix`, `chore`, `test`, `docs`).
- Small PRs, one checkpoint each. No “Phase 1 in one PR.”
- Never force-push `feat/solana-mpp` after the first checkpoint is tagged.
- Rebase checkpoint branches onto `feat/solana-mpp`; do not rebase the
  integration branch itself once others are using it. Merge `main` into
  `feat/solana-mpp` with a merge commit if `main` moves.
- Solana stays **env-gated**. `hasMppConfig()` must still be true with only
  Stripe + Tempo. Missing Solana env = current behavior.
- Preview deploys (Vercel on the checkpoint PR) are the e2e target, not
  production `mybot.farm`, until the integration PR merges.

### Merge to `main`

Merge `feat/solana-mpp` → `main` when **CP1a + CP1b + CP1c** are tagged green.
CP1d/CP1e can follow in the same integration PR if ready, or as follow-ups on
`main`. Phase 2+ starts a **new** integration branch `feat/solana-identity`
off `main` after Phase 1 ships — do not keep an immortal Solana branch.

---

## Feature flags and env

Add to `web/.env.example` and `.env.example`. All optional until a checkpoint
needs them.

| Variable | Phase | Purpose |
|---|---|---|
| `SOLANA_MPP_ENABLED` | 1a | `"1"` to register `solana/charge` |
| `SOLANA_NETWORK` | 1a | `devnet` on the feature branch; `mainnet-beta` only after CP1c on prod |
| `SOLANA_RPC_URL` | 1a | Dedicated RPC. Never public demo RPC in production |
| `SOLANA_MERCHANT_ADDRESS` | 1a | Farm treasury / fee recipient |
| `SOLANA_USDC_MINT` | 1a | Devnet USDC mint in CP1; mainnet `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` |
| `SOLANA_USDC_DECIMALS` | 1a | `6` |
| `MPP_SOLANA_SECRET_KEY` | 1a | Challenge-binding secret (do not reuse Stripe key if avoidable) |
| `SOLANA_FEE_PAYER_SECRET` | 1a optional | Server-sponsored fees (pull mode). Keep out of git |
| `NEXT_PUBLIC_SOLANA_MPP_ENABLED` | 1d | Stall-page wallet button |

Vercel: set these on the **Preview** environment for `feat/solana-mpp*` only
until CP1c is tagged. Production stays unset.

---

## Phase 0 — narrative (done, no code)

Reddit positioning (`PROJECTS/reddit-presence.md`). No repo changes. No branch.

---

## CP0 — Identity PDA spike (throwaway, ~1 day)

**Branch:** `feat/solana-mpp-cp0-spike` → `feat/solana-mpp`

**Goal:** de-risk Phase 2 APIs before writing marketplace code. Does **not**
ship in the web app.

### Implementation

1. Add `scripts/solana-spike/` (Node script, gitignored secrets).
2. Mint a test agent Identity PDA on **devnet** with Metaplex Agent Kit.
3. Register it; query DAS on a public RPC and print the asset id.
4. Write `scripts/solana-spike/README.md` with the exact commands and a redacted
   receipt (addresses only).
5. Spike `@solana/pay-kit` vs `@solana/mpp` against a local Hono fixture that
   mimics `mpp/server.ts`. Record which one can sit in `Mppx.create({ methods })`
   beside Stripe.

### Tests / verify

```bash
# from scripts/solana-spike
npm start          # prints PDA + DAS id
curl -s "$DAS_URL" | jq '.id'
```

**E2E checkpoint (tag `solana/cp0-spike`):**

- [ ] Identity PDA exists on devnet
- [ ] DAS returns the agent
- [ ] Written note: pay-kit **does** / **does not** compose with current mppx
- [ ] No `web/` runtime dependency added yet

If Metaplex Agent Kit is still unstable, stop Phase 2 planning and still
proceed with Phase 1 payments.

---

## Phase 1 — SOL/USDC checkout on MPP

Price stays **USD cents** on `listings.price_cents`. Settlement asset is
**USDC on Solana** (not volatile SOL) unless a later checkpoint explicitly
adds SOL.

### CP1a — Agent rail (3–5 days)

**Branch:** `feat/solana-mpp-cp1a-rail` → `feat/solana-mpp`

Register `solana/charge` on the existing 402. Treasury-only recipient (no
seller split yet). Stripe + Tempo unchanged.

#### Code changes

| File | Change |
|---|---|
| `web/package.json` | Add `@solana/mpp` and/or `@solana/pay-kit`, `@solana/kit` (versions from CP0) |
| `web/.env.example`, `.env.example` | Solana vars above |
| `web/src/lib/mpp.ts` | `hasSolanaMppConfig()`, merge Solana method into `Mppx.create` when enabled; do **not** require Solana for `hasMppConfig()` |
| `web/src/lib/mpp-pack.ts` | If Solana enabled, add a third `compose()` method: `solana/charge` with amount from `usdAmountFromCents`, USDC mint, farm `SOLANA_MERCHANT_ADDRESS` |
| `web/mpp/server.ts` | Fixture `/paid` advertises Solana when enabled |
| `web/src/app/openapi.json/route.ts` | Discovery includes Solana method when enabled |
| `web/src/lib/http.ts` | Hint text: agents may pay with Stripe SPT, Tempo, or Solana USDC |

`compose()` shape (illustrative — match CP0’s actual method id):

```ts
getMppx().compose(
  ["stripe/charge", { amount, description, connect: { … } }],
  ["tempo/charge", { amount, description }],
  ["solana/charge", {
    amount,
    description,
    currency: process.env.SOLANA_USDC_MINT,
    decimals: 6,
    recipient: process.env.SOLANA_MERCHANT_ADDRESS,
    network: process.env.SOLANA_NETWORK,
  }],
)
```

Gate the third tuple on `hasSolanaMppConfig()` so Preview without env is
byte-identical to current 402.

Seller Connect check in `mpp-pack.ts` stays as-is for CP1a (treasury receive
is enough for the fixture). Do not yet allow Solana-only sellers.

#### Unit tests

Add next to `web/src/lib/mpp.test.ts`:

- `web/src/lib/mpp-solana.test.ts`
  - `hasSolanaMppConfig()` false when any required env missing
  - true when all set
  - `usdAmountFromCents` still `"2.00"` for 200 cents (USDC amount string)
- `web/src/lib/mpp-pack.test.ts` (mock `getMppx().compose`)
  - Solana disabled → compose called with 2 methods
  - Solana enabled → 3 methods, last is `solana/charge` with mint + merchant
  - Stripe connect_required still 403 when seller Connect is missing
    (CP1a does not relax that)

```bash
cd web && npm test
```

#### E2E checkpoint (tag `solana/cp1a-rail`)

Use the Vercel preview for the checkpoint PR. Pick a **paid** listing (or the
MPP fixture `POST /paid` on `npm run mpp`).

```bash
# unpaid — must 402 and list solana when enabled
curl -i "$PREVIEW/api/packs/$SLUG"

# Stripe/Tempo still present in WWW-Authenticate
# Solana method present iff SOLANA_MPP_ENABLED=1

# pay (devnet / sandbox — exact CLI from CP0)
npx mppx "$PREVIEW/api/packs/$SLUG"
# or: pay --sandbox curl "$PREVIEW/api/packs/$SLUG"

# free pack still 200 with no Payment header
curl -i "$PREVIEW/api/packs/frontend-developer"
```

- [ ] Unpaid paid-stall GET → `402` + `WWW-Authenticate: Payment`
- [ ] Challenge includes `stripe/charge`, `tempo/charge`, and `solana/charge`
- [ ] Solana-disabled preview (unset env) → challenge has **no** Solana method
- [ ] Successful Solana pay → `200` + pack JSON + `Payment-Receipt`
- [ ] Free stall unchanged (`200`, no charge)
- [ ] Replay of the same credential → `402` or problem+json, **not** a second pack
- [ ] `cd web && npm test` green
- [ ] `cd web && npm run lint` green

---

### CP1b — Marketplace split (3–5 days)

**Branch:** `feat/solana-mpp-cp1b-splits` → `feat/solana-mpp`

10% farm / 90% seller in **one** Solana transaction (`methodDetails.splits`,
same bps as `applicationFeeCents`).

#### Code changes

| File | Change |
|---|---|
| `web/src/lib/db/schema.ts` | `users.solanaWallet` (`text`, unique, nullable), `users.solanaPayoutsActive` (`boolean`, default false) |
| `web/drizzle/00xx_users_solana_wallet.sql` | Generated migration |
| `web/src/lib/users.ts` | `setSolanaWallet`, `sellerSolanaReady(user)` |
| `web/src/lib/seller-payouts.ts` **new** | `sellerCardReady` / `sellerSolanaReady` / `sellerPaidReady` — one helper used by listings + mpp-pack + checkout |
| `web/src/app/api/listings/route.ts` | Paid listing allowed if `sellerPaidReady` (Connect **or** Solana wallet) |
| `web/src/app/api/listings/[id]/route.ts` | Same |
| `web/src/lib/mpp-pack.ts` | If seller Solana-ready, pass splits: merchant = fee, seller = rest. If only Connect-ready, omit `solana/charge`. If only Solana-ready, omit Stripe Connect transfer (card 402 may still exist for farm-treasury, or omit `stripe/charge` — prefer omit card when seller has no Connect) |
| `web/src/app/sell/page.tsx` | Wallet field: paste address, require confirm signature later if needed; for CP1b a stored address + `solanaPayoutsActive=true` after checksum is enough |
| `web/src/app/api/sell/solana-wallet/route.ts` **new** | Authenticated POST `{ address }` ; validate base58 32-byte pubkey; upsert |
| `packages/openclaw-mybot-farm/index.ts` | `farm_post` copy: paid listings need Stripe Connect **or** a Solana wallet |

Reuse `platformFeeBps()` / `applicationFeeCents()`. Convert fee cents → USDC
atomic units in one helper `usdcAtomsFromCents(cents)` so splits cannot drift
from Stripe’s 10%.

#### Unit tests

- `web/src/lib/seller-payouts.test.ts` — matrix: neither / Connect only /
  Solana only / both
- `web/src/lib/fees.test.ts` — `usdcAtomsFromCents(200)` with 1000 bps →
  seller 180, farm 20 (6 decimals: `180000` / `20000` if $2.00)
- Listings route tests if they exist; otherwise add a pure helper test for the
  403 `connect_required` vs new `payouts_required` error when neither rail is
  ready. Prefer renaming the error to `payouts_required` with
  `rails: { stripe: boolean, solana: boolean }` — update plugin copy in the
  same PR.

#### E2E checkpoint (tag `solana/cp1b-splits`)

- [ ] Seller without Connect and without wallet still cannot POST paid listing
- [ ] Seller with Solana wallet only can POST paid listing
- [ ] 402 for that stall includes `solana/charge` with **two** recipients
- [ ] On-chain tx (devnet): farm wallet gets 10%, seller 90%, ±1 atomic unit
- [ ] Seller with Connect only: 402 still has Stripe + Tempo; Solana omitted
  unless they also saved a wallet
- [ ] Stripe Checkout for Connect-ready sellers still works on preview

---

### CP1c — Rail-agnostic purchases (2–3 days)

**Branch:** `feat/solana-mpp-cp1c-purchases` → `feat/solana-mpp`

Stripe Checkout keeps writing purchases. Solana MPP pays **and** records a
license so catalog unlock matches humans.

#### Schema

`purchases` today: `stripe_checkout_session_id text NOT NULL` unique.

Migration:

1. Add `rail text NOT NULL DEFAULT 'stripe'`
2. Add `external_id text` (nullable during backfill)
3. Backfill `external_id = stripe_checkout_session_id`
4. Set `external_id NOT NULL`
5. Unique `(rail, external_id)` replacing uniqueness on session id alone
6. Make `stripe_checkout_session_id` nullable
7. Add `solana_signature text`, `buyer_wallet text`, `seller_wallet text`
8. Keep `buyer_user_id` required for Clerk humans; for agent-only pays, either
   attach the Clerk user when a session exists **or** allow a sentinel and
   unlock via wallet — **CP1c decision (do this in the PR, not later):**

   **Recommended:** agent Solana pay is still pay-per-GET (no durable license)
   unless `Authorization` also carries a Clerk session / farm user id. Human
   Solana HTML/wallet pay (CP1d) writes `purchases` like Stripe. That keeps
   CP1c small: only persist when `buyerUserId` is known.

   Alternative (bigger): wallet-bound licenses without Clerk. Defer to CP1e
   unless a real agent buyer needs it.

| File | Change |
|---|---|
| `web/src/lib/db/schema.ts` | Columns above |
| `web/src/lib/purchases.ts` | `upsertPurchase` keyed by `(rail, externalId)`; keep Stripe helper wrapping `rail: "stripe"` |
| `web/src/lib/checkout.ts` | Pass `rail: "stripe"` |
| `web/src/lib/mpp-pack.ts` | After Solana receipt, if Clerk user present, `upsertPurchase({ rail: "solana", externalId: signature, … status: "paid" })` |
| `web/src/lib/catalog.ts` | `hasPaidPurchase` unchanged (already by buyer+listing) |

Reuse `processed_events` for Solana signature replay if mppx’s in-memory
replay is not durable across serverless instances. **Required for production.**
Add `source = 'solana_mpp'` and the tx signature as `id`.

#### Unit tests

- `web/src/lib/purchases.test.ts` — upsert Stripe and Solana rows without
  colliding; `hasPaidPurchase` true after Solana upsert
- Replay: inserting the same `solana_signature` twice does not double-fulfill
  (unique + `processed_events`)

#### E2E checkpoint (tag `solana/cp1c-purchases`)

- [ ] Signed-in human pays Solana on preview → `purchases.status = paid`,
  `rail = solana`, signature stored
- [ ] Same user, no Payment header, `GET /api/packs/{slug}` → `200` (license)
- [ ] Different user, no payment → `402`
- [ ] Stripe Checkout still inserts `rail = stripe` and unlocks
- [ ] Replay of the Solana signature does not create a second purchase
- [ ] Neon migration applied on the preview branch (or a dedicated preview DB)

**This is the first checkpoint allowed to merge toward `main`.** After CP1a–c
are tagged, un-draft the integration PR and merge if production env for Solana
is still **unset** (code is dark). Or set Preview-only env and enable
production in a follow-up once treasury + RPC are real.

---

### CP1e — Plugins speak 402 (2–4 days)

**Branch:** `feat/solana-mpp-cp1e-plugin` → `feat/solana-mpp`  
(Named 1e so 1d wallet UI can stay optional.)

`packages/openclaw-mybot-farm/src/farm-api.mjs` `getPack()` throws on any
non-2xx. Paid stalls are unplantable from the plugin today.

#### Code changes

| File | Change |
|---|---|
| `packages/openclaw-mybot-farm/src/farm-api.mjs` | On `402`, throw `FarmError` with `status: 402` and parsed challenge summary (amount, methods) |
| `packages/openclaw-mybot-farm/index.ts` | `farm_get_pack` / `farm_plant` messages: “paid stall; retry with MPP Payment or buy on the stall page” |
| `packages/openclaw-mybot-farm` | Optional: if `mppx`/`@solana/pay-kit` client is configured (`MYBOT_FARM_MPP=1`), retry once with Payment credential |
| `packages/hermes-mybot-farm` | Same 402 handling |

Do not silently pay. The plugin should either (a) explain 402, or (b) pay only
when an explicit wallet/env is configured.

#### Tests

- `packages/openclaw-mybot-farm/tests/get-pack.test.mjs` — mock 402 → FarmError 402
- Existing `post.test.mjs` still green

#### E2E checkpoint (tag `solana/cp1e-plugin`)

- [ ] `farm_plant` on a paid slug without payment → clear 402, no crash
- [ ] With sandbox payer configured → pack lands in `~/.openclaw/farm/<slug>`
- [ ] Free slug plant still works

---

### CP1d — Human wallet UI (optional, 5–8 days)

**Branch:** `feat/solana-mpp-cp1d-wallet-ui` → `feat/solana-mpp`

Skip if CP1a `html: true` on `solana.charge` is good enough for browsers
(MPP payment page with “Continue with Solana”).

Only build stall-page wallet UX if that page bounces humans.

| File | Change |
|---|---|
| `web/src/components/buy-button.tsx` | Secondary “Pay with USDC on Solana” when `NEXT_PUBLIC_SOLANA_MPP_ENABLED` |
| `web/src/app/api/checkout/solana/route.ts` | Creates an MPP challenge or Solana Pay URL bound to listing + buyer |
| Stall page | On return, fulfill like Stripe `?checkout=success` using signature query |

#### E2E checkpoint (tag `solana/cp1d-wallet-ui`)

- [ ] Signed-in buyer on stall page can complete Phantom/Solflare pay on
  **desktop and mobile**
- [ ] Cancel path does not mark `paid`
- [ ] Stripe button still the default when Connect-ready
- [ ] Solana-only seller: Stripe button hidden, Solana button shown

---

## Phase 2 — Metaplex license (~3–6 weeks)

**New integration branch after Phase 1 is on `main`:** `feat/solana-identity`
(or continue `feat/solana-mpp` only if Phase 1 has not merged yet).

**Goal:** NFT = license to plant. Creator royalties on secondary sales.
`farm_plant --verify`.

### CP2a — Mint on paid purchase

- On `purchases` → `paid` (Stripe **or** Solana), mint a Metaplex edition
  (1 per buyer unless listing allows more).
- Metadata: pack slug, `packVersion`, soul/memory hashes, creator wallet,
  plant URL.
- Store `solana_mint` on `purchases`.
- Royalty 5–10% to creator wallet (listing field `royaltyBps`, default 500).

### CP2b — `farm_plant --verify`

- Plugin flag `--verify <mint>` or `{ "nft": "…" }`.
- RPC: holder of mint must match configured wallet (or DAS owner).
- Server: optional `GET /api/packs/{slug}` still MPP/purchase gated; verify is
  an extra client check so a leaked pack JSON is not the license.

### Tests

- Unit: metadata JSON shape, royalty bps clamp, skip mint when
  `METAPLEX_ENABLED` unset
- E2E: buy on devnet → mint exists → DAS shows it → `farm_plant --verify`
  succeeds for holder, fails for a second wallet

### E2E checkpoint (tag `solana/cp2-nft`)

- [ ] Paid Stripe purchase still mints (license is rail-agnostic)
- [ ] Secondary transfer: new holder can verify; old holder cannot
- [ ] Pack update (`packVersion` bump) does not steal the NFT; owner re-plants
- [ ] `METAPLEX_ENABLED` unset → Phase 1 behavior, no mint errors on buy

---

## Phase 3 — Identity + Nori (~2–3 months)

**Branch:** `feat/solana-identity-cp3` off `main` (after CP2).

- Post-purchase onboarding: “Mint an Agent” → Identity PDA → Metaplex registry
- Nori metering (agent pays for inference in SOL) — likely MPP **session**
  intent, not a new protocol
- Later: agent commerce / ACP. Still no farm token

### E2E checkpoint (tag `solana/cp3-identity`)

- [ ] Fresh plant → agent has Identity PDA indexed by DAS
- [ ] Agent’s first on-chain tx is a Nori (or fixture) inference payment
- [ ] Killing the LLM provider does not destroy PDA / wallet / skills
- [ ] No token-launch UI anywhere in the product

CP0’s spike is the go/no-go for this phase.

---

## Regression matrix (every checkpoint PR)

Run before merge into `feat/solana-mpp`:

```bash
cd /Users/alexokita/git_repos/mybot-farm/web
pwd
npm test
npm run lint
```

| Check | How |
|---|---|
| Free pack download | `curl -i $PREVIEW/api/packs/frontend-developer` → 200 |
| Paid pack, no pay | → 402, Stripe + Tempo still in challenge |
| Stripe Checkout | Buy on stall page with test card; unlock works |
| Seller Connect | `/sell` onboard still works |
| `farm_post` free listing | Plugin dry-run + post |
| Catalog search | `/api/stalls?q=frontend` 200 |

A checkpoint that breaks Stripe Checkout does **not** get tagged, even if
Solana e2e is green.

---

## Suggested GitHub PR template (checkpoint)

```markdown
## Summary
- Checkpoint: CP1a / CP1b / …
- What is env-gated?

## Test plan
- [ ] `cd web && npm test`
- [ ] Preview 402 lists expected methods
- [ ] Stripe Checkout still unlocks
- [ ] Checkpoint e2e list in docs/solana-roadmap.md (copy the boxes)

## Rollback
Tag to revert to: `solana/cp…`
```

---

## Effort recap

| Checkpoint | Days | Merge to `main`? |
|---|---|---|
| CP0 spike | 1 | Script-only, optional |
| CP1a rail | 3–5 | Only as dark code |
| CP1b splits | 3–5 | With 1a |
| CP1c purchases | 2–3 | **Yes, with 1a+1b** |
| CP1e plugin | 2–4 | Follow-up OK |
| CP1d wallet UI | 5–8 | Skip unless needed |
| CP2 NFT | 15–25 | After Phase 1 on main |
| CP3 identity | 25–40+ | After CP2 |

Phase 1 (CP1a–c) is the whole payment bet. Stop there until a paid Solana
download happens in the wild.
