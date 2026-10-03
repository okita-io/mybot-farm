import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  gafWorldToKirocrewCrew,
  gafTeamToKirocrewCrew,
} from "../src/gaf-to-kirocrew.mjs";
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
const memberPacks = { patch, probe };

// A plain team (no world block) — used to prove the world path is additive.
const pairBench = {
  format: "mybot.farm/team-pack", slug: "pair-bench",
  profile: { name: "Pair Bench", title: "Programmer + debugger team", description: "Patch implements; Probe verifies." },
  members: [
    { role: "programmer", summary: "impl", pack: "agents/patch.json" },
    { role: "debugger", summary: "verify", pack: "agents/probe.json" },
  ],
  topology: { kind: "pair", handoffs: ["bug → Probe → Patch → Probe"] },
  shared: {
    memory: [{ kind: "profile", content: "A task is not done until Probe confirms." }],
    gettingStarted: "Install Patch and Probe; start bugs with Probe.",
  },
};

// Full worlds/v1 world-pack (mirrors the shipped neon-harbor seed shape).
const neonHarbor = {
  format: "mybot.farm/world-pack", slug: "neon-harbor",
  profile: { name: "Neon Harbor", title: "Harbor world", description: "Patch and Probe in a dock scene." },
  members: [
    { role: "harbor-engineer", summary: "Patch", pack: "agents/patch.json" },
    { role: "night-watch", summary: "Probe", pack: "agents/probe.json" },
  ],
  topology: { kind: "pair", handoffs: ["fault → Night Watch → Harbor Engineer → Night Watch"] },
  shared: {
    memory: [{ kind: "profile", content: "Nothing ships until the Night Watch confirms." }],
    gettingStarted: "Install both into one group named Neon Harbor.",
  },
  world: {
    schema: "worlds/v1",
    title: "Neon Harbor",
    thumbnail: "/packs/worlds/neon-harbor.webp",
    theme: { palette: { bg: "#0b1020" }, mood: "cyberpunk-cozy" },
    places: [
      { id: "dock", name: "The Docks", connects: ["workshop"], present: ["harbor-engineer", "night-watch"] },
      { id: "workshop", name: "The Workshop", connects: ["dock"], present: ["harbor-engineer"] },
    ],
    cast: [
      { role: "harbor-engineer", name: "Patch", home: "workshop", memoryScope: "private",
        capabilities: ["web", "files"], relationships: { "night-watch": "trusted partner", user: "harbor-master" } },
      { role: "night-watch", name: "Probe", home: "dock", memoryScope: "private",
        capabilities: ["web", "files"], relationships: { "harbor-engineer": "trusted partner", user: "harbor-master" } },
    ],
    rules: { turnModel: "defer", handoff: "mention", ambient: false, maxPresent: 6 },
    entrypoint: { place: "dock", greeter: "night-watch" },
    render: { theme: "cyberpunk-cozy", widgetHints: { scenePanel: true } },
  },
};

test("world mapping is additive: a plain team is byte-identical through either path", () => {
  const viaTeam = gafTeamToKirocrewCrew(pairBench, memberPacks);
  // A team-pack has no world block, so the world mapper must degrade to the team result.
  const viaWorld = gafWorldToKirocrewCrew(pairBench, memberPacks);
  assert.equal(viaWorld.world, null);
  assert.equal(viaWorld.worldDoc, null);
  // Templates, bind commands, shared/topology identical (minus the extra "plain team" note).
  assert.deepEqual(
    viaWorld.members.map((m) => m.template),
    viaTeam.members.map((m) => m.template),
  );
  assert.deepEqual(viaWorld.bindCommands, viaTeam.bindCommands);
  assert.equal(viaWorld.topologyDoc, viaTeam.topologyDoc);
});

test("world mapping emits a _world.md doc covering places, cast, turn model, entry", () => {
  const crew = gafWorldToKirocrewCrew(neonHarbor, memberPacks);
  assert.ok(crew.world, "world block carried through");
  assert.ok(crew.worldDoc, "world doc produced");
  assert.ok(crew.worldDoc.path.endsWith("/neon-harbor/_world.md"));
  const doc = crew.worldDoc.content;
  assert.ok(doc.includes("Neon Harbor — world"));
  assert.ok(doc.includes("cyberpunk-cozy"));
  assert.ok(doc.includes("Turn model:** defer"));
  assert.ok(doc.includes("night-watch") && doc.includes("greets first"));
  // places
  assert.ok(doc.includes("The Docks") && doc.includes("The Workshop"));
  assert.ok(doc.includes("present: harbor-engineer, night-watch"));
  // cast skins keyed by role
  assert.ok(doc.includes("**Patch** plays the **harbor-engineer**"));
  assert.ok(doc.includes("home: The Workshop (workshop)"));
  assert.ok(doc.includes("trusted partner"));
  // safety line present
  assert.ok(doc.includes("never grants `execute_bash`"));
});

test("members gain a world skin pointing at _world.md, deny-by-default preserved", () => {
  const crew = gafWorldToKirocrewCrew(neonHarbor, memberPacks);
  const engineer = crew.members.find((m) => m.role === "harbor-engineer");
  const watch = crew.members.find((m) => m.role === "night-watch");
  assert.ok(engineer && watch);
  // Skin names the character + home + world doc ref.
  assert.ok(engineer.template.prompt.includes("You are **Patch**"));
  assert.ok(engineer.template.prompt.includes("You live in **The Workshop**"));
  assert.ok(engineer.template.prompt.includes("_world.md"));
  // Greeter line only on the greeter.
  assert.ok(watch.template.prompt.includes("You greet newcomers"));
  assert.ok(!engineer.template.prompt.includes("You greet newcomers"));
  // Resources include the world doc.
  assert.ok(engineer.template.resources.some((r) => r.includes("_world.md")));
  // Safety: tool allow-list NOT widened by the world's cast capabilities.
  assert.ok(!engineer.template.tools.includes("execute_bash"));
  assert.ok(!engineer.template.tools.includes("fs_write"));
  assert.deepEqual(engineer.template.allowedTools, watch.template.allowedTools);
});

test("plantTeam writes crew + _world.md + world.json for a world-pack", async () => {
  const home = await mkdtemp(join(tmpdir(), "kiro-world2-"));
  try {
    process.env.KIRO_HOME = home;
    const res = await plantTeam(neonHarbor, memberPacks, {});
    assert.equal(res.kind, "world");
    assert.equal(res.wrote, true);
    assert.equal(res.memberNames.length, 2);
    // world.json raw block
    const world = JSON.parse(await readFile(res.worldJsonPath, "utf8"));
    assert.equal(world.title, "Neon Harbor");
    assert.equal(world.entrypoint.greeter, "night-watch");
    // _world.md steering doc
    assert.ok(res.worldDocPath?.endsWith("/_world.md"));
    const doc = await readFile(res.worldDocPath, "utf8");
    assert.ok(doc.includes("## Places"));
    assert.ok(doc.includes("## Cast"));
    // member template carries the world skin
    const engineerName = res.memberNames.find((n) => n === "patch");
    const tpl = JSON.parse(await readFile(join(home, "agents", `${engineerName}.json`), "utf8"));
    assert.ok(tpl.prompt.includes("In the world: Neon Harbor"));
    assert.deepEqual(
      tpl.tools.filter((t) => t === "execute_bash" || t === "fs_write"),
      [],
      "deny-by-default survives world install",
    );
  } finally {
    delete process.env.KIRO_HOME;
    await rm(home, { recursive: true, force: true });
  }
});

test("plantTeam for a plain team writes NO world artifacts", async () => {
  const home = await mkdtemp(join(tmpdir(), "kiro-team2-"));
  try {
    process.env.KIRO_HOME = home;
    const res = await plantTeam(pairBench, memberPacks, {});
    assert.equal(res.kind, "team");
    assert.equal(res.worldJsonPath, null);
    assert.equal(res.worldDocPath, null);
    await assert.rejects(access(join(home, "steering", "farm", "pair-bench", "world.json")));
    await assert.rejects(access(join(home, "steering", "farm", "pair-bench", "_world.md")));
  } finally {
    delete process.env.KIRO_HOME;
    await rm(home, { recursive: true, force: true });
  }
});
