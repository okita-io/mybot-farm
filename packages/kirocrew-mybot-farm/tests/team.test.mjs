import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gafTeamToKirocrewCrew } from "../src/gaf-to-kirocrew.mjs";
import { plantTeam } from "../src/plant.mjs";

const patch = {
  format: "mybot.farm/agent-pack", slug: "patch",
  profile: { name: "Patch", title: "Implementation programmer", description: "Writes code." },
  skills: [{ name: "small-diff", description: "impl", content: "Scope small." }],
};
const probe = {
  format: "mybot.farm/agent-pack", slug: "probe",
  profile: { name: "Probe", title: "Debugger", description: "Reproduces and verifies." },
  skills: [{ name: "repro", description: "reproduce", content: "Reproduce first." }],
};
const pairBench = {
  format: "mybot.farm/team-pack", slug: "pair-bench",
  profile: { name: "Pair Bench", title: "Programmer + debugger team", description: "Patch implements; Probe verifies." },
  members: [
    { role: "programmer", summary: "impl", pack: "agents/patch.json" },
    { role: "debugger", summary: "verify", pack: "agents/probe.json" },
  ],
  topology: { kind: "pair", handoffs: ["bug → Probe reproduces → Patch patches → Probe verifies"] },
  shared: {
    memory: [{ kind: "profile", content: "A task is not done until Probe confirms." }],
    gettingStarted: "Install Patch and Probe; start bugs with Probe.",
  },
};
const memberPacks = { patch, probe };

test("team maps to workspace + member templates + bind commands", () => {
  const crew = gafTeamToKirocrewCrew(pairBench, memberPacks);
  assert.equal(crew.workspace, "pair-bench");
  assert.equal(crew.members.length, 2);
  assert.deepEqual(crew.members.map((m) => m.name).sort(), ["patch", "probe"]);
  // bind commands: 1 workspace create + 1 per member
  assert.ok(crew.bindCommands[0].startsWith("kirocrew workspace create --name pair-bench"));
  assert.equal(crew.bindCommands.filter((c) => c.startsWith("kirocrew agent create")).length, 2);
  assert.ok(crew.bindCommands.some((c) => c.includes("--kiro-agent patch") && c.includes("--workspace pair-bench")));
  // shared memory + topology preserved
  assert.ok(crew.sharedSteering.content.includes("not done until Probe"));
  assert.ok(crew.topologyDoc.includes("Topology:** pair"));
  assert.ok(crew.topologyDoc.includes("Getting started"));
});

test("unresolved member is noted, not silently dropped", () => {
  const crew = gafTeamToKirocrewCrew(pairBench, { patch }); // probe missing
  assert.equal(crew.members.length, 1);
  assert.ok(crew.notes.some((n) => n.includes("probe")));
});

test("plantTeam writes member templates + shared + topology into KIRO_HOME", async () => {
  const home = await mkdtemp(join(tmpdir(), "kiro-team-"));
  try {
    process.env.KIRO_HOME = home;
    const dry = await plantTeam(pairBench, memberPacks, { dryRun: true });
    assert.equal(dry.wrote, false);
    assert.equal(dry.memberNames.length, 2);

    const res = await plantTeam(pairBench, memberPacks, {});
    assert.equal(res.wrote, true);
    const patchTpl = JSON.parse(await readFile(join(home, "agents", "patch.json"), "utf8"));
    assert.equal(patchTpl.name, "patch");
    const shared = await readFile(res.sharedSteeringPath, "utf8");
    assert.ok(shared.includes("not done until Probe"));
    const topo = await readFile(res.topologyDocPath, "utf8");
    assert.ok(topo.includes("pair"));
  } finally {
    delete process.env.KIRO_HOME;
    await rm(home, { recursive: true, force: true });
  }
});
