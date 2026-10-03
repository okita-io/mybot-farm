/**
 * Silhouette masks for `profile.avatar.shape`.
 *
 * Mask cell values (pixel-sprite-generator / mixel):
 *   -1 always border
 *    0 empty
 *    1 randomly empty or body
 *    2 randomly border or body
 *
 * Width is the *half* width; `mirrorX` doubles it. Families cover farm shapes
 * from `convert.py` (`SHAPES`) plus Grok mark tokens and team-pack extras
 * (square, hexagon, pentagon, octagon, capsule, book).
 */

export type Mask = {
  width: number;
  height: number;
  mirrorX: boolean;
  mirrorY: boolean;
  data: number[];
};

function mask(width: number, height: number, data: number[]): Mask {
  if (data.length !== width * height) {
    throw new Error(`mask data length ${data.length} != ${width * height}`);
  }
  return { width, height, mirrorX: true, mirrorY: false, data };
}

/** Round head, rounded torso — circle / pebble / blob / dome / cloud. */
const ROUND = mask(6, 10, [
  0, 0, 0, 0, 1, 1,
  0, 0, 0, 1, 1, 1,
  0, 0, 0, 1, 1, 2,
  0, 0, 0, 0, 1, 1,
  0, 0, 0, 1, 1, 1,
  0, 0, 1, 1, 1, 2,
  0, 0, 1, 1, 1, 2,
  0, 0, 1, 1, 1, 1,
  0, 0, 0, 1, 1, 1,
  0, 0, 1, 1, 0, 0,
]);

/** Oval, heavier at the bottom — egg / bean. */
const EGG = mask(6, 10, [
  0, 0, 0, 0, 0, 1,
  0, 0, 0, 0, 1, 1,
  0, 0, 0, 1, 1, 2,
  0, 0, 0, 1, 1, 1,
  0, 0, 1, 1, 1, 1,
  0, 0, 1, 1, 1, 2,
  0, 0, 1, 1, 1, 2,
  0, 0, 1, 1, 1, 1,
  0, 0, 0, 1, 1, 1,
  0, 0, 1, 1, 0, 0,
]);

/** Faceted head — hex / hexagon / octagon / gem / crystal. */
const HEX = mask(6, 10, [
  0, 0, 0, 0, 1, 1,
  0, 0, 0, 1, 1, 1,
  0, 0, 1, 1, 1, 2,
  0, 0, 0, 1, 1, 1,
  0, 0, 0, 0, 1, 1,
  0, 0, 1, 1, 1, 2,
  0, 0, 1, 1, 2, 2,
  0, 0, 1, 1, 1, 1,
  0, 0, 0, 1, 1, 1,
  0, 0, 1, 1, 0, 0,
]);

/** Diamond / pointed-top gem. */
const DIAMOND = mask(6, 10, [
  0, 0, 0, 0, 0, 1,
  0, 0, 0, 0, 1, 1,
  0, 0, 0, 1, 1, 2,
  0, 0, 0, 0, 1, 1,
  0, 0, 0, 1, 1, 1,
  0, 0, 1, 1, 1, 2,
  0, 0, 1, 1, 1, 2,
  0, 0, 0, 1, 1, 1,
  0, 0, 0, 1, 1, 1,
  0, 0, 1, 1, 0, 0,
]);

/** Pointed crown — triangle / wedge / pentagon. */
const TRIANGLE = mask(6, 10, [
  0, 0, 0, 0, 0, 1,
  0, 0, 0, 0, 1, 1,
  0, 0, 0, 1, 1, 2,
  0, 0, 1, 1, 1, 1,
  0, 0, 0, 0, 1, 1,
  0, 0, 0, 1, 1, 1,
  0, 0, 1, 1, 1, 2,
  0, 0, 1, 1, 1, 1,
  0, 0, 0, 1, 1, 1,
  0, 0, 1, 1, 0, 0,
]);

/** Broad upper body, taper — shield / arch. */
const SHIELD = mask(6, 10, [
  0, 0, 0, 1, 1, 1,
  0, 0, 1, 1, 1, 2,
  0, 0, 1, 1, 1, 1,
  0, 0, 0, 1, 1, 1,
  0, 0, 1, 1, 1, 2,
  0, 0, 1, 1, 2, 2,
  0, 0, 1, 1, 1, 1,
  0, 0, 0, 1, 1, 1,
  0, 0, 0, 0, 1, 1,
  0, 0, 0, 1, 1, 0,
]);

/** Pointed top, rounded base — teardrop. */
const TEARDROP = mask(6, 10, [
  0, 0, 0, 0, 0, 1,
  0, 0, 0, 0, 1, 1,
  0, 0, 0, 1, 1, 2,
  0, 0, 0, 1, 1, 1,
  0, 0, 1, 1, 1, 1,
  0, 0, 1, 1, 1, 2,
  0, 0, 1, 1, 1, 2,
  0, 0, 1, 1, 1, 1,
  0, 0, 0, 1, 1, 1,
  0, 0, 0, 1, 0, 0,
]);

/** Slim taper — leaf. */
const LEAF = mask(6, 10, [
  0, 0, 0, 0, 0, 1,
  0, 0, 0, 0, 1, 1,
  0, 0, 0, 1, 1, 1,
  0, 0, 0, 1, 1, 2,
  0, 0, 1, 1, 1, 1,
  0, 0, 1, 1, 1, 2,
  0, 0, 0, 1, 1, 1,
  0, 0, 0, 1, 1, 1,
  0, 0, 0, 0, 1, 1,
  0, 0, 0, 1, 0, 0,
]);

/** Tall rounded rectangle — capsule / cylinder. */
const CAPSULE = mask(6, 10, [
  0, 0, 0, 0, 1, 1,
  0, 0, 0, 1, 1, 1,
  0, 0, 0, 1, 1, 2,
  0, 0, 0, 1, 1, 1,
  0, 0, 0, 1, 1, 1,
  0, 0, 0, 1, 1, 2,
  0, 0, 0, 1, 1, 2,
  0, 0, 0, 1, 1, 1,
  0, 0, 0, 1, 1, 1,
  0, 0, 0, 1, 1, 0,
]);

/** Blocky — square / squircle / tablet / book. */
const SQUARE = mask(6, 10, [
  0, 0, 0, 1, 1, 1,
  0, 0, 0, 1, 1, 2,
  0, 0, 0, 1, 1, 1,
  0, 0, 0, 0, 1, 1,
  0, 0, 1, 1, 1, 1,
  0, 0, 1, 1, 1, 2,
  0, 0, 1, 1, 1, 2,
  0, 0, 1, 1, 1, 1,
  0, 0, 1, 1, 1, 1,
  0, 0, 1, 1, 1, 0,
]);

const FAMILIES: Record<string, Mask> = {
  circle: ROUND,
  pebble: ROUND,
  blob: ROUND,
  dome: ROUND,
  cloud: ROUND,
  egg: EGG,
  bean: EGG,
  hex: HEX,
  hexagon: HEX,
  octagon: HEX,
  gem: HEX,
  crystal: HEX,
  diamond: DIAMOND,
  triangle: TRIANGLE,
  wedge: TRIANGLE,
  pentagon: TRIANGLE,
  shield: SHIELD,
  arch: SHIELD,
  teardrop: TEARDROP,
  leaf: LEAF,
  capsule: CAPSULE,
  cylinder: CAPSULE,
  square: SQUARE,
  squircle: SQUARE,
  tablet: SQUARE,
  book: SQUARE,
};

const DEFAULT_MASK = ROUND;

export function resolveMask(shape?: string): Mask {
  if (!shape || !shape.trim()) {
    return DEFAULT_MASK;
  }
  const key = shape.trim().toLowerCase();
  return FAMILIES[key] ?? DEFAULT_MASK;
}

export function knownShapes(): string[] {
  return Object.keys(FAMILIES).sort();
}
