/**
 * Procedural 32×32 state rows from one base sprite.
 *
 * idle     — 1px bob
 * working  — faster bounce
 * thinking — slow sway
 * done     — hop
 * error    — shake + "!"
 * sleeping — lowered / dimmed + cycling "Zzz"
 */

import { scaleNearest, type NativeSprite } from "./generator.ts";
import {
  FRAME_H,
  FRAME_W,
  FRAMES_PER_STATE,
  SPRITE_STATES,
  type SpriteState,
} from "./types.ts";

const GLYPHS: Record<string, readonly string[]> = {
  "!": [".#.", ".#.", ".#.", "...", ".#."],
  Z: ["###", "..#", ".#.", "#..", "###"],
  z: ["##", ".#", "#."],
};

function blankFrame(): Uint8Array {
  return new Uint8Array(FRAME_W * FRAME_H * 4);
}

function blit(
  dest: Uint8Array,
  dw: number,
  dh: number,
  src: NativeSprite,
  ox: number,
  oy: number,
  dim = 1,
): void {
  for (let y = 0; y < src.height; y += 1) {
    const dy = y + oy;
    if (dy < 0 || dy >= dh) continue;
    for (let x = 0; x < src.width; x += 1) {
      const dx = x + ox;
      if (dx < 0 || dx >= dw) continue;
      const si = (y * src.width + x) * 4;
      const a = src.rgba[si + 3] ?? 0;
      if (a === 0) continue;
      const di = (dy * dw + dx) * 4;
      dest[di] = Math.round((src.rgba[si] ?? 0) * dim);
      dest[di + 1] = Math.round((src.rgba[si + 1] ?? 0) * dim);
      dest[di + 2] = Math.round((src.rgba[si + 2] ?? 0) * dim);
      dest[di + 3] = a;
    }
  }
}

function drawGlyph(
  dest: Uint8Array,
  glyph: string,
  ox: number,
  oy: number,
  color: { r: number; g: number; b: number; a: number },
): void {
  const rows = GLYPHS[glyph];
  if (!rows) return;
  for (let y = 0; y < rows.length; y += 1) {
    const row = rows[y] ?? "";
    for (let x = 0; x < row.length; x += 1) {
      if (row[x] !== "#") continue;
      const dx = ox + x;
      const dy = oy + y;
      if (dx < 0 || dy < 0 || dx >= FRAME_W || dy >= FRAME_H) continue;
      const di = (dy * FRAME_W + dx) * 4;
      dest[di] = color.r;
      dest[di + 1] = color.g;
      dest[di + 2] = color.b;
      dest[di + 3] = color.a;
    }
  }
}

function originFor(sprite: NativeSprite, dx: number, dy: number): { ox: number; oy: number } {
  const ox = Math.floor((FRAME_W - sprite.width) / 2) + dx;
  const oy = Math.floor((FRAME_H - sprite.height) / 2) + 2 + dy;
  return { ox, oy };
}

function frameOffsets(state: SpriteState, i: number): { dx: number; dy: number; dim: number } {
  switch (state) {
    case "idle":
      return { dx: 0, dy: [0, -1, 0, -1][i] ?? 0, dim: 1 };
    case "working":
      return { dx: [0, 1, 0, -1][i] ?? 0, dy: [0, -2, 0, -1][i] ?? 0, dim: 1 };
    case "thinking":
      return { dx: [0, 1, 0, -1][i] ?? 0, dy: [0, -1, 0, 0][i] ?? 0, dim: 1 };
    case "done":
      return { dx: 0, dy: [0, -3, -1, 0][i] ?? 0, dim: 1 };
    case "error":
      return { dx: [0, -1, 1, 0][i] ?? 0, dy: 0, dim: 1 };
    case "sleeping":
      return { dx: 0, dy: [2, 2, 1, 2][i] ?? 2, dim: 0.72 };
    default:
      return { dx: 0, dy: 0, dim: 1 };
  }
}

function paintOverlay(dest: Uint8Array, state: SpriteState, i: number): void {
  if (state === "error") {
    drawGlyph(dest, "!", 24, 3, { r: 255, g: 220, b: 64, a: 255 });
    return;
  }
  if (state === "sleeping") {
    const zColor = { r: 210, g: 230, b: 255, a: 230 };
    if (i === 0) {
      drawGlyph(dest, "Z", 22, 2, zColor);
    } else if (i === 1) {
      drawGlyph(dest, "Z", 21, 2, zColor);
      drawGlyph(dest, "z", 26, 6, zColor);
    } else if (i === 2) {
      drawGlyph(dest, "Z", 20, 1, zColor);
      drawGlyph(dest, "z", 25, 5, zColor);
      drawGlyph(dest, "z", 28, 8, { ...zColor, a: 180 });
    } else {
      drawGlyph(dest, "z", 24, 4, zColor);
    }
  }
}

export function composeSheet(base: NativeSprite): {
  sheet: Uint8Array;
  width: number;
  height: number;
  avatar: Uint8Array;
} {
  const scaled = scaleNearest(base, 2);
  const cols = FRAMES_PER_STATE;
  const rows = SPRITE_STATES.length;
  const width = FRAME_W * cols;
  const height = FRAME_H * rows;
  const sheet = new Uint8Array(width * height * 4);
  let avatar = blankFrame();

  SPRITE_STATES.forEach((state, row) => {
    for (let i = 0; i < cols; i += 1) {
      const frame = blankFrame();
      const { dx, dy, dim } = frameOffsets(state, i);
      const { ox, oy } = originFor(scaled, dx, dy);
      blit(frame, FRAME_W, FRAME_H, scaled, ox, oy, dim);
      paintOverlay(frame, state, i);

      if (state === "idle" && i === 0) {
        avatar = new Uint8Array(frame);
      }

      const destX = i * FRAME_W;
      const destY = row * FRAME_H;
      for (let y = 0; y < FRAME_H; y += 1) {
        const srcOff = y * FRAME_W * 4;
        const dstOff = ((destY + y) * width + destX) * 4;
        sheet.set(frame.subarray(srcOff, srcOff + FRAME_W * 4), dstOff);
      }
    }
  });

  return { sheet, width, height, avatar };
}
