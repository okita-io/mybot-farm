"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import type { CatalogSort } from "@/lib/catalog";
import type { StallKind } from "@/lib/packs";

function buildCatalogHref(input: {
  q: string;
  kind: "" | StallKind;
  sort: CatalogSort;
}) {
  const params = new URLSearchParams();
  if (input.q.trim()) params.set("q", input.q.trim());
  if (input.kind) params.set("kind", input.kind);
  if (input.sort !== "newest") params.set("sort", input.sort);
  const query = params.toString();
  return query ? `/catalog?${query}` : "/catalog";
}

export function CatalogControls({
  initialQuery,
  initialKind,
  initialSort,
}: {
  initialQuery: string;
  initialKind: "" | StallKind;
  initialSort: CatalogSort;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(initialQuery);
  const [kind, setKind] = useState<"" | StallKind>(initialKind);
  const [sort, setSort] = useState<CatalogSort>(initialSort);

  const href = useMemo(
    () => buildCatalogHref({ q, kind, sort }),
    [q, kind, sort],
  );

  function apply(next?: Partial<{ q: string; kind: "" | StallKind; sort: CatalogSort }>) {
    const payload = {
      q: next?.q ?? q,
      kind: next?.kind ?? kind,
      sort: next?.sort ?? sort,
    };
    startTransition(() => {
      router.push(buildCatalogHref(payload));
    });
  }

  return (
    <form
      className="space-y-4 rounded-3xl bg-card/50 p-5 ring-1 ring-foreground/10"
      onSubmit={(event) => {
        event.preventDefault();
        apply();
      }}
    >
      <label className="block text-sm font-medium text-foreground">
        Search
        <input
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="Find bots, teams, authors…"
          className="mt-2 h-11 w-full rounded-full border border-border bg-background px-4 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-foreground">
          Kind
          <select
            value={kind}
            onChange={(event) => {
              const next = event.target.value as "" | StallKind;
              setKind(next);
              apply({ kind: next });
            }}
            className="mt-2 h-11 w-full rounded-full border border-border bg-background px-4 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="">All</option>
            <option value="agent">Bots</option>
            <option value="team">Teams</option>
          </select>
        </label>
        <label className="block text-sm font-medium text-foreground">
          Sort
          <select
            value={sort}
            onChange={(event) => {
              const next = event.target.value as CatalogSort;
              setSort(next);
              apply({ sort: next });
            }}
            className="mt-2 h-11 w-full rounded-full border border-border bg-background px-4 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="newest">Newest</option>
            <option value="name">Name</option>
            <option value="price">Price</option>
          </select>
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          size="lg"
          className="h-11 rounded-full px-5"
          disabled={pending}
        >
          {pending ? "Searching…" : "Search"}
        </Button>
        {q || kind || sort !== "newest" ? (
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="h-11 rounded-full px-5"
            disabled={pending}
            onClick={() => {
              setQ("");
              setKind("");
              setSort("newest");
              startTransition(() => {
                router.push("/catalog");
              });
            }}
          >
            Clear
          </Button>
        ) : null}
      </div>
      <p className="sr-only">{href}</p>
    </form>
  );
}
