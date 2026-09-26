import type { ReactNode } from "react";
import Link from "next/link";
import { User, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatPriceLabel } from "@/lib/money";
import { type StallAuthor, type StallKind } from "@/lib/packs";
import { runtimeTag, type RuntimeTag } from "@/lib/runtimes";
import { cn } from "@/lib/utils";

function RuntimeBadge({ runtime }: { runtime: RuntimeTag }) {
  const tip = runtime.description;
  const badge = (
    <Badge className={cn("h-8 px-3.5", runtime.className, tip && "cursor-help")}>
      {runtime.label}
    </Badge>
  );

  if (!tip) {
    return badge;
  }

  const className =
    "group/runtime relative inline-flex rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50";
  const tooltip = (
    <>
      <span className="sr-only">. {tip}</span>
      <span
        id={tipId}
        role="tooltip"
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-full z-20 mt-1.5 hidden w-64 rounded-xl border border-foreground/10 bg-background px-3 py-2 text-left text-xs font-normal leading-relaxed text-pretty text-foreground shadow-md group-hover/runtime:block group-focus-visible/runtime:block"
      >
        {tip}
      </span>
    </>
  );

  if (runtime.href) {
    return (
      <Link href={runtime.href} title={tip} className={className}>
        {badge}
        {tooltip}
      </Link>
    );
  }

  return (
    <span tabIndex={0} title={tip} className={className}>
      {badge}
      {tooltip}
    </span>
  );
}

export function StallHeaderMeta({
  kind,
  category,
  categoryClassName,
  runtimes,
  author,
  priceCents,
  extra,
}: {
  kind: StallKind;
  category?: string;
  categoryClassName?: string;
  runtimes: readonly string[];
  author?: StallAuthor | null;
  priceCents?: number | null;
  extra?: ReactNode;
}) {
  const KindIcon = kind === "team" ? Users : User;
  const kindLabel = kind === "team" ? "Team" : "Bot";
  const showPrice = typeof priceCents === "number";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {category ? (
        <Badge variant="outline" className={cn("h-8 px-3.5", categoryClassName)}>
          {category}
        </Badge>
      ) : null}
      {runtimes.map((id) => {
        const runtime = runtimeTag(id);

        return runtime ? <RuntimeBadge key={id} runtime={runtime} /> : null;
      })}
      {author ? (
        <Badge variant="outline" className="h-8 px-3.5 font-normal">
          {author.href ? (
            <Link
              href={author.href}
              className="underline-offset-2 hover:underline"
            >
              {author.username}
            </Link>
          ) : (
            author.username
          )}
        </Badge>
      ) : null}
      {showPrice ? (
        <Badge
          variant="secondary"
          className={cn(
            "h-8 px-3.5",
            priceCents <= 0 ? "bg-find/15 text-find-foreground" : undefined,
          )}
        >
          {formatPriceLabel(priceCents)}
        </Badge>
      ) : null}
      <span
        className={cn(
          "clay-chip inline-flex size-8 items-center justify-center rounded-full border border-foreground/10 bg-background/80 text-foreground",
          kind === "team" ? "bg-agent/15" : undefined,
        )}
        title={kindLabel}
        aria-label={kindLabel}
      >
        <KindIcon className="size-3.5" strokeWidth={2.25} aria-hidden="true" />
      </span>
      {extra}
    </div>
  );
}

export function StallPackStats({
  skillCount,
  memoryLineCount,
  soulLine,
}: {
  skillCount: number;
  memoryLineCount: number;
  soulLine?: string | null;
}) {
  const skillLabel = skillCount === 1 ? "1 skill" : `${skillCount} skills`;
  const memoryLabel =
    memoryLineCount === 0
      ? null
      : memoryLineCount === 1
        ? "1 memory line"
        : `${memoryLineCount} memory lines`;

  return (
    <div className="space-y-2">
      <p className="text-sm text-foreground/70">
        {skillLabel}
        {memoryLabel ? ` · ${memoryLabel}` : null}
      </p>
      {soulLine ? (
        <p className="text-sm leading-relaxed text-pretty text-foreground/70">
          <span className="font-medium text-foreground/85">Soul</span>
          {" — "}
          {soulLine}
        </p>
      ) : null}
    </div>
  );
}

export function formatStallDate(value?: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function StallDates({
  listedAt,
  updatedAt,
}: {
  listedAt?: string | null;
  updatedAt?: string | null;
}) {
  const created = formatStallDate(listedAt);
  const updated = formatStallDate(updatedAt);

  if (!created && !updated) {
    return null;
  }

  return (
    <p className="text-sm text-foreground/70">
      {created ? `Created ${created}` : null}
      {created && updated ? " · " : null}
      {updated ? `Updated ${updated}` : null}
    </p>
  );
}

export function StallRevisionHistory({
  revisions,
}: {
  revisions: {
    packVersion: number;
    summary: string;
    createdAt: string;
  }[];
}) {
  if (!revisions.length) {
    return null;
  }

  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium text-foreground/80">Revision history</p>
      <ul className="space-y-1">
        {revisions.map((revision) => (
          <li
            key={`${revision.packVersion}-${revision.createdAt}`}
            className="text-sm text-foreground/70"
          >
            v{revision.packVersion}
            {" · "}
            {revision.summary}
            {formatStallDate(revision.createdAt)
              ? ` · ${formatStallDate(revision.createdAt)}`
              : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
