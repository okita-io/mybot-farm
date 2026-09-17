import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  existingHermesArchiveHref,
  hermesArchivePublicHref,
  listingMemberHref,
  withHermesRuntime,
} from "./hermes-archive.ts";

describe("hermes archive", () => {
  it("builds the public href from kind and slug", () => {
    assert.equal(
      hermesArchivePublicHref("agent", "gift-day"),
      "/packs/agents/gift-day.hermes.tar.gz",
    );
    assert.equal(
      hermesArchivePublicHref("team", "workbench"),
      "/packs/teams/workbench.hermes.tar.gz",
    );
  });

  it("finds scholastic-research on disk", () => {
    assert.equal(
      existingHermesArchiveHref("agent", "scholastic-research"),
      "/packs/agents/scholastic-research.hermes.tar.gz",
    );
  });

  it("returns undefined when no tarball exists", () => {
    assert.equal(
      existingHermesArchiveHref("agent", "definitely-not-a-stall"),
      undefined,
    );
  });

  it("adds hermes to runtime only when the archive exists", () => {
    const withArchive = withHermesRuntime(
      { runtime: ["grok-bot"] },
      "agent",
      "scholastic-research",
    );
    assert.deepEqual(withArchive.runtime, ["grok-bot", "hermes"]);

    const without = withHermesRuntime(
      { runtime: ["grok-bot"] },
      "agent",
      "definitely-not-a-stall",
    );
    assert.deepEqual(without.runtime, ["grok-bot"]);
  });

  it("prefers a Hermes tarball for catalog agent member refs", () => {
    assert.equal(
      listingMemberHref("agents/patch.json"),
      "/packs/agents/patch.hermes.tar.gz",
    );
    assert.equal(
      listingMemberHref("scholastic-research"),
      "/packs/agents/scholastic-research.hermes.tar.gz",
    );
  });

  it("keeps workbench member tarball paths", () => {
    assert.equal(
      listingMemberHref("teams/workbench/workbench-spec.hermes.tar.gz"),
      "/packs/teams/workbench/workbench-spec.hermes.tar.gz",
    );
  });

  it("falls back to GAF JSON when no tarball exists", () => {
    assert.equal(
      listingMemberHref("agents/definitely-not-a-stall.json"),
      "/packs/agents/definitely-not-a-stall.json",
    );
  });
});
