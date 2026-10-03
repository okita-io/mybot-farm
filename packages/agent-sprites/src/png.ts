import { PNG } from "pngjs";

/**
 * Encode RGBA bytes as a PNG. Filter type 0 + a fixed deflate level keep the
 * bytes stable across runs on the same Node/zlib.
 */
export function encodePng(width: number, height: number, rgba: Uint8Array): Buffer {
  const png = new PNG({
    width,
    height,
    colorType: 6,
    inputColorType: 6,
    inputHasAlpha: true,
    bitDepth: 8,
  });
  if (rgba.length !== width * height * 4) {
    throw new Error(`RGBA length ${rgba.length} != ${width * height * 4}`);
  }
  png.data = Buffer.from(rgba);
  return PNG.sync.write(png, {
    colorType: 6,
    inputColorType: 6,
    inputHasAlpha: true,
    bitDepth: 8,
    deflateLevel: 9,
    filterType: 0,
  });
}
