#!/usr/bin/env node
// farm-mcp — a minimal stdio MCP server exposing the kirocrew-mybot-farm plugin
// tools (farm_search / farm_get_stall / farm_get_pack / farm_plant /
// farm_reinstall / farm_post / farm_update) to a KiroCrew runtime.
//
// This is the OPT-IN wiring path (world-install-contract §6, option 2). The
// default surface is the zero-dependency CLI (bin/farm-plant.mjs); this server
// exists so a user who wants the farm_* tools callable as MCP tools can register
// one entry in ~/.kiro/crew/config.json — see docs/kirocrew-runtime-wiring.md.
//
// Protocol: JSON-RPC 2.0 over stdio, newline-delimited. Implements the subset
// MCP hosts need: initialize, tools/list, tools/call. No external deps.
//
// Env: MYBOT_FARM_URL (default https://mybot.farm), MYBOT_FARM_API_KEY (mbf_…,
// only for farm_post/farm_update), KIRO_HOME (default ~/.kiro).

import { createInterface } from "node:readline";
import { tools } from "../src/tools.mjs";

const SERVER_INFO = { name: "mybot-farm", version: "0.2.0" };

// Tool metadata (name/description/inputSchema) mirrored from plugin.yaml so an
// MCP host can advertise them. readOnly flags match the plugin's register().
const TOOL_DEFS = [
  { name: "farm_search", description: "Search mybot.farm bots (agents, teams, worlds). Args: query?, kind? (agent|team|world). Read-only.",
    inputSchema: { type: "object", properties: { query: { type: "string" }, kind: { type: "string", enum: ["agent", "team", "world"] } } } },
  { name: "farm_get_stall", description: "Get one bot's metadata + pack summary by slug. Read-only.",
    inputSchema: { type: "object", properties: { slug: { type: "string" } }, required: ["slug"] } },
  { name: "farm_get_pack", description: "Download the GAF pack for a slug (agent, team, or world). Paid packs return 402. Read-only.",
    inputSchema: { type: "object", properties: { slug: { type: "string" } }, required: ["slug"] } },
  { name: "farm_plant", description: "Plant a bot into KiroCrew. Agent → template; team → crew + bind commands; world → crew + world.json + _world.md scene doc + per-character skins (cast capabilities advisory only, never widen the allow-list). Args: slug, name?, workspace?, force?, reinstall?, clean?, dryRun?.",
    inputSchema: { type: "object", properties: { slug: { type: "string" }, name: { type: "string" }, workspace: { type: "string" }, force: { type: "boolean" }, reinstall: { type: "boolean" }, clean: { type: "boolean" }, dryRun: { type: "boolean" } }, required: ["slug"] } },
  { name: "farm_reinstall", description: "Re-plant a bot (agent, team, or world), overwriting an existing template when force is set. Args: slug, force?, dryRun?.",
    inputSchema: { type: "object", properties: { slug: { type: "string" }, force: { type: "boolean" }, clean: { type: "boolean" }, dryRun: { type: "boolean" } }, required: ["slug"] } },
  { name: "farm_post", description: "Publish a GAF listing with the seller key (env MYBOT_FARM_API_KEY). Args: kind, name, title, description, category, priceCents, pack, slug?.",
    inputSchema: { type: "object", properties: { kind: { type: "string" }, name: { type: "string" }, title: { type: "string" }, description: { type: "string" }, category: { type: "string" }, priceCents: { type: "integer" }, pack: { type: "object" }, slug: { type: "string" } }, required: ["kind", "name", "title", "description", "category", "pack"] } },
  { name: "farm_update", description: "Update an owned listing in place. Same fields as farm_post plus required slug.",
    inputSchema: { type: "object", properties: { slug: { type: "string" }, kind: { type: "string" }, name: { type: "string" }, title: { type: "string" }, description: { type: "string" }, category: { type: "string" }, priceCents: { type: "integer" }, pack: { type: "object" } }, required: ["slug"] } },
];

function send(msg) {
  process.stdout.write(JSON.stringify(msg) + "\n");
}

function reply(id, result) {
  send({ jsonrpc: "2.0", id, result });
}

function replyError(id, code, message) {
  send({ jsonrpc: "2.0", id, error: { code, message } });
}

async function handle(req) {
  const { id, method, params } = req;

  if (method === "initialize") {
    reply(id, {
      protocolVersion: params?.protocolVersion ?? "2024-11-05",
      capabilities: { tools: {} },
      serverInfo: SERVER_INFO,
    });
    return;
  }

  if (method === "notifications/initialized" || method === "initialized") {
    return; // notification, no response
  }

  if (method === "tools/list") {
    reply(id, { tools: TOOL_DEFS });
    return;
  }

  if (method === "tools/call") {
    const name = params?.name;
    const args = params?.arguments ?? {};
    const fn = tools[name];
    if (!fn) {
      replyError(id, -32601, `unknown tool: ${name}`);
      return;
    }
    try {
      const result = await fn(args);
      reply(id, {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        isError: result && result.ok === false,
      });
    } catch (err) {
      reply(id, {
        content: [{ type: "text", text: JSON.stringify({ ok: false, error: "tool_threw", message: String(err?.message ?? err) }) }],
        isError: true,
      });
    }
    return;
  }

  if (id !== undefined) {
    replyError(id, -32601, `method not found: ${method}`);
  }
}

const rl = createInterface({ input: process.stdin });
rl.on("line", async (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;
  let req;
  try {
    req = JSON.parse(trimmed);
  } catch {
    return; // ignore non-JSON lines
  }
  await handle(req);
});
