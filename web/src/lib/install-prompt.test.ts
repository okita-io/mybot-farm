import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  grokAgentInstallPrompt,
  grokAgentShortInstallPrompt,
  grokTeamInstallPrompt,
  grokTeamShortInstallPrompt,
} from "./gaf-install-copy.ts";

describe("Grok install prompt copy", () => {
  it("tells Grok-assisted install to apply avatar, routines, plugins, and gettingStarted", () => {
    const prompt = grokAgentInstallPrompt("https://mybot.farm/agents/gift-day", "gift-day");

    assert.match(prompt, /profile\.avatar/);
    assert.match(prompt, /book→tablet/);
    assert.match(prompt, /triangle→wedge/);
    assert.match(prompt, /circle→pebble/);
    assert.match(prompt, /diamond→gem/);
    assert.match(prompt, /indigo→violet/);
    assert.match(prompt, /amber→yellow/);
    assert.match(prompt, /lime→green/);
    assert.match(prompt, /pack\.routines/);
    assert.match(prompt, /pack\.plugins/);
    assert.match(prompt, /gettingStarted/);
    assert.match(prompt, /grok-template/);
    assert.doesNotMatch(prompt, /pack\.team/);
  });

  it("installs Grok team packs from members[], not pack.team", () => {
    const prompt = grokTeamInstallPrompt("https://mybot.farm/teams/pair-bench", "pair-bench");

    assert.match(prompt, /members\[\]\.pack/);
    assert.match(prompt, /shared\.gettingStarted/);
    assert.doesNotMatch(prompt, /If pack\.team is present/);
  });
});

describe("short Grok install prompt", () => {
  it("mentions routines, plugins, gettingStarted, and avatar for Grok agents", () => {
    const short = grokAgentShortInstallPrompt(
      "https://mybot.farm/agents/gift-day",
      "gift-day",
      "Gift Day",
    );
    assert.match(short, /routines/);
    assert.match(short, /plugins/);
    assert.match(short, /gettingStarted/);
    assert.match(short, /avatar/);
  });

  it("points teams at members[] instead of pack.team", () => {
    const short = grokTeamShortInstallPrompt(
      "https://mybot.farm/teams/pair-bench",
      "pair-bench",
      "Pair Bench",
    );
    assert.match(short, /members\[\]\.pack/);
    assert.doesNotMatch(short, /pack\.team members if present/);
  });
});
