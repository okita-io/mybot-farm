import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { packUpdatedAtOf, packVersionOf } from "./pack-version.ts";
import {
  formatShortUpdatedDate,
  recentStallUpdate,
  STALL_UPDATED_WINDOW_DAYS,
} from "./stall-updated.ts";

const NOW = Date.parse("2026-11-30T12:00:00.000Z");

describe("packUpdatedAtOf", () => {
  it("normalizes valid dates and rejects junk", () => {
    assert.equal(packUpdatedAtOf({ updatedAt: "2026-11-24" }), "2026-11-24T00:00:00.000Z");
    assert.equal(
      packUpdatedAtOf({ updatedAt: "2026-11-24T00:00:00.000Z" }),
      "2026-11-24T00:00:00.000Z",
    );
    assert.equal(packUpdatedAtOf({ updatedAt: "yesterday" }), null);
    assert.equal(packUpdatedAtOf({ updatedAt: 5 }), null);
    assert.equal(packUpdatedAtOf({}), null);
    assert.equal(packUpdatedAtOf(undefined), null);
  });
});

describe("recentStallUpdate", () => {
  it("shows date and version for a revised pack updated inside the window", () => {
    const update = recentStallUpdate(
      { packVersion: 3, updatedAt: "2026-11-24T00:00:00.000Z" },
      NOW,
    );
    assert.deepEqual(update, {
      iso: "2026-11-24T00:00:00.000Z",
      dateLabel: "Nov 24",
      version: 3,
    });
  });

  it("hides the chip for never-revised packs (v1), even if recently listed", () => {
    assert.equal(recentStallUpdate({ packVersion: 1, updatedAt: "2026-11-24T00:00:00.000Z" }, NOW), null);
    assert.equal(recentStallUpdate({ updatedAt: "2026-11-24T00:00:00.000Z" }, NOW), null);
  });

  it("hides the chip outside the 30 day window and for missing/invalid dates", () => {
    assert.equal(STALL_UPDATED_WINDOW_DAYS, 30);
    const day = 24 * 60 * 60 * 1000;
    const iso = (offsetDays: number) => new Date(NOW - offsetDays * day).toISOString();
    assert.notEqual(recentStallUpdate({ packVersion: 2, updatedAt: iso(30) }, NOW), null);
    assert.equal(recentStallUpdate({ packVersion: 2, updatedAt: iso(30.5) }, NOW), null);
    assert.equal(recentStallUpdate({ packVersion: 2, updatedAt: iso(-5) }, NOW), null);
    assert.equal(recentStallUpdate({ packVersion: 2, updatedAt: null }, NOW), null);
    assert.equal(recentStallUpdate({ packVersion: 2, updatedAt: "nope" }, NOW), null);
  });

  it("formats dates in UTC", () => {
    assert.equal(formatShortUpdatedDate("2026-11-24T00:00:00.000Z"), "Nov 24");
    assert.equal(formatShortUpdatedDate("2026-12-01T23:59:00.000Z"), "Dec 1");
  });
});

describe("shipped packs", () => {
  const root = join(import.meta.dirname, "../../public/packs");
  const read = (path: string) => JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;

  it("every pack revised past v1 carries a valid updatedAt", () => {
    const missing: string[] = [];
    for (const dir of ["agents", "teams"]) {
      for (const file of readdirSync(join(root, dir)).filter((f) => f.endsWith(".json"))) {
        const pack = read(join(root, dir, file));
        if (packVersionOf(pack) > 1 && !packUpdatedAtOf(pack)) {
          missing.push(`${dir}/${file}`);
        }
      }
    }
    assert.deepEqual(missing, []);
  });

  it("the packs from the 2026-11-24 audits are dated", () => {
    for (const slug of ["gis-spatial-desk", "finance-office", "career-desk"]) {
      assert.equal(packUpdatedAtOf(read(join(root, "teams", `${slug}.json`))), "2026-11-24T00:00:00.000Z", slug);
    }
    for (const slug of ["tax-strategist", "coach", "web-gis-developer", "financial-analyst"]) {
      assert.equal(packUpdatedAtOf(read(join(root, "agents", `${slug}.json`))), "2026-11-24T00:00:00.000Z", slug);
    }
  });
});
