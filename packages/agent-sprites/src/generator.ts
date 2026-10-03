/**
 * Seeded pixel-sprite-generator, ported from:
 *   - zfedoran/pixel-sprite-generator (MIT) — Mask / Sprite / edges / HSL
 *   - seiyria/mixel (MIT) — seedable RNG, transparent empty cells, tint
 *
 * Canvas is not used. Pixels stay in a packed RGBA buffer and are later
 * encoded with pngjs.
 */

import { resolvePalette, type Palette } from "./colors.ts";
import { resolveMask, type Mask } from "./masks.ts";
import { rngFromSeed, type Rng } from "./rng.ts";

const ALWAYS_BORDER = -1;
const EMPTY = 0;
const RANDOM_EMPTY_BODY = 1;
const RANDOM_BORDER_BODY = 2;

const EDGE_BRIGHTNESS = 0.3;
const COLOR_VARIATIONS = 0.2;
const BRIGHTNESS_NOISE = 0.3;

export type NativeSprite = {
  width: number;
  height: number;
  /** Length width*height*4, unpremultiplied RGBA 0–255. */
  rgba: Uint8Array;
};

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = l * (1 - s);
  const q = l * (1 - f * s);
  const t = l * (1 - (1 - f) * s);
  switch (i % 6) {
    case 0:
      return { r: l, g: t, b: p };
    case 1:
      return { r: q, g: l, b: p };
    case 2:
      return { r: p, g: l, b: t };
    case 3:
      return { r: p, g: q, b: l };
    case 4:
      return { r: t, g: p, b: l };
    default:
      return { r: l, g: p, b: q };
  }
}

function getData(data: number[], width: number, x: number, y: number): number {
  return data[y * width + x] ?? EMPTY;
}

function setData(data: number[], width: number, x: number, y: number, value: number): void {
  data[y * width + x] = value;
}

function applyMask(data: number[], width: number, mask: Mask): void {
  for (let y = 0; y < mask.height; y += 1) {
    for (let x = 0; x < mask.width; x += 1) {
      setData(data, width, x, y, mask.data[y * mask.width + x] ?? EMPTY);
    }
  }
}

function generateRandomSample(data: number[], width: number, height: number, rng: Rng): void {
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const val = getData(data, width, x, y);
      if (val === RANDOM_EMPTY_BODY) {
        setData(data, width, x, y, val * Math.round(rng()));
      } else if (val === RANDOM_BORDER_BODY) {
        setData(data, width, x, y, rng() > 0.5 ? RANDOM_EMPTY_BODY : ALWAYS_BORDER);
      }
    }
  }
}

function mirrorX(data: number[], width: number, height: number): void {
  const half = Math.floor(width / 2);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < half; x += 1) {
      setData(data, width, width - x - 1, y, getData(data, width, x, y));
    }
  }
}

function mirrorY(data: number[], width: number, height: number): void {
  const half = Math.floor(height / 2);
  for (let y = 0; y < half; y += 1) {
    for (let x = 0; x < width; x += 1) {
      setData(data, width, x, height - y - 1, getData(data, width, x, y));
    }
  }
}

function generateEdges(data: number[], width: number, height: number): void {
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (getData(data, width, x, y) <= 0) {
        continue;
      }
      if (y - 1 >= 0 && getData(data, width, x, y - 1) === EMPTY) {
        setData(data, width, x, y - 1, ALWAYS_BORDER);
      }
      if (y + 1 < height && getData(data, width, x, y + 1) === EMPTY) {
        setData(data, width, x, y + 1, ALWAYS_BORDER);
      }
      if (x - 1 >= 0 && getData(data, width, x - 1, y) === EMPTY) {
        setData(data, width, x - 1, y, ALWAYS_BORDER);
      }
      if (x + 1 < width && getData(data, width, x + 1, y) === EMPTY) {
        setData(data, width, x + 1, y, ALWAYS_BORDER);
      }
    }
  }
}

function renderPixels(
  data: number[],
  width: number,
  height: number,
  rng: Rng,
  palette: Palette,
): Uint8Array {
  const rgba = new Uint8Array(width * height * 4);
  const isVerticalGradient = rng() > 0.5;
  const saturation = Math.max(Math.min(rng() * palette.saturation, 1), 0.25);
  let hue = palette.hue;

  const ulen = isVerticalGradient ? height : width;
  const vlen = isVerticalGradient ? width : height;
  const tint = {
    r: palette.rgb.r / 255,
    g: palette.rgb.g / 255,
    b: palette.rgb.b / 255,
  };

  for (let u = 0; u < ulen; u += 1) {
    // Original algorithm: mean of three triangular samples in [-1, 1].
    const isNewColor = Math.abs((rng() * 2 - 1 + (rng() * 2 - 1) + (rng() * 2 - 1)) / 3);
    if (isNewColor > 1 - COLOR_VARIATIONS) {
      hue = (palette.hue + (rng() - 0.5) * 0.12 + 1) % 1;
    }

    for (let v = 0; v < vlen; v += 1) {
      const val = isVerticalGradient ? getData(data, width, v, u) : getData(data, width, u, v);
      const index = isVerticalGradient ? (u * vlen + v) * 4 : (v * ulen + u) * 4;

      if (val === EMPTY) {
        rgba[index] = 0;
        rgba[index + 1] = 0;
        rgba[index + 2] = 0;
        rgba[index + 3] = 0;
        continue;
      }

      const brightness =
        Math.sin((u / ulen) * Math.PI) * (1 - BRIGHTNESS_NOISE) + rng() * BRIGHTNESS_NOISE;
      const rgb = hslToRgb(hue, saturation, Math.max(0.15, Math.min(brightness, 0.92)));
      let r = rgb.r;
      let g = rgb.g;
      let b = rgb.b;
      if (val === ALWAYS_BORDER) {
        r *= EDGE_BRIGHTNESS;
        g *= EDGE_BRIGHTNESS;
        b *= EDGE_BRIGHTNESS;
      }
      // Lean the generated color toward the avatar token (mixel tint).
      r = r * 0.45 + r * tint.r * 0.55;
      g = g * 0.45 + g * tint.g * 0.55;
      b = b * 0.45 + b * tint.b * 0.55;

      rgba[index] = Math.round(Math.max(0, Math.min(r, 1)) * 255);
      rgba[index + 1] = Math.round(Math.max(0, Math.min(g, 1)) * 255);
      rgba[index + 2] = Math.round(Math.max(0, Math.min(b, 1)) * 255);
      rgba[index + 3] = 255;
    }
  }

  return rgba;
}

export function generateBaseSprite(role: string, color?: string, shape?: string): NativeSprite {
  const mask = resolveMask(shape);
  const palette = resolvePalette(color);
  const rng = rngFromSeed(role.trim().toLowerCase());
  const width = mask.width * (mask.mirrorX ? 2 : 1);
  const height = mask.height * (mask.mirrorY ? 2 : 1);
  const data = new Array<number>(width * height).fill(ALWAYS_BORDER);

  applyMask(data, width, mask);
  generateRandomSample(data, width, height, rng);
  if (mask.mirrorX) {
    mirrorX(data, width, height);
  }
  if (mask.mirrorY) {
    mirrorY(data, width, height);
  }
  generateEdges(data, width, height);

  return {
    width,
    height,
    rgba: renderPixels(data, width, height, rng, palette),
  };
}

/** Nearest-neighbour scale (integer factor). */
export function scaleNearest(src: NativeSprite, factor: number): NativeSprite {
  if (factor === 1) {
    return { width: src.width, height: src.height, rgba: new Uint8Array(src.rgba) };
  }
  const width = src.width * factor;
  const height = src.height * factor;
  const rgba = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    const sy = Math.floor(y / factor);
    for (let x = 0; x < width; x += 1) {
      const sx = Math.floor(x / factor);
      const si = (sy * src.width + sx) * 4;
      const di = (y * width + x) * 4;
      rgba[di] = src.rgba[si] ?? 0;
      rgba[di + 1] = src.rgba[si + 1] ?? 0;
      rgba[di + 2] = src.rgba[si + 2] ?? 0;
      rgba[di + 3] = src.rgba[si + 3] ?? 0;
    }
  }
  return { width, height, rgba };
}
