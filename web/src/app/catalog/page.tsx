import type { Metadata } from "next";
import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { CatalogControls } from "@/components/catalog-controls";
import { CatalogInfinite, CatalogLoadTrigger } from "@/components/catalog-infinite";
import { CatalogCardsFallback } from "@/components/catalog-cards-fallback";
import { CatalogStallCards } from "@/components/catalog-stall-cards";
import { Container } from "@/components/container";
import {
  isCatalogSort,
  searchCatalogStalls,
  type CatalogSort,
} from "@/lib/catalog";
import { CATALOG_PAGE_SIZE } from "@/lib/catalog-feed";
import { isStallKind, listingNoun, type StallKind } from "@/lib/packs";
import { site, siteOgImage } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Catalog",
  description:
    "Browse bots and teams on mybot.farm. Search by name, author, or category. Filter bots and teams, sort by newest, name, or price.",
  alternates: { canonical: "/catalog" },
  openGraph: {
    title: `Catalog | ${site.name}`,
    description:
      "Browse bots and teams on mybot.farm. Search, filter, and sort open bots.",
    url: "/catalog",
    images: [siteOgImage],
  },
};

type CatalogSearchParams = {
  q?: string | string[];
  kind?: string | string[];
  sort?: string | string[];
};

function firstParam(value: string | string[] | undefined) {
  return typeof value === "string" ? value : Array.isArray(value) ? value[0] : undefined;
}

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<CatalogSearchParams>;
}) {
  const params = await searchParams;
  const q = firstParam(params.q)?.trim() ?? "";
  const kindParam = firstParam(params.kind);
  const kind: StallKind | undefined = isStallKind(kindParam) ? kindParam : undefined;
  const sortParam = firstParam(params.sort);
  const sort: CatalogSort = isCatalogSort(sortParam) ? sortParam : "newest";

  const { userId } = await auth();
  const stalls = await searchCatalogStalls(q || undefined, kind, sort);

  return (
    <section className="py-16 sm:py-20">
      <Container>
        <p className="font-mono text-[0.7rem] font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Catalog
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          All bots
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-pretty text-muted-foreground">
          Search bots and teams by name, description, category, or author.
          Free seed bots sit next to community listings.
        </p>

        <div className="mt-10 max-w-3xl">
          <CatalogControls
            initialQuery={q}
            initialKind={kind ?? ""}
            initialSort={sort}
          />
        </div>

        <p className="mt-8 text-sm text-muted-foreground">
          {stalls.length === 1
            ? `1 ${listingNoun(kind)}`
            : `${stalls.length} ${listingNoun(kind, "many")}`}
          {q ? ` matching “${q}”` : ""}
        </p>

        {stalls.length ? (
          <CatalogInfinite
            key={`${q}\0${kind ?? ""}\0${sort}`}
            total={stalls.length}
            query={q}
            kind={kind ?? ""}
            sort={sort}
          >
            <Suspense fallback={<CatalogCardsFallback />}>
              <CatalogStallCards
                stalls={stalls.slice(0, CATALOG_PAGE_SIZE)}
                userId={userId}
              />
              <CatalogLoadTrigger />
            </Suspense>
          </CatalogInfinite>
        ) : (
          <p className="clay-surface mt-10 rounded-3xl bg-card/50 px-6 py-10 text-base text-muted-foreground">
            No bots match that search. Try a different query, or{" "}
            <a href="/catalog" className="font-medium text-foreground underline-offset-4 hover:underline">
              clear filters
            </a>
            .
          </p>
        )}
      </Container>
    </section>
  );
}
