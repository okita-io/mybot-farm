import { SIGNUP_SOURCES, type SignupSource } from "./newsletter-parse";

export { SIGNUP_SOURCES, type SignupSource };

export const farmNotes = {
  headline: "New stalls when they land — not when you remember to check.",
  sub: "Whole agents and teams for Grok Bot, Hermes, and OpenClaw. Occasional, no fluff.",
  blockButton: "Get farm notes",
  footerLabel: "Farm updates · New stalls + install notes. No weekly digests.",
  footerButton: "Subscribe",
  finePrint: "Occasional. Unsubscribe anytime.",
  success: "You’re on the list.",
} as const;

export const site = {
  name: "mybot.farm",
  productName: "My Bot Farm",
  url: "https://mybot.farm",
  tagline: "An Open Market to share your Agents",
  contrast: "Not a warehouse of skills.",
  byline:
    "A farmers market for your agent workforce in GrokBot, Hermes, OpenClaw and more.",
  description:
    "My Bot Farm is an open marketplace for whole agents and teams — not a warehouse of skills. Browse bots and install a copy for GrokBot, Hermes, and OpenClaw.",
  summary:
    "An open marketplace for whole agents and teams — not a warehouse of skills. Publish a pack, browse by life job, and install a copy.",
} as const;

export const navLinks = [
  { href: "/catalog", label: "Catalog", emphasis: true },
  { href: "/sell", label: "Sell" },
  { href: "/about", label: "About" },
  { href: "/press", label: "Press" },
  { href: "/how-to", label: "How-To" },
  { href: "/plant", label: "Plant" },
] as const;

export const siteOgImage = {
  url: "/og.png",
  width: 2164,
  height: 950,
  alt: "Glossy green, blue, and pink agent mascots for My Bot Farm",
} as const;

export const footerLinks = [
  { href: "/catalog", label: "Catalog" },
  { href: "/about", label: "About" },
  { href: "/press", label: "Press" },
  { href: "/sell", label: "Sell" },
  { href: "/sponsor", label: "Sponsor" },
  { href: "/how-to", label: "How-To" },
  { href: "/install/openclaw", label: "OpenClaw" },
  { href: "/install/hermes", label: "Hermes" },
  { href: "/install/kirocrew", label: "KiroCrew" },
  { href: "/plant", label: "Plant" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
] as const;

export const hermesPlugin = {
  id: "mybot-farm",
  version: "0.3.0",
  downloadPath: "/downloads/hermes-mybot-farm-0.3.0.zip",
  downloadUrl: "https://mybot.farm/downloads/hermes-mybot-farm-0.3.0.zip",
  gitInstall: "okita-io/mybot-farm/packages/hermes-mybot-farm",
} as const;

export const openclawPlugin = {
  id: "mybot-farm",
  packageName: "@okita-io/openclaw-mybot-farm",
  version: "0.2.0",
  downloadPath: "/downloads/openclaw-mybot-farm-0.2.0.tgz",
  downloadUrl: "https://mybot.farm/downloads/openclaw-mybot-farm-0.2.0.tgz",
} as const;

export const kirocrewPlugin = {
  id: "mybot-farm",
  packageName: "@okita-io/kirocrew-mybot-farm",
  version: "0.1.0",
  gitInstall: "okita-io/mybot-farm/packages/kirocrew-mybot-farm",
} as const;

export const contentRoutes = [
  {
    path: "/catalog",
    title: "Catalog",
    changeFrequency: "weekly" as const,
    priority: 0.9,
  },
  {
    path: "/about",
    title: "About",
    changeFrequency: "monthly" as const,
    priority: 0.7,
  },
  {
    path: "/press",
    title: "Press",
    changeFrequency: "monthly" as const,
    priority: 0.6,
  },
  {
    path: "/how-to",
    title: "How-To",
    changeFrequency: "monthly" as const,
    priority: 0.8,
  },
  {
    path: "/install/openclaw",
    title: "Install in OpenClaw",
    changeFrequency: "monthly" as const,
    priority: 0.8,
  },
  {
    path: "/install/hermes",
    title: "Install in Hermes",
    changeFrequency: "monthly" as const,
    priority: 0.8,
  },
  {
    path: "/install/kirocrew",
    title: "Install in KiroCrew",
    changeFrequency: "monthly" as const,
    priority: 0.8,
  },
  {
    path: "/plant",
    title: "Plant",
    changeFrequency: "monthly" as const,
    priority: 0.7,
  },
  {
    path: "/sell",
    title: "Sell",
    changeFrequency: "monthly" as const,
    priority: 0.7,
  },
  {
    path: "/sponsor",
    title: "Sponsor",
    changeFrequency: "monthly" as const,
    priority: 0.6,
  },
  {
    path: "/privacy",
    title: "Privacy",
    changeFrequency: "yearly" as const,
    priority: 0.4,
  },
  {
    path: "/terms",
    title: "Terms",
    changeFrequency: "yearly" as const,
    priority: 0.4,
  },
] as const;

export const capabilities = [
  {
    id: "find",
    title: "Find",
    tone: "find",
    description:
      "Browse bots by what you need. Lifestyle sits next to coding next to sales.",
  },
  {
    id: "share",
    title: "Share",
    tone: "share",
    description:
      "Publish a finished agent or a whole team. Set a price if you want — the farm hosts the bot.",
  },
  {
    id: "teams",
    title: "Teams",
    tone: "agent",
    description:
      "Install a crew as one pack. Programmer plus debugger. Writer plus editor.",
  },
] as const;

export const teams = [
  {
    name: "Programmer + Debugger",
    roles: "One implements. One reproduces failures and files the checks.",
  },
  {
    name: "Researcher + Librarian",
    roles: "One hunts. One files, indexes, and retrieves.",
  },
  {
    name: "Writer + Editor",
    roles: "One drafts. One humanizes, fact-checks, and cuts.",
  },
  {
    name: "Planner + Doer",
    roles: "One breaks work down. One executes and reports.",
  },
  {
    name: "Spec + Scaffold + QA",
    roles: "One writes cards. One builds. One gates release and never patches.",
  },
  {
    name: "Scout + Finders + Pitch",
    roles: "One finds venues. One digs up bookers. One drafts the email — the band sends.",
  },
] as const;

export const categories = [
  { slug: "lifestyle", label: "Lifestyle", tone: "find" },
  { slug: "productivity", label: "Productivity", tone: "share" },
  { slug: "coding", label: "Coding", tone: "share" },
  { slug: "writing", label: "Writing", tone: "share" },
  { slug: "marketing", label: "Marketing", tone: "agent" },
  { slug: "sales", label: "Sales", tone: "agent" },
  { slug: "research", label: "Research", tone: "share" },
  { slug: "finance-personal", label: "Personal finance", tone: "find" },
  { slug: "creative", label: "Creative", tone: "find" },
  { slug: "music", label: "Music", tone: "find" },
  { slug: "education", label: "Education", tone: "find" },
  { slug: "ops", label: "Ops / admin", tone: "share" },
  { slug: "experimental", label: "Experimental", tone: "agent" },
] as const;

export const webmcp = {
  title: "WebMCP for agents",
  answer:
    "WebMCP is how agents use mybot.farm as a tool instead of a webpage. This site registers pack tools — search_stalls, get_stall, download_pack, list_pack_skills, get_install_prompt, and post_listing — and mirrors them as JSON APIs. Browse tools are public. post_listing publishes a stall (including priceCents) with a seller API key, or a signed-in Clerk session in the browser. No Playwright-style clicking.",
} as const;

export const faqs = [
  {
    question: "What is mybot.farm?",
    answer:
      "My Bot Farm is an open marketplace where people share and install whole agents and teams — not a warehouse of skills. It stays clear, simple, sharable, searchable, and agent-friendly.",
  },
  {
    question: "How is that different from a skills hub?",
    answer:
      "Skills hubs sell capabilities and tips. mybot.farm lists finished agents — persona, memory, skills, and routines already composed — and teams that work together.",
  },
  {
    question: "What is a team?",
    answer:
      "A team is a small group of agents with roles and handoffs, installable as one pack. Installing a team creates a copy of each member. There is no live link back to the author’s farm.",
  },
  {
    question: "What is WebMCP?",
    answer:
      "WebMCP lets agents use mybot.farm as a tool. On this site they can call search_stalls, get_stall, download_pack, list_pack_skills, get_install_prompt, and post_listing — or hit the same JSON under /api — instead of automating the interface. Unattended posts use a seller API key from /sell; signed-in sellers can post from WebMCP with their browser session.",
  },
  {
    question: "How do I add a pack to Grok Bot?",
    answer:
      "Open a bot and copy the install prompt, or download the GAF JSON from /packs or /api/packs/{slug}. In Grok Bot choose New → Create new agent and Edit Profile. Adding a Bot creates a copy on your account. It does not include the author’s computer, logins, or conversation history. You need the Grok Bot app to finish. Seed bots today are GAF files. The How-To page walks through Grok Bot install, Hermes import, and sharing.",
  },
  {
    question: "How do I import a pack into Hermes?",
    answer:
      "Enable the mybot-farm plugin (symlink or copy packages/hermes-mybot-farm into ~/.hermes/plugins/mybot-farm, then hermes plugins enable mybot-farm). Open Hermes Desktop → Farm → browse a stall → Recruit. Solo agents land in the Desktop Bots roster. From the Plugin Catalog: hermes plugins install mybot-farm. CLI tools: farm_search, farm_get_stall, farm_get_pack, farm_plant, farm_reinstall. Manual path: hermes profile import on a scrubbed .tar.gz (Scholastic Research, Workbench). After import, add your own API keys. Full steps: /install/hermes.",
  },
  {
    question: "How do I plant a pack in OpenClaw?",
    answer:
      "Install from ClawHub: openclaw plugins install clawhub:@okita-io/openclaw-mybot-farm, then openclaw plugins enable mybot-farm and openclaw gateway restart. Optional: openclaw plugins search mybot-farm. From a checkout: openclaw plugins install ./packages/openclaw-mybot-farm --link --force. Or download https://mybot.farm/downloads/openclaw-mybot-farm-0.2.0.tgz and run openclaw plugins install on that .tgz (or npm-pack:). Tools are farm_search, farm_get_pack, farm_plant, farm_post, and farm_update. Full steps: /install/openclaw.",
  },
  {
    question: "How do I plant a pack in KiroCrew?",
    answer:
      "Install the mybot-farm plugin from the repo checkout at packages/kirocrew-mybot-farm (v0.1.0; there is no npm package yet). Then node bin/farm-plant.mjs plant <slug> writes ~/.kiro/agents/<name>.json plus steering files. A team slug also prints kirocrew workspace create / kirocrew agent create bind commands. Planted third-party agents get read, search, and web tools only. Full steps: /install/kirocrew.",
  },
  {
    question: "How do I share my Hermes agent?",
    answer:
      "Export with hermes profile export, then run scripts/scrub.py (also at https://mybot.farm/scripts/scrub.py) to drop chat history and secrets. Share only the clean archive. Never send the raw export. You can list a scrubbed GAF pack on /sell.",
  },
  {
    question: "Can I plant a share URL into my library?",
    answer:
      "Paste a mybot.farm bot, pack, or API URL on /plant to preview the pack. No login required for browse or preview. Saving into a library waits until you Start a plot. Copy install prompt and WebMCP remain the ways to install into Grok Bot or fetch packs as an agent.",
  },
  {
    question: "How do I share my own Grok Bot?",
    answer:
      "Scrub secrets first. Then list it on /sell: connect Stripe for paid bots, paste a GAF pack, set a price. Or create a seller API key on /sell and call post_listing / POST /api/listings from an agent. The farm hosts the bot and keeps 10% of each sale. You can still use Grok Bot’s public share link if you only want a free copy, not a paid listing. Hermes authors export, scrub with scrub.py, then share the clean .tar.gz or a GAF listing.",
  },
  {
    question: "What does the farm keep?",
    answer:
      "10% of the listing price as a hosting fee. Buyers check out on mybot.farm. The rest goes to the seller through Stripe Connect. Seed bots from the farm stay free.",
  },
  {
    question: "When can I use it?",
    answer:
      "Seed bots are up now: Gift Day, Sprout, Kitchen, Patch, Probe, Grant Research, Scholastic Research, Scout, Finders, Pitch, the Pair Bench team, the Workbench web team, and the Road Crew booking team. The catalog also includes the MIT Agency Agents roster as plantable packs. Authors can list their own agents and teams on /sell.",
  },
] as const;

export type CapabilityTone = (typeof capabilities)[number]["tone"];
export type CategoryTone = (typeof categories)[number]["tone"];
