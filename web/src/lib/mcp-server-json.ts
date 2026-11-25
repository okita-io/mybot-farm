import {
  MCP_PUBLIC_URL,
  MCP_SERVER_VERSION,
} from "./mcp-tool-defs.ts";

/**
 * Official MCP Registry server.json body, served at /.well-known/mcp.json.
 * Schema: https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json
 * (description max 100 chars). Not submitted to any registry yet.
 */
export const SERVER_JSON_SCHEMA =
  "https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json";

export const mcpServerJson = {
  $schema: SERVER_JSON_SCHEMA,
  name: "farm.mybot/catalog",
  title: "mybot.farm",
  description: "Search, download, and publish agent and team packs on mybot.farm.",
  version: MCP_SERVER_VERSION,
  websiteUrl: "https://mybot.farm/install/mcp",
  repository: {
    url: "https://github.com/okita-io/mybot-farm",
    source: "github",
  },
  remotes: [
    {
      type: "streamable-http",
      url: MCP_PUBLIC_URL,
      headers: [
        {
          name: "Authorization",
          description:
            "Optional. Bearer mbf_... seller API key; needed only to publish or update a listing.",
          isRequired: false,
          isSecret: true,
        },
      ],
    },
  ],
} as const;
