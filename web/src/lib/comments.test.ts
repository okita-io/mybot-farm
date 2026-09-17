import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  COMMENT_COOLDOWN_MS,
  COMMENT_DAY_LIMIT,
  COMMENT_HOUR_LIMIT,
  COMMENT_STALL_HOUR_LIMIT,
  MAX_COMMENT_WORDS,
  countWords,
  evaluateCommentRateLimit,
  nextCommentVote,
  parseCommentBody,
  parseCommentVote,
  voteDeltas,
} from "./comment-text.ts";

describe("countWords", () => {
  it("ignores extra whitespace", () => {
    assert.equal(countWords("  hello   there\nfriend  "), 3);
  });

  it("counts an empty string as zero", () => {
    assert.equal(countWords("   \n"), 0);
  });
});

describe("parseCommentBody", () => {
  it("trims and accepts a short comment", () => {
    const parsed = parseCommentBody("  Nice bot.\n ");
    assert.equal(parsed.ok, true);
    if (parsed.ok) {
      assert.equal(parsed.body, "Nice bot.");
      assert.equal(parsed.wordCount, 2);
    }
  });

  it("rejects empty input", () => {
    const parsed = parseCommentBody("   ");
    assert.equal(parsed.ok, false);
    if (!parsed.ok) {
      assert.equal(parsed.error, "empty");
    }
  });

  it("rejects more than 500 words", () => {
    const parsed = parseCommentBody(Array.from({ length: 501 }, () => "word").join(" "));
    assert.equal(parsed.ok, false);
    if (!parsed.ok) {
      assert.equal(parsed.error, "too_long");
    }
  });

  it("accepts exactly 500 words", () => {
    const parsed = parseCommentBody(
      Array.from({ length: MAX_COMMENT_WORDS }, () => "word").join(" "),
    );
    assert.equal(parsed.ok, true);
    if (parsed.ok) {
      assert.equal(parsed.wordCount, MAX_COMMENT_WORDS);
    }
  });
});

describe("evaluateCommentRateLimit", () => {
  const now = new Date("2026-09-17T12:00:00.000Z");

  it("enforces a short cooldown", () => {
    const result = evaluateCommentRateLimit(
      [{ slug: "scout", createdAt: new Date(now.getTime() - COMMENT_COOLDOWN_MS + 5_000) }],
      "scout",
      now,
    );
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.retryAfter, 5);
    }
  });

  it("caps comments per hour", () => {
    const result = evaluateCommentRateLimit(
      Array.from({ length: COMMENT_HOUR_LIMIT }, (_, index) => ({
        slug: `bot-${index}`,
        createdAt: new Date(now.getTime() - 60_000 * (index + 1)),
      })),
      "scout",
      now,
    );
    assert.equal(result.ok, false);
  });

  it("caps comments per day", () => {
    const result = evaluateCommentRateLimit(
      Array.from({ length: COMMENT_DAY_LIMIT }, (_, index) => ({
        slug: `bot-${index}`,
        createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000 - index * 60_000),
      })),
      "scout",
      now,
    );
    assert.equal(result.ok, false);
  });

  it("caps comments on one stall per hour", () => {
    const result = evaluateCommentRateLimit(
      Array.from({ length: COMMENT_STALL_HOUR_LIMIT }, (_, index) => ({
        slug: "scout",
        createdAt: new Date(now.getTime() - COMMENT_COOLDOWN_MS - 60_000 * (index + 1)),
      })),
      "scout",
      now,
    );
    assert.equal(result.ok, false);
  });

  it("allows a spaced-out comment", () => {
    const result = evaluateCommentRateLimit(
      [{ slug: "other", createdAt: new Date(now.getTime() - COMMENT_COOLDOWN_MS - 1_000) }],
      "scout",
      now,
    );
    assert.equal(result.ok, true);
  });
});

describe("comment votes", () => {
  it("toggles a vote off when clicked twice", () => {
    assert.equal(nextCommentVote(1, 1), 0);
    assert.equal(nextCommentVote(-1, -1), 0);
  });

  it("switches from down to up", () => {
    assert.equal(nextCommentVote(-1, 1), 1);
    assert.deepEqual(voteDeltas(-1, 1), { up: 1, down: -1 });
  });

  it("adds an up vote from empty", () => {
    assert.equal(nextCommentVote(0, 1), 1);
    assert.deepEqual(voteDeltas(0, 1), { up: 1, down: 0 });
  });

  it("parses thumbs values", () => {
    assert.equal(parseCommentVote(1), 1);
    assert.equal(parseCommentVote(-1), -1);
    assert.equal(parseCommentVote(0), null);
    assert.equal(parseCommentVote("up"), null);
  });
});
