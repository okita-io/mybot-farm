import { jsonResponse, optionsResponse } from "@/lib/http";
import { isCatalogSort, searchCatalogStalls } from "@/lib/catalog";
import { isStallKind, stallRecord } from "@/lib/packs";
import { packTools } from "@/lib/webmcp-catalog";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query =
    url.searchParams.get("q") ?? url.searchParams.get("query") ?? undefined;
  const kindParam = url.searchParams.get("kind");
  const kind = isStallKind(kindParam) ? kindParam : undefined;
  const sortParam = url.searchParams.get("sort");
  const sort = isCatalogSort(sortParam) ? sortParam : "newest";

  if (kindParam && !kind) {
    return jsonResponse(
      { error: "invalid_kind", kind: kindParam, allowed: ["agent", "team"] },
      { status: 400 },
    );
  }

  if (sortParam && !isCatalogSort(sortParam)) {
    return jsonResponse(
      {
        error: "invalid_sort",
        sort: sortParam,
        allowed: ["newest", "name", "price"],
      },
      { status: 400 },
    );
  }

  const matches = (await searchCatalogStalls(query, kind, sort)).map(stallRecord);

  return jsonResponse({
    tool: "search_stalls",
    query: query ?? null,
    kind: kind ?? null,
    sort,
    count: matches.length,
    stalls: matches,
    tools: packTools.map((tool) => tool.name),
  });
}

export function OPTIONS() {
  return optionsResponse();
}
