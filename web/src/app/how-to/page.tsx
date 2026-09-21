import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage, ContentSection } from "@/components/content-page";
import { JsonLd } from "@/components/json-ld";
import {
  howToHermesImportLd,
  howToHermesPluginLd,
  howToHermesShareLd,
  howToInstallLd,
  howToOpenClawLd,
  howToPostListingLd,
} from "@/lib/schema";
import { hermesPlugin, openclawPlugin, site, siteOgImage } from "@/lib/site";

export const metadata: Metadata = {
  title: "How-To",
  description:
    "Install a mybot.farm agent in Grok Bot from GAF JSON, Recruit a stall in Hermes Desktop with the mybot-farm plugin, or plant a pack in OpenClaw.",
  alternates: { canonical: "/how-to" },
  openGraph: {
    title: `How-To | ${site.name}`,
    description:
      "Grok Bot uses GAF JSON. Hermes: enable the plugin, open Desktop Farm, Recruit — or import a scrubbed .tar.gz. Seed bots include Scholastic Research and Workbench. Scrub chat history and secrets before you share.",
    url: "/how-to",
    images: [siteOgImage],
  },
};

export default function HowToPage() {
  return (
    <>
      <JsonLd data={howToInstallLd} />
      <JsonLd data={howToHermesImportLd} />
      <JsonLd data={howToHermesPluginLd} />
      <JsonLd data={howToHermesShareLd} />
      <JsonLd data={howToOpenClawLd} />
      <JsonLd data={howToPostListingLd} />
      <ContentPage
        kicker="How-To"
        title="Install a bot, or share your own"
        lead="Two jobs: bring an agent home, or send one to market. Grok Bot installs from GAF JSON. Hermes: enable the mybot-farm plugin, open Desktop Farm, Recruit into the Bots roster — or import a scrubbed .tar.gz by hand. Seed bots include Scholastic Research and Workbench. OpenClaw plants the same GAF packs with its own mybot-farm plugin."
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
              Grok Bot. The prompt points at the bot URL (and catalog{" "}
              <code>stallId</code> / <code>packVersion</code>) and tells the Bot
              to download the pack, set the mapped avatar, save skills, write
              memory, save routines, list marketplace plugins, and start from{" "}
              <code>gettingStarted.skill</code>.
            </li>
            <li>
              Or download the GAF JSON from the bot’s Download Grok Bot / OpenClaw
              pack button (Hermes uses Download Hermes pack when available).
              The same file lives at{" "}
              <code>/packs/agents/{"{slug}"}.json</code> and{" "}
              <Link href="/api/packs/grant-research">
                <code>/api/packs/{"{slug}"}</code>
              </Link>
              . Agents can also call WebMCP tools{" "}
              <code>get_stall</code>, <code>download_pack</code>,{" "}
              <code>list_pack_skills</code>, <code>get_install_prompt</code>,
              and <code>post_listing</code> — catalog at{" "}
              <Link href="/api">/api</Link>.
            </li>
            <li>
              In Grok Bot: <strong>New</strong> (or Cmd/Ctrl+N) →{" "}
              <strong>Create new agent</strong> → Bot actions →{" "}
              <strong>Edit Profile</strong>. Set name and description from{" "}
              <code>profile</code>. Map nested <code>profile.avatar</code>{" "}
              (<code>shape</code>/<code>color</code>) to Grok{" "}
              <code>avatarShape</code>/<code>avatarColor</code>. Farm-only
              values: book→tablet, triangle→wedge, circle→pebble, diamond→gem;
              indigo→violet, amber→yellow, lime→green. Omit{" "}
              <code>profile.title</code> (farm listing/UI). Save each{" "}
              <code>pack.skills</code> entry. Write <code>pack.memory</code>{" "}
              into durable memory. Save <code>pack.routines</code> as routines
              (prose triggers; confirm any schedule). If{" "}
              <code>pack.plugins</code> is non-empty, list each{" "}
              <code>pluginId</code> for the owner to install from the Grok
              marketplace — never a custom MCP URL. If{" "}
              <code>pack.gettingStarted.skill</code> is set, use that skill for
              the first conversation. For a team pack, create each{" "}
              <code>members[]</code> agent; there is no 1:1 team template.{" "}
              <code>stallId</code> and <code>packVersion</code> from{" "}
              <Link href="/api/stalls">
                <code>GET /api/stalls</code>
              </Link>{" "}
              are catalog metadata — cite them in install notes, not in{" "}
              <code>create_bot_share_json</code>. Optional projector:{" "}
              <code>/api/packs/{"{slug}"}/grok-template</code>.
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
            members). Prefer the{" "}
            <Link href="/install/hermes">mybot-farm plugin</Link> when you want
            Desktop browse + one-click Recruit (or CLI plant + clean reinstall).
            Use this manual path for a single
            archive from another farmer, or after you ran{" "}
            <a href="#hermes-share">scrub.py</a> on your own export. Grok Bot
            packs still download as GAF JSON and will not import.
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

        <ContentSection id="hermes-plugin" title="Recruit a stall with the Hermes plugin">
          <p>
            The Hermes <strong>mybot-farm</strong> plugin (id{" "}
            <code>{hermesPlugin.id}</code> {hermesPlugin.version}) browses
            stalls in Hermes Desktop and one-click{" "}
            <strong>Recruit</strong> into the Bots roster. Enable the
            plugin, open sidebar <strong>Farm</strong> (or ⌘K →{" "}
            <code>mybot.farm: Open catalog</code>), open a stall, Recruit. Solo
            agents stamp <code>ui_meta.hermes-bots</code>; team members plant as
            Bots as usual. CLI tools: <code>farm_search</code>,{" "}
            <code>farm_get_stall</code>, <code>farm_get_pack</code>,{" "}
            <code>farm_plant</code>, <code>farm_reinstall</code>.{" "}
            <code>farm_reinstall</code> clears{" "}
            <code>~/.hermes/profiles/.deleted</code> tombstones so a same-name
            re-import is actually spawnable (GAP 2). Full page:{" "}
            <Link href="/install/hermes">Install in Hermes</Link>.
          </p>
          <p>
            <code>hermes plugins install</code> does not take a local folder.
            From a checkout:
          </p>
          <pre>{`mkdir -p ~/.hermes/plugins
ln -sfn "$(pwd)/packages/hermes-mybot-farm" ~/.hermes/plugins/mybot-farm
hermes plugins enable mybot-farm
# then Desktop → Farm → Recruit
# git Hermes only — PyPI 0.19.0 has no validate subcommand
hermes plugins validate ./packages/hermes-mybot-farm
python3 -m unittest discover -s packages/hermes-mybot-farm/tests -v`}</pre>
          <p>GitHub (subdir required) or the public zip:</p>
          <pre>{`hermes plugins install ${hermesPlugin.gitInstall} --enable

# after Plugin Catalog admission:
hermes plugins install mybot-farm
hermes plugins enable mybot-farm

curl -LO ${hermesPlugin.downloadUrl}
mkdir -p ~/.hermes/plugins/mybot-farm
unzip hermes-mybot-farm-${hermesPlugin.version}.zip -d ~/.hermes/plugins/mybot-farm
hermes plugins enable mybot-farm`}</pre>
          <p>
            CLI smoke (secondary):{" "}
            <code>
              python3 packages/hermes-mybot-farm/bin/farm-plant plant
              scholastic-research --dry-run
            </code>
            . Live plant of Scholastic Research is the small single-profile
            smoke; Workbench is the team smoke.
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
            Stripe payouts for paid bots, and post a{" "}
            <strong>scrubbed GAF pack</strong> with a price — or create a
            seller API key there and call <code>post_listing</code> /{" "}
            <code>POST /api/listings</code>. Free listings use{" "}
            <code>priceCents: 0</code> and do not need Connect. Buyers check
            out on the farm. You receive 90%; the farm keeps 10% for hosting.
            Until you list, you can still use Grok Bot’s public share link. Do
            not ship secrets in either channel. Details:{" "}
            <a href="#api-keys">seller API keys</a>.
          </p>
          <p>
            Official Grok Bot notes:{" "}
            <a href="https://docs.x.ai/grok-bot/bots">Create and manage Bots</a>
            .
          </p>
        </ContentSection>

        <ContentSection id="openclaw" title="Plant an agent in OpenClaw">
          <p>
            OpenClaw plants the same GAF packs with the{" "}
            <strong>mybot-farm</strong> plugin (id <code>mybot-farm</code>,
            package <code>{openclawPlugin.packageName}</code>). Tools:{" "}
            <code>farm_search</code>, <code>farm_get_pack</code>,{" "}
            <code>farm_plant</code>, <code>farm_post</code>. Workspace lands at{" "}
            <code>~/.openclaw/farm/{"{slug}"}</code> with IDENTITY / SOUL /
            MEMORY / FARM.md and skills. Full page with download:{" "}
            <Link href="/install/openclaw">Install in OpenClaw</Link>.
          </p>
          <p>
            Install from ClawHub (recommended). The package is published and
            live:
          </p>
          <pre>{`openclaw plugins install clawhub:${openclawPlugin.packageName}
openclaw plugins enable mybot-farm
openclaw gateway restart`}</pre>
          <p>
            Optional discover: <code>openclaw plugins search mybot-farm</code>.
            After a ClawHub install, ask the agent to call the farm tools — or
            look for the CLI under the OpenClaw extensions path. The first
            ClawHub release may show scan status <code>suspicious</code> until
            review; install via the <code>clawhub:</code> locator still works.
          </p>
          <p>From a checkout of this repo:</p>
          <pre>{`openclaw plugins install ./packages/openclaw-mybot-farm --link --force
openclaw plugins enable mybot-farm
openclaw gateway restart`}</pre>
          <p>
            CLI smoke from a checkout:{" "}
            <code>
              node packages/openclaw-mybot-farm/bin/farm-plant.mjs plant
              frontend-developer
            </code>
            .
          </p>
          <p>
            Or download the packed release (
            <a href={openclawPlugin.downloadUrl}>
              <code>{openclawPlugin.downloadUrl}</code>
            </a>
            ) and install the archive:
          </p>
          <pre>{`curl -LO ${openclawPlugin.downloadUrl}
openclaw plugins install ./openclaw-mybot-farm-${openclawPlugin.version}.tgz --force
# or: openclaw plugins install npm-pack:./openclaw-mybot-farm-${openclawPlugin.version}.tgz --force
openclaw plugins enable mybot-farm`}</pre>
        </ContentSection>

        <ContentSection id="api-keys" title="Post a listing with an API key">
          <p>
            The Sell form still uses your Clerk session. Agents and plugins
            that cannot open a browser session create a seller API key on{" "}
            <Link href="/sell">/sell</Link>, then call{" "}
            <code>POST /api/listings</code>, WebMCP <code>post_listing</code>,
            or plugin <code>farm_post</code> (OpenClaw and Hermes). The farm
            hashes the secret (SHA-256) and shows the plaintext once. Full
            notes: the repo’s <code>docs/api-keys.md</code>.
          </p>
          <ol>
            <li>
              Sign in on <Link href="/sell">Sell</Link>, open{" "}
              <strong>API keys</strong>, and create a key. Copy{" "}
              <code>mbf_…</code> immediately.
            </li>
            <li>
              POST a JSON body with every required field:{" "}
              <code>kind</code> (<code>agent</code> or <code>team</code>),{" "}
              <code>name</code>, <code>title</code>, <code>description</code>,{" "}
              <code>category</code> (exact label such as{" "}
              <code>Lifestyle</code> or <code>Coding</code>),{" "}
              <code>priceCents</code> (<code>0</code> for free, or 200–999900
              cents), and <code>pack</code> (GAF object).
            </li>
            <li>
              Send <code>Authorization: Bearer mbf_…</code>. Paid listings
              still need Stripe Connect. Prefer a free smoke listing so Connect
              is not required.
            </li>
          </ol>
          <pre>{`# 1. Create a key while signed in (browser cookie / Clerk session)
curl -sS -X POST https://mybot.farm/api/api-keys \\
  -H "Content-Type: application/json" \\
  -H "Cookie: __session=YOUR_SESSION_COOKIE" \\
  -d '{"name":"agent poster"}'

# 2. Post a free listing with the key shown once in that response
curl -sS -X POST https://mybot.farm/api/listings \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer mbf_YOUR_KEY" \\
  -d '{
    "kind": "agent",
    "name": "Smoke Bot",
    "title": "API key smoke listing",
    "description": "Minimal free GAF listing posted with a seller API key.",
    "category": "Experimental",
    "priceCents": 0,
    "pack": {
      "format": "mybot.farm/agent-pack",
      "version": "0.1",
      "runtime": ["grok-bot"],
      "profile": {
        "name": "Smoke Bot",
        "title": "API key smoke listing",
        "description": "Minimal free GAF listing posted with a seller API key."
      },
      "skills": [],
      "memory": []
    }
  }'`}</pre>
          <p>
            A 201 body includes <code>ok</code>, <code>slug</code>,{" "}
            <code>kind</code>, <code>pagePath</code>, and{" "}
            <code>hasReadme</code>. Open <code>pagePath</code> to confirm the
            stall. WebMCP <code>post_listing</code> takes the same fields plus
            optional <code>apiKey</code> (omitted when you are already signed
            in on the farm).
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
              <Link href="/about#teams">Why plant a team</Link> — pair, hub, and
              pipeline crews; plant them from the{" "}
              <Link href="/catalog?kind=team">catalog</Link>
            </li>
            <li>
              <Link href="/install/openclaw">OpenClaw</Link> — plant a GAF pack
              with the mybot-farm plugin
            </li>
            <li>
              <Link href="/install/hermes">Hermes</Link> — Recruit from Desktop
              Farm with the mybot-farm plugin
            </li>
            <li>
              <Link href="/plant">Plant</Link> — paste a share URL and preview
              the pack
            </li>
            <li>
              <Link href="/sell">Sell</Link> — list a priced agent or team
            </li>
            <li>
              <Link href="/how-to#api-keys">Seller API keys</Link> — post a
              listing from an agent
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
