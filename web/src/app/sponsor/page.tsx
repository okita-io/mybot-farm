import type { Metadata } from "next";
import Link from "next/link";
import { SponsorBanner } from "@/components/sponsor-banner";
import { ContentPage, ContentSection } from "@/components/content-page";
import { JsonLd } from "@/components/json-ld";
import { sponsorPageLd } from "@/lib/schema";
import { site, siteOgImage } from "@/lib/site";
import {
  SPONSOR_PRICE_LABEL,
  SPONSOR_PRICE_USD,
  SPONSOR_SLOT_COUNT,
  openSlotCount,
  sponsorRails,
} from "@/lib/sponsors";

export const metadata: Metadata = {
  title: "Sponsor",
  description:
    "Put a named banner in the left or right gutter of mybot.farm. Desktop rails stay beside the catalog; smaller screens rotate the same spots along the bottom.",
  alternates: { canonical: "/sponsor" },
  openGraph: {
    title: `Sponsor | ${site.name}`,
    description:
      "Sponsor a stall on the edges of mybot.farm — a linked banner beside the main catalog.",
    url: "/sponsor",
    images: [siteOgImage],
  },
};

export default function SponsorPage() {
  const { left, right } = sponsorRails();
  const open = openSlotCount();

  return (
    <>
      <JsonLd data={sponsorPageLd} />
      <ContentPage
        kicker="Sponsored spots"
        title="Put a stall on the edge of the market"
        lead="Wide desktops leave air on both sides of the catalog. Those gutters hold five linked banners each — featured farm links today, paid sponsors as the spots fill. Open spots are labeled. House banners are the farm’s own stalls."
      >
        <p className="text-sm text-muted-foreground">
          {SPONSOR_PRICE_LABEL} per placement · {open} open{" "}
          {open === 1 ? "spot" : "spots"} right now
        </p>

        <ContentSection title="What you get">
          <ul>
            <li>
              One placement: name, a two-line description, and a link. Paid
              spots are marked <strong>Sponsored</strong>.
            </li>
            <li>
              Desktop: the left or right rail, sticky beside the main column
              once the viewport is wide enough for both gutters.
            </li>
            <li>
              Smaller screens: the same lineup rotates along the bottom of the
              page. Visitors can pause the rotation.
            </li>
            <li>
              {SPONSOR_SLOT_COUNT * 2} banner positions in total. Featured farm
              banners are placeholders a paid sponsor can replace. Open spots
              fill from the top down. After every position is taken, later
              sponsors share a slot in the chosen column and rotate every six
              seconds.
            </li>
          </ul>
          <p>
            Write{" "}
            <a href="mailto:press@okita.io?subject=Sponsor%20a%20spot%20on%20mybot.farm">
              press@okita.io
            </a>{" "}
            to claim a stall. Say left or right. Checkout will go through
            Stripe; until that form is live, we confirm the copy and URL by
            email. {SPONSOR_PRICE_USD} USD per month, billed until you cancel.
          </p>
        </ContentSection>

        <ContentSection title="On the left" id="left">
          <p>Available positions on the left rail, or a shared slot once the column is full.</p>
          <SlotPreview slots={left} />
        </ContentSection>

        <ContentSection title="On the right" id="right">
          <p>Available positions on the right rail, or a shared slot once the column is full.</p>
          <SlotPreview slots={right} />
        </ContentSection>

        <ContentSection title="Rules">
          <ul>
            <li>No secrets, malware, or packs that are not yours to promote.</li>
            <li>
              The farm can refuse or remove a banner that fights the{" "}
              <Link href="/terms">terms</Link>.
            </li>
            <li>
              Sponsoring a gutter is not a ranking boost in the{" "}
              <Link href="/catalog">catalog</Link>. Listings stay listings.
            </li>
          </ul>
        </ContentSection>
      </ContentPage>
    </>
  );
}

function SlotPreview({
  slots,
}: {
  slots: ReturnType<typeof sponsorRails>["left"];
}) {
  return (
    <div className="mt-5 grid grid-cols-2 gap-3 text-foreground sm:grid-cols-3">
      {slots.map((slot) =>
        slot.creatives[0] ? (
          <SponsorBanner key={slot.id} creative={slot.creatives[0]} />
        ) : null,
      )}
    </div>
  );
}
