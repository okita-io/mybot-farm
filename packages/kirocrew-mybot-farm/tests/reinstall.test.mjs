import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, access } from "node:fs/promises";
import { constants } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { plantAgent } from "../src/plant.mjs";

const v1 = {
  format: "mybot.farm/agent-pack", slug: "verbot", packVersion: 1,
  profile: { name: "VerBot", title: "v1", description: "first" },
  skills: [
    { name: "keep-me", description: "stays", content: "keep" },
    { name: "drop-me", description: "removed in v2", content: "drop" },
  ],
};
const v2 = {
  format: "mybot.farm/agent-pack", slug: "verbot", packVersion: 2,
  profile: { name: "VerBot", title: "v2", description: "second" },
  skills: [
    { name: "keep-me", description: "stays", content: "keep v2" },
    { name: "new-skill", description: "added in v2", content: "new" },
  ],
};

async function fileExists(p) {
  try { await access(p, constants.F_OK); return true; } catch { return false; }
}

test("reinstall to a new version removes the orphaned skill file", async () => {
  const home = await mkdtemp(join(tmpdir(), "kiro-reinstall-"));
  try {
    process.env.KIRO_HOME = home;

    const p1 = await plantAgent(v1, {});
    assert.equal(p1.wrote, true);
    assert.equal(p1.packVersion, 1);
    const dropPath = join(home, "steering/farm/verbot/drop-me.md");
    assert.ok(await fileExists(dropPath), "v1 drop-me steering should exist");

    // plain plant refuses to clobber
    const noop = await plantAgent(v2, {});
    assert.equal(noop.skippedExisting, true);

    // reinstall to v2: drop-me must be gone, new-skill present, meta bumped
    const p2 = await plantAgent(v2, { reinstall: true, clean: true });
    assert.equal(p2.wrote, true);
    assert.equal(p2.priorVersion, 1);
    assert.equal(p2.packVersion, 2);
    assert.ok(p2.cleanedFiles >= 1, "should have cleaned stale files");
    assert.equal(await fileExists(dropPath), false, "orphaned drop-me.md must be removed");
    assert.ok(await fileExists(join(home, "steering/farm/verbot/new-skill.md")));
    const keep = await readFile(join(home, "steering/farm/verbot/keep-me.md"), "utf8");
    assert.ok(keep.includes("keep v2"), "kept skill should be refreshed to v2 content");

    // meta marker records the new version
    const meta = JSON.parse(await readFile(join(home, "steering/farm/verbot/.farm-meta.json"), "utf8"));
    assert.equal(meta.packVersion, 2);
  } finally {
    delete process.env.KIRO_HOME;
    await rm(home, { recursive: true, force: true });
  }
});

test("reinstall auto-detects a version change even without clean flag", async () => {
  const home = await mkdtemp(join(tmpdir(), "kiro-reinstall2-"));
  try {
    process.env.KIRO_HOME = home;
    await plantAgent(v1, {});
    // reinstall without explicit clean: version differs, so stale steering is still cleaned
    const p2 = await plantAgent(v2, { reinstall: true });
    assert.equal(p2.wrote, true);
    assert.equal(await fileExists(join(home, "steering/farm/verbot/drop-me.md")), false);
  } finally {
    delete process.env.KIRO_HOME;
    await rm(home, { recursive: true, force: true });
  }
});
