import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage, ContentSection } from "@/components/content-page";
import { JsonLd } from "@/components/json-ld";
import { pressPageLd } from "@/lib/schema";
import { site } from "@/lib/site";

const headline =
  "mybot.farm Launches an Open Market for AI Agent Teams — Discover Finished Crews, Plant a Copy, Pay Creators";

const subhead =
  "New farmers market lets builders publish whole agents and crews — and get paid when other users plant their work";

export const metadata: Metadata = {
  title: "Press",
  description: `${headline}. ${subhead}`,
  alternates: { canonical: "/press" },
  openGraph: {
    title: `Press | ${site.name}`,
    description: subhead,
    url: "/press",
    type: "article",
    publishedTime: "2026-09-12",
  },
};

export default function PressPage() {
  return (
    <>
      <JsonLd data={pressPageLd} />
      <ContentPage kicker="FOR IMMEDIATE RELEASE" title={headline} lead={subhead}>
        <ContentSection title="September 12, 2026">
          <p>
            Contact: Alex Okita ·{" "}
            <a href="mailto:press@okita.io">press@okita.io</a>
            <br />
            LinkedIn:{" "}
            <a href="https://www.linkedin.com/in/alexokita/">
              linkedin.com/in/alexokita
            </a>
            <br />
            X: <a href="https://x.com/alexokita">x.com/alexokita</a>
            <br />
            Web: <a href={site.url}>{site.name}</a>
          </p>
          <p>
            LOS GATOS, Calif. — {site.name}, now live at{" "}
            <a href={site.url}>{site.url}</a>, is an open market for finished
            AI agents and small teams — persona, memory, skills, and routines
            already composed, with the handoffs baked in.
          </p>
          <p>
            Browse and plant a working crew the way you’d pull a finished pack
            from an open hub. Authors can list a scrubbed stall, set a price,
            and get paid when someone else installs their work — Etsy-style
            creator commerce on top of public discovery. The farm hosts the
            market; buyers run agents in their own apps (Grok Bot, Hermes,
            OpenClaw, and more).
          </p>
          <blockquote>
            “Think of it as an open hub for agent packs, with a real stall for
            makers,” said Alex Okita, founder of {site.name}. “People can browse
            and plant a working crew — and creators can earn when someone else
            installs that work. We built the market so finished teams can
            travel.”
          </blockquote>
        </ContentSection>

        <ContentSection title="Why now">
          <p>
            Agent builders already share skills and prompts. Coordinated teams —
            programmer plus debugger, researcher plus librarian — are harder to
            package and harder to get paid for. Official template marketplaces
            and skills lists cover part of the need. {site.name} focuses on the
            missing product: installable crews plus a creator payout path.
          </p>
        </ContentSection>

        <ContentSection title="How it works">
          <ul>
            <li>
              <strong>Discover:</strong> Browse stalls by life job (Lifestyle,
              Coding, Writing, Marketing, Research, Education, and more).
            </li>
            <li>
              <strong>Plant:</strong> Copy an install prompt or download a
              Generic Agent Format (GAF) pack into Grok Bot; Hermes uses a
              scrubbed profile import path.
            </li>
            <li>
              <strong>Sell:</strong> On <Link href="/sell">/sell</Link>,
              connect Stripe, post a scrubbed agent or team, set a price. The
              farm keeps 10% for hosting; the rest goes to the seller.
            </li>
            <li>
              <strong>Trust:</strong> Buyers get a copy of the profile, skills,
              and routines — not the author’s computer, logins, or chat
              history.
            </li>
            <li>
              <strong>Agent-native:</strong> WebMCP and public JSON APIs (
              <code>search_stalls</code>, <code>get_stall</code>,{" "}
              <code>download_pack</code>, and more) let agents use the farm as
              a tool, not a webpage to scrape.
            </li>
          </ul>
        </ContentSection>

        <ContentSection title="What’s on the tables">
          <p>
            Seed stalls are free and live now, including Gift Day, Sprout,
            Patch, Probe, Grant Research, and the Pair Bench team (Patch +
            Probe). Authors can list their own agents and teams alongside them.
          </p>
          <p>
            Teams are first-class: install a crew as one pack and get local
            copies of each member — no live tether back to the author’s farm.
          </p>
        </ContentSection>

        <ContentSection title="What mybot.farm is">
          <ul>
            <li>
              A market for finished agents and teams, not a skills tip dump
            </li>
            <li>
              A place creators can get paid when others plant their packs
            </li>
            <li>
              Scrubbed copies you own — not the author’s computer, logins, or
              chat history
            </li>
          </ul>
          <blockquote>
            “Sellers bring the craft. Buyers plant a crew. We bring the
            market,” Okita said.
          </blockquote>
        </ContentSection>

        <ContentSection title="Availability">
          <p>
            {site.name} is live at <a href={site.url}>{site.url}</a>. Seed
            stalls are free. Paid listings are open via Stripe Connect at{" "}
            <Link href="/sell">{site.url}/sell</Link>.
          </p>
        </ContentSection>

        <ContentSection title="About mybot.farm">
          <p>
            {site.name} is an open marketplace for sharing and installing whole
            agents and teams — with creator payouts for priced stalls and no
            hosted compute. Clear, searchable, sharable, and agent-friendly.
          </p>
        </ContentSection>

        <ContentSection title="Boilerplate quotes">
          <blockquote>
            “Open discovery for agent packs. Real payouts for the people who
            build them.”
          </blockquote>
          <blockquote>
            “List your stall. Get paid when someone plants your crew.”
          </blockquote>
        </ContentSection>

        <ContentSection title="Media kit / contact">
          <ul>
            <li>
              Founder: Alex Okita (Los Gatos, Calif.) ·{" "}
              <a href="mailto:press@okita.io">press@okita.io</a>
            </li>
            <li>
              LinkedIn:{" "}
              <a href="https://www.linkedin.com/in/alexokita/">
                linkedin.com/in/alexokita
              </a>
              {" · "}
              X: <a href="https://x.com/alexokita">x.com/alexokita</a>
              {" · "}
              Product: <a href={site.url}>{site.name}</a>
              {" · "}
              List a stall: <Link href="/sell">/sell</Link>
            </li>
            <li>
              Spokesperson: Alex Okita ·{" "}
              <a href="mailto:press@okita.io">press@okita.io</a>
            </li>
            <li>
              Media kit — assets on request via{" "}
              <a href="mailto:press@okita.io">press@okita.io</a>
            </li>
          </ul>
        </ContentSection>

        <ContentSection title="Disclaimer">
          <p>
            Shared Bots and third-party stalls are created by their authors, not
            by SpaceXAI. Adding a pack creates a copy on the buyer’s account
            and does not include the author’s computer, logins, or conversation
            history.
          </p>
        </ContentSection>
      </ContentPage>
    </>
  );
}
