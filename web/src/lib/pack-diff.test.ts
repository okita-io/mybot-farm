import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { summarizePackChange } from "./pack-diff.ts";
import type { FarmPack } from "./pack-files.ts";

const base: FarmPack = {
  format: "mybot.farm/agent-pack",
  skills: [{ name: "small-diff" }],
  profile: { title: "Patch", description: "Writes code." },
};

describe("summarizePackChange", () => {
  it("describes a first publish", () => {
    assert.equal(
      summarizePackChange(null, base, { created: true }),
      "Published · 1 skill",
    );
  });

  it("names added skills and members", () => {
    const next: FarmPack = {
      ...base,
      skills: [{ name: "small-diff" }, { name: "booking-email" }],
      members: [{ role: "Probe" }],
    };
    assert.equal(
      summarizePackChange(base, next),
      "Added skill booking-email · Added member Probe",
    );
  });

  it("falls back when the pack changed without skill/member diffs", () => {
    const next: FarmPack = {
      ...base,
      profile: { title: "Patch", description: "Writes smaller diffs." },
    };
    assert.equal(summarizePackChange(base, next), "Updated description");
  });
});
