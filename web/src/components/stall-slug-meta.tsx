export function StallSlugMeta({
  slug,
  packVersion,
  stallId,
}: {
  slug: string;
  packVersion?: number | null;
  stallId?: string | null;
}) {
  const version = packVersion && packVersion > 0 ? packVersion : 1;

  return (
    <div className="space-y-0.5">
      <p className="font-mono text-sm text-muted-foreground">{slug}</p>
      <p className="font-mono text-xs leading-relaxed break-all text-muted-foreground/80">
        v{version}
        {stallId ? ` · ${stallId}` : null}
      </p>
    </div>
  );
}
