/**
 * Deterministic PRNG. Same seed string always yields the same sequence.
 * Mulberry32 (public-domain algorithm by Tommy Ettinger), seeded from a
 * 32-bit FNV-1a hash of the role. Replaces mixel's seedrandom xor4096 so
 * this package has no extra RNG dependency.
 */

export type Rng = () => number;

function fnv1a32(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function rngFromSeed(seed: string): Rng {
  return mulberry32(fnv1a32(seed));
}
