import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { usdAmountFromCents } from "./mpp-amount.ts";
import {
  buildTempoConnectPaymentIntent,
  parseTempoSettlementMetadata,
  tempoRawAmountToCents,
  tempoSettlementMetadata,
} from "./mpp-settlement.ts";

describe("usdAmountFromCents", () => {
  it("formats listing prices as USD for MPP charges", () => {
    assert.equal(usdAmountFromCents(50), "0.50");
    assert.equal(usdAmountFromCents(200), "2.00");
    assert.equal(usdAmountFromCents(1999), "19.99");
  });
});

describe("tempo settlement helpers", () => {
  it("converts 6-decimal raw units to Stripe cents", () => {
    assert.equal(tempoRawAmountToCents("2000000"), 200);
    assert.equal(tempoRawAmountToCents("500000"), 50);
  });

  it("round-trips connect metadata for the Tempo recorder", () => {
    const metadata = tempoSettlementMetadata({
      connectAccountId: "acct_seller",
      applicationFeeCents: 20,
      slug: "smoke-bot",
      listingId: "listing-1",
    });
    assert.deepEqual(parseTempoSettlementMetadata(metadata), {
      connectAccountId: "acct_seller",
      applicationFeeCents: 20,
    });
  });

  it("builds a crypto PaymentIntent with Connect destination and fee", () => {
    const built = buildTempoConnectPaymentIntent({
      rawAmount: "2000000",
      reference: "0xabc",
      metadata: { slug: "smoke-bot" },
      connectAccountId: "acct_seller",
      applicationFeeCents: 20,
    });

    assert.equal(built.amountCents, 200);
    assert.equal(built.idempotencyKey, "0xabc");
    assert.equal(built.createParams.amount, 200);
    assert.equal(built.createParams.application_fee_amount, 20);
    assert.deepEqual(built.createParams.transfer_data, {
      destination: "acct_seller",
    });
    assert.equal(built.createParams.payment_method_data.type, "crypto");
    assert.equal(
      built.createParams.payment_method_options.crypto.mode,
      "transaction_verification",
    );
    assert.equal(
      built.createParams.payment_method_options.crypto
        .transaction_verification_options.transaction_hash,
      "0xabc",
    );
  });
});
