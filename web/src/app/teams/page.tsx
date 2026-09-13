import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ContentPage, ContentSection } from "@/components/content-page";
import { JsonLd } from "@/components/json-ld";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { teamsPageLd } from "@/lib/schema";
import { listCatalogStalls } from "@/lib/catalog";
import { stallPagePath } from "@/lib/packs";
import { site, siteOgImage } from "@/lib/site";

const teamsImageAlt =
  "Three glossy figures — a green oval, a pink triangle, and a blue cube — standing together in a cubicle office.";

export const metadata: Metadata = {
  title: "Teams",
  description:
    "Import a pre-coordinated team of agents instead of wiring them one-by-one. Solo agents are fine; many workflows are pairs or crews with roles and handoffs.",
  alternates: { canonical: "/teams" },
  openGraph: {
    title: `Teams | ${site.name}`,
    description:
      "Plant a crew as one pack. Roles and handoffs ship together — you don’t introduce the agents yourself.",
    url: "/teams",
    images: [
      {
        url: "/teams.png",
        width: 1024,
        height: 1024,
        alt: teamsImageAlt,
      },
      siteOgImage,
    ],
  },
};

const comparison = [
  {
    name: "DIY intros",
    body: "Pick each agent, invent who speaks first, stand them up in a group, and hope the handoff rules stick.",
  },
  {
    name: "Pre-coordinated pack",
    body: "One stall ships the members, topology, and standing instructions. Install creates a copy of each member.",
  },
] as const;

const topologies = [
  {
    name: "Pair",
    body: "A ↔ B. Two specialists hand work back and forth — programmer and debugger, writer and editor.",
  },
  {
    name: "Hub",
    body: "A manager routes to specialists. One desk, several jobs.",
  },
  {
    name: "Pipeline",
    body: "A → B → C. Hunt, then enrich, then draft. Work moves in one direction.",
  },
] as const;

export default async function TeamsPage() {
  const teamStalls = (await listCatalogStalls()).filter((stall) => stall.kind === "team");
  return (
    <>
      <JsonLd data={teamsPageLd} />
      <ContentPage
        kicker="Agent Teams"
        title="Plant a crew, not a pile of introductions"
        lead="Solo agents are fine. Many real workflows are pairs or crews with roles and handoffs. Importing a team launches that pre-coordinated pack together — you don’t configure each agent and introduce them to one another."
        hero={
          <Image
            src="/teams.png"
            alt={teamsImageAlt}
            width={1024}
            height={1024}
            priority
            className="h-auto w-full"
          />
        }
      >
        <ContentSection title="Why plant a team">
          <p>
            A team stall is a small group with roles and standing handoffs,
            installable as <strong>one pack</strong>. Installing creates a{" "}
            <strong>copy</strong> of each member, plus suggested grouping when
            the runtime can do it. There is still no live tether back to the
            author’s farm.
          </p>
          <p>
            You can always plant solo agents. Teams exist because the
            introductions are already done.
          </p>
        </ContentSection>

        <ContentSection title="DIY intros vs a packed crew">
          <p>
            Wiring agents one-by-one works. A team pack is useful when the
            coordination is the product — not just the résumés.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {comparison.map((item) => (
              <Card
                key={item.name}
                className="min-w-0 gap-3 py-5 ring-1 ring-foreground/10"
              >
                <CardHeader>
                  <CardTitle className="text-lg font-semibold tracking-tight text-foreground">
                    {item.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-base leading-relaxed text-pretty text-muted-foreground">
                    {item.body}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </ContentSection>

        <ContentSection title="Pair, hub, pipeline">
          <p>
            Topology is documented in prose the host can turn into a group and
            standing instructions. v0 does not require a proprietary wire
            format.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            {topologies.map((item) => (
              <Card
                key={item.name}
                className="min-w-0 gap-3 py-5 ring-1 ring-foreground/10"
              >
                <CardHeader>
                  <CardTitle className="text-lg font-semibold tracking-tight text-foreground">
                    {item.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-base leading-relaxed text-pretty text-muted-foreground">
                    {item.body}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </ContentSection>

        <ContentSection title="Open team stalls">
          <p>
            Browse anonymously. The live team pack is{" "}
            <Link href="/teams/pair-bench">Pair Bench</Link> — Patch implements,
            Probe verifies. Bug reports start with Probe; features start with
            Patch.
          </p>
          <ul>
            {teamStalls.map((stall) => (
              <li key={stall.slug}>
                <Link href={stallPagePath(stall)}>{stall.name}</Link>
                {` — ${stall.title}`}
              </li>
            ))}
            <li>
              <Link href="/sell">Sell</Link> — list a team pack of your own
            </li>
            <li>
              <Link href="/how-to">How-To</Link> — install a pack, including
              each team member
            </li>
            <li>
              <Link href="/plant">Plant</Link> — paste a stall or pack URL and
              preview
            </li>
            <li>
              <Link href="/catalog">Open stalls</Link> — agents and teams on
              the same market
            </li>
          </ul>
        </ContentSection>
      </ContentPage>
    </>
  );
}
