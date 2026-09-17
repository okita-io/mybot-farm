import Link from "next/link";
import { SponsorBanner } from "@/components/sponsor-banner";
import { SponsorRotation } from "@/components/sponsor-rotation";
import {
  SPONSOR_DESKTOP_ROTATION_MS,
  SPONSOR_MOBILE_ROTATION_MS,
  mobileSponsorCreatives,
  sponsorRails,
  type SponsorSide,
  type SponsorSlot,
} from "@/lib/sponsors";
import { cn } from "@/lib/utils";

function RailSlots({ slots }: { slots: SponsorSlot[] }) {
  return (
    <>
      {slots.map((slot) => (
        <div key={slot.id} className="min-w-0">
          {slot.creatives.length > 1 ? (
            <SponsorRotation
              creatives={slot.creatives}
              intervalMs={SPONSOR_DESKTOP_ROTATION_MS}
              layout="rail"
              label={`Sponsored rotation for ${slot.id}`}
            />
          ) : slot.creatives[0] ? (
            <SponsorBanner creative={slot.creatives[0]} />
          ) : null}
        </div>
      ))}
    </>
  );
}

export function SponsorRail({ side }: { side: SponsorSide }) {
  const rails = sponsorRails();
  const slots = rails[side];

  return (
    <aside
      aria-label={`Featured links and sponsorships on the ${side}`}
      className={cn(
        "hidden min-h-0 min-w-0 grid-rows-[auto_repeat(5,8.25rem)] content-start gap-3 px-1.5 pb-8 pt-4",
        "min-[90rem]:sticky min-[90rem]:top-0 min-[90rem]:grid min-[90rem]:self-start min-[90rem]:max-h-dvh min-[90rem]:overflow-y-auto min-[90rem]:overscroll-y-contain",
        side === "left" ? "min-[90rem]:col-start-1" : "min-[90rem]:col-start-3",
      )}
    >
      <p className="mb-0.5 text-center font-mono text-[0.65rem] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        Featured & sponsors
        <Link
          href={`/sponsor#${side}`}
          className="mt-1 block font-sans text-[0.7rem] font-medium normal-case tracking-normal text-foreground underline-offset-4 hover:underline"
        >
          Sponsor a spot
        </Link>
      </p>
      <RailSlots slots={slots} />
    </aside>
  );
}

export function MobileSponsors() {
  const creatives = mobileSponsorCreatives();

  return (
    <aside
      aria-label="Featured links and sponsors"
      className="fixed inset-x-0 top-14 z-40 border-b border-border/80 bg-background/95 p-2 pt-2 shadow-[0_8px_28px_rgba(0,0,0,0.08)] backdrop-blur-xl min-[90rem]:hidden"
    >
      <div className="mx-auto max-w-3xl">
        <SponsorRotation
          creatives={creatives}
          intervalMs={SPONSOR_MOBILE_ROTATION_MS}
          layout="mobile"
          label="Mobile featured and sponsor rotation"
        />
      </div>
    </aside>
  );
}
