import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  FRAME_H,
  FRAME_W,
  FRAMES_PER_STATE,
  SPRITE_STATES,
  STATE_PLAYBACK,
  buildManifest,
  generateSpriteSheet,
} from "../src/index.ts";

describe("sprite manifest", () => {
  it("matches {frameW, frameH, states:{name:{row, frames, fps, loop}}}", () => {
    const manifest = buildManifest("Harbor Engineer");
    assert.equal(manifest.frameW, FRAME_W);
    assert.equal(manifest.frameH, FRAME_H);
    assert.equal(manifest.sheet, "harbor-engineer.sheet.png");
    assert.deepEqual(Object.keys(manifest.states), [...SPRITE_STATES]);

    SPRITE_STATES.forEach((name, row) => {
      const state = manifest.states[name];
      assert.equal(state.row, row);
      assert.equal(state.frames, FRAMES_PER_STATE);
      assert.equal(state.fps, STATE_PLAYBACK[name].fps);
      assert.equal(state.loop, STATE_PLAYBACK[name].loop);
    });
  });

  it("keeps done from looping and lists a sleeping row", () => {
    const { manifest } = generateSpriteSheet({
      role: "night-watch",
      color: "orange",
      shape: "gem",
    });
    assert.equal(manifest.states.done.loop, false);
    assert.equal(manifest.states.sleeping.row, 5);
    assert.equal(manifest.states.error.row, 4);
  });
});
