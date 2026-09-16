import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  gafToGrokTemplate,
  mapAvatarColor,
  mapAvatarShape,
} from "./gaf-to-grok-template.ts";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "../../public/packs/agents");
const giftDay = JSON.parse(readFileSync(join(fixtures, "gift-day.json"), "utf8"));
const finders = JSON.parse(readFileSync(join(fixtures, "finders.json"), "utf8"));

describe("avatar fallbacks", () => {
  it("maps farm-only shapes onto Grok mark enums", () => {
    assert.equal(mapAvatarShape("book"), "tablet");
    assert.equal(mapAvatarShape("triangle"), "wedge");
    assert.equal(mapAvatarShape("circle"), "pebble");
    assert.equal(mapAvatarShape("diamond"), "gem");
  });

  it("maps farm-only colors onto Grok mark enums", () => {
    assert.equal(mapAvatarColor("indigo"), "violet");
    assert.equal(mapAvatarColor("amber"), "yellow");
    assert.equal(mapAvatarColor("lime"), "green");
  });

  it("passes through shapes and colors already in the mark enums", () => {
    assert.equal(mapAvatarShape("teardrop"), "teardrop");
    assert.equal(mapAvatarColor("magenta"), "magenta");
    assert.equal(mapAvatarShape("leaf"), "leaf");
    assert.equal(mapAvatarColor("green"), "green");
  });

  it("prefers pack-level avatarFallbacks over defaults", () => {
    assert.equal(mapAvatarShape("book", { book: "squircle" }), "squircle");
    assert.equal(mapAvatarColor("amber", { amber: "orange" }), "orange");
  });

  it("omits tokens that are still unknown after fallbacks", () => {
    assert.equal(mapAvatarShape("spiral"), undefined);
    assert.equal(mapAvatarColor("chartreuse"), undefined);
  });
});

describe("gafToGrokTemplate", () => {
  it("projects Gift Day onto a template-ready recipe", () => {
    const recipe = gafToGrokTemplate(giftDay);

    assert.deepEqual(recipe.profile, {
      name: "Gift Day",
      description:
        "Remembers birthdays and gifting occasions for the people you care about. Nudges you in time to buy or send something — never charges or orders without your yes.",
      avatarShape: "teardrop",
      avatarColor: "magenta",
    });
    assert.equal("title" in recipe.profile, false);
    assert.equal(recipe.visibility, "public");
    assert.equal(recipe.plugins.length, 0);
    assert.deepEqual(recipe.gettingStarted, { skill: "occasion-book" });
    assert.equal(recipe.memory.length, 3);
    assert.equal(recipe.memory[0]?.kind, "profile");
    assert.equal(recipe.memory[2]?.kind, "log");
    assert.equal(recipe.memory[2]?.createdAt, "2026-09-11");
    assert.equal(recipe.skills.length, 2);
    assert.equal(recipe.skills[0]?.name, "occasion-book");
    assert.equal(recipe.skills[1]?.name, "gift-nudge");
    assert.deepEqual(recipe.routines, [
      {
        slug: "morning-gift-scan",
        name: "Morning gift scan",
        description:
          "Weekday morning check for occasions inside lead time so gifts are not last-minute.",
        content:
          "Each weekday morning in the user's local timezone: scan the occasion book for dates within each person's lead time. If anything is due, message the user with a short list (who, date, suggested action, draft). If nothing is due, stay quiet — no filler.",
      },
    ]);
    assert.equal("stallId" in recipe, false);
    assert.equal("packVersion" in recipe, false);
    assert.equal("slug" in recipe, false);
    assert.equal("format" in recipe, false);
  });

  it("applies default avatar fallbacks for Finders (diamond/amber)", () => {
    const recipe = gafToGrokTemplate(finders);
    assert.equal(recipe.profile.avatarShape, "gem");
    assert.equal(recipe.profile.avatarColor, "yellow");
    assert.equal(recipe.profile.name, "Finders");
    assert.equal("title" in recipe.profile, false);
  });

  it("fills routine name from slug and defaults visibility to public", () => {
    const recipe = gafToGrokTemplate({
      slug: "smoke",
      profile: { name: "Smoke", description: "A test bot." },
      routines: [
        {
          slug: "evening-pass",
          description: "Once a day.",
          content: "Scan and stay quiet if nothing is due.",
        },
      ],
    });
    assert.equal(recipe.routines[0]?.name, "evening-pass");
    assert.equal(recipe.visibility, "public");
  });

  it("uses profileDescriptionOverride when set", () => {
    const recipe = gafToGrokTemplate({
      profile: { name: "Gift Day", description: "Farm blurb." },
      exports: {
        grokBotTemplate: {
          profileDescriptionOverride: "Template blurb.",
        },
      },
    });
    assert.equal(recipe.profile.description, "Template blurb.");
  });
});
