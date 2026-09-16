#!/usr/bin/env node
/**
 * CLI smoke-test wrapper for mybot-farm (no agent loop).
 *
 *   node bin/farm-plant.mjs search <query> [--limit N]
 *   node bin/farm-plant.mjs get <slug>
 *   node bin/farm-plant.mjs plant <slug> [--agent-id ID] [--workspace DIR] [--force]
 */

import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function usage() {
  console.log(`Usage:
  farm-plant search <query> [--limit N]
  farm-plant get <slug>
  farm-plant plant <slug> [--agent-id ID] [--workspace DIR] [--force]

Env:
  MYBOT_FARM_URL              override API origin (default https://mybot.farm)
  MYBOT_FARM_WORKSPACE_ROOT   override workspace root (default ~/.openclaw/farm)
`);
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--limit") args.limit = Number(argv[++i]);
    else if (a === "--agent-id") args.agentId = argv[++i];
    else if (a === "--workspace") args.workspace = argv[++i];
    else if (a === "--force") args.force = true;
    else if (a === "--help" || a === "-h") args.help = true;
    else args._.push(a);
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || args._.length === 0) {
    usage();
    process.exit(args.help ? 0 : 1);
  }

  const api = await import(pathToFileURL(path.join(root, "src/farm-api.mjs")).href);
  const farm = api.resolveFarmConfig({
    baseUrl: process.env.MYBOT_FARM_URL,
    workspaceRoot: process.env.MYBOT_FARM_WORKSPACE_ROOT || "~/.openclaw/farm",
  });

  const [cmd, ...rest] = args._;

  if (cmd === "search") {
    const query = rest.join(" ").trim();
    if (!query) throw new Error("search requires a query");
    const { stalls, count } = await api.searchStalls(farm.baseUrl, query, args.limit);
    console.log(JSON.stringify({ query, count, stalls: stalls.map(api.stallSummary) }, null, 2));
    return;
  }

  if (cmd === "get") {
    const slug = rest[0];
    if (!slug) throw new Error("get requires a slug");
    const pack = await api.getPack(farm.baseUrl, slug);
    console.log(JSON.stringify(api.packSummary(pack), null, 2));
    return;
  }

  if (cmd === "plant") {
    const slug = rest[0];
    if (!slug) throw new Error("plant requires a slug");
    const { plantPack } = await import(pathToFileURL(path.join(root, "src/plant.mjs")).href);
    const result = await plantPack({
      slug,
      agentId: args.agentId,
      workspace: args.workspace,
      force: Boolean(args.force),
      config: farm,
    });
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  usage();
  throw new Error(`unknown command: ${cmd}`);
}

main().catch((err) => {
  console.error(err?.stack || String(err));
  process.exit(1);
});
