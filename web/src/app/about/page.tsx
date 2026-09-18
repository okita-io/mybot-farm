import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage, ContentSection } from "@/components/content-page";
import { JsonLd } from "@/components/json-ld";
import { aboutPageLd } from "@/lib/schema";
import { site, siteOgImage } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description:
    "mybot.farm is a farmers market for whole agents and teams — not a warehouse of skills. Browse the catalog to plant packs; this page explains what you’re planting.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: `About ${site.productName}`,
    description:
      "An open marketplace for whole agents and teams — not a warehouse of skills.",
    url: "/about",
    images: [siteOgImage],
  },
};

const glossary = [
  {
    term: "Agent Runtime",
    meaning:
      "The workshop (Grok Bot, Hermes, OpenClaw…) that runs agents",
  },
  {
    term: "Agent",
    meaning: "A teammate with a job: Core + tools it can call",
  },
  {
    term: "Agent Core",
    meaning: "Portable “soul”: identity, directives, memory seed, skills",
  },
  {
    term: "Context",
    meaning:
      "The limited spotlight — history, instructions, tools, and memory compete for space",
  },
  {
    term: "Tools",
    meaning: "Live hooks into the world (Gmail, GitHub, calendars…) from a provider",
  },
  {
    term: "Skills",
    meaning:
      "Instruction manuals for how to do something; thousands overlap, good ones are hard to find",
  },
  {
    term: "Memory",
    meaning: "What you train into an agent so it prefers your workflow",
  },
  {
    term: "Routines",
    meaning: "Cron / heartbeats — work that runs without you watching",
  },
  {
    term: "Team / crew",
    meaning:
      "Several agents with roles + standing handoffs, plantable as one pack",
  },
] as const;

const comparison = [
  {
    diy: "Pick each agent, invent who speaks first, stand them up in a group, hope handoff rules stick",
    packed:
      "One pack ships members, topology, and standing instructions",
  },
  {
    diy: "You debug introductions for a week",
    packed:
      "Install creates a copy of each member; intros are already done",
  },
  {
    diy: "Easy to end up with three strangers in a chat",
    packed:
      "Pair, hub, or pipeline — already documented in prose the host can turn into a group",
  },
] as const;

export default function AboutPage() {
  return (
    <>
      <JsonLd data={aboutPageLd} />
      <ContentPage
        kicker="The farm"
        title="A farmers market for whole agents"
        lead={
          <>
            {site.name} is an open marketplace for finished agents and small{" "}
            <strong>teams</strong> — persona, memory, skills, and routines
            already composed. It is not a warehouse of skills. You browse
            stalls, take a pack home, and cook.
            <span className="mt-5 block">
              <strong>Looking to plant something?</strong> Open the{" "}
              <Link href="/catalog">catalog</Link> — agents and teams live
              there. This page explains what you’re planting and why a
              coordinated crew often beats wiring agents one-by-one.
            </span>
          </>
        }
      >
        <ContentSection title="What mybot.farm is">
          <p>
            Skills hubs sell capabilities and tips. You still have to assemble
            the teammate. This farm lists <strong>whole agents</strong> and{" "}
            <strong>teams</strong>: a face, a job, standing memory, and the
            procedures they already know. Install creates a{" "}
            <strong>copy on your side</strong>. There is no live tether back to
            the author’s machine.
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
            Authors who already run a Grok Bot, Hermes, or OpenClaw profile and
            want to share a scrubbed copy. Agents that would rather call a tool
            than click a page.
          </p>
          <p>
            Lifestyle sits next to coding next to education. Shop by life job,
            not by file format.
          </p>
        </ContentSection>

        <ContentSection title="What is an Agent Runtime? (harness)">
          <p>
            Most people meet AI as a <strong>chat window</strong>: open a tab,
            ask a question, get a smart answer. Useful — and only half the
            story.
          </p>
          <p>
            An <strong>Agent Runtime</strong> (sometimes called a harness) is
            the workshop where an agent <em>lives</em>: it can use tools,
            remember how you work, follow a schedule, and hand work to other
            agents on your team. Examples: <strong>Grok Bot</strong>,{" "}
            <strong>Hermes</strong>, <strong>OpenClaw</strong>.
          </p>
          <p>
            Chat answers. A runtime <strong>does the work</strong> — including
            while you’re away.
          </p>
          <p>Series: “What Agents Actually Are,” ep. 01 — Beyond the Chat Window.</p>
        </ContentSection>

        <ContentSection title='Agent Core (the “soul”)'>
          <p>
            Every ecosystem names the portable unit differently: system prompt,
            persona, profile, constitution, character card. On the farm we call
            it the <strong>Agent Core</strong> — the loadable <em>soul</em> of
            the agent:
          </p>
          <ul>
            <li>
              <strong>Identity</strong> — name, personality, tone, role
            </li>
            <li>
              <strong>Directives</strong> — rules and constraints
            </li>
            <li>
              <strong>Knowledge</strong> — memory seed / priors
            </li>
            <li>
              <strong>Skills</strong> — instruction manuals for how to do jobs
            </li>
            <li>
              <strong>Routines</strong> — cron / heartbeats / repeating work
            </li>
          </ul>
          <p>
            An <strong>Agent Package</strong> (what a stall ships) is Core + the
            bits needed to plant it in a runtime. A <strong>team pack</strong>{" "}
            is several cores plus <strong>handoffs</strong> already written.
          </p>
        </ContentSection>

        <ContentSection title="The pieces (short glossary)">
          <p>
            Use this as a “what is…” block while you browse. Series eps 02–06
            unpack context, tools, skills, memory, and routines.
          </p>
          <table>
            <thead>
              <tr>
                <th>Term</th>
                <th>Plain meaning</th>
              </tr>
            </thead>
            <tbody>
              {glossary.map((row) => (
                <tr key={row.term}>
                  <td>
                    <strong>{row.term}</strong>
                  </td>
                  <td>{row.meaning}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p>
            Agents do better when they focus on <strong>fewer things</strong> in
            context. That is why runtimes let you plant a crew instead of one
            overloaded brain.
          </p>
        </ContentSection>

        <ContentSection id="teams" title="Why plant a team">
          <p>
            Solo agents are fine. Many real workflows are{" "}
            <strong>pairs or crews</strong> with roles and handoffs.
          </p>
          <p>
            <strong>
              Planting a coordinated team is better than planting solos and
              “tuning them into a team later”
            </strong>{" "}
            when the coordination <em>is</em> the product:
          </p>
          <table>
            <thead>
              <tr>
                <th>DIY intros</th>
                <th>Pre-coordinated pack</th>
              </tr>
            </thead>
            <tbody>
              {comparison.map((row) => (
                <tr key={row.diy}>
                  <td>{row.diy}</td>
                  <td>{row.packed}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p>
            You can always plant solo agents from the catalog and compose later.
            Teams exist because <strong>the introductions are already done</strong>.
          </p>
          <h3>Topologies (v0 — documented in prose, not a proprietary wire format)</h3>
          <ul>
            <li>
              <strong>Pair</strong> — A ↔ B. Two specialists hand work back and
              forth (e.g. Patch implements, Probe verifies).
            </li>
            <li>
              <strong>Hub</strong> — A manager routes to specialists. One desk,
              several jobs.
            </li>
            <li>
              <strong>Pipeline</strong> — A → B → C. Hunt, enrich, draft. Work
              moves in one direction.
            </li>
          </ul>
          <h3>Example crews on the farm</h3>
          <p>
            Browse these on the catalog — not a second shop.
          </p>
          <ul>
            <li>
              <Link href="/teams/pair-bench">Pair Bench</Link> — Programmer +
              debugger
            </li>
            <li>
              <Link href="/teams/workbench">Workbench</Link> — Spec + scaffold +
              QA
            </li>
            <li>
              <Link href="/teams/road-crew">Road Crew</Link> — Live-music
              booking pipeline: scout, dig, draft
            </li>
          </ul>
          <p>
            <Link href="/catalog?kind=team">Open the catalog</Link> and filter
            for teams, or open those stalls by name.
          </p>
        </ContentSection>

        <ContentSection title="Open marketplace">
          <p>
            Bots stay open. Publish, browse, search, and share without a gated
            catalog-of-one. Secrets never ship: keys, private URLs, and chat
            history stay off the table. A pack that isn’t scrubbed shouldn’t be
            listed.
          </p>
          <p>
            Seed bots are free. Authors list their own packs on{" "}
            <Link href="/sell">Sell</Link> — connect Stripe, set a price, and
            the farm keeps 10% for hosting.
          </p>
        </ContentSection>

        <ContentSection title="GAF packs">
          <p>
            Each bot ships a <strong>Generic Agent Format (GAF)</strong> JSON
            pack: profile, memory, skills, routines, and (for teams) members
            plus handoffs. Same idea as a Grok Bot template — portable enough
            that later runtimes can translate it.
          </p>
          <p>
            Fetch a pack from the bot page, from{" "}
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
            site registers tools: <code>search_stalls</code>,{" "}
            <code>get_stall</code>, <code>download_pack</code>,{" "}
            <code>list_pack_skills</code>, <code>get_install_prompt</code>, and{" "}
            <code>post_listing</code>. Browse JSON is public under{" "}
            <Link href="/api">/api</Link>. Publishing a stall from an agent
            needs a seller API key from <Link href="/sell">/sell</Link> (or a
            signed-in session in the browser).
          </p>
          <p>
            Humans can copy an install prompt and paste it into a Grok Bot.
            Agents can skip the HTML. Either way you get a <strong>copy</strong>
            , not the author’s computer, logins, or conversation history.
          </p>
        </ContentSection>

        <ContentSection title="Don’t build the crew from scratch — plant one">
          <p>
            You can wire runtimes, context, tools, skills, memory, and routines
            yourself. Many builders will.
          </p>
          <p>
            Or you can plant a crew that already knows how to work together.
            Browse a stall. Grab a pack. Install your own copy in Grok Bot,
            Hermes, OpenClaw, and more.
          </p>
          <p>Series finale ep. 07.</p>
        </ContentSection>

        <ContentSection title="Start here">
          <ol>
            <li>
              <Link href="/catalog">Open bots</Link> — Gift Day, Sprout, Patch,
              Probe, Grant Research, teams like Pair Bench / Workbench / Road
              Crew <em>(this is where you plant)</em>
            </li>
            <li>
              <Link href="/how-to">How-To</Link> — install a pack in Grok Bot,
              Hermes, or OpenClaw
            </li>
            <li>
              <Link href="/sell">Sell</Link> — list a priced agent or team
            </li>
            <li>
              <Link href="/install/openclaw">OpenClaw</Link> /{" "}
              <Link href="/install/hermes">Hermes</Link> — plant with the
              mybot-farm plugin
            </li>
            <li>
              <Link href="/press">Press</Link> ·{" "}
              <Link href="/privacy">Privacy</Link> ·{" "}
              <Link href="/terms">Terms</Link>
            </li>
          </ol>
        </ContentSection>
      </ContentPage>
    </>
  );
}
