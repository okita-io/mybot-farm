import type { Metadata } from "next";
import Link from "next/link";
import { Download } from "lucide-react";
import { ContentPage, ContentSection } from "@/components/content-page";
import { JsonLd } from "@/components/json-ld";
import { Button } from "@/components/ui/button";
import { howToHermesPluginLd } from "@/lib/schema";
import { hermesPlugin, site, siteOgImage } from "@/lib/site";

export const metadata: Metadata = {
  title: "Install in Hermes",
  description:
    "Plant mybot.farm Hermes stalls with the mybot-farm plugin. Symlink or unzip into ~/.hermes/plugins/mybot-farm, enable it, then farm_search / farm_get_stall / farm_plant / farm_reinstall.",
  alternates: { canonical: "/install/hermes" },
  openGraph: {
    title: `Install in Hermes | ${site.name}`,
    description:
      "Install the mybot-farm Hermes plugin, then search and plant scrubbed profiles into Hermes — including GAP 2 tombstone cleanup on reinstall.",
    url: "/install/hermes",
    images: [siteOgImage],
  },
};

export default function HermesInstallPage() {
  return (
    <>
      <JsonLd data={howToHermesPluginLd} />
      <ContentPage
        kicker="Hermes"
        title="Plant a farm stall into Hermes"
        lead="Install the mybot-farm plugin, enable it, then search and plant scrubbed profile archives. You get Hermes profiles (and for teams, a team dir + kanban board) — not the author’s computer, logins, or chat history."
      >
        <div className="flex flex-wrap gap-2">
          <Button asChild size="lg" className="h-9 rounded-full px-4">
            <a
              href={hermesPlugin.downloadPath}
              download={`hermes-mybot-farm-${hermesPlugin.version}.zip`}
            >
              <Download data-icon="inline-start" />
              Download plugin {hermesPlugin.version}
            </a>
          </Button>
          <Button asChild variant="outline" size="lg" className="h-9 rounded-full px-4">
            <Link href="/how-to#hermes-plugin">How-To</Link>
          </Button>
        </div>

        <ContentSection id="what" title="What you get">
          <p>
            Native Hermes tools (plugin name <code>{hermesPlugin.id}</code>),
            registered with <code>register(ctx)</code>:
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
              <code>farm_get_stall</code> — stall metadata including member
              tarball hrefs
            </li>
            <li>
              <code>farm_plant</code> — download +{" "}
              <code>hermes profile import</code>. Teams also get{" "}
              <code>~/.hermes/teams/{"{slug}"}</code>, TEAM.md / WORK.md / cron,
              and a kanban board when gettingStarted says so
            </li>
            <li>
              <code>farm_reinstall</code> — clear{" "}
              <code>~/.hermes/profiles/.deleted</code> tombstones (GAP 2), then
              plant again; optional destructive <code>force</code> /{" "}
              <code>clean</code>
            </li>
          </ul>
          <p>
            Longer notes and exact CLI:{" "}
            <a href="https://github.com/okita-io/mybot-farm/blob/main/docs/hermes-plugin.md">
              docs/hermes-plugin.md
            </a>
            . Source lives at <code>packages/hermes-mybot-farm</code> in the farm
            repo. This is the Hermes twin of the{" "}
            <Link href="/install/openclaw">OpenClaw plugin</Link> — different
            runtime, different plant target.
          </p>
        </ContentSection>

        <ContentSection id="install" title="Install the plugin">
          <p>
            Plugins are opt-in.{" "}
            <code>hermes plugins install</code> takes a Git URL or{" "}
            <code>owner/repo[/subdir]</code> — not a local folder path.
          </p>
          <h3>From a repo checkout (recommended)</h3>
          <pre>{`mkdir -p ~/.hermes/plugins
ln -sfn "$(pwd)/packages/hermes-mybot-farm" ~/.hermes/plugins/mybot-farm
hermes plugins enable mybot-farm`}</pre>
          <p>Copy the folder instead of linking if you prefer a snapshot.</p>
          <h3>From GitHub</h3>
          <p>
            Subdir is required — this plugin is not at the repo root.{" "}
            <code>--enable</code> skips the Enable now? prompt.
          </p>
          <pre>{`hermes plugins install ${hermesPlugin.gitInstall} --enable`}</pre>
          <h3>From the public zip</h3>
          <pre>{`curl -LO ${hermesPlugin.downloadUrl}
mkdir -p ~/.hermes/plugins/mybot-farm
unzip hermes-mybot-farm-0.1.0.zip -d ~/.hermes/plugins/mybot-farm
hermes plugins enable mybot-farm`}</pre>
        </ContentSection>

        <ContentSection id="validate" title="Validate">
          <pre>{`hermes plugins validate ./packages/hermes-mybot-farm
python3 -m unittest discover -s packages/hermes-mybot-farm/tests -v`}</pre>
          <p>
            Current Hermes git has <code>plugins validate</code>. PyPI{" "}
            <code>hermes-agent</code> 0.19.0 does not (install / list / enable /
            disable only) — use the unittest probe. You should see tools:{" "}
            <code>farm_search</code>, <code>farm_get_pack</code>,{" "}
            <code>farm_get_stall</code>, <code>farm_plant</code>,{" "}
            <code>farm_reinstall</code>.
          </p>
        </ContentSection>

        <ContentSection id="plant" title="Plant a stall">
          <p>
            After install, ask your Hermes agent to call{" "}
            <code>farm_search</code>, <code>farm_get_stall</code>,{" "}
            <code>farm_get_pack</code>, or <code>farm_plant</code> with a slug
            such as <code>scholastic-research</code> (one profile) or{" "}
            <code>workbench</code> (three members + board). Optional plant
            params: <code>name</code>, <code>force</code>, <code>clean</code>,{" "}
            <code>dry_run</code>. Also: <code>hermes farm search workbench</code>{" "}
            and <code>/farm plant scholastic-research</code>.
          </p>
          <p>From a checkout, CLI with no agent loop:</p>
          <pre>{`python3 packages/hermes-mybot-farm/bin/farm-plant search workbench
python3 packages/hermes-mybot-farm/bin/farm-plant plant scholastic-research --dry-run
python3 packages/hermes-mybot-farm/bin/farm-plant plant scholastic-research`}</pre>
          <p>
            Then <code>hermes profile list</code> must show the imported
            name(s). Replace <code>https://SET_YOUR_ENDPOINT/v1</code> in each
            profile’s <code>config.yaml</code>. <code>auth.json</code> and{" "}
            <code>.env</code> never ship.
          </p>
        </ContentSection>

        <ContentSection id="reinstall" title="Reinstall and GAP 2">
          <p>
            After <code>hermes profile delete</code>, Hermes leaves{" "}
            <code>~/.hermes/profiles/.deleted/{"{name}"}</code>. Import of the
            same name extracts files and prints success, but the profile stays
            off <code>profile list</code> / non-spawnable. The plugin always
            clears matching tombstones before import.
          </p>
          <pre>{`python3 packages/hermes-mybot-farm/bin/farm-plant reinstall workbench
# delete live profiles of those names, then re-import:
python3 packages/hermes-mybot-farm/bin/farm-plant reinstall workbench --force
# also wipe team dir + kanban board:
python3 packages/hermes-mybot-farm/bin/farm-plant reinstall workbench --force --clean
python3 packages/hermes-mybot-farm/scripts/clear-tombstones.py`}</pre>
          <p>
            <code>--force</code> and <code>--clean</code> are destructive.
            Default is safe.
          </p>
        </ContentSection>

        <ContentSection title="Other runtimes">
          <ul>
            <li>
              <Link href="/how-to#install">Grok Bot</Link> — copy-paste GAF
              install prompt
            </li>
            <li>
              <Link href="/how-to#hermes-import">Hermes (manual import)</Link> —{" "}
              <code>hermes profile import</code> without the plugin
            </li>
            <li>
              <Link href="/install/openclaw">OpenClaw</Link> — plant GAF JSON
              with the mybot-farm plugin
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
