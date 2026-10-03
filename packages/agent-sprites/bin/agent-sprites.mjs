#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const compiled = path.join(root, "dist", "cli.js");

try {
  const mod = await import(pathToFileURL(compiled).href);
  const code = await mod.run(process.argv);
  process.exitCode = code;
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("Cannot find module") || message.includes("ERR_MODULE_NOT_FOUND")) {
    process.stderr.write("agent-sprites: run `npm run build` in packages/agent-sprites first.\n");
  }
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
}
