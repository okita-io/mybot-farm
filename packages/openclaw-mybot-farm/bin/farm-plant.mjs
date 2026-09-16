#!/usr/bin/env node
/**
 * CLI smoke-test wrapper for mybot-farm (no agent loop).
 *
 *   node bin/farm-plant.mjs search <query> [--limit N]
 *   node bin/farm-plant.mjs get <slug>
 *   node bin/farm-plant.mjs plant <slug> [--agent-id ID] [--workspace DIR] [--force]
 *   node bin/farm-plant.mjs post --kind agent|team --name NAME --title TITLE --description DESC
 *                               --category LABEL --price-cents N --pack pack.json
 *                               [--slug SLUG] [--pack-version N] [--api-key KEY] [--dry-run] [--json]
 *   node bin/farm-plant.mjs update --slug SLUG --kind agent|team --name NAME --title TITLE
 *                               --description DESC --category LABEL --price-cents N --pack pack.json
 */

import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export function usage() {
  return `Usage:
  farm-plant search <query> [--limit N]
  farm-plant get <slug>
  farm-plant plant <slug> [--agent-id ID] [--workspace DIR] [--force]
  farm-plant post --kind agent|team --name NAME --title TITLE --description DESC
                 --category LABEL --price-cents N --pack pack.json
                 [--slug SLUG] [--pack-version N] [--api-key KEY] [--dry-run] [--json]
  farm-plant update --slug SLUG --kind agent|team --name NAME --title TITLE --description DESC
                 --category LABEL --price-cents N --pack pack.json
                 [--pack-version N] [--api-key KEY] [--dry-run] [--json]

Env:
  MYBOT_FARM_URL              override API origin (default https://mybot.farm)
  MYBOT_FARM_WORKSPACE_ROOT   override workspace root (default ~/.openclaw/farm)
  MYBOT_FARM_API_KEY          seller key for post (from https://mybot.farm/sell)

Post publishes GAF JSON to the farm. If you already own the slug, post updates
that stall in place and bumps packVersion. Plant still imports GAF packs into OpenClaw.
Category must be an exact farm label (Lifestyle, Coding, Experimental, …).
price-cents is 0 (free) or 200–999900. Paid listings need Stripe Connect.
`;
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
    else if (a === "--kind") args.kind = argv[++i];
    else if (a === "--name") args.name = argv[++i];
    else if (a === "--title") args.title = argv[++i];
    else if (a === "--description") args.description = argv[++i];
    else if (a === "--category") args.category = argv[++i];
    else if (a === "--price-cents" || a === "--priceCents") {
      const raw = argv[++i];
      args.priceCents = Number(raw);
      if (!Number.isFinite(args.priceCents)) {
        args.flagError = `${a} expected a number`;
      }
    } else if (a === "--pack" || a === "--pack-path") args.packPath = argv[++i];
    else if (a === "--api-key" || a === "--apiKey") args.apiKey = argv[++i];
    else if (a === "--slug") args.slug = argv[++i];
    else if (a === "--pack-version" || a === "--packVersion") {
      const raw = argv[++i];
      args.packVersion = Number(raw);
      if (!Number.isFinite(args.packVersion)) {
        args.flagError = `${a} expected a number`;
      }
    }
    else if (a === "--dry-run" || a === "--dry_run") args.dryRun = true;
    else if (a === "--json") args.json = true;
    else args._.push(a);
  }
  return args;
}

export async function run(argv, { stdout = console.log, stderr = console.error } = {}) {
  const args = parseArgs(argv);
  if (args.help || argv.length === 0) {
    stdout(usage());
    return args.help ? 0 : 1;
  }
  if (args.flagError) {
    stderr(args.flagError);
    return 1;
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
    stdout(JSON.stringify({ query, count, stalls: stalls.map(api.stallSummary) }, null, 2));
    return 0;
  }

  if (cmd === "get") {
    const slug = rest[0];
    if (!slug) throw new Error("get requires a slug");
    const pack = await api.getPack(farm.baseUrl, slug);
    stdout(JSON.stringify(api.packSummary(pack), null, 2));
    return 0;
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
    stdout(JSON.stringify(result, null, 2));
    return 0;
  }

  if (cmd === "post" || cmd === "update") {
    const missing = ["kind", "name", "title", "description", "category", "priceCents"].filter(
      (name) => args[name] == null || args[name] === "",
    );
    let packPath = args.packPath;
    if (rest.length && !packPath) packPath = rest[0];
    if (cmd === "update" && !args.slug) {
      stderr("update requires --slug");
      return 1;
    }
    if (missing.length || !packPath) {
      stderr(
        `${cmd} requires --kind --name --title --description --category --price-cents and --pack <gaf.json>`,
      );
      return 1;
    }
    const { postListing, updateListing } = await import(pathToFileURL(path.join(root, "src/post.mjs")).href);
    const postArgs = {
      kind: args.kind,
      name: args.name,
      title: args.title,
      description: args.description,
      category: args.category,
      priceCents: args.priceCents,
      packPath,
    };
    if (args.dryRun) postArgs.dryRun = true;
    if (args.apiKey) postArgs.apiKey = args.apiKey;
    if (args.slug) postArgs.slug = args.slug;
    if (args.packVersion != null) postArgs.packVersion = args.packVersion;
    const result = cmd === "update"
      ? await updateListing({ args: postArgs, pluginConfig: farm })
      : await postListing({ args: postArgs, pluginConfig: farm });
    if (args.json) {
      stdout(JSON.stringify(result, null, 2));
    } else if (result.text) {
      stdout(result.text);
    } else {
      stdout(JSON.stringify(result, null, 2));
    }
    return result.ok ? 0 : 1;
  }

  stderr(usage());
  throw new Error(`unknown command: ${cmd}`);
}

async function main() {
  try {
    const code = await run(process.argv.slice(2));
    if (code) process.exit(code);
  } catch (err) {
    console.error(err?.stack || String(err));
    process.exit(1);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
