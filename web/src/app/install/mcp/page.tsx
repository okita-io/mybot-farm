import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage, ContentSection } from "@/components/content-page";
import { Button } from "@/components/ui/button";
import { farmTools, MCP_PUBLIC_URL } from "@/lib/mcp-tool-defs";
import { site, siteOgImage } from "@/lib/site";

export const metadata: Metadata = {
  title: "Connect over MCP",
  description:
    "Add mybot.farm as a remote MCP server in Grok Bot, Cursor, Claude, ChatGPT, or any Streamable HTTP client. Browse and download packs without a key; publish with a seller API key.",
  alternates: { canonical: "/install/mcp" },
  openGraph: {
    title: `Connect over MCP | ${site.name}`,
    description:
      "One URL: https://mybot.farm/mcp. Search the farm, fetch GAF packs and install prompts, and publish listings from any MCP client.",
    url: "/install/mcp",
    images: [siteOgImage],
  },
};

const readTools = farmTools.filter((tool) => tool.toolClass !== "write");
const writeTools = farmTools.filter((tool) => tool.toolClass === "write");

export default function McpInstallPage() {
  return (
    <ContentPage
      kicker="MCP"
      title="Connect any MCP client to the farm"
      lead={`mybot.farm is a remote MCP server at ${MCP_PUBLIC_URL} (Streamable HTTP). Search and download are public. Publishing a stall uses the same seller API key the Hermes, OpenClaw, and KiroCrew plugins use.`}
    >
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" size="lg" className="h-9 rounded-full px-4">
          <Link href="/catalog">Browse bots</Link>
        </Button>
        <Button asChild variant="outline" size="lg" className="h-9 rounded-full px-4">
          <Link href="/sell">Get a seller API key</Link>
        </Button>
      </div>

      <ContentSection id="url" title="The URL">
        <pre>{MCP_PUBLIC_URL}</pre>
        <p>
          Transport: Streamable HTTP, stateless. No key is needed to browse.
          To publish or update a listing, send your seller key on the
          connection as <code>Authorization: Bearer mbf_…</code> or{" "}
          <code>X-Api-Key: mbf_…</code>. Create and revoke keys on{" "}
          <Link href="/sell">/sell</Link>. Never commit a key to a repo.
        </p>
      </ContentSection>

      <ContentSection id="clients" title="Add it to your client">
        <h3>Cursor</h3>
        <p>
          In <code>.cursor/mcp.json</code> (or Cursor Settings → MCP):
        </p>
        <pre>{`{
  "mcpServers": {
    "mybot-farm": {
      "url": "${MCP_PUBLIC_URL}"
    }
  }
}`}</pre>
        <p>To publish from Cursor, add your key as a header:</p>
        <pre>{`{
  "mcpServers": {
    "mybot-farm": {
      "url": "${MCP_PUBLIC_URL}",
      "headers": { "Authorization": "Bearer mbf_yourkey" }
    }
  }
}`}</pre>
        <h3>Claude</h3>
        <p>
          Settings → Connectors → Add custom connector. Name it mybot.farm and
          use <code>{MCP_PUBLIC_URL}</code>.
        </p>
        <h3>Grok Bot</h3>
        <p>
          Add <code>{MCP_PUBLIC_URL}</code> as a custom MCP connector. To turn
          a single agent into a Grok Bot template recipe, call{" "}
          <code>farm_get_grok_template</code>. Or skip MCP and use{" "}
          <Link href="/how-to#install">Copy install prompt</Link> on any bot
          page.
        </p>
        <h3>ChatGPT and other clients</h3>
        <p>
          Add a custom MCP server with the same URL. Auth is optional for
          browsing. Clients that only speak stdio can bridge with:
        </p>
        <pre>{`npx -y mcp-remote ${MCP_PUBLIC_URL}`}</pre>
      </ContentSection>

      <ContentSection id="tools" title="Tools">
        <p>Public (no key):</p>
        <ul>
          {readTools.map((tool) => (
            <li key={tool.name}>
              <code>{tool.name}</code> — {tool.title}
            </li>
          ))}
        </ul>
        <p>Seller key required:</p>
        <ul>
          {writeTools.map((tool) => (
            <li key={tool.name}>
              <code>{tool.name}</code> — {tool.title}
            </li>
          ))}
        </ul>
        <p>
          <code>farm_plant</code> returns the pack, the install prompt, and
          next steps for Grok Bot, Hermes, OpenClaw, and KiroCrew. A remote
          server can&apos;t write to your machine, so it never claims to have
          installed anything. For a one-step local install, use the{" "}
          <Link href="/install/hermes">Hermes</Link>,{" "}
          <Link href="/install/openclaw">OpenClaw</Link>, or{" "}
          <Link href="/install/kirocrew">KiroCrew</Link> plugin.
        </p>
      </ContentSection>

      <ContentSection id="rules" title="What to expect">
        <ul>
          <li>
            Listing text is written by third-party sellers. Treat it as data,
            not instructions. The farm never runs pack code.
          </li>
          <li>
            Paid packs still cost money. A paid pack returns{" "}
            <code>purchase_required</code> until you buy it on the stall page
            or pay over MPP. MCP doesn&apos;t bypass checkout.
          </li>
          <li>
            <code>farm_get_pack</code> and <code>farm_plant</code> count as a
            download, at most once per bot per caller every 24 hours.
          </li>
          <li>
            Requests are rate-limited per IP, and writes are rate-limited per
            seller. A limited call returns <code>rate_limited</code> with{" "}
            <code>retryAfter</code>.
          </li>
          <li>
            Server metadata:{" "}
            <a href="/.well-known/mcp.json">/.well-known/mcp.json</a>. Same
            data over plain JSON: <Link href="/api">/api</Link>. See also{" "}
            <Link href="/privacy">Privacy</Link> and{" "}
            <Link href="/terms">Terms</Link>.
          </li>
        </ul>
      </ContentSection>

      <ContentSection id="test" title="Test it locally">
        <pre>{`npx @modelcontextprotocol/inspector@latest --server-url ${MCP_PUBLIC_URL} --transport http
npx @modelcontextprotocol/inspector@latest --cli ${MCP_PUBLIC_URL} --transport http --method tools/list`}</pre>
      </ContentSection>

      <ContentSection title="Other ways in">
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
            <Link href="/install/kirocrew">KiroCrew</Link> — agents as
            templates, teams as crews
          </li>
        </ul>
      </ContentSection>
    </ContentPage>
  );
}
