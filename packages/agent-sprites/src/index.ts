export { composeSheet } from "./animate.ts";
export { resolvePalette } from "./colors.ts";
export { generateBaseSprite, scaleNearest } from "./generator.ts";
export { writeSpriteSheet } from "./io.ts";
export { knownShapes, resolveMask } from "./masks.ts";
export { encodePng } from "./png.ts";
export { rngFromSeed } from "./rng.ts";
export { buildManifest, generateSpriteSheet, roleFileStem, sheetBasename } from "./sheet.ts";
export {
  FRAME_H,
  FRAME_W,
  FRAMES_PER_STATE,
  PULSE_TO_SPRITE,
  SPRITE_STATES,
  STATE_PLAYBACK,
  type GeneratedSheet,
  type PulseState,
  type SpriteInput,
  type SpriteManifest,
  type SpriteState,
  type SpriteStateInfo,
} from "./types.ts";
