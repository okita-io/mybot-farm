import { resolveApiKeyUser } from "@/lib/api-keys";
import { farmMcpDeps } from "@/lib/mcp-deps";
import { createFarmMcpHttpHandler } from "@/lib/mcp-http";

/**
 * Remote MCP server (Streamable HTTP, stateless) — https://mybot.farm/mcp
 * Anonymous catalog reads; farm_post / farm_update need a seller key
 * (Authorization: Bearer mbf_… or X-Api-Key). Docs: /install/mcp
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handler = createFarmMcpHttpHandler(farmMcpDeps, async (key) => {
  const user = await resolveApiKeyUser(key);
  if (!user) return null;
  return { id: user.id, clerkUserId: user.clerkUserId, keyPrefix: key.slice(0, 12) };
});

export { handler as GET, handler as POST, handler as DELETE, handler as OPTIONS };
