import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  formatWorldCastLines,
  grokAgentInstallPrompt,
  grokTeamInstallPrompt,
  grokWorldInstallPrompt,
  shortGrokAgentInstallPrompt,
} from "./install-prompt-copy.ts";
import { catalogStallId } from "./stall-id.ts";

const neonHarbor = JSON.parse(
  readFileSync(join(import.meta.dirname, "../../public/packs/worlds/neon-harbor.json"), "utf8"),
);

describe("install prompt copy", () => {
  it("tells Grok install to apply avatar, routines, plugins, and gettingStarted", () => {
    const prompt = grokAgentInstallPrompt({
      url: "https://mybot.farm/agents/gift-day",
      slug: "gift-day",
      name: "Gift Day",
      kind: "agent",
      stallId: catalogStallId("agent", "gift-day"),
      packVersion: 1,
    });
    assert.match(prompt, /avatarShape\/avatarColor/);
    assert.match(prompt, /book→tablet/);
    assert.match(prompt, /pack\.routines/);
    assert.match(prompt, /pack\.plugins/);
    assert.match(prompt, /gettingStarted\.skill/);
    assert.match(prompt, /stallId 11732350-45c3-51ca-a73b-e9e8a1fc57b5/);
    assert.match(prompt, /packVersion 1/);
    assert.match(prompt, /grok-template/);
    assert.doesNotMatch(prompt, /pack\.team/);
  });

  it("does not treat Grok team packs as pack.team", () => {
    const prompt = grokTeamInstallPrompt({
      url: "https://mybot.farm/teams/road-crew",
      slug: "road-crew",
      name: "Road Crew",
      kind: "team",
      stallId: catalogStallId("team", "road-crew"),
      packVersion: 1,
    });
    assert.match(prompt, /members\[\]/);
    assert.match(prompt, /shared\.gettingStarted/);
    assert.doesNotMatch(prompt, /If pack\.team is present/);
  });

  it("names cast members for world packs and rejects a single-bot recipe", () => {
    const prompt = grokWorldInstallPrompt({
      url: "https://mybot.farm/worlds/neon-harbor",
      slug: "neon-harbor",
      name: "Neon Harbor",
      kind: "world",
      stallId: catalogStallId("world", "neon-harbor"),
      packVersion: 1,
    });
    assert.match(prompt, /world-pack/);
    assert.match(prompt, /members\[\]/);
    assert.match(prompt, /world\.places/);
    assert.match(prompt, /turnModel/);
    assert.match(prompt, /one group chat per place/);
    assert.match(prompt, /no 1:1 create_bot_share_json recipe/);
    assert.match(prompt, /Do not create a single bot or group named after the world slug/);
  });

  it("lists Neon Harbor cast names in the world cast appendix", () => {
    const cast = formatWorldCastLines(neonHarbor.members);
    assert.match(cast, /Patch/);
    assert.match(cast, /Probe/);
  });

  it("cites Finders catalog stallId and avatar fallbacks in the short prompt", () => {
    const stallId = catalogStallId("agent", "finders");
    assert.equal(stallId, "04caa770-f6ae-5fad-881b-c77f28ae972c");
    const short = shortGrokAgentInstallPrompt({
      url: "https://mybot.farm/agents/finders",
      slug: "finders",
      name: "Finders",
      kind: "agent",
      stallId,
      packVersion: 1,
    });
    assert.match(short, /diamond→gem/);
    assert.match(short, /stallId 04caa770-f6ae-5fad-881b-c77f28ae972c/);
  });
});
