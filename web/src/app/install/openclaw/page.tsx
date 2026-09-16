import type { Metadata } from "next";
import Link from "next/link";
import { Download } from "lucide-react";
import { ContentPage, ContentSection } from "@/components/content-page";
import { JsonLd } from "@/components/json-ld";
import { Button } from "@/components/ui/button";
import { howToOpenClawLd } from "@/lib/schema";
import { openclawPlugin, site, siteOgImage } from "@/lib/site";

export const metadata: Metadata = {
  title: "Install in OpenClaw",
  description:
    "Plant mybot.farm agents into OpenClaw with the mybot-farm plugin. Install from ClawHub (recommended), a repo checkout, or the packed tarball, then farm_search / farm_get_pack / farm_plant.",
  alternates: { canonical: "/install/openclaw" },
  openGraph: {
    title: `Install in OpenClaw | ${site.name}`,
    description:
      "Install the mybot-farm plugin from ClawHub, then search and plant GAF packs into ~/.openclaw/farm/<slug>.",
    url: "/install/openclaw",
    images: [siteOgImage],
  },
};

export default function OpenClawInstallPage() {
  return (
    <>
      <JsonLd data={howToOpenClawLd} />
      <ContentPage
        kicker="OpenClaw"
        title="Plant a farm agent into OpenClaw"
        lead="Install the mybot-farm plugin, restart the gateway, then search and plant GAF packs. You get a copy under ~/.openclaw/farm/<slug> — not the author’s computer, logins, or chat history."
      >
        <div className="flex flex-wrap gap-2">
          <Button asChild size="lg" className="h-9 rounded-full px-4">
            <a
              href={openclawPlugin.downloadPath}
              download={`openclaw-mybot-farm-${openclawPlugin.version}.tgz`}
            >
              <Download data-icon="inline-start" />
              Download plugin {openclawPlugin.version}
            </a>
          </Button>
          <Button asChild variant="outline" size="lg" className="h-9 rounded-full px-4">
            <Link href="/how-to#openclaw">How-To</Link>
          </Button>
        </div>

        <ContentSection id="what" title="What you get">
          <p>
            Native OpenClaw tools (plugin id <code>{openclawPlugin.id}</code>,
            package <code>{openclawPlugin.packageName}</code>), proven on
            OpenClaw 2026.9.4:
          </p>
          <ul>
            <li>
              <code>farm_search</code> — list stalls from{" "}
              <code>/api/stalls</code>
            </li>
            <li>
              <code>farm_get_pack</code> — fetch{" "}
              <code>/api/packs/{"{slug}"}</code>
            </li>
            <li>
              <code>farm_plant</code> — write IDENTITY / SOUL / MEMORY / FARM.md
              plus skills into <code>~/.openclaw/farm/{"{slug}"}</code>
            </li>
          </ul>
          <p>
            Longer notes and exact CLI:{" "}
            <a href="https://github.com/okita-io/mybot-farm/blob/main/docs/openclaw-plugin.md">
              docs/openclaw-plugin.md
            </a>
            . Source lives at <code>packages/openclaw-mybot-farm</code> in the
            farm repo.
          </p>
        </ContentSection>

        <ContentSection id="install" title="Install the plugin">
          <h3>ClawHub (recommended)</h3>
          <p>
            Package <code>{openclawPlugin.packageName}</code> is published on
            ClawHub (status published as of 2026-09-15). Optional discover:{" "}
            <code>openclaw plugins search mybot-farm</code>.
          </p>
          <pre>{`openclaw plugins install clawhub:${openclawPlugin.packageName}
openclaw plugins enable mybot-farm
openclaw gateway restart`}</pre>
          <p>
            The first ClawHub release may show scan status{" "}
            <code>suspicious</code> until review; install via the{" "}
            <code>clawhub:</code> locator still works.
          </p>
          <h3>From a repo checkout</h3>
          <pre>{`openclaw plugins install ./packages/openclaw-mybot-farm --link --force
openclaw plugins enable mybot-farm`}</pre>
          <p>
            Without <code>--link</code>, OpenClaw copies the plugin instead of
            symlinking.
          </p>
          <h3>From the public tarball</h3>
          <p>
            Packed with <code>openclaw plugins pack</code>. OpenClaw accepts a
            local archive path, or <code>npm-pack:</code> for the managed npm
            install path. See{" "}
            <a href="https://docs.openclaw.ai/cli/plugins/install">
              OpenClaw plugin install
            </a>
            .
          </p>
          <pre>{`curl -LO ${openclawPlugin.downloadUrl}

# packed archive
openclaw plugins install ./openclaw-mybot-farm-${openclawPlugin.version}.tgz --force

# same file, npm-pack locator
openclaw plugins install npm-pack:./openclaw-mybot-farm-${openclawPlugin.version}.tgz --force

openclaw plugins enable mybot-farm`}</pre>
          <p>
            Noninteractive installs of an untrusted local archive need{" "}
            <code>--force</code> after you review the file.
          </p>
        </ContentSection>

        <ContentSection id="restart" title="Restart the gateway">
          <p>
            A running gateway and already-open agent sessions may not see the
            new tools until you restart:
          </p>
          <pre>{`openclaw gateway restart`}</pre>
          <p>
            If tools still do not appear, backup{" "}
            <code>~/.openclaw/openclaw.json</code> and add{" "}
            <code>mybot-farm</code> to <code>plugins.allow</code> when that
            list is present. Then{" "}
            <code>openclaw plugins inspect mybot-farm --runtime --json</code>.
          </p>
        </ContentSection>

        <ContentSection id="plant" title="Plant an agent">
          <p>
            After any install, ask your OpenClaw agent to call{" "}
            <code>farm_search</code>, <code>farm_get_pack</code>, or{" "}
            <code>farm_plant</code> with a slug such as{" "}
            <code>frontend-developer</code>. Optional plant params:{" "}
            <code>agentId</code>, <code>workspace</code>, <code>force</code>.
            ClawHub installs may place the CLI under the OpenClaw extensions
            path.
          </p>
          <p>From a checkout, CLI with no agent loop:</p>
          <pre>{`node packages/openclaw-mybot-farm/bin/farm-plant.mjs search frontend
node packages/openclaw-mybot-farm/bin/farm-plant.mjs plant frontend-developer`}</pre>
        </ContentSection>

        <ContentSection id="clawhub" title="ClawHub">
          <p>
            Live on ClawHub as <code>{openclawPlugin.packageName}</code>{" "}
            {openclawPlugin.version} (status published as of 2026-09-15). The
            recommended locator is in{" "}
            <a href="#install">Install the plugin</a> above.
          </p>
        </ContentSection>

        <ContentSection title="Other runtimes">
          <ul>
            <li>
              <Link href="/how-to#install">Grok Bot</Link> — copy-paste GAF
              install prompt
            </li>
            <li>
              <Link href="/how-to#hermes-import">Hermes</Link> — scrubbed{" "}
              <code>.tar.gz</code> profile import
            </li>
            <li>
              <Link href="/how-to">How-To</Link> — install and share
            </li>
            <li>
              <Link href="/catalog">Open bots</Link>
            </li>
          </ul>
        </ContentSection>
      </ContentPage>
    </>
  );
}
