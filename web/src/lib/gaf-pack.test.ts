import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { validateGafPack, validateListingPack } from "./gaf-pack.ts";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "../../public/packs/agents");
const giftDay = JSON.parse(readFileSync(join(fixtures, "gift-day.json"), "utf8"));
const finders = JSON.parse(readFileSync(join(fixtures, "finders.json"), "utf8"));

describe("validateGafPack", () => {
  it("accepts current seed packs (backward compatible)", () => {
    assert.deepEqual(validateGafPack(giftDay), { ok: true });
    assert.deepEqual(validateGafPack(finders), { ok: true });
    assert.deepEqual(validateGafPack({ slug: "legacy", profile: { name: "Old" } }), {
      ok: true,
    });

    const packsRoot = join(dirname(fileURLToPath(import.meta.url)), "../../public/packs");
    for (const kind of ["agents", "teams"]) {
      const dir = join(packsRoot, kind);
      for (const name of readdirSync(dir).filter((file) => file.endsWith(".json"))) {
        const pack = JSON.parse(readFileSync(join(dir, name), "utf8"));
        const result = validateGafPack(pack);
        assert.equal(result.ok, true, `${kind}/${name}: ${result.ok ? "" : result.error}`);
        if (kind === "teams") {
          const listing = validateListingPack("team", pack);
          assert.equal(
            listing.ok,
            true,
            `${kind}/${name} listing: ${listing.ok ? "" : listing.error}`,
          );
        }
      }
    }
  });

  it("accepts unknown exports keys and optional grokBotTemplate", () => {
    const result = validateGafPack({
      exports: {
        grokBotTemplate: {
          enabled: true,
          avatarFallbacks: { shape: { book: "tablet" }, color: { indigo: "violet" } },
        },
        otherRuntime: { enabled: false },
      },
    });
    assert.deepEqual(result, { ok: true });
  });

  it("validates plugin items as marketplace ids only", () => {
    assert.deepEqual(
      validateGafPack({
        plugins: [{ pluginId: "x.ai/browser", name: "Browser" }],
      }),
      { ok: true },
    );

    const extra = validateGafPack({
      plugins: [{ pluginId: "x.ai/browser", url: "https://example.invalid/mcp" }],
    });
    assert.equal(extra.ok, false);
    if (!extra.ok) {
      assert.match(extra.error, /pluginId, name, and description/);
    }

    const missing = validateGafPack({ plugins: [{ name: "Browser" }] });
    assert.equal(missing.ok, false);
  });

  it("requires gettingStarted.skill to name a pack skill", () => {
    assert.deepEqual(
      validateGafPack({
        skills: [{ name: "occasion-book", content: "Keep a book." }],
        gettingStarted: { skill: "occasion-book" },
      }),
      { ok: true },
    );

    const mismatch = validateGafPack({
      skills: [{ name: "occasion-book", content: "Keep a book." }],
      gettingStarted: { skill: "missing-skill" },
    });
    assert.equal(mismatch.ok, false);
    if (!mismatch.ok) {
      assert.match(mismatch.error, /must match a skills\[\]\.name/);
    }
  });

  it("rejects a string gettingStarted at the agent-pack top level", () => {
    const result = validateGafPack({ gettingStarted: "import these tarballs" });
    assert.equal(result.ok, false);
  });

  it("rejects invalid visibility", () => {
    const result = validateGafPack({ visibility: "private" });
    assert.equal(result.ok, false);
  });
});

const TEAM_PACK = {
  format: "mybot.farm/team-pack",
  version: "0.1",
  runtime: ["hermes"],
  members: [
    {
      role: "programmer",
      summary: "Implements small diffs.",
      pack: "agents/patch.json",
    },
    {
      role: "debugger",
      summary: "Reproduces and verifies.",
      pack: "agents/probe.json",
    },
  ],
  shared: {
    gettingStarted: "Install Patch and Probe.",
  },
};

describe("validateListingPack", () => {
  it("accepts a two-member team-pack", () => {
    assert.deepEqual(validateListingPack("team", TEAM_PACK), { ok: true });
  });

  it("accepts nested agent-pack members", () => {
    const nested = {
      ...TEAM_PACK,
      members: [
        {
          role: "programmer",
          summary: "Implements.",
          pack: { format: "mybot.farm/agent-pack", profile: { name: "A" } },
        },
        {
          role: "debugger",
          summary: "Verifies.",
          pack: { format: "mybot.farm/agent-pack", profile: { name: "B" } },
        },
      ],
    };
    assert.deepEqual(validateListingPack("team", nested), { ok: true });
  });

  it("rejects a team without team-pack format", () => {
    const result = validateListingPack("team", { format: "mybot.farm/agent-pack" });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /team-pack/);
    }
  });

  it("rejects a team with one member", () => {
    const result = validateListingPack("team", {
      format: "mybot.farm/team-pack",
      members: [{ role: "solo", summary: "Alone", pack: "agents/patch.json" }],
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /at least 2/);
    }
  });

  it("rejects an agent listing that uses team-pack", () => {
    const result = validateListingPack("agent", TEAM_PACK);
    assert.equal(result.ok, false);
  });

  it("rejects an agent listing with members[]", () => {
    const result = validateListingPack("agent", {
      format: "mybot.farm/agent-pack",
      members: TEAM_PACK.members,
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /kind "team"/);
    }
  });
});
