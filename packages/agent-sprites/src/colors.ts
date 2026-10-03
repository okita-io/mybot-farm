/**
 * Map `profile.avatar.color` (farm tokens + Grok mark colors + hex) onto a
 * hue/tint used by the pixel-sprite-generator colorizer.
 *
 * Tokens match `avatar_for()` / `COLOR_MAP` in
 * `scripts/import-agency-agents/convert.py` and the Grok mark set in
 * `web/src/lib/gaf-pack.ts`.
 */

export type Rgb = { r: number; g: number; b: number };

export type Palette = {
  hue: number;
  saturation: number;
  rgb: Rgb;
};

const NAMED: Record<string, Palette> = {
  black: { hue: 0.66, saturation: 0.08, rgb: { r: 48, g: 48, b: 52 } },
  gray: { hue: 0.66, saturation: 0.06, rgb: { r: 128, g: 128, b: 136 } },
  brown: { hue: 0.07, saturation: 0.55, rgb: { r: 140, g: 84, b: 48 } },
  red: { hue: 0.0, saturation: 0.72, rgb: { r: 220, g: 56, b: 56 } },
  rose: { hue: 0.96, saturation: 0.62, rgb: { r: 220, g: 72, b: 104 } },
  orange: { hue: 0.08, saturation: 0.7, rgb: { r: 232, g: 124, b: 40 } },
  amber: { hue: 0.12, saturation: 0.72, rgb: { r: 232, g: 176, b: 48 } },
  yellow: { hue: 0.15, saturation: 0.7, rgb: { r: 232, g: 208, b: 48 } },
  gold: { hue: 0.13, saturation: 0.68, rgb: { r: 212, g: 176, b: 48 } },
  lime: { hue: 0.22, saturation: 0.68, rgb: { r: 140, g: 212, b: 48 } },
  green: { hue: 0.33, saturation: 0.62, rgb: { r: 48, g: 176, b: 88 } },
  emerald: { hue: 0.4, saturation: 0.6, rgb: { r: 32, g: 168, b: 112 } },
  teal: { hue: 0.48, saturation: 0.58, rgb: { r: 32, g: 168, b: 160 } },
  cyan: { hue: 0.5, saturation: 0.62, rgb: { r: 48, g: 200, b: 208 } },
  sky: { hue: 0.55, saturation: 0.58, rgb: { r: 64, g: 164, b: 220 } },
  blue: { hue: 0.62, saturation: 0.62, rgb: { r: 56, g: 112, b: 220 } },
  indigo: { hue: 0.7, saturation: 0.58, rgb: { r: 88, g: 80, b: 200 } },
  violet: { hue: 0.76, saturation: 0.6, rgb: { r: 140, g: 80, b: 220 } },
  purple: { hue: 0.78, saturation: 0.6, rgb: { r: 156, g: 72, b: 200 } },
  magenta: { hue: 0.83, saturation: 0.64, rgb: { r: 208, g: 56, b: 168 } },
  fuchsia: { hue: 0.86, saturation: 0.64, rgb: { r: 220, g: 48, b: 180 } },
  pink: { hue: 0.9, saturation: 0.55, rgb: { r: 228, g: 96, b: 160 } },
};

const DEFAULT_PALETTE = NAMED.blue;

function clamp01(n: number): number {
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number } {
  const rr = r / 255;
  const gg = g / 255;
  const bb = b / 255;
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === rr) h = ((gg - bb) / d) % 6;
    else if (max === gg) h = (bb - rr) / d + 2;
    else h = (rr - gg) / d + 4;
    h /= 6;
    if (h < 0) h += 1;
  }
  const l = (max + min) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  return { h, s };
}

function parseHex(raw: string): Rgb | undefined {
  let hex = raw.startsWith("#") ? raw.slice(1) : raw;
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((ch) => ch + ch)
      .join("");
  }
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) {
    return undefined;
  }
  return {
    r: Number.parseInt(hex.slice(0, 2), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    b: Number.parseInt(hex.slice(4, 6), 16),
  };
}

export function resolvePalette(color?: string): Palette {
  if (!color || !color.trim()) {
    return DEFAULT_PALETTE;
  }
  const key = color.trim().toLowerCase();
  if (NAMED[key]) {
    return NAMED[key];
  }
  const rgb = parseHex(key);
  if (rgb) {
    const { h, s } = rgbToHsl(rgb.r, rgb.g, rgb.b);
    return { hue: h, saturation: clamp01(Math.max(s, 0.35)), rgb };
  }
  const first = key.split(/\s+/)[0] ?? "";
  return NAMED[first] ?? DEFAULT_PALETTE;
}
