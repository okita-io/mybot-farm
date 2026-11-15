import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { externalWorlds, type ExternalWorld } from "@/lib/external-worlds";
import { isRenderableThumbnail } from "@/lib/world-card";

/**
 * Community towns that are not farm packs. Each card is an outbound link plus
 * a short path for taking an agent the visitor already has on mybot.farm.
 */
export function ExternalWorlds() {
  if (!externalWorlds.length) return null;

  return (
    <section
      id="elsewhere"
      aria-labelledby="elsewhere-heading"
      className="mt-16 border-t border-border/80 pt-14"
    >
      <p className="font-mono text-[0.7rem] font-medium uppercase tracking-[0.2em] text-muted-foreground">
        Elsewhere
      </p>
      <h2
        id="elsewhere-heading"
        className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
      >
        Take a farm agent somewhere fun
      </h2>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-pretty text-muted-foreground sm:text-lg">
        Worlds on this page are stages you plant into Hermes or KiroCrew. The
        towns below are built by other people. Install an agent from the{" "}
        <Link
          href="/catalog"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          catalog
        </Link>
        , then open the project and follow its steps. Install details live in{" "}
        <Link
          href="/how-to"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          How-To
        </Link>
        .
      </p>

      <ul className="mt-8 grid grid-cols-1 gap-6">
        {externalWorlds.map((world) => (
          <li key={world.id} className="min-w-0">
            <ExternalWorldCard world={world} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function ExternalWorldCard({ world }: { world: ExternalWorld }) {
  const image =
    world.image && isRenderableThumbnail(world.image.src) ? world.image : null;

  return (
    <Card className="min-w-0 gap-4 overflow-hidden border border-dashed border-foreground/20 py-0">
      {image ? (
        <a
          href={world.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${world.name} (opens in a new tab)`}
          className="relative block aspect-[8/5] w-full overflow-hidden no-underline"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- static copy of the project's own screenshot */}
          <img
            src={image.src}
            alt={image.alt}
            className="size-full object-cover"
            loading="lazy"
          />
          <span className="absolute left-3 top-3 inline-flex items-center rounded-full border border-foreground/10 bg-background/85 px-2.5 py-1 text-xs font-medium text-foreground backdrop-blur">
            External
          </span>
        </a>
      ) : null}

      <CardHeader className={image ? "gap-2 px-4" : "gap-2 px-4 pt-5"}>
        {image ? null : (
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">External</Badge>
          </div>
        )}
        <CardTitle className="clay-title text-xl font-extrabold tracking-tight">
          <a
            href={world.href}
            target="_blank"
            rel="noopener noreferrer"
            className="underline-offset-4 hover:underline"
          >
            {world.name}
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </CardTitle>
        <p className="text-xs text-muted-foreground">{world.author}</p>
      </CardHeader>
      <CardContent className="space-y-4 px-4 pb-5">
        <p className="text-sm leading-relaxed text-pretty text-foreground/80">
          {world.summary}
        </p>
        <p className="text-sm leading-relaxed text-pretty text-muted-foreground">
          {world.bring}
        </p>
        <Button
          asChild
          variant="outline"
          size="lg"
          className="h-9 rounded-full px-4"
        >
          <a href={world.href} target="_blank" rel="noopener noreferrer">
            {world.linkLabel}
            <ArrowUpRight data-icon="inline-end" aria-hidden="true" />
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}
