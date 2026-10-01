import Link from "next/link";
import { Globe } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { stallPagePath, type Stall } from "@/lib/packs";
import { isRenderableThumbnail } from "@/lib/world-card";
import { normalizeRuntimes, runtimeTag } from "@/lib/runtimes";
import { cn } from "@/lib/utils";

/**
 * World listing card: a thumbnail of what the world looks like, the world name
 * and description, and the runtimes it is compatible with as badges. Falls back
 * to a themed placeholder when the world has no renderable thumbnail.
 */
export function WorldCard({ stall }: { stall: Stall }) {
  const href = stallPagePath(stall);
  // Runtime badges: prefer the explicit stall.runtimes, else normalize whatever
  // the pack carried. normalizeRuntimes keeps canonical order + drops unknowns.
  const runtimes = normalizeRuntimes(stall.runtimes);
  const thumbnail = stall.thumbnail;

  return (
    <Card className="group/card min-w-0 gap-4 py-0">
      <Link
        href={href}
        aria-label={stall.name}
        className="relative block aspect-[16/9] w-full overflow-hidden no-underline"
      >
        {isRenderableThumbnail(thumbnail) ? (
          // eslint-disable-next-line @next/next/no-img-element -- static farm asset, no loader needed
          <img
            src={thumbnail}
            alt={`${stall.name} world`}
            className="size-full object-cover transition-transform duration-300 group-hover/card:scale-[1.03]"
            loading="lazy"
          />
        ) : (
          <WorldThumbnailPlaceholder name={stall.name} />
        )}
        <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-foreground/10 bg-background/85 px-2.5 py-1 text-xs font-medium text-foreground backdrop-blur">
          <Globe className="size-3.5" strokeWidth={2.25} aria-hidden="true" />
          World
        </span>
      </Link>

      <CardHeader className="gap-2 px-4">
        <CardTitle className="clay-title text-xl font-extrabold tracking-tight">
          <Link href={href} className="underline-offset-4 hover:underline">
            {stall.name}
          </Link>
        </CardTitle>
        <CardDescription className="text-sm text-foreground/70">
          {stall.title}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 px-4 pb-5">
        <p className="line-clamp-3 text-sm leading-relaxed text-pretty text-foreground/80">
          {stall.description}
        </p>
        {runtimes.length ? (
          <div className="flex flex-wrap gap-1.5">
            <span className="sr-only">Compatible runtimes:</span>
            {runtimes.map((id) => {
              const runtime = runtimeTag(id);
              return runtime ? (
                <Badge
                  key={id}
                  className={cn("h-7 px-3", runtime.className)}
                  title={runtime.description}
                >
                  {runtime.label}
                </Badge>
              ) : null;
            })}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

/** A deterministic themed gradient when a world ships no thumbnail. */
function WorldThumbnailPlaceholder({ name }: { name: string }) {
  // Derive two hues from the name so each world gets a stable, distinct swatch.
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) % 360;
  }
  const h1 = hash;
  const h2 = (hash + 48) % 360;

  return (
    <span
      aria-hidden="true"
      className="flex size-full items-center justify-center"
      style={{
        backgroundImage: `linear-gradient(135deg, oklch(0.55 0.16 ${h1}), oklch(0.45 0.18 ${h2}))`,
      }}
    >
      <Globe
        className="size-12 text-white/70"
        strokeWidth={1.5}
        aria-hidden="true"
      />
    </span>
  );
}
