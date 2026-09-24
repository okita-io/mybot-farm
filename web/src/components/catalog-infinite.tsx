"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { loadCatalogChunk } from "@/app/catalog/actions";
import { CatalogCardsFallback } from "@/components/catalog-cards-fallback";
import { Button } from "@/components/ui/button";
import { CATALOG_PAGE_SIZE } from "@/lib/catalog-feed";

const CatalogLoadContext = createContext<(() => void) | null>(null);

/** Mounts with the first page of cards so scrolling does not fetch the next page early. */
export function CatalogLoadTrigger() {
  const arm = useContext(CatalogLoadContext);

  useEffect(() => {
    arm?.();
  }, [arm]);

  return null;
}

export function CatalogInfinite({
  children,
  total,
  query,
  kind,
  sort,
}: {
  children: ReactNode;
  total: number;
  query: string;
  kind: string;
  sort: string;
}) {
  const [chunks, setChunks] = useState<ReactNode[]>([]);
  const [offset, setOffset] = useState(() => Math.min(CATALOG_PAGE_SIZE, total));
  const [hasMore, setHasMore] = useState(total > CATALOG_PAGE_SIZE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [armed, setArmed] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(offset);
  const hasMoreRef = useRef(hasMore);
  const arm = useRef(() => setArmed(true)).current;

  useEffect(() => {
    offsetRef.current = offset;
  }, [offset]);

  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!armed || !sentinel || !hasMore || error) {
      return;
    }

    let active = true;
    let started = false;

    async function loadNext() {
      if (!active || started || !hasMoreRef.current) {
        return;
      }

      started = true;
      setLoading(true);
      setError(false);
      const start = offsetRef.current;

      try {
        const result = await loadCatalogChunk({
          offset: start,
          query,
          kind,
          sort,
        });
        if (!active || start !== offsetRef.current) {
          return;
        }
        if (result.cards) {
          setChunks((current) => [...current, result.cards]);
        }
        offsetRef.current = result.nextOffset;
        hasMoreRef.current = result.hasMore;
        setOffset(result.nextOffset);
        setHasMore(result.hasMore);
      } catch {
        if (active) {
          setError(true);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void loadNext();
        }
      },
      { rootMargin: "640px 0px" },
    );

    observer.observe(sentinel);
    return () => {
      active = false;
      observer.disconnect();
    };
  }, [armed, error, hasMore, kind, offset, query, sort]);

  return (
    <CatalogLoadContext.Provider value={arm}>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {children}
        {chunks}
        {loading ? <CatalogCardsFallback count={2} /> : null}
        {hasMore ? (
          <div ref={sentinelRef} className="col-span-full h-px" aria-hidden />
        ) : null}
        {error ? (
          <div className="col-span-full flex justify-center py-4">
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => setError(false)}
            >
              Couldn’t load more bots. Try again
            </Button>
          </div>
        ) : null}
        <p className="sr-only" aria-live="polite">
          {loading ? "Loading more bots" : ""}
        </p>
      </div>
    </CatalogLoadContext.Provider>
  );
}
