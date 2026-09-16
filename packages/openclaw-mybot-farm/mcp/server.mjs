#!/usr/bin/env node
/**
 * Optional MCP stdio bridge exposing farm_search / farm_get_pack / farm_plant.
 * Requires: npm i @modelcontextprotocol/sdk
 * Native OpenClaw tools remain the primary integration path.
 */

import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function main() {
  let Server, StdioServerTransport, CallToolRequestSchema, ListToolsRequestSchema;
  try {
    ({ Server } = await import("@modelcontextprotocol/sdk/server/index.js"));
    ({ StdioServerTransport } = await import("@modelcontextprotocol/sdk/server/stdio.js"));
    ({ CallToolRequestSchema, ListToolsRequestSchema } = await import(
      "@modelcontextprotocol/sdk/types.js"
    ));
  } catch {
    console.error(
      "MCP server requires @modelcontextprotocol/sdk. Run: npm i @modelcontextprotocol/sdk\n" +
        "Or use the native OpenClaw plugin tools instead.",
    );
    process.exit(1);
  }

  const api = await import(pathToFileURL(path.join(root, "src/farm-api.mjs")).href);
  const { plantPack } = await import(pathToFileURL(path.join(root, "src/plant.mjs")).href);
  const farm = api.resolveFarmConfig({});

  const server = new Server(
    { name: "mybot-farm", version: "0.1.0" },
    { capabilities: { tools: {} } },
  );

  const tools = [
    {
      name: "farm_search",
      description: "Search mybot.farm stalls",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string" },
          limit: { type: "number" },
        },
        required: ["query"],
      },
    },
    {
      name: "farm_get_pack",
      description: "Get a mybot.farm GAF pack summary",
      inputSchema: {
        type: "object",
        properties: { slug: { type: "string" } },
        required: ["slug"],
      },
    },
    {
      name: "farm_plant",
      description: "Plant a pack into OpenClaw",
      inputSchema: {
        type: "object",
        properties: {
          slug: { type: "string" },
          agentId: { type: "string" },
          workspace: { type: "string" },
          force: { type: "boolean" },
        },
        required: ["slug"],
      },
    },
  ];

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));
  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const name = req.params.name;
    const args = req.params.arguments ?? {};
    if (name === "farm_search") {
      const { stalls, count } = await api.searchStalls(farm.baseUrl, String(args.query), args.limit);
      const payload = { count, stalls: stalls.map(api.stallSummary) };
      return { content: [{ type: "text", text: JSON.stringify(payload, null, 2) }] };
    }
    if (name === "farm_get_pack") {
      const pack = await api.getPack(farm.baseUrl, String(args.slug));
      return {
        content: [{ type: "text", text: JSON.stringify(api.packSummary(pack), null, 2) }],
      };
    }
    if (name === "farm_plant") {
      const result = await plantPack({
        slug: String(args.slug),
        agentId: args.agentId,
        workspace: args.workspace,
        force: Boolean(args.force),
        config: farm,
      });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
    throw new Error(`Unknown tool: ${name}`);
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
