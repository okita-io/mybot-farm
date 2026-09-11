import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage, ContentSection } from "@/components/content-page";
import { JsonLd } from "@/components/json-ld";
import { privacyPageLd } from "@/lib/schema";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "mybot.farm uses standard web analytics. We do not sell personal data. Pack downloads and install prompts are product features, not tracking.",
  alternates: { canonical: "/privacy" },
  openGraph: {
    title: `Privacy | ${site.name}`,
    description:
      "Plain-language privacy: visits and page views, no selling personal data, packs are a product feature.",
    url: "/privacy",
  },
};

export default function PrivacyPage() {
  return (
    <>
      <JsonLd data={privacyPageLd} />
      <ContentPage
        kicker="Privacy"
        title="We are not building a dossier"
        lead="mybot.farm is a public marketplace. The owner is not interested in collecting personal intel beyond ordinary web analytics — visits, page views, maybe clicks. We do not sell personal data."
      >
        <ContentSection title="What this site is">
          <p>
            The farm shows stalls, GAF packs, and install prompts. Those are
            product features: you asked to read a page or download a pack. That
            is not a side channel for profiling you.
          </p>
          <p>
            Last updated September 11, 2026. This is a plain-language policy,
            not a law-firm novel.
          </p>
        </ContentSection>

        <ContentSection title="Analytics">
          <p>
            We may use standard web analytics (for example Vercel Analytics) to
            see how the site is used at a high level:
          </p>
          <ul>
            <li>Visits and which pages are viewed</li>
            <li>Rough geography or device class, if the analytics tool reports it</li>
            <li>Maybe clicks on stalls, downloads, or install-prompt copies</li>
          </ul>
          <p>
            That helps decide what to plant next. It is not an invitation to
            build identity graphs, retarget you across the web, or watch you
            from a pixel farm. We are not promising “zero cookies forever” or
            other absolute tracking claims that break the first time a host
            adds a dashboard.
          </p>
        </ContentSection>

        <ContentSection title="What we do not do">
          <ul>
            <li>Sell personal data</li>
            <li>Ask for an account to browse stalls or download free packs</li>
            <li>Use pack downloads or install prompts as hidden trackers</li>
            <li>
              Collect conversation history from a Bot you install — that copy
              lives on your side
            </li>
          </ul>
        </ContentSection>

        <ContentSection title="Packs, APIs, and prompts">
          <p>
            Public JSON under <code>/packs</code> and <code>/api</code> is
            meant to be fetched — by you, by a Grok Bot, or by WebMCP. Request
            logs that a host keeps (IP, user agent, path) are ordinary server
            hygiene, not a research panel. Don’t put secrets in a pack you
            publish.
          </p>
        </ContentSection>

        <ContentSection title="Links">
          <ul>
            <li>
              <Link href="/about">About the farm</Link>
            </li>
            <li>
              <Link href="/how-to">How to install or share</Link>
            </li>
            <li>
              <Link href="/#stalls">Open stalls</Link>
            </li>
          </ul>
        </ContentSection>
      </ContentPage>
    </>
  );
}
