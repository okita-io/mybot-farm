import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  SPONSOR_SLOT_COUNT,
  fillSponsorSlots,
  mobileSponsorCreatives,
  openSlotCount,
  openSponsorCreative,
  sponsorRails,
  type SponsorCreative,
} from "./sponsors.ts";

const paid: SponsorCreative = {
  id: "paid-acme",
  name: "Acme",
  blurb: "Build agents.",
  href: "https://example.com",
  hrefLabel: "example.com",
  icon: "A",
  tone: "share",
  kind: "sponsor",
  external: true,
};

describe("fillSponsorSlots", () => {
  it("always returns five slots per side", () => {
    const slots = fillSponsorSlots("left", []);
    assert.equal(slots.length, SPONSOR_SLOT_COUNT);
    assert.deepEqual(
      slots.map((slot) => slot.id),
      ["left-1", "left-2", "left-3", "left-4", "left-5"],
    );
  });

  it("keeps occupied creatives and fills the rest with open spots", () => {
    const slots = fillSponsorSlots("right", [[paid]]);
    assert.equal(slots[0]?.creatives[0]?.id, "paid-acme");
    assert.equal(slots[1]?.creatives[0]?.kind, "open");
    assert.equal(slots[4]?.creatives[0]?.href, "/sponsor#right");
  });
});

describe("openSponsorCreative", () => {
  it("points at the matching rail on the sponsor page", () => {
    const creative = openSponsorCreative("left", 0);
    assert.equal(creative.kind, "open");
    assert.equal(creative.href, "/sponsor#left");
    assert.equal(creative.icon, "+");
  });
});

describe("sponsorRails", () => {
  it("mixes house banners with open inventory", () => {
    const { left, right } = sponsorRails();
    assert.equal(left.length, 5);
    assert.equal(right.length, 5);
    assert.equal(left[0]?.creatives[0]?.id, "sponsor-applied-ai");
    assert.equal(left[0]?.creatives[0]?.href, "https://appliedai.solutions/");
    assert.equal(left[1]?.creatives[0]?.kind, "house");
    assert.equal(right[0]?.creatives[0]?.id, "sponsor-aicookd");
    assert.equal(right[0]?.creatives[0]?.href, "https://aicookd.com/");
    assert.equal(right[1]?.creatives[0]?.kind, "house");
    assert.equal(openSlotCount(), 2);
  });
});

describe("mobileSponsorCreatives", () => {
  it("dedupes creatives and keeps a single open spot", () => {
    const creatives = mobileSponsorCreatives();
    const ids = creatives.map((creative) => creative.id);
    assert.equal(ids.length, new Set(ids).size);
    assert.equal(
      creatives.filter((creative) => creative.kind === "open").length,
      1,
    );
    assert.ok(creatives.some((creative) => creative.kind === "house"));
    assert.ok(
      creatives.some((creative) => creative.id === "sponsor-applied-ai"),
    );
    assert.ok(creatives.some((creative) => creative.id === "sponsor-aicookd"));
    assert.equal(creatives[0]?.id, "sponsor-applied-ai");
    assert.equal(creatives[1]?.id, "sponsor-aicookd");
  });
});
