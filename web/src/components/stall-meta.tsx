import type { ReactNode } from "react";
import Link from "next/link";
import { User, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatPriceLabel } from "@/lib/money";
import { type StallAuthor, type StallKind } from "@/lib/packs";
import { runtimeTag } from "@/lib/runtimes";
import { cn } from "@/lib/utils";

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
  const kindLabel = kind === "team" ? "Team" : "Solo agent";
  const showPrice = typeof priceCents === "number";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {category ? (
        <Badge variant="secondary" className={cn("h-6 px-2.5", categoryClassName)}>
          {category}
        </Badge>
      ) : null}
      {runtimes.map((id) => {
        const runtime = runtimeTag(id);

        return runtime ? (
          <Badge key={id} className={cn("h-6 px-2.5", runtime.className)}>
            {runtime.label}
          </Badge>
        ) : null;
      })}
      {author ? (
        <Badge variant="outline" className="h-6 px-2.5 font-normal">
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
            "h-6 px-2.5",
            priceCents <= 0 ? "bg-find/15 text-find-foreground" : undefined,
          )}
        >
          {formatPriceLabel(priceCents)}
        </Badge>
      ) : null}
      <span
        className={cn(
          "inline-flex size-6 items-center justify-center rounded-full text-foreground",
          kind === "team" ? "bg-agent/20" : "bg-foreground/10",
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
