import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { CatalogControls } from "@/components/catalog-controls";
import { Container } from "@/components/container";
import { StallCard } from "@/components/stall-card";
import {
  canDownloadStall,
  isCatalogSort,
  searchCatalogStalls,
  type CatalogSort,
} from "@/lib/catalog";
import { isStallKind, type StallKind } from "@/lib/packs";
import { site, siteOgImage } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Catalog",
  description:
    "Browse every agent and team stall on mybot.farm. Search by name, author, or category. Filter agents and teams, sort by newest, name, or price.",
  alternates: { canonical: "/catalog" },
  openGraph: {
    title: `Catalog | ${site.name}`,
    description:
      "Browse every agent and team stall on mybot.farm. Search, filter, and sort open stalls.",
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
          All stalls
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-pretty text-muted-foreground">
          Search agents and teams by name, description, category, or author.
          Free seed stalls sit next to community listings.
        </p>

        <div className="mt-10 max-w-3xl">
          <CatalogControls
            initialQuery={q}
            initialKind={kind ?? ""}
            initialSort={sort}
          />
        </div>

        <p className="mt-8 text-sm text-muted-foreground">
          {stalls.length === 1 ? "1 stall" : `${stalls.length} stalls`}
          {q ? ` matching “${q}”` : ""}
        </p>

        {stalls.length ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {await Promise.all(
              stalls.map(async (stall) => {
                const canDownload = await canDownloadStall(stall, userId);
                return (
                  <StallCard
                    key={stall.slug}
                    stall={stall}
                    canDownload={canDownload}
                    signedIn={Boolean(userId)}
                  />
                );
              }),
            )}
          </div>
        ) : (
          <p className="mt-10 rounded-3xl bg-card/50 px-6 py-10 text-base text-muted-foreground ring-1 ring-foreground/10">
            No stalls match that search. Try a different query, or{" "}
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
