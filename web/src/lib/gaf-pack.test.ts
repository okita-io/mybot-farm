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
    for (const kind of ["agents", "teams", "worlds"]) {
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
        if (kind === "worlds") {
          const listing = validateListingPack("world", pack);
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

const worldsDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../public/packs/worlds",
);
const neonHarbor = JSON.parse(
  readFileSync(join(worldsDir, "neon-harbor.json"), "utf8"),
);

const WORLD_PACK = {
  format: "mybot.farm/world-pack",
  version: "0.1",
  runtime: ["kirocrew", "hermes"],
  members: [
    { role: "harbor-engineer", summary: "Builds.", pack: "agents/patch.json" },
    { role: "night-watch", summary: "Verifies.", pack: "agents/probe.json" },
  ],
  world: {
    schema: "worlds/v1",
    title: "Neon Harbor",
    thumbnail: "assets/neon-harbor.webp",
    places: [
      { id: "dock", name: "The Docks", present: ["harbor-engineer", "night-watch"] },
    ],
    cast: [
      { role: "harbor-engineer", capabilities: ["web", "files"] },
      { role: "night-watch", capabilities: ["web"] },
    ],
    rules: { turnModel: "defer" },
    entrypoint: { place: "dock", greeter: "night-watch" },
  },
};

function worldPack(overrides: Record<string, unknown> = {}) {
  const world = {
    ...WORLD_PACK.world,
    ...(overrides.world as Record<string, unknown> | undefined),
  };
  const { world: _worldOverride, ...rest } = overrides;
  return { ...WORLD_PACK, ...rest, world };
}

describe("validateListingPack world kind", () => {
  it("accepts the Neon Harbor seed world-pack", () => {
    assert.deepEqual(validateListingPack("world", neonHarbor), { ok: true });
  });

  it("accepts a minimal world-pack", () => {
    assert.deepEqual(validateListingPack("world", WORLD_PACK), { ok: true });
  });

  it("still accepts a plain team-pack (team kind unchanged)", () => {
    assert.deepEqual(validateListingPack("team", TEAM_PACK), { ok: true });
  });

  it("rejects a world without the world-pack format", () => {
    const result = validateListingPack("world", {
      ...WORLD_PACK,
      format: "mybot.farm/team-pack",
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /world-pack/);
    }
  });

  it("rejects a world-pack with no world block", () => {
    const { world: _world, ...noWorld } = WORLD_PACK;
    const result = validateListingPack("world", noWorld);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /world\{\} block/);
    }
  });

  it("rejects a place.present referencing an unknown role", () => {
    const result = validateListingPack("world", {
      ...WORLD_PACK,
      world: {
        ...WORLD_PACK.world,
        places: [{ id: "dock", name: "The Docks", present: ["stranger"] }],
      },
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /not a member role/);
    }
  });

  it("rejects an unknown capability", () => {
    const result = validateListingPack("world", {
      ...WORLD_PACK,
      world: {
        ...WORLD_PACK.world,
        cast: [{ role: "harbor-engineer", capabilities: ["shell"] }],
      },
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /web, files, schedule/);
    }
  });

  it("rejects an agent listing that uses world-pack format", () => {
    const result = validateListingPack("agent", WORLD_PACK);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /world-pack/);
    }
  });

  it("rejects a world block without schema worlds/v1", () => {
    const result = validateListingPack(
      "world",
      worldPack({ world: { ...WORLD_PACK.world, schema: "worlds/v0" } }),
    );
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /worlds\/v1/);
    }
  });

  it("rejects a world block with no places", () => {
    const result = validateListingPack(
      "world",
      worldPack({ world: { ...WORLD_PACK.world, places: [] } }),
    );
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /at least one place/);
    }
  });

  it("rejects an entrypoint place that does not exist", () => {
    const result = validateListingPack(
      "world",
      worldPack({
        world: {
          ...WORLD_PACK.world,
          entrypoint: { place: "nowhere", greeter: "night-watch" },
        },
      }),
    );
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /entrypoint\.place/);
    }
  });

  it("rejects an entrypoint greeter that is not a member role", () => {
    const result = validateListingPack(
      "world",
      worldPack({
        world: {
          ...WORLD_PACK.world,
          entrypoint: { place: "dock", greeter: "stranger" },
        },
      }),
    );
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /entrypoint\.greeter/);
    }
  });

  it("rejects duplicate cast roles", () => {
    const result = validateListingPack(
      "world",
      worldPack({
        world: {
          ...WORLD_PACK.world,
          cast: [
            { role: "harbor-engineer", capabilities: ["web"] },
            { role: "harbor-engineer", capabilities: ["files"] },
          ],
        },
      }),
    );
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /duplicated/);
    }
  });

  it("rejects unknown place connects", () => {
    const result = validateListingPack(
      "world",
      worldPack({
        world: {
          ...WORLD_PACK.world,
          places: [{ id: "dock", name: "The Docks", connects: ["tower"] }],
        },
      }),
    );
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /connects references/);
    }
  });

  it("rejects a cast home that is not a place id", () => {
    const result = validateListingPack(
      "world",
      worldPack({
        world: {
          ...WORLD_PACK.world,
          cast: [{ role: "harbor-engineer", home: "tower" }],
        },
      }),
    );
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /home/);
    }
  });

  it("rejects an invalid memoryScope", () => {
    const result = validateListingPack(
      "world",
      worldPack({
        world: {
          ...WORLD_PACK.world,
          cast: [{ role: "harbor-engineer", memoryScope: "public" }],
        },
      }),
    );
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /memoryScope/);
    }
  });

  it("rejects present longer than maxPresent (default 6)", () => {
    const roles = Array.from({ length: 7 }, (_, i) => `role-${i}`);
    const members = roles.map((role) => ({
      role,
      summary: "x",
      pack: "agents/patch.json",
    }));
    const result = validateListingPack("world", {
      ...WORLD_PACK,
      members,
      world: {
        ...WORLD_PACK.world,
        places: [{ id: "dock", name: "The Docks", present: roles }],
        cast: roles.map((role) => ({ role })),
        entrypoint: { place: "dock", greeter: "role-0" },
      },
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /max is 6/);
    }
  });

  it("rejects thumbnails with .. or a non-https scheme", () => {
    const parentTraversal = validateListingPack(
      "world",
      worldPack({ world: { ...WORLD_PACK.world, thumbnail: "../secret.webp" } }),
    );
    assert.equal(parentTraversal.ok, false);
    if (!parentTraversal.ok) {
      assert.match(parentTraversal.error, /\.\./);
    }

    const httpUrl = validateListingPack(
      "world",
      worldPack({
        world: { ...WORLD_PACK.world, thumbnail: "http://example.com/x.webp" },
      }),
    );
    assert.equal(httpUrl.ok, false);
    if (!httpUrl.ok) {
      assert.match(httpUrl.error, /https/);
    }
  });

  it("accepts a public site-path thumbnail and a bundle-relative path", () => {
    assert.deepEqual(
      validateListingPack(
        "world",
        worldPack({ world: { ...WORLD_PACK.world, thumbnail: "/packs/worlds/x.webp" } }),
      ),
      { ok: true },
    );
    assert.deepEqual(
      validateListingPack(
        "world",
        worldPack({ world: { ...WORLD_PACK.world, thumbnail: "assets/x.webp" } }),
      ),
      { ok: true },
    );
  });
});
