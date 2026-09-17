import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { usdAmountFromCents } from "./mpp.ts";

describe("usdAmountFromCents", () => {
  it("formats listing prices as USD for MPP charges", () => {
    assert.equal(usdAmountFromCents(50), "0.50");
    assert.equal(usdAmountFromCents(200), "2.00");
    assert.equal(usdAmountFromCents(1999), "19.99");
  });
});
