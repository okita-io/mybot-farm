"use client";

import { useEffect, useId, useState } from "react";
import { SponsorBanner } from "@/components/sponsor-banner";
import type { SponsorCreative } from "@/lib/sponsors";

export function SponsorRotation({
  creatives,
  intervalMs,
  layout,
  label,
}: {
  creatives: SponsorCreative[];
  intervalMs: number;
  layout: "rail" | "mobile";
  label: string;
}) {
  const labelId = useId();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const rotating = creatives.length > 1;

  useEffect(() => {
    if (!rotating || paused) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % creatives.length);
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [creatives.length, intervalMs, paused, rotating]);

  const creative = creatives[index] ?? creatives[0];
  if (!creative) return null;

  return (
    <div className={layout === "mobile" ? "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2" : undefined}>
      <div aria-live="polite" aria-atomic="true">
        <SponsorBanner creative={creative} layout={layout} />
      </div>
      {rotating ? (
        <div
          className={
            layout === "mobile"
              ? "grid grid-cols-2 gap-1"
              : "mt-1 flex justify-center gap-1"
          }
        >
          <p id={labelId} className="sr-only">
            {label}
          </p>
          <button
            type="button"
            className="min-h-11 min-w-11 rounded-md text-[0.65rem] font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={() =>
              setIndex((current) => (current - 1 + creatives.length) % creatives.length)
            }
            aria-describedby={labelId}
          >
            Prev
          </button>
          <button
            type="button"
            className="min-h-11 min-w-11 rounded-md text-[0.65rem] font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-pressed={paused}
            aria-describedby={labelId}
            onClick={() => setPaused((current) => !current)}
          >
            {paused ? "Play" : "Pause"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
