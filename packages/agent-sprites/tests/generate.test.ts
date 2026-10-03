import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PNG } from "pngjs";
import {
  FRAME_H,
  FRAME_W,
  FRAMES_PER_STATE,
  PULSE_TO_SPRITE,
  SPRITE_STATES,
  generateSpriteSheet,
} from "../src/index.ts";

const SAMPLE = { role: "harbor-engineer", color: "cyan", shape: "capsule" };

describe("generateSpriteSheet", () => {
  it("is deterministic: same inputs yield identical PNG bytes", () => {
    const a = generateSpriteSheet(SAMPLE);
    const b = generateSpriteSheet(SAMPLE);
    assert.equal(a.png.equals(b.png), true);
    assert.equal(a.avatarPng.equals(b.avatarPng), true);
    assert.deepEqual(a.manifest, b.manifest);
  });

  it("changes bytes when the role seed changes", () => {
    const a = generateSpriteSheet(SAMPLE);
    const b = generateSpriteSheet({ ...SAMPLE, role: "night-watch" });
    assert.equal(a.png.equals(b.png), false);
  });

  it("maps color and shape into different pixels", () => {
    const base = generateSpriteSheet(SAMPLE);
    const recolor = generateSpriteSheet({ ...SAMPLE, color: "orange" });
    const reshape = generateSpriteSheet({ ...SAMPLE, shape: "triangle" });
    assert.equal(base.png.equals(recolor.png), false);
    assert.equal(base.png.equals(reshape.png), false);
  });

  it("encodes a 4×6 grid of 32×32 RGBA frames", () => {
    const { png } = generateSpriteSheet(SAMPLE);
    const decoded = PNG.sync.read(png);
    assert.equal(decoded.width, FRAME_W * FRAMES_PER_STATE);
    assert.equal(decoded.height, FRAME_H * SPRITE_STATES.length);
    assert.equal(decoded.data.length, decoded.width * decoded.height * 4);
  });

  it("maps Hermes pulse states onto sheet rows", () => {
    assert.equal(PULSE_TO_SPRITE.working, "working");
    assert.equal(PULSE_TO_SPRITE.fresh, "thinking");
    assert.equal(PULSE_TO_SPRITE.idle, "idle");
    assert.equal(PULSE_TO_SPRITE.asleep, "sleeping");
  });
});
