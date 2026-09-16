import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import type { FarmPack } from "./pack-files.ts";
import {
  DEFAULT_AVATAR_COLOR_FALLBACKS,
  DEFAULT_AVATAR_SHAPE_FALLBACKS,
  gafToGrokTemplate,
  isGafAgentPack,
  mapGrokAvatarValue,
  GROK_BOT_MARK_COLOR_SET,
  GROK_BOT_MARK_SHAPE_SET,
  validateGafListingPack,
} from "./gaf-grok-template.ts";

function loadPack(relativeFromPublic: string): FarmPack {
  const path = fileURLToPath(new URL(relativeFromPublic, import.meta.url));
  return JSON.parse(readFileSync(path, "utf8")) as FarmPack;
}

const giftDayLike: FarmPack = {
  format: "mybot.farm/agent-pack",
  version: "0.1",
  runtime: ["grok-bot"],
  slug: "gift-day",
  profile: {
    name: "Gift Day",
    title: "Family gift & birthday remembrancer",
    description:
      "Remembers birthdays and gifting occasions for the people you care about. Nudges you in time to buy or send something — never charges or orders without your yes.",
    avatar: { kind: "geometric", shape: "teardrop", color: "magenta" },
  },
  memory: [
    {
      kind: "profile",
      content:
        "Gift Day only reminds and drafts; the user always approves purchases, sends, and calendar invites.",
    },
    {
      kind: "log",
      createdAt: "2026-09-11",
      content:
        "Default lead times: 10 days for shipped gifts, 3 days for a card-only note, 1 day for a same-day text draft.",
    },
  ],
  skills: [
    {
      name: "occasion-book",
      description: "Use when adding, updating, or listing birthdays and gift occasions.",
      content: "Keep an occasion book in durable memory.",
    },
    {
      name: "gift-nudge",
      description: "Use when checking what is coming up or drafting a reminder.",
      content: "Scan occasions within lead time.",
    },
  ],
  routines: [
    {
      slug: "morning-gift-scan",
      name: "Morning gift scan",
      description: "Weekday morning check for occasions inside lead time.",
      content: "Each weekday morning: scan the occasion book.",
    },
  ],
  plugins: [],
  gettingStarted: { skill: "occasion-book" },
};

describe("gafToGrokTemplate", () => {
  it("projects a gift-day-like pack to create_bot_share_json args", () => {
    const recipe = gafToGrokTemplate(giftDayLike);

    assert.equal(recipe.profile.name, "Gift Day");
    assert.equal(recipe.profile.description, giftDayLike.profile?.description);
    assert.equal(recipe.profile.avatarShape, "teardrop");
    assert.equal(recipe.profile.avatarColor, "magenta");
    assert.equal("title" in recipe.profile, false);
    assert.equal(recipe.memory.length, 2);
    assert.equal(recipe.skills.length, 2);
    assert.deepEqual(recipe.routines[0], {
      slug: "morning-gift-scan",
      name: "Morning gift scan",
      description: "Weekday morning check for occasions inside lead time.",
      content: "Each weekday morning: scan the occasion book.",
    });
    assert.deepEqual(recipe.plugins, []);
    assert.deepEqual(recipe.gettingStarted, { skill: "occasion-book" });
    assert.equal(recipe.visibility, "public");
  });

  it("projects the live Gift Day seed pack", () => {
    const pack = loadPack("../../public/packs/agents/gift-day.json");
    const recipe = gafToGrokTemplate(pack);

    assert.equal(recipe.profile.name, "Gift Day");
    assert.equal(recipe.profile.avatarShape, "teardrop");
    assert.equal(recipe.profile.avatarColor, "magenta");
    assert.ok(recipe.skills.some((skill) => skill.name === "occasion-book"));
    assert.equal(recipe.routines[0]?.slug, "morning-gift-scan");
    assert.deepEqual(recipe.gettingStarted, { skill: "occasion-book" });
    assert.equal(recipe.visibility, "public");
    assert.equal(isGafAgentPack(pack), true);
  });

  it("maps live outlier seed avatars (finders diamond/amber)", () => {
    const pack = loadPack("../../public/packs/agents/finders.json");
    const recipe = gafToGrokTemplate(pack);

    assert.equal(recipe.profile.name, "Finders");
    assert.equal(recipe.profile.avatarShape, "gem");
    assert.equal(recipe.profile.avatarColor, "yellow");
    assert.deepEqual(recipe.gettingStarted, { skill: "contact-dig" });
  });

  it("maps farm-only avatars through the default fallback table", () => {
    const recipe = gafToGrokTemplate({
      ...giftDayLike,
      profile: {
        name: "Outlier",
        description: "Farm-only mark ids.",
        avatar: { kind: "geometric", shape: "book", color: "indigo" },
      },
    });

    assert.equal(recipe.profile.avatarShape, "tablet");
    assert.equal(recipe.profile.avatarColor, "violet");
    assert.equal(DEFAULT_AVATAR_SHAPE_FALLBACKS.triangle, "wedge");
    assert.equal(DEFAULT_AVATAR_SHAPE_FALLBACKS.circle, "pebble");
    assert.equal(DEFAULT_AVATAR_SHAPE_FALLBACKS.diamond, "gem");
    assert.equal(DEFAULT_AVATAR_COLOR_FALLBACKS.amber, "yellow");
    assert.equal(DEFAULT_AVATAR_COLOR_FALLBACKS.lime, "green");
  });

  it("prefers pack-level avatarFallbacks over the default map", () => {
    const recipe = gafToGrokTemplate({
      ...giftDayLike,
      profile: {
        name: "Custom",
        description: "Pack overrides.",
        avatar: { kind: "geometric", shape: "book", color: "amber" },
      },
      exports: {
        grokBotTemplate: {
          enabled: true,
          avatarFallbacks: {
            shape: { book: "squircle" },
            color: { amber: "orange" },
          },
        },
      },
    });

    assert.equal(recipe.profile.avatarShape, "squircle");
    assert.equal(recipe.profile.avatarColor, "orange");
  });

  it("omits avatar fields that cannot map into mark enums", () => {
    const recipe = gafToGrokTemplate({
      ...giftDayLike,
      profile: {
        name: "No mark",
        description: "Unknown farm shape.",
        avatar: { kind: "geometric", shape: "spiral", color: "chartreuse" },
      },
    });

    assert.equal("avatarShape" in recipe.profile, false);
    assert.equal("avatarColor" in recipe.profile, false);
  });

  it("fills missing optional arrays, routine name from slug, and drops unknown gettingStarted", () => {
    const recipe = gafToGrokTemplate({
      format: "mybot.farm/agent-pack",
      profile: { name: "Sparse", description: "No extras." },
      routines: [
        {
          slug: "weekly-pass",
          description: "A nameless routine.",
          content: "Once a week, check in.",
        },
      ],
      gettingStarted: { skill: "missing-skill" },
    });

    assert.deepEqual(recipe.memory, []);
    assert.deepEqual(recipe.skills, []);
    assert.deepEqual(recipe.plugins, []);
    assert.equal(recipe.routines[0]?.name, "weekly-pass");
    assert.equal("gettingStarted" in recipe, false);
    assert.equal(recipe.visibility, "public");
  });

  it("uses profileDescriptionOverride and copies marketplace plugins only", () => {
    const recipe = gafToGrokTemplate({
      ...giftDayLike,
      plugins: [
        { pluginId: "x-search", name: "Search", description: "Web search." },
        { pluginId: "   " } as never,
      ],
      exports: {
        grokBotTemplate: {
          enabled: true,
          profileDescriptionOverride: "Template-only blurb.",
        },
      },
    });

    assert.equal(recipe.profile.description, "Template-only blurb.");
    assert.deepEqual(recipe.plugins, [
      { pluginId: "x-search", name: "Search", description: "Web search." },
    ]);
  });

  it("does not treat team packs as a single template", () => {
    assert.equal(
      isGafAgentPack({ format: "mybot.farm/team-pack", members: [{ pack: "agents/patch.json" }] }),
      false,
    );
  });
});

describe("mapGrokAvatarValue", () => {
  it("keeps values already in the mark enum", () => {
    assert.equal(
      mapGrokAvatarValue("hex", GROK_BOT_MARK_SHAPE_SET, DEFAULT_AVATAR_SHAPE_FALLBACKS),
      "hex",
    );
    assert.equal(
      mapGrokAvatarValue("cyan", GROK_BOT_MARK_COLOR_SET, DEFAULT_AVATAR_COLOR_FALLBACKS),
      "cyan",
    );
  });
});

describe("validateGafListingPack", () => {
  it("accepts a gift-day-like pack and omitted plugins", () => {
    assert.deepEqual(validateGafListingPack(giftDayLike), { ok: true });
    const withoutPlugins: FarmPack = { ...giftDayLike };
    delete withoutPlugins.plugins;
    assert.deepEqual(validateGafListingPack(withoutPlugins), { ok: true });
  });

  it("rejects plugin url/command and unknown plugin keys", () => {
    const withUrl = validateGafListingPack({
      ...giftDayLike,
      plugins: [{ pluginId: "x", url: "https://example.com/mcp" }],
    });
    assert.equal(withUrl.ok, false);

    const withCommand = validateGafListingPack({
      ...giftDayLike,
      plugins: [{ pluginId: "x", command: "npx evil" }],
    });
    assert.equal(withCommand.ok, false);

    const emptyId = validateGafListingPack({
      ...giftDayLike,
      plugins: [{ pluginId: "" }],
    });
    assert.equal(emptyId.ok, false);
  });

  it("rejects gettingStarted that is not in skills, and bad visibility", () => {
    const badStart = validateGafListingPack({
      ...giftDayLike,
      gettingStarted: { skill: "not-a-skill" },
    });
    assert.equal(badStart.ok, false);

    const badVis = validateGafListingPack({
      ...giftDayLike,
      visibility: "secret",
    });
    assert.equal(badVis.ok, false);
  });

  it("allows team packs with shared.gettingStarted strings", () => {
    assert.deepEqual(
      validateGafListingPack({
        format: "mybot.farm/team-pack",
        members: [{ pack: "agents/patch.json" }],
        shared: { gettingStarted: "Install Patch and Probe." },
      }),
      { ok: true },
    );
  });
});
