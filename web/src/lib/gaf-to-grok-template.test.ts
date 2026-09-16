import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  gafToGrokTemplate,
  isGafTeamPack,
  validateFarmPack,
} from "./gaf-to-grok-template.ts";
import type { FarmPack } from "./pack-files.ts";

const here = path.dirname(fileURLToPath(import.meta.url));

function readPack(rel: string): FarmPack {
  const raw = fs.readFileSync(path.join(here, rel), "utf8");
  return JSON.parse(raw) as FarmPack;
}

const giftDay = readPack("../../public/packs/agents/gift-day.json");
const finders = readPack("../../public/packs/agents/finders.json");
const pitch = readPack("../../public/packs/agents/pitch.json");
const scholasticResearch = readPack("../../public/packs/agents/scholastic-research.json");
const scout = readPack("../../public/packs/agents/scout.json");
const pairBench = readPack("../../public/packs/teams/pair-bench.json");

describe("gafToGrokTemplate", () => {
  it("projects gift-day to a create_bot_share_json-shaped recipe without inventing fields", () => {
    const template = gafToGrokTemplate(giftDay);

    assert.deepEqual(Object.keys(template.profile).sort(), [
      "avatarColor",
      "avatarShape",
      "description",
      "name",
    ]);
    assert.equal(template.profile.name, "Gift Day");
    assert.equal(template.profile.description, giftDay.profile?.description);
    assert.equal("title" in template.profile, false);
    assert.equal(template.profile.avatarShape, "teardrop");
    assert.equal(template.profile.avatarColor, "magenta");
    assert.equal(template.memory.length, giftDay.memory?.length);
    assert.deepEqual(
      template.memory.map((entry) => entry.content),
      giftDay.memory?.map((entry) => entry.content),
    );
    assert.equal(template.memory[2]?.createdAt, "2026-09-11");
    assert.equal(template.skills.length, giftDay.skills?.length);
    assert.equal(template.skills[0]?.name, "occasion-book");
    assert.equal(template.skills[0]?.content, giftDay.skills?.[0]?.content);
    assert.equal(template.routines[0]?.slug, "morning-gift-scan");
    assert.equal(template.routines[0]?.name, "Morning gift scan");
    assert.deepEqual(template.plugins, []);
    assert.deepEqual(template.gettingStarted, { skill: "occasion-book" });
    assert.equal(template.visibility, "public");
    assert.equal("format" in template, false);
    assert.equal("slug" in template, false);
    assert.equal("manifest" in template, false);
  });

  it("maps farm-only avatar shapes and colors onto Grok Bot mark enums", () => {
    assert.equal(gafToGrokTemplate(scout).profile.avatarShape, "pebble");
    assert.equal(gafToGrokTemplate(scout).profile.avatarColor, "green");
    assert.equal(gafToGrokTemplate(finders).profile.avatarShape, "gem");
    assert.equal(gafToGrokTemplate(finders).profile.avatarColor, "yellow");
    assert.equal(gafToGrokTemplate(pitch).profile.avatarShape, "wedge");
    assert.equal(gafToGrokTemplate(scholasticResearch).profile.avatarShape, "tablet");
    assert.equal(gafToGrokTemplate(scholasticResearch).profile.avatarColor, "violet");
  });

  it("prefers pack-level avatarFallbacks and profileDescriptionOverride", () => {
    const pack: FarmPack = {
      format: "mybot.farm/agent-pack",
      profile: {
        name: "Override Bot",
        description: "Farm description",
        avatar: { kind: "geometric", shape: "circle", color: "lime" },
      },
      exports: {
        grokBotTemplate: {
          enabled: true,
          profileDescriptionOverride: "Template description",
          avatarFallbacks: {
            shape: { circle: "blob" },
            color: { lime: "yellow" },
          },
        },
      },
    };

    const template = gafToGrokTemplate(pack);
    assert.equal(template.profile.description, "Template description");
    assert.equal(template.profile.avatarShape, "blob");
    assert.equal(template.profile.avatarColor, "yellow");
  });

  it("fills routine.name from slug and defaults omitted plugins to []", () => {
    const template = gafToGrokTemplate({
      format: "mybot.farm/agent-pack",
      profile: { name: "Bare", description: "A minimal pack." },
      routines: [
        {
          slug: "morning-scan",
          description: "Look around.",
          content: "Each morning, look around.",
        },
      ],
    });

    assert.equal(template.routines[0]?.name, "morning-scan");
    assert.deepEqual(template.plugins, []);
    assert.equal(template.gettingStarted, undefined);
    assert.equal(template.visibility, "public");
  });

  it("omits avatar fields that are still outside the mark enums after fallbacks", () => {
    const template = gafToGrokTemplate({
      format: "mybot.farm/agent-pack",
      profile: {
        name: "Odd Mark",
        description: "Unknown decorative avatar.",
        avatar: { kind: "geometric", shape: "star", color: "chartreuse" },
      },
    });

    assert.equal("avatarShape" in template.profile, false);
    assert.equal("avatarColor" in template.profile, false);
  });

  it("refuses team packs instead of flattening members", () => {
    assert.equal(isGafTeamPack(pairBench), true);
    assert.throws(() => gafToGrokTemplate(pairBench), /members\[\]\.pack/);
  });
});

describe("validateFarmPack", () => {
  it("accepts live seed agent packs including gift-day", () => {
    for (const pack of [giftDay, scout, finders, pitch, scholasticResearch]) {
      assert.deepEqual(validateFarmPack(pack), { ok: true }, pack.slug);
    }
  });

  it("accepts optional visibility and exports.grokBotTemplate", () => {
    assert.deepEqual(
      validateFarmPack({
        format: "mybot.farm/agent-pack",
        plugins: [{ pluginId: "web-search", name: "Web search" }],
        visibility: "public",
        exports: {
          grokBotTemplate: {
            enabled: true,
            avatarFallbacks: { shape: { book: "tablet" }, color: { indigo: "violet" } },
          },
        },
      }),
      { ok: true },
    );
  });

  it("rejects custom MCP plugin URLs and unknown plugin keys", () => {
    const url = validateFarmPack({
      plugins: [{ pluginId: "https://example.com/mcp" }],
    });
    assert.equal(url.ok, false);
    if (!url.ok) {
      assert.match(url.error, /marketplace id/);
    }

    const extra = validateFarmPack({
      plugins: [{ pluginId: "web-search", url: "https://example.com/mcp" }],
    });
    assert.equal(extra.ok, false);
    if (!extra.ok) {
      assert.match(extra.error, /no custom MCP/);
    }
  });

  it("rejects gettingStarted that does not name a skill", () => {
    const result = validateFarmPack({
      skills: [{ name: "occasion-book", content: "Keep a book." }],
      gettingStarted: { skill: "missing-skill" },
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /must match/);
    }
  });
});
