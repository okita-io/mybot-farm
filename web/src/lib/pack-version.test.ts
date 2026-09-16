import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyPackVersion,
  packVersionOf,
  parsePackVersion,
  resolveCreatePackVersion,
  resolveUpdatePackVersion,
} from "./pack-version.ts";

describe("packVersion", () => {
  it("parses positive integers and rejects GAF format strings", () => {
    assert.equal(parsePackVersion(3), 3);
    assert.equal(parsePackVersion("12"), 12);
    assert.equal(parsePackVersion("0.2"), null);
    assert.equal(parsePackVersion(0), null);
    assert.equal(parsePackVersion(-1), null);
  });

  it("defaults missing packVersion to 1 without reading GAF version", () => {
    assert.equal(packVersionOf({ version: "0.2" }), 1);
    assert.equal(packVersionOf({ packVersion: 4, version: "0.2" }), 4);
  });

  it("creates at 1 unless an explicit revision is sent", () => {
    assert.equal(resolveCreatePackVersion(null, {}), 1);
    assert.equal(resolveCreatePackVersion(3, { packVersion: 1 }), 3);
    assert.equal(resolveCreatePackVersion(null, { packVersion: 2 }), 2);
  });

  it("auto-increments on update when the round-tripped pack still has the live version", () => {
    const next = resolveUpdatePackVersion(1, null, { packVersion: 1 });
    assert.deepEqual(next, { ok: true, version: 2 });
  });

  it("accepts a newer explicit packVersion and rejects a stale one", () => {
    assert.deepEqual(resolveUpdatePackVersion(2, 5, { packVersion: 2 }), {
      ok: true,
      version: 5,
    });
    const stale = resolveUpdatePackVersion(2, 2, { packVersion: 2 });
    assert.equal(stale.ok, false);
    if (!stale.ok) {
      assert.equal(stale.error, "stale_version");
    }
  });

  it("writes packVersion without changing GAF format version", () => {
    const pack = applyPackVersion({ version: "0.2", slug: "old" }, "smoke-bot", 3);
    assert.equal(pack.version, "0.2");
    assert.equal(pack.packVersion, 3);
    assert.equal(pack.slug, "smoke-bot");
  });
});
