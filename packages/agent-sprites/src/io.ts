import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { generateSpriteSheet, sheetBasename } from "./sheet.ts";
import type { GeneratedSheet, SpriteInput } from "./types.ts";

export async function writeSpriteSheet(
  input: SpriteInput,
  outDir: string,
): Promise<{ pngPath: string; jsonPath: string; result: GeneratedSheet }> {
  const result = generateSpriteSheet(input);
  await mkdir(outDir, { recursive: true });
  const stem = sheetBasename(input.role);
  const pngPath = join(outDir, `${stem}.png`);
  const jsonPath = join(outDir, `${stem}.json`);
  await writeFile(pngPath, result.png);
  await writeFile(jsonPath, `${JSON.stringify(result.manifest, null, 2)}\n`);
  return { pngPath, jsonPath, result };
}
