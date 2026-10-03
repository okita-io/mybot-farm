/** Animation states written as rows on the sheet. */
export const SPRITE_STATES = [
  "idle",
  "working",
  "thinking",
  "done",
  "error",
  "sleeping",
] as const;

export type SpriteState = (typeof SPRITE_STATES)[number];

/** Hermes-Worlds session pulse → sheet state (cosmetic overlay only). */
export const PULSE_TO_SPRITE = {
  working: "working",
  fresh: "thinking",
  idle: "idle",
  asleep: "sleeping",
} as const;

export type PulseState = keyof typeof PULSE_TO_SPRITE;

export type SpriteStateInfo = {
  row: number;
  frames: number;
  fps: number;
  loop: boolean;
};

/**
 * Runtime manifest. Grid form so an AI-made sheet (e.g. aldegad/sprite-gen)
 * can replace the PNG without code changes: same `states.{name}.{row,frames,fps,loop}`.
 */
export type SpriteManifest = {
  frameW: number;
  frameH: number;
  sheet: string;
  states: Record<SpriteState, SpriteStateInfo>;
};

export type SpriteInput = {
  /** Cast role. Seeds the pixel-sprite-generator RNG. */
  role: string;
  /** `profile.avatar.color` — named token or `#rrggbb`. */
  color?: string;
  /** `profile.avatar.shape` — geometric silhouette token. */
  shape?: string;
};

export type GeneratedSheet = {
  png: Buffer;
  manifest: SpriteManifest;
  /** Idle frame 0, suitable as `cast[].avatar` for runtimes that ignore `sprite`. */
  avatarPng: Buffer;
};

export const FRAME_W = 32;
export const FRAME_H = 32;
export const FRAMES_PER_STATE = 4;

export const STATE_PLAYBACK: Record<SpriteState, { fps: number; loop: boolean }> = {
  idle: { fps: 4, loop: true },
  working: { fps: 8, loop: true },
  thinking: { fps: 3, loop: true },
  done: { fps: 6, loop: false },
  error: { fps: 4, loop: true },
  sleeping: { fps: 2, loop: true },
};
