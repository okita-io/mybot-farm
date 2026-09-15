import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage, ContentSection } from "@/components/content-page";
import { JsonLd } from "@/components/json-ld";
import {
  howToHermesImportLd,
  howToHermesShareLd,
  howToInstallLd,
} from "@/lib/schema";
import { site, siteOgImage } from "@/lib/site";

export const metadata: Metadata = {
  title: "How-To",
  description:
    "Install a mybot.farm agent in Grok Bot from GAF JSON, or import a scrubbed Hermes profile. Export, run scrub.py, then share. OpenClaw is coming soon.",
  alternates: { canonical: "/how-to" },
  openGraph: {
    title: `How-To | ${site.name}`,
    description:
      "Grok Bot uses GAF JSON. Hermes uses a scrubbed .tar.gz — including seed bots like Scholastic Research and Workbench. Scrub chat history and secrets before you share.",
    url: "/how-to",
    images: [siteOgImage],
  },
};

export default function HowToPage() {
  return (
    <>
      <JsonLd data={howToInstallLd} />
      <JsonLd data={howToHermesImportLd} />
      <JsonLd data={howToHermesShareLd} />
      <ContentPage
        kicker="How-To"
        title="Install a bot, or share your own"
        lead="Two jobs: bring an agent home, or send one to market. Grok Bot installs from GAF JSON. Hermes installs from a scrubbed profile .tar.gz — including seed bots like Scholastic Research and Workbench. OpenClaw translators are still coming."
      >
        <ContentSection id="install" title="Install an agent in Grok Bot">
          <p>
            You are installing a <strong>copy</strong>. You get profile, skills,
            memory, and routines. You do not get the author’s computer, logins,
            or chat history. You need the{" "}
            <a href="https://docs.x.ai/grok-bot/bots">Grok Bot app</a> to
            finish. Seed bots download as GAF JSON. That is the Grok Bot
            path — Hermes uses a different file; jump to{" "}
            <a href="#hermes-import">import a Hermes profile</a>.
          </p>
          <ol>
            <li>
              Browse <Link href="/catalog">open bots</Link> and open the
              agent or team — for example{" "}
              <Link href="/agents/grant-research">Grant Research</Link>.
            </li>
            <li>
              Click <strong>Copy install prompt</strong> and paste it into any
              Grok Bot. The prompt points at the bot URL and tells the Bot to
              download the pack, create an agent, save skills, and write
              memory.
            </li>
            <li>
              Or download the GAF JSON from the bot’s Download pack button.
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
            Have a bot, pack, or <code>/api</code> URL already? Paste it on{" "}
            <Link href="/plant">Plant</Link>. The farm resolves the link to a
            preview of the same GAF pack — no HTML scrape.{" "}
            <strong>Plant into library</strong> is the next door (a plot’s
            collection on the farm). Preview needs no login. Persisting that
            collection waits until you Start a plot. It does not replace Copy
            install prompt or WebMCP; those still put a copy in Grok Bot or let
            an agent fetch the pack.
          </p>
        </ContentSection>

        <ContentSection id="hermes-import" title="Import a Hermes profile">
          <p>
            Hermes does not install GAF JSON.{" "}
            <code>hermes profile import</code> wants a{" "}
            <strong>scrubbed profile archive</strong> (<code>.tar.gz</code>).
            Some seed bots ship that way —{" "}
            <Link href="/agents/scholastic-research">Scholastic Research</Link>{" "}
            (one profile) and{" "}
            <Link href="/teams/workbench">Workbench</Link> (three team
            members). Grok Bot packs still download as GAF JSON and will not
            import. Use this path for those Hermes packs, a clean archive from
            another farmer, or after you ran{" "}
            <a href="#hermes-share">scrub.py</a> on your own export.
          </p>
          <p>
            You need{" "}
            <a href="https://hermes-agent.nousresearch.com/docs/getting-started/installation">
              Hermes Agent
            </a>{" "}
            installed.
          </p>
          <ol>
            <li>
              Download the scrubbed <code>.tar.gz</code>. Do not import a raw{" "}
              <code>hermes profile export</code> — that file can still hold
              chat history and secrets written into skills or memory.
            </li>
            <li>
              Import it as a <strong>new</strong> profile. Import refuses to
              overwrite an existing name, and cannot import as{" "}
              <code>default</code>.
              <pre>{`hermes profile import ~/Downloads/my-agent-share.tar.gz --name my-agent`}</pre>
            </li>
            <li>
              In chat you can run{" "}
              <code>/import ~/Downloads/my-agent-share.tar.gz</code>. In the
              desktop app: ⌘K → <strong>Import profile…</strong>, or the import
              button beside the profile rail’s +.
            </li>
            <li>
              Add <strong>your</strong> API keys.{" "}
              <code>auth.json</code> and <code>.env</code> never ship in a farm
              pack. Run setup for the new profile, or copy{" "}
              <code>.env.EXAMPLE</code> to <code>.env</code> and fill it in.
            </li>
          </ol>
          <p>
            Official commands:{" "}
            <a href="https://hermes-agent.nousresearch.com/docs/reference/profile-commands">
              Hermes profile commands
            </a>
            .
          </p>
        </ContentSection>

        <ContentSection id="hermes-share" title="Export and scrub a Hermes bot">
          <p>
            Want someone else to start from the same Hermes agent? Export it,
            then <strong>scrub it</strong>. A raw export is a private snapshot,
            not a public pack.
          </p>
          <h3>Export</h3>
          <p>
            Hermes copies the profile directory and always drops{" "}
            <code>auth.json</code> and <code>.env</code> by filename. Named
            profiles also pack <code>sessions/</code>, <code>state.db</code>,
            memories, caches, and anything you wrote into{" "}
            <code>SOUL.md</code> or skills. Filename filters are not a content
            scan. Inspect before you share.
          </p>
          <pre>{`hermes profile list
hermes profile export my-agent
# or: hermes profile export my-agent -o ./my-agent.tar.gz`}</pre>
          <p>
            Without <code>-o</code>, Hermes writes to its managed{" "}
            <code>profile-exports/</code> directory (typically under{" "}
            <code>~/.hermes/</code>), not the current working directory. In
            chat: <code>/export</code>. Desktop: ⌘K →{" "}
            <strong>Export profile…</strong>, or right-click a profile square.
          </p>
          <h3>Scrub with scripts/scrub.py</h3>
          <p>
            Never send the original export. Run the farm’s sanitizer. Canonical
            source is <code>scripts/scrub.py</code> on{" "}
            <a href="https://github.com/okita-io/mybot-farm/tree/main/scripts">
              the repo
            </a>
            . Same bytes when deployed:{" "}
            <a href="https://mybot.farm/scripts/scrub.py">
              <code>https://mybot.farm/scripts/scrub.py</code>
            </a>
            . Stdlib only, Python 3.9+.
          </p>
          <p>The script, in order:</p>
          <ul>
            <li>
              <strong>Drops</strong> chat transcripts (<code>state.db</code>),
              curator backups, <code>auth.json</code>, <code>.env*</code>,
              caches, bins, logs, and unused bundled skills.
            </li>
            <li>
              <strong>Redacts</strong> credential-looking values in{" "}
              <code>config.yaml</code> (keys, tokens, <code>sk-…</code>{" "}
              patterns). Home paths become <code>~</code>.
            </li>
            <li>
              <strong>Re-scans</strong> the output. A high-confidence secret
              fails the run: exit 1, no pack written.
            </li>
          </ul>
          <pre>{`# 0. export is read-only — it does not touch the live agent
hermes profile export my-agent
#    → ~/.hermes/profile-exports/my-agent-20260911-142553.tar.gz

# 1. fetch the sanitizer (or clone the repo and use scripts/scrub.py)
curl -fsSL https://mybot.farm/scripts/scrub.py -o scrub.py

# 2. scrub
python3 scrub.py ~/.hermes/profile-exports/my-agent-20260911-142553.tar.gz \\
  -o /tmp/my-agent-share.tar.gz \\
  --report /tmp/my-agent.scrub-report.json

# 3. check the report — status must be pass
python3 -c "import json; r=json.load(open('/tmp/my-agent.scrub-report.json')); print(r['status'], r['summary'])"`}</pre>
          <p>
            Exit <code>0</code> means the re-scan passed — safe to share that
            output file. Exit <code>1</code> means a secret is still in the
            tree: read <code>high_confidence_hits</code>, fix the source
            profile, re-export, re-scrub. Do not hand-edit the clean pack.{" "}
            <code>needs_review</code> items (emails, LAN URLs, cron bindings)
            stay until you decide; they are not silent deletes.
          </p>
          <p>
            Then either send the clean <code>.tar.gz</code> for{" "}
            <a href="#hermes-import">
              <code>hermes profile import</code>
            </a>
            , or list a scrubbed GAF pack on <Link href="/sell">Sell</Link>.
            The original export stays on your machine.
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
            Listing on the farm: go to <Link href="/sell">Sell</Link>, connect
            Stripe payouts, and post a <strong>scrubbed GAF pack</strong> with
            a price. Buyers check out on the farm. You receive 90%; the farm
            keeps 10% for hosting. Until you list, you can still use Grok Bot’s
            public share link. Do not ship secrets in either channel.
          </p>
          <p>
            Official Grok Bot notes:{" "}
            <a href="https://docs.x.ai/grok-bot/bots">Create and manage Bots</a>
            .
          </p>
        </ContentSection>

        <ContentSection id="coming-soon" title="OpenClaw — coming soon">
          <p>
            <strong>OpenClaw support is coming soon.</strong> Planned work is
            a translator and install target: map a GAF pack into OpenClaw
            soul/instructions. That installer is not live. There is no working
            OpenClaw install button on the farm today.
          </p>
          <p>
            Today’s live paths are Grok Bot (copy-paste prompt or GAF download)
            and Hermes (scrubbed <code>.tar.gz</code> import, plus export →{" "}
            <code>scrub.py</code>). If you are building an OpenClaw translator,
            start from the public JSON — don’t wait on a fake one-click.
          </p>
        </ContentSection>

        <ContentSection title="More on the farm">
          <ul>
            <li>
              <Link href="/about">About</Link> — farmers market, not a skills
              dump
            </li>
            <li>
              <Link href="/press">Press</Link> — launch release
            </li>
            <li>
              <Link href="/teams">Agent Teams</Link> — pair, hub, and pipeline
              packs
            </li>
            <li>
              <Link href="/plant">Plant</Link> — paste a share URL and preview
              the pack
            </li>
            <li>
              <Link href="/sell">Sell</Link> — list a priced agent or team
            </li>
            <li>
              <Link href="/catalog">Open bots</Link>
            </li>
            <li>
              <Link href="/privacy">Privacy</Link>
            </li>
            <li>
              <Link href="/terms">Terms</Link>
            </li>
          </ul>
        </ContentSection>
      </ContentPage>
    </>
  );
}
