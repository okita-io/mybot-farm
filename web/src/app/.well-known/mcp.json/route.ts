import { mcpServerJson } from "@/lib/mcp-server-json";

export const dynamic = "force-static";

const headers = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "public, max-age=300",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

export function GET() {
  return new Response(JSON.stringify(mcpServerJson, null, 2), { headers });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers });
}
