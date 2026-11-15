import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { externalWorlds } from "./external-worlds.ts";
import { isRenderableThumbnail } from "./world-card.ts";

const publicDir = join(dirname(fileURLToPath(import.meta.url)), "../../public");

describe("external worlds", () => {
  it("introduces Agent Machi as a place to take a farm agent", () => {
    const machi = externalWorlds.find((world) => world.id === "agent-machi");
    assert.ok(machi);
    assert.equal(machi.name, "Agent Machi");
    assert.equal(
      machi.href,
      "https://github.com/happyeric77/agent-machi",
    );
    assert.match(machi.bring, /catalog|agent/i);
    assert.match(machi.summary, /Herdr/);
    assert.equal(machi.image?.src, "/external-worlds/agent-machi.webp");
    assert.match(machi.image?.alt ?? "", /town/i);
    assert.equal(
      existsSync(join(publicDir, "external-worlds/agent-machi.webp")),
      true,
    );
  });

  it("only links out over https, with a label and a distinct id", () => {
    const ids = new Set<string>();
    for (const world of externalWorlds) {
      assert.equal(ids.has(world.id), false);
      ids.add(world.id);
      assert.ok(world.name.trim());
      assert.ok(world.linkLabel.trim());
      assert.ok(world.author.trim());
      assert.ok(world.summary.trim());
      assert.ok(world.bring.trim());
      if (world.image) {
        assert.equal(isRenderableThumbnail(world.image.src), true);
        assert.ok(world.image.alt.trim());
        if (world.image.src.startsWith("/")) {
          assert.equal(
            existsSync(join(publicDir, world.image.src.slice(1))),
            true,
          );
        }
      }
      const url = new URL(world.href);
      assert.equal(url.protocol, "https:");
    }
  });
});
