import Link from "next/link";
import { stallToneClasses } from "@/lib/packs";
import type { SponsorCreative } from "@/lib/sponsors";
import { cn } from "@/lib/utils";

const toneInk: Record<SponsorCreative["tone"], string> = {
  find: "text-find",
  share: "text-share",
  agent: "text-agent",
};

export function SponsorBanner({
  creative,
  layout = "rail",
}: {
  creative: SponsorCreative;
  layout?: "rail" | "mobile";
}) {
  const open = creative.kind === "open";
  const tone = stallToneClasses[creative.tone];
  const className = cn(
    "w-full rounded-3xl text-foreground no-underline transition-[transform,box-shadow] duration-150 motion-reduce:transition-none",
    layout === "rail"
      ? "flex h-[8.25rem] min-h-[8.25rem] flex-col items-center justify-center gap-1.5 px-2.5 py-3 text-center hover:-translate-y-0.5 motion-reduce:hover:translate-y-0"
      : "grid h-20 grid-cols-[2rem_minmax(0,1fr)] grid-rows-[auto_auto_auto] items-center gap-x-2.5 gap-y-0.5 px-2.5 py-2 text-left",
    open
      ? "clay-surface border border-dashed border-foreground/25 bg-card hover:border-foreground/45"
      : tone.card,
  );

  const inner = (
    <>
      <span
        aria-hidden="true"
        className={cn(
          "clay-chip grid size-8 place-items-center rounded-full font-sans text-lg font-black leading-none tracking-tight",
          layout === "mobile" && "row-span-3",
          open ? "text-muted-foreground" : toneInk[creative.tone],
        )}
      >
        {creative.icon}
      </span>
      <strong
        className={cn(
          "font-heading text-[0.75rem] font-semibold leading-tight tracking-tight",
          layout === "mobile" && "truncate",
          open ? "text-foreground" : tone.label,
        )}
      >
        {creative.name}
      </strong>
      <span
        className={cn(
          "text-[0.7rem] leading-snug text-muted-foreground",
          layout === "rail" && "whitespace-pre-line",
          layout === "mobile" && "line-clamp-2",
        )}
      >
        {layout === "mobile"
          ? creative.blurb.replaceAll("\n", " ")
          : creative.blurb}
      </span>
      <small
        className={cn(
          "font-mono text-[0.65rem] leading-none",
          layout === "mobile" && "truncate",
          open ? "text-foreground/80" : toneInk[creative.tone],
        )}
      >
        {creative.kind === "house"
          ? `Featured · ${creative.hrefLabel}`
          : creative.kind === "sponsor"
            ? `Sponsored · ${creative.hrefLabel}`
            : creative.hrefLabel}
      </small>
    </>
  );

  if (creative.external) {
    return (
      <a
        href={creative.href}
        className={className}
        target="_blank"
        rel={
          creative.kind === "sponsor"
            ? "noopener noreferrer sponsored"
            : "noopener noreferrer"
        }
      >
        {inner}
      </a>
    );
  }

  return (
    <Link href={creative.href} className={className}>
      {inner}
    </Link>
  );
}
