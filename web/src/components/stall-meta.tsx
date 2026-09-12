import type { ReactNode } from "react";
import { User, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { type StallKind } from "@/lib/packs";
import { runtimeTag } from "@/lib/runtimes";
import { cn } from "@/lib/utils";

export function StallHeaderMeta({
  kind,
  category,
  categoryClassName,
  runtimes,
  extra,
}: {
  kind: StallKind;
  category?: string;
  categoryClassName?: string;
  runtimes: readonly string[];
  extra?: ReactNode;
}) {
  const KindIcon = kind === "team" ? Users : User;
  const kindLabel = kind === "team" ? "Team" : "Solo agent";

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
