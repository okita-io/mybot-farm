import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  grokInstallPromptText,
  grokShortInstallPromptText,
  hermesInstallPromptText,
} from "./install-prompt-copy.ts";

describe("Grok Bot install prompt copy", () => {
  it("tells Grok install to apply avatar, routines, plugins, and gettingStarted", () => {
    const prompt = grokInstallPromptText({
      slug: "gift-day",
      kind: "agent",
      url: "https://mybot.farm/agents/gift-day",
    });
    const short = grokShortInstallPromptText({
      slug: "gift-day",
      kind: "agent",
      name: "Gift Day",
      url: "https://mybot.farm/agents/gift-day",
    });

    assert.match(prompt, /avatarShape\/avatarColor/);
    assert.match(prompt, /pack\.routines/);
    assert.match(prompt, /intention prose/);
    assert.match(prompt, /pack\.plugins/);
    assert.match(prompt, /marketplace pluginId/);
    assert.match(prompt, /gettingStarted\.skill/);
    assert.match(prompt, /first conversation/);
    assert.match(prompt, /members\[\]/);
    assert.match(prompt, /There is no pack\.team key/);
    assert.equal(prompt.includes("If pack.team is present"), false);
    assert.match(short, /pack\.routines as routines/);
    assert.match(short, /gettingStarted\.skill/);
    assert.equal(short.includes("install pack.team"), false);
  });

  it("uses members[] language for Grok team packs, not pack.team", () => {
    const prompt = grokInstallPromptText({
      slug: "pair-bench",
      kind: "team",
      url: "https://mybot.farm/teams/pair-bench",
    });
    const short = grokShortInstallPromptText({
      slug: "pair-bench",
      kind: "team",
      name: "Pair Bench",
      url: "https://mybot.farm/teams/pair-bench",
    });

    assert.match(prompt, /mybot\.farm team pack/);
    assert.match(prompt, /team-pack/);
    assert.match(prompt, /members\[\]/);
    assert.equal(prompt.includes("If pack.team is present"), false);
    assert.match(short, /members\[\] agent/);
    assert.match(short, /not pack\.team/);
  });

  it("keeps Hermes-only packs on the tarball import path", () => {
    const prompt = hermesInstallPromptText({
      slug: "scholastic-research",
      kind: "agent",
      url: "https://mybot.farm/agents/scholastic-research",
    });

    assert.match(prompt, /Hermes agent/);
    assert.match(prompt, /hermes profile import/);
    assert.equal(prompt.includes("pack.routines"), false);
  });
});
