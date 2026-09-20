import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isValidEmail,
  normalizeEmail,
  parseSubscribeBody,
} from "./newsletter-parse.ts";

describe("parseSubscribeBody", () => {
  it("accepts a valid email and known source", () => {
    const parsed = parseSubscribeBody({
      email: "  Human@Example.com ",
      source: "home",
      website: "",
    });
    assert.deepEqual(parsed, {
      ok: true,
      email: "human@example.com",
      source: "home",
    });
  });

  it("rejects a filled honeypot without calling through", () => {
    const parsed = parseSubscribeBody({
      email: "human@example.com",
      source: "footer",
      website: "https://spam.example",
    });
    assert.deepEqual(parsed, { ok: false, error: "honeypot" });
  });

  it("rejects invalid email", () => {
    const parsed = parseSubscribeBody({ email: "not-an-email", source: "footer" });
    assert.deepEqual(parsed, { ok: false, error: "invalid_email" });
  });

  it("falls back to footer for an unknown source", () => {
    const parsed = parseSubscribeBody({ email: "human@example.com", source: "hero" });
    assert.equal(parsed.ok, true);
    if (parsed.ok) {
      assert.equal(parsed.source, "footer");
    }
  });
});

describe("email helpers", () => {
  it("normalizes case and whitespace", () => {
    assert.equal(normalizeEmail("  Alex@MyBot.Farm "), "alex@mybot.farm");
  });

  it("allows unusual but valid-looking addresses", () => {
    assert.equal(isValidEmail("a+tag@sub.example.co.uk"), true);
  });
});
