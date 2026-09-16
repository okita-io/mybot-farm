import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { writePackWorkspace } = await import(pathToFileURL(path.join(root, "src/plant.mjs")).href);

const SAMPLE_PACK = {
  format: "mybot.farm/agent-pack",
  version: "0.1",
  slug: "gift-day",
  profile: {
    name: "Gift Day",
    title: "Family gift & birthday remembrancer",
    description: "Remembers birthdays and gifting occasions.",
    avatar: { kind: "geometric", shape: "teardrop", color: "magenta" },
  },
  memory: [{ kind: "profile", content: "Gift Day only reminds and drafts." }],
  skills: [
    {
      name: "occasion-book",
      description: "Use when adding occasions.",
      content: "Keep an occasion book.",
    },
  ],
  routines: [
    {
      slug: "morning-gift-scan",
      name: "Morning gift scan",
      description: "Weekday morning check.",
      content: "Each weekday morning, scan the occasion book.",
    },
  ],
  plugins: [{ pluginId: "web-search", name: "Web search", description: "Look things up." }],
  gettingStarted: { skill: "occasion-book" },
  manifest: { author: "mybot.farm seeds", license: "MIT" },
};

test("writePackWorkspace plants ROUTINES.md and notes plugins in FARM.md", async () => {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "farm-plant-"));
  try {
    const skills = await writePackWorkspace(SAMPLE_PACK, workspace);
    assert.deepEqual(skills, ["occasion-book"]);

    const routines = await fs.readFile(path.join(workspace, "ROUTINES.md"), "utf8");
    assert.match(routines, /morning-gift-scan/);
    assert.match(routines, /Morning gift scan/);
    assert.match(routines, /not live schedules/);
    assert.match(routines, /Never copy automation\.json/);

    const farm = await fs.readFile(path.join(workspace, "FARM.md"), "utf8");
    assert.match(farm, /occasion-book/);
    assert.match(farm, /web-search/);
    assert.match(farm, /Do not auto-install arbitrary MCP/);
  } finally {
    await fs.rm(workspace, { recursive: true, force: true });
  }
});

test("writePackWorkspace skips ROUTINES.md when the pack has no routines", async () => {
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), "farm-plant-"));
  try {
    await writePackWorkspace({ ...SAMPLE_PACK, routines: [], plugins: [] }, workspace);
    await assert.rejects(fs.access(path.join(workspace, "ROUTINES.md")));
    const farm = await fs.readFile(path.join(workspace, "FARM.md"), "utf8");
    assert.doesNotMatch(farm, /Marketplace plugins/);
  } finally {
    await fs.rm(workspace, { recursive: true, force: true });
  }
});
