export function CatalogCardsFallback({ count = 4 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="clay-surface min-h-64 animate-pulse rounded-3xl bg-card/40"
          aria-hidden
        />
      ))}
    </>
  );
}
