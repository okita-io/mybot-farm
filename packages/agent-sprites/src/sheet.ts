import { composeSheet } from "./animate.ts";
import { generateBaseSprite } from "./generator.ts";
import { encodePng } from "./png.ts";
import {
  FRAME_H,
  FRAME_W,
  FRAMES_PER_STATE,
  SPRITE_STATES,
  STATE_PLAYBACK,
  type GeneratedSheet,
  type SpriteInput,
  type SpriteManifest,
  type SpriteStateInfo,
} from "./types.ts";

export function roleFileStem(role: string): string {
  const stem = role
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return stem || "agent";
}

export function sheetBasename(role: string): string {
  return `${roleFileStem(role)}.sheet`;
}

export function buildManifest(role: string): SpriteManifest {
  const states = {} as SpriteManifest["states"];
  SPRITE_STATES.forEach((name, row) => {
    const play = STATE_PLAYBACK[name];
    const info: SpriteStateInfo = {
      row,
      frames: FRAMES_PER_STATE,
      fps: play.fps,
      loop: play.loop,
    };
    states[name] = info;
  });
  return {
    frameW: FRAME_W,
    frameH: FRAME_H,
    sheet: `${sheetBasename(role)}.png`,
    states,
  };
}

export function generateSpriteSheet(input: SpriteInput): GeneratedSheet {
  const role = input.role.trim();
  if (!role) {
    throw new Error("role is required and seeds the generator");
  }
  const base = generateBaseSprite(role, input.color, input.shape);
  const composed = composeSheet(base);
  return {
    png: encodePng(composed.width, composed.height, composed.sheet),
    manifest: buildManifest(role),
    avatarPng: encodePng(FRAME_W, FRAME_H, composed.avatar),
  };
}
