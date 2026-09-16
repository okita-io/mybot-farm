import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  API_KEY_PREFIX,
  generateApiKeyMaterial,
  hashApiKey,
  hashesMatch,
  isFarmApiKey,
  readApiKeyFromRequest,
} from "./api-key-crypto.ts";

describe("api key crypto", () => {
  it("generates an mbf_ key, display prefix, and sha256 hash", () => {
    const material = generateApiKeyMaterial();

    assert.equal(material.key.startsWith(API_KEY_PREFIX), true);
    assert.equal(isFarmApiKey(material.key), true);
    assert.equal(material.prefix.startsWith(API_KEY_PREFIX), true);
    assert.equal(material.prefix.length, API_KEY_PREFIX.length + 8);
    assert.equal(material.key.startsWith(material.prefix), true);
    assert.equal(material.keyHash, hashApiKey(material.key));
    assert.equal(material.keyHash.length, 64);
    assert.notEqual(material.key, material.keyHash);
  });

  it("compares hashes in constant time", () => {
    const hash = hashApiKey("mbf_example-secret-value-not-real");
    assert.equal(hashesMatch(hash, hash), true);
    assert.equal(hashesMatch(hash, "0".repeat(64)), false);
    assert.equal(hashesMatch("abc", "abcd"), false);
  });

  it("rejects short or non-farm secrets", () => {
    assert.equal(isFarmApiKey("sk_live_not_ours"), false);
    assert.equal(isFarmApiKey("mbf_short"), false);
    assert.equal(isFarmApiKey(""), false);
  });
});

describe("readApiKeyFromRequest", () => {
  it("reads Authorization Bearer mbf_ keys", () => {
    const material = generateApiKeyMaterial();
    const request = new Request("https://mybot.farm/api/listings", {
      headers: { Authorization: `Bearer ${material.key}` },
    });

    assert.equal(readApiKeyFromRequest(request), material.key);
  });

  it("reads X-Api-Key when Authorization is not a farm key", () => {
    const material = generateApiKeyMaterial();
    const request = new Request("https://mybot.farm/api/listings", {
      headers: {
        Authorization: "Bearer eyJhbGciOiJIUzI1NiJ9.clerk.jwt",
        "X-Api-Key": material.key,
      },
    });

    assert.equal(readApiKeyFromRequest(request), material.key);
  });

  it("ignores Clerk-looking Bearer tokens without a farm key", () => {
    const request = new Request("https://mybot.farm/api/listings", {
      headers: { Authorization: "Bearer eyJhbGciOiJIUzI1NiJ9.clerk.jwt" },
    });

    assert.equal(readApiKeyFromRequest(request), null);
  });

  it("prefers a farm Bearer over X-Api-Key", () => {
    const bearer = generateApiKeyMaterial();
    const header = generateApiKeyMaterial();
    const request = new Request("https://mybot.farm/api/listings", {
      headers: {
        Authorization: `Bearer ${bearer.key}`,
        "X-Api-Key": header.key,
      },
    });

    assert.equal(readApiKeyFromRequest(request), bearer.key);
  });
});
