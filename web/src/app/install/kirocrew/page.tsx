import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage, ContentSection } from "@/components/content-page";
import { Button } from "@/components/ui/button";
import { kirocrewPlugin, site, siteOgImage } from "@/lib/site";

export const metadata: Metadata = {
  title: "Install in KiroCrew",
  description:
    "Plant mybot.farm agents and teams into KiroCrew as native agent templates and crew workspaces, and post GAF listings back with a seller API key.",
  alternates: { canonical: "/install/kirocrew" },
  openGraph: {
    title: `Install in KiroCrew | ${site.name}`,
    description:
      "Enable the mybot-farm KiroCrew plugin, then plant agents into ~/.kiro/agents and teams into crew workspaces — a copy, never the author's machine.",
    url: "/install/kirocrew",
    images: [siteOgImage],
  },
};

export default function KirocrewInstallPage() {
  return (
    <ContentPage
      kicker="KiroCrew"
      title="Plant a farm stall into KiroCrew"
      lead="Enable the mybot-farm plugin, then plant agents into ~/.kiro/agents and teams into crew workspaces. You get a copy — not the author's computer, logins, or chat history."
    >
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" size="lg" className="h-9 rounded-full px-4">
          <Link href="/catalog">Browse bots</Link>
        </Button>
      </div>

      <ContentSection id="what" title="What you get">
        <p>
          The <code>{kirocrewPlugin.id}</code> plugin ({kirocrewPlugin.version})
          maps a Generic Agent Format (GAF) pack onto KiroCrew&apos;s native
          shapes. Tools registered with <code>register(ctx)</code>:
        </p>
        <ul>
          <li>
            <code>farm_search</code> — list stalls from <code>/api/stalls</code>
          </li>
          <li>
            <code>farm_get_stall</code> / <code>farm_get_pack</code> — stall
            metadata and the GAF pack for a slug
          </li>
          <li>
            <code>farm_plant</code> — an agent becomes a template at{" "}
            <code>~/.kiro/agents/&lt;name&gt;.json</code> with its persona in the{" "}
            <code>prompt</code> and skills as steering files under{" "}
            <code>.kiro/steering/farm/&lt;slug&gt;/</code>. A team writes each
            member template plus a shared-context file and a topology doc, and
            returns the <code>kirocrew workspace create</code> /{" "}
            <code>agent create</code> bind commands for the crew.
          </li>
          <li>
            <code>farm_reinstall</code> — re-plant, overwriting with{" "}
            <code>force</code>
          </li>
          <li>
            <code>farm_post</code> / <code>farm_update</code> — publish a GAF
            listing with a seller API key
          </li>
        </ul>
        <p>
          Longer notes and the exact mapping:{" "}
          <a href="https://github.com/okita-io/mybot-farm/blob/main/docs/kirocrew-plugin-spec.md">
            docs/kirocrew-plugin-spec.md
          </a>
          . Source lives at <code>packages/kirocrew-mybot-farm</code>. This is
          the KiroCrew twin of the{" "}
          <Link href="/install/hermes">Hermes</Link> and{" "}
          <Link href="/install/openclaw">OpenClaw</Link> plugins — different
          runtime, different plant target.
        </p>
      </ContentSection>

      <ContentSection id="safety" title="Safe by default">
        <p>
          Planting a stranger&apos;s agent is a trust boundary, so a planted
          agent gets a <strong>deny-by-default</strong> tool allow-list —
          read, search, and web only. It never inherits <code>execute_bash</code>{" "}
          or file-write access from a downloaded pack; grant more only after you
          review the template. Shipped routines are documented in the
          agent&apos;s prompt but <strong>not</strong> scheduled on install.
        </p>
      </ContentSection>

      <ContentSection id="install" title="Enable the plugin">
        <p>Plugins are opt-in. From a repo checkout:</p>
        <pre>{`git clone ${kirocrewPlugin.gitInstall.split("/").slice(0, 2).join("/")} # okita-io/mybot-farm
cd mybot-farm/packages/kirocrew-mybot-farm
npm test   # verify the mapping + plant surface`}</pre>
        <p>
          Point the plugin at the farm and plant with no agent loop:
        </p>
        <pre>{`export MYBOT_FARM_URL=${site.url}
export MYBOT_FARM_API_KEY=mbf_yourkey   # only needed to post
node bin/farm-plant.mjs search patch
node bin/farm-plant.mjs plant patch --dry-run
node bin/farm-plant.mjs plant patch
node bin/farm-plant.mjs plant pair-bench    # team -> crew + bind commands`}</pre>
      </ContentSection>

      <ContentSection id="crew" title="Teams become crews">
        <p>
          A team pack plants each member as its own agent template, writes a
          shared-context steering file and a topology doc, and prints the bind
          commands to wire the crew — a workspace plus one Crew Member per
          member:
        </p>
        <pre>{`kirocrew workspace create --name pair-bench
kirocrew agent create --name "patch" --kiro-agent patch --workspace pair-bench --memory-store default
kirocrew agent create --name "probe" --kiro-agent probe --workspace pair-bench --memory-store default`}</pre>
        <p>
          KiroCrew&apos;s native orchestration (<code>route_crew</code>,{" "}
          <code>spawn_run(crew=…)</code>) makes it the closest fit of any
          runtime for a farm team.
        </p>
      </ContentSection>

      <ContentSection title="Other runtimes">
        <ul>
          <li>
            <Link href="/how-to#install">Grok Bot</Link> — copy-paste GAF
            install prompt
          </li>
          <li>
            <Link href="/install/hermes">Hermes</Link> — Recruit into the Bots
            roster
          </li>
          <li>
            <Link href="/install/openclaw">OpenClaw</Link> — plant GAF JSON
          </li>
          <li>
            <Link href="/catalog">Open bots</Link>
          </li>
        </ul>
      </ContentSection>
    </ContentPage>
  );
}
