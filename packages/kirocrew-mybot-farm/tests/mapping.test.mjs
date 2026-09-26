import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  gafToKirocrewAgent, kirocrewAgentToGaf, safeAgentName, slugifyName,
  DEFAULT_TOOLS,
} from "../src/gaf-to-kirocrew.mjs";
import { plantAgent } from "../src/plant.mjs";

const patch = {
  format: "mybot.farm/agent-pack", slug: "patch",
  profile: { name: "Patch", title: "Implementation programmer", description: "Writes and lands code changes." },
  memory: [{ kind: "profile", content: "Patch implements; does not deploy without the user." }],
  skills: [
    { name: "small-diff", description: "impl a fix", content: "Scope the smallest change." },
    { name: "handoff-to-probe", description: "adversarial check", content: "Write a short handoff." },
  ],
  gettingStarted: { skill: "small-diff" },
  plugins: [{ pluginId: "some-shell-plugin" }],
  routines: [{ slug: "daily", name: "Daily", description: "runs daily" }],
};

test("slugify + safe name", () => {
  assert.equal(slugifyName("Mock Bot!"), "mock-bot");
  assert.equal(safeAgentName({ slug: "kirocrew" }), "farm-kirocrew"); // reserved prefix
  assert.equal(safeAgentName({ slug: "kirocrew-worker" }), "farm-kirocrew-worker");
  assert.equal(safeAgentName({ profile: { name: "Patch" } }), "patch");
});

test("maps patch to a template + steering files", () => {
  const { name, template, steeringFiles, withheldTools, notes } = gafToKirocrewAgent(patch);
  assert.equal(name, "patch");
  assert.equal(template.model, "auto");
  assert.deepEqual(template.tools, DEFAULT_TOOLS);
  // D3: shell/write never granted, and the requested plugin is noted not granted
  assert.ok(withheldTools.includes("execute_bash"));
  assert.ok(withheldTools.includes("fs_write"));
  assert.ok(notes.some((n) => n.includes("some-shell-plugin")));
  // D2: skills become steering files under farm/<slug>/
  assert.equal(steeringFiles.length, 2);
  assert.ok(steeringFiles[0].path.startsWith(".kiro/steering/farm/patch/"));
  assert.ok(template.resources[0].includes("steering/farm/patch"));
  // prompt carries persona + memory + getting-started; D4: routine documented not scheduled
  assert.ok(template.prompt.includes("Patch"));
  assert.ok(template.prompt.includes("Durable context"));
  assert.ok(template.prompt.includes("small-diff"));
  assert.ok(template.prompt.includes("not auto-scheduled"));
});

test("export scrubs machine-local fields", () => {
  const template = {
    name: "patch", description: "impl", model: "auto", prompt: "# Patch\ndoes things",
    mcpServers: { core: { command: "/Applications/KiroCrew.app/.../bin/kirocrew" } },
    hooks: { postToolUse: [{ command: "cat >> /Users/x/audit.log" }] },
  };
  const { pack, scrubbed } = kirocrewAgentToGaf(template, { slug: "patch", category: "Coding" });
  assert.equal(pack.format, "mybot.farm/agent-pack");
  assert.equal(pack.manifest.scrubbed, true);
  assert.ok(!("mcpServers" in pack));
  assert.ok(!("hooks" in pack));
  assert.ok(scrubbed.some((s) => s.includes("mcpServers")));
  assert.ok(scrubbed.some((s) => s.includes("hooks")));
});

test("plant writes template + steering into KIRO_HOME (and dry-run writes nothing)", async () => {
  const home = await mkdtemp(join(tmpdir(), "kiro-test-"));
  try {
    const dry = await plantAgent(patch, { dryRun: true });
    assert.equal(dry.wrote, false);
    await assert.rejects(readFile(dry.agentPath, "utf8")); // nothing written

    process.env.KIRO_HOME = home;
    const res = await plantAgent(patch, {});
    assert.equal(res.wrote, true);
    const written = JSON.parse(await readFile(res.agentPath, "utf8"));
    assert.equal(written.name, "patch");
    assert.deepEqual(written.tools, DEFAULT_TOOLS);
    const steering = await readFile(res.steeringPaths[0], "utf8");
    assert.ok(steering.includes("Scope the smallest change"));

    // second plant without force is skipped
    const again = await plantAgent(patch, {});
    assert.equal(again.skippedExisting, true);
  } finally {
    delete process.env.KIRO_HOME;
    await rm(home, { recursive: true, force: true });
  }
});
