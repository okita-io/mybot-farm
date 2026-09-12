import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage, ContentSection } from "@/components/content-page";
import { JsonLd } from "@/components/json-ld";
import { aboutPageLd } from "@/lib/schema";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description:
    "mybot.farm is a farmers market for whole agents and teams — not a warehouse of skills. Browse open stalls, install GAF packs, and use WebMCP.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: `About ${site.productName}`,
    description:
      "An open marketplace for whole agents and teams — not a warehouse of skills.",
    url: "/about",
  },
};

export default function AboutPage() {
  return (
    <>
      <JsonLd data={aboutPageLd} />
      <ContentPage
        kicker="The farm"
        title="A farmers market for whole agents"
        lead={`${site.name} is an open marketplace for finished agents and small teams — persona, memory, skills, and routines already composed. It is not a warehouse of skills. You browse stalls, take a pack home, and cook.`}
      >
        <ContentSection title="What mybot.farm is">
          <p>
            Skills hubs sell capabilities and tips. You still have to assemble
            the teammate. This farm lists{" "}
            <strong>whole agents</strong> and <strong>teams</strong>: a face, a
            job, standing memory, and the procedures they already know. Install
            creates a <strong>copy</strong> on your side. There is no live
            tether back to the author’s machine.
          </p>
          <p>
            The metaphor is a farmers market, not a parts warehouse. Vendors
            bring finished goods. You meet the maker, read what’s in the crate,
            and decide whether to take it home.
          </p>
        </ContentSection>

        <ContentSection title="Who it’s for">
          <p>
            People who want a teammate with a job — gift reminders, a debugger
            pair, a grant researcher — without stacking skills from scratch.
            Authors who already run a Grok Bot or a Hermes profile and want to
            share a scrubbed copy. Agents that would rather call a tool than
            click a page.
          </p>
          <p>
            Lifestyle sits next to coding next to education. Shop by life job,
            not by file format.
          </p>
        </ContentSection>

        <ContentSection title="Open marketplace">
          <p>
            Stalls stay open. Publish, browse, search, and share without a
            gated catalog-of-one. Secrets never ship: keys, private URLs, and
            chat history stay off the table. A pack that isn’t scrubbed
            shouldn’t be listed.
          </p>
          <p>
            Seed stalls are free. Authors list their own packs on{" "}
            <Link href="/sell">Sell</Link> — connect Stripe, set a price, and
            the farm keeps 10% for hosting.
          </p>
        </ContentSection>

        <ContentSection title="GAF packs">
          <p>
            Each stall ships a <strong>Generic Agent Format (GAF)</strong> JSON
            pack: profile, memory, skills, routines, and (for teams) members
            plus handoffs. Same idea as a Grok Bot template — portable enough
            that later runtimes can translate it.
          </p>
          <p>
            Fetch a pack from the stall page, from{" "}
            <code>/packs/agents/{"{slug}"}.json</code>, or from{" "}
            <Link href="/api/packs/grant-research">
              <code>/api/packs/{"{slug}"}</code>
            </Link>
            .
          </p>
        </ContentSection>

        <ContentSection title="WebMCP and install-via-agent">
          <p>
            WebMCP is how agents use the farm as a tool instead of a webpage.
            When the browser exposes <code>document.modelContext</code>, this
            site registers read-only tools: <code>search_stalls</code>,{" "}
            <code>get_stall</code>, <code>download_pack</code>,{" "}
            <code>list_pack_skills</code>, and <code>get_install_prompt</code>.
            The same JSON is public under <Link href="/api">/api</Link>.
          </p>
          <p>
            Humans can copy an install prompt and paste it into a Grok Bot.
            Agents can skip the HTML. Either way you get a copy, not the
            author’s computer, logins, or conversation history.
          </p>
        </ContentSection>

        <ContentSection title="Start here">
          <ul>
            <li>
              <Link href="/#stalls">Open stalls</Link> — Gift Day, Sprout,
              Patch, Probe, Grant Research, Pair Bench
            </li>
            <li>
              <Link href="/teams">Agent Teams</Link> — plant a crew instead of
              wiring agents one-by-one
            </li>
            <li>
              <Link href="/sell">Sell</Link> — list a priced agent or team
            </li>
            <li>
              <Link href="/how-to">How-To</Link> — install a pack in Grok Bot
              or Hermes, or share a scrubbed copy
            </li>
            <li>
              <Link href="/privacy">Privacy</Link> — analytics, not a dossier
            </li>
          </ul>
        </ContentSection>
      </ContentPage>
    </>
  );
}
