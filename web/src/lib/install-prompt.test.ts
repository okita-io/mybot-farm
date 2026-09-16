import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  grokAgentInstallPrompt,
  grokTeamInstallPrompt,
  shortGrokAgentInstallPrompt,
} from "./install-prompt-copy.ts";
import { catalogStallId } from "./stall-id.ts";

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
