import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage, ContentSection } from "@/components/content-page";
import { JsonLd } from "@/components/json-ld";
import { howToInstallLd } from "@/lib/schema";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "How to install and share agents",
  description:
    "Install a mybot.farm agent in Grok Bot with a copy-paste prompt or GAF JSON. Share your own Bot as a public copy. OpenClaw and Hermes support are coming soon.",
  alternates: { canonical: "/how-to" },
  openGraph: {
    title: `How to install and share agents | ${site.name}`,
    description:
      "Copy an install prompt into Grok Bot, download GAF JSON, or share a scrubbed Bot. OpenClaw and Hermes translators are coming soon.",
    url: "/how-to",
  },
};

export default function HowToPage() {
  return (
    <>
      <JsonLd data={howToInstallLd} />
      <ContentPage
        kicker="How-To"
        title="Install a stall, or share your own"
        lead="Two jobs: bring an agent home, or send one to market. Grok Bot is the live install target today. OpenClaw and Hermes support are coming soon — translators and install targets, not live buttons pretending to work."
      >
        <ContentSection id="install" title="Install an agent from mybot.farm">
          <p>
            You are installing a <strong>copy</strong>. You get profile, skills,
            memory, and routines. You do not get the author’s computer, logins,
            or chat history. You need the{" "}
            <a href="https://docs.x.ai/grok-bot/bots">Grok Bot app</a> to
            finish.
          </p>
          <ol>
            <li>
              Browse <Link href="/#stalls">open stalls</Link> and open the
              agent or team — for example{" "}
              <Link href="/agents/grant-research">Grant Research</Link>.
            </li>
            <li>
              Click <strong>Copy install prompt</strong> and paste it into any
              Grok Bot. The prompt points at the stall URL and tells the Bot to
              download the pack, create an agent, save skills, and write
              memory.
            </li>
            <li>
              Or download the GAF JSON from the stall’s Download pack button.
              The same file lives at{" "}
              <code>/packs/agents/{"{slug}"}.json</code> and{" "}
              <Link href="/api/packs/grant-research">
                <code>/api/packs/{"{slug}"}</code>
              </Link>
              . Agents can also call WebMCP tools{" "}
              <code>get_stall</code>, <code>download_pack</code>,{" "}
              <code>list_pack_skills</code>, and{" "}
              <code>get_install_prompt</code> — catalog at{" "}
              <Link href="/api">/api</Link>.
            </li>
            <li>
              In Grok Bot: <strong>New</strong> (or Cmd/Ctrl+N) →{" "}
              <strong>Create new agent</strong> → Bot actions →{" "}
              <strong>Edit Profile</strong>. Set name, title, description, and
              avatar from <code>profile</code>. Save each{" "}
              <code>pack.skills</code> entry. Write <code>pack.memory</code>{" "}
              into durable memory. For a team pack, create each member.
            </li>
          </ol>
          <p>
            Shared Bots are created by other users, not by SpaceXAI. Adding one
            accepts the third-party bot terms.
          </p>
          <p>
            Have a stall, pack, or <code>/api</code> URL already? Paste it on{" "}
            <Link href="/plant">Plant</Link>. The farm resolves the link to a
            preview of the same GAF pack — no HTML scrape.{" "}
            <strong>Plant into library</strong> is the next door (a plot’s
            collection on the farm). Preview needs no login. Persisting that
            collection waits until you Start a plot. It does not replace Copy
            install prompt or WebMCP; those still put a copy in Grok Bot or let
            an agent fetch the pack.
          </p>
        </ContentSection>

        <ContentSection id="share" title="Export or share your own Grok Bot">
          <p>
            Want someone else to start from the same Bot? Use Grok Bot’s public
            share flow, or serve a scrubbed GAF pack.{" "}
            <strong>Scrub first.</strong> Remove API keys, internal URLs,
            customer data, and anything you would not put in a public document.
          </p>
          <ol>
            <li>
              In Grok Bot, open the Bot and use{" "}
              <strong>share-as-template</strong> or copy its{" "}
              <strong>share link</strong>. Grok Bot prepares a template from
              identity, description, skills, and routines. Inspect what it
              selected before you publish.
            </li>
            <li>
              The link is public (typically an <code>x.ai/bot/…</code> preview).
              Anyone with it can view the shared configuration and choose{" "}
              <strong>Add to Grok Bot</strong>. That creates a copy on their
              account — not your computer, logins, conversation history, or
              secrets.
            </li>
            <li>
              They need the Grok Bot app to finish adding it. Review the
              template in the app before you confirm.
            </li>
          </ol>
          <p>
            Listing on the farm: when the publish flow is open, post a{" "}
            <strong>scrubbed GAF pack</strong> as a stall (same shape as the
            seed files under <code>/packs</code>). Until that listing path
            ships, download or serve the GAF JSON yourself — or keep using the
            Grok Bot share link. Do not ship secrets in either channel.
          </p>
          <p>
            Official Grok Bot notes:{" "}
            <a href="https://docs.x.ai/grok-bot/bots">Create and manage Bots</a>
            .
          </p>
        </ContentSection>

        <ContentSection id="coming-soon" title="OpenClaw and Hermes — coming soon">
          <p>
            <strong>OpenClaw and Hermes support are coming soon.</strong>{" "}
            Planned work is translators and install targets: map a GAF pack
            into Hermes skills or OpenClaw soul/instructions. Those installers
            are not live. There is no working OpenClaw or Hermes install button
            on the farm today.
          </p>
          <p>
            Today’s path is Grok Bot (copy-paste prompt, GAF download, or
            public share link). If you are building a translator, start from
            the public JSON — don’t wait on a fake one-click.
          </p>
        </ContentSection>

        <ContentSection title="More on the farm">
          <ul>
            <li>
              <Link href="/about">About</Link> — farmers market, not a skills
              dump
            </li>
            <li>
              <Link href="/plant">Plant</Link> — paste a share URL and preview
              the pack
            </li>
            <li>
              <Link href="/#stalls">Open stalls</Link>
            </li>
            <li>
              <Link href="/privacy">Privacy</Link>
            </li>
          </ul>
        </ContentSection>
      </ContentPage>
    </>
  );
}
