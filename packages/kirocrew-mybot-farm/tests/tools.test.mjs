// Exercises the plugin tool handlers against a live mock-farm started as a
// child process. Covers farm_search / farm_get_pack / farm_plant (agent+team)
// and farm_post + round-trip.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = join(__dirname, "..", "..", "..");
const PORT = 8791;
let srv, home, tools;

before(async () => {
  home = await mkdtemp(join(tmpdir(), "kiro-tools-"));
  process.env.MYBOT_FARM_URL = `http://localhost:${PORT}`;
  process.env.MYBOT_FARM_API_KEY = "mbf_mocktoken";
  process.env.KIRO_HOME = home;
  srv = spawn("node", [join(REPO, "mock-farm", "server.mjs")], {
    env: { ...process.env, PORT: String(PORT) }, stdio: "ignore",
  });
  await new Promise((r) => setTimeout(r, 1500));
  ({ tools } = await import("../src/tools.mjs"));
});

after(async () => {
  if (srv) srv.kill();
  delete process.env.KIRO_HOME;
  await rm(home, { recursive: true, force: true });
});

test("farm_search returns stalls", async () => {
  const r = await tools.farm_search({ query: "patch" });
  assert.equal(r.ok, true);
  assert.ok(r.count > 0);
});

test("farm_get_pack returns a GAF pack", async () => {
  const r = await tools.farm_get_pack({ slug: "patch" });
  assert.equal(r.ok, true);
  assert.equal(r.pack.format, "mybot.farm/agent-pack");
});

test("farm_plant plants an agent with deny-by-default tools", async () => {
  const r = await tools.farm_plant({ slug: "patch" });
  assert.equal(r.ok, true);
  assert.equal(r.kind, "agent");
  assert.equal(r.wrote, true);
  assert.ok(r.withheldTools.includes("execute_bash"));
});

test("farm_plant plants a team as a crew with bind commands", async () => {
  const r = await tools.farm_plant({ slug: "pair-bench" });
  assert.equal(r.ok, true);
  assert.equal(r.kind, "team");
  assert.deepEqual(r.members.sort(), ["patch", "probe"]);
  assert.ok(r.bindCommands.some((c) => c.includes("workspace create")));
});

test("farm_post publishes and round-trips", async () => {
  const pack = {
    format: "mybot.farm/agent-pack",
    profile: { name: "Tool Bot", title: "t", description: "posted via tool" },
    skills: [],
  };
  const posted = await tools.farm_post({
    kind: "agent", name: "Tool Bot", title: "t", description: "posted via tool",
    category: "Experimental", priceCents: 0, pack, slug: "tool-bot",
  });
  assert.equal(posted.ok, true);
  assert.equal(posted.created, true);
  const back = await tools.farm_get_pack({ slug: "tool-bot" });
  assert.equal(back.ok, true);
  assert.equal(back.pack.profile.name, "Tool Bot");
});
