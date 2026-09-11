import { jsonResponse, optionsResponse } from "@/lib/http";
import { isStallKind, searchStalls, stallRecord } from "@/lib/packs";
import { packTools } from "@/lib/webmcp-catalog";

export function GET(request: Request) {
  const url = new URL(request.url);
  const query =
    url.searchParams.get("q") ?? url.searchParams.get("query") ?? undefined;
  const kindParam = url.searchParams.get("kind");
  const kind = isStallKind(kindParam) ? kindParam : undefined;

  if (kindParam && !kind) {
    return jsonResponse(
      { error: "invalid_kind", kind: kindParam, allowed: ["agent", "team"] },
      { status: 400 },
    );
  }

  const matches = searchStalls(query, kind).map(stallRecord);

  return jsonResponse({
    tool: "search_stalls",
    query: query ?? null,
    kind: kind ?? null,
    count: matches.length,
    stalls: matches,
    tools: packTools.map((tool) => tool.name),
  });
}

export function OPTIONS() {
  return optionsResponse();
}
