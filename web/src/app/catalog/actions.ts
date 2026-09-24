"use server";

import { auth } from "@clerk/nextjs/server";
import { CatalogStallCards } from "@/components/catalog-stall-cards";
import { isCatalogSort, searchCatalogStalls, type CatalogSort } from "@/lib/catalog";
import { CATALOG_PAGE_SIZE } from "@/lib/catalog-feed";
import { isStallKind, type StallKind } from "@/lib/packs";

export async function loadCatalogChunk(input: {
  offset: number;
  query: string;
  kind: string;
  sort: string;
}) {
  const offset = Number.isFinite(input.offset) ? Math.max(0, Math.floor(input.offset)) : 0;
  const query = typeof input.query === "string" ? input.query.trim().slice(0, 200) : "";
  const kind: StallKind | undefined = isStallKind(input.kind) ? input.kind : undefined;
  const sort: CatalogSort = isCatalogSort(input.sort) ? input.sort : "newest";

  const { userId } = await auth();
  const stalls = await searchCatalogStalls(query || undefined, kind, sort);
  const slice = stalls.slice(offset, offset + CATALOG_PAGE_SIZE);
  const nextOffset = offset + slice.length;

  return {
    cards: slice.length ? await CatalogStallCards({ stalls: slice, userId }) : null,
    nextOffset,
    hasMore: nextOffset < stalls.length,
  };
}
