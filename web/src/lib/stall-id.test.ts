import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { catalogStallId, uuidv5 } from "./stall-id.ts";

describe("catalogStallId", () => {
  it("matches Python uuid.uuid5 for the DNS namespace", () => {
    assert.equal(
      uuidv5("www.example.com", "6ba7b810-9dad-11d1-80b4-00c04fd430c8"),
      "2ed6657d-e927-568b-95e1-2665a8aea6a2",
    );
  });

  it("is stable per kind+slug and differs across kinds", () => {
    const agent = catalogStallId("agent", "operations-manager");
    const again = catalogStallId("agent", "operations-manager");
    const team = catalogStallId("team", "operations-manager");
    assert.equal(agent, again);
    assert.match(agent, /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    assert.notEqual(agent, team);
    assert.equal(
      catalogStallId("agent", "gift-day"),
      "11732350-45c3-51ca-a73b-e9e8a1fc57b5",
    );
  });
});
