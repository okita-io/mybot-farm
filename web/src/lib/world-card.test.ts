import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { validateListingPack } from "./gaf-pack.ts";
import { parseSharePath } from "./share-paths.ts";
import {
  catalogDirForKind,
  isRenderableThumbnail,
  worldCardFields,
  worldStallSummary,
} from "./world-card.ts";

const worldsDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../public/packs/worlds",
);
const neonHarbor = JSON.parse(
  readFileSync(join(worldsDir, "neon-harbor.json"), "utf8"),
);

describe("world listing persistence round-trip", () => {
  it("accepts the world pack under the world listing kind", () => {
    // post_listing path: validateListingPack('world', pack)
    assert.deepEqual(validateListingPack("world", neonHarbor), { ok: true });
  });

  it("extracts thumbnail + runtime badges that survive into the stall card", () => {
    // The world block and runtime list live inside the pack jsonb, so a
    // POST -> store -> GET round trip preserves them with no DB column:
    // worldCardFields is exactly what listingToStall reads back.
    const fields = worldCardFields(neonHarbor);
    assert.equal(fields.thumbnail, "/packs/worlds/neon-harbor.webp");
    assert.deepEqual(fields.runtimes, ["hermes", "kirocrew"]);
  });

  it("routes a world listing to the worlds catalog directory", () => {
    assert.equal(catalogDirForKind("world"), "worlds");
    assert.equal(catalogDirForKind("team"), "teams");
    assert.equal(catalogDirForKind("agent"), "agents");
  });

  it("yields no thumbnail/runtimes for an agent pack (no world block)", () => {
    const fields = worldCardFields({
      format: "mybot.farm/agent-pack",
      profile: { name: "Solo" },
    });
    assert.equal(fields.thumbnail, undefined);
    assert.equal(fields.runtimes, undefined);
  });

  it("keeps the world block intact through a JSON store/load cycle", () => {
    // Simulate jsonb persistence: serialize and parse, then re-read.
    const stored = JSON.parse(JSON.stringify(neonHarbor));
    assert.deepEqual(validateListingPack("world", stored), { ok: true });
    assert.equal(stored.world.title, "Neon Harbor");
    assert.equal(stored.world.entrypoint.greeter, "night-watch");
    assert.equal(stored.world.places.length, 2);
    const fields = worldCardFields(stored);
    assert.equal(fields.thumbnail, "/packs/worlds/neon-harbor.webp");
  });
});

describe("isRenderableThumbnail", () => {
  it("accepts site paths and https URLs", () => {
    assert.equal(isRenderableThumbnail("/packs/worlds/neon-harbor.webp"), true);
    assert.equal(isRenderableThumbnail("https://example.com/thumb.webp"), true);
  });

  it("rejects bundle-relative paths and empty values", () => {
    assert.equal(isRenderableThumbnail("assets/neon-harbor.webp"), false);
    assert.equal(isRenderableThumbnail(undefined), false);
  });
});

describe("worldStallSummary", () => {
  it("extracts places, greeter, turn model, and cast from the seed world", () => {
    const summary = worldStallSummary(neonHarbor);
    assert.ok(summary);
    assert.equal(summary.title, "Neon Harbor");
    assert.equal(summary.places.length, 2);
    assert.equal(summary.greeterRole, "night-watch");
    assert.equal(summary.greeterName, "Probe");
    assert.equal(summary.turnModel, "defer");
    assert.equal(summary.cast.length, 2);
  });
});

describe("parseSharePath world routes", () => {
  it("accepts /worlds/{slug} and /packs/worlds/{slug}.json", () => {
    assert.deepEqual(parseSharePath("/worlds/neon-harbor"), {
      slug: "neon-harbor",
      pathKind: "world",
    });
    assert.deepEqual(parseSharePath("/packs/worlds/neon-harbor.json"), {
      slug: "neon-harbor",
      pathKind: "pack",
    });
  });
});

describe("world API contract (routes + WebMCP)", () => {
  it("post_listing + search_stalls tools document the world kind", async () => {
    const { packTools } = await import("./webmcp-catalog.ts");
    const post = packTools.find((t) => t.name === "post_listing");
    const search = packTools.find((t) => t.name === "search_stalls");
    assert.ok(post, "post_listing tool present");
    assert.ok(search, "search_stalls tool present");
    assert.match(post!.description, /"world"/);
    assert.match(post!.description, /mybot\.farm\/world-pack/);
    assert.match(post!.description, /Worlds/);
    assert.match(search!.description, /worlds/i);
  });

  it("registers the Worlds category (post_listing category gate)", () => {
    // site.ts is not plain-node loadable (extensionless relative import), so
    // assert the static category literal from source text.
    const siteSrc = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "site.ts"),
      "utf8",
    );
    assert.match(siteSrc, /label:\s*"Worlds"/);
  });

  it("agent and team packs still validate under their own kinds (regression)", () => {
    const agent = {
      format: "mybot.farm/agent-pack",
      profile: { name: "Solo" },
    };
    assert.deepEqual(validateListingPack("agent", agent), { ok: true });

    const team = {
      format: "mybot.farm/team-pack",
      members: [
        { role: "a", summary: "x", pack: "agents/patch.json" },
        { role: "b", summary: "y", pack: "agents/probe.json" },
      ],
    };
    assert.deepEqual(validateListingPack("team", team), { ok: true });
    // an agent pack carries no world card fields
    assert.equal(worldCardFields(agent).thumbnail, undefined);
    assert.equal(worldCardFields(agent).runtimes, undefined);
  });
});
