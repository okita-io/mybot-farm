export const site = {
  name: "mybot.farm",
  productName: "My Bot Farm",
  url: "https://mybot.farm",
  tagline: "An Open Market to share your Agents",
  contrast: "Not a warehouse of skills.",
  byline:
    "A farmers market for your agent workforce in GrokBot, Hermes, OpenClaw and more.",
  description:
    "My Bot Farm is an open marketplace for whole agents and teams — not a warehouse of skills. Browse stalls and install a copy for GrokBot, Hermes, and OpenClaw.",
  summary:
    "An open marketplace for whole agents and teams — not a warehouse of skills. Publish a pack, browse by life job, and install a copy.",
} as const;

export const navLinks = [
  { href: "/catalog", label: "Stalls" },
  { href: "/teams", label: "Teams" },
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
  { href: "/about", label: "About" },
  { href: "/press", label: "Press" },
  { href: "/teams", label: "Teams" },
  { href: "/sell", label: "Sell" },
  { href: "/how-to", label: "How-To" },
  { href: "/plant", label: "Plant" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/catalog", label: "Stalls" },
] as const;

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
    path: "/teams",
    title: "Agent Teams",
    changeFrequency: "monthly" as const,
    priority: 0.7,
  },
  {
    path: "/how-to",
    title: "How-To",
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
      "Browse stalls by what you need. Lifestyle sits next to coding next to sales.",
  },
  {
    id: "share",
    title: "Share",
    tone: "share",
    description:
      "Publish a finished agent or a whole team. Set a price if you want — the farm hosts the stall.",
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
  { slug: "education", label: "Education", tone: "find" },
  { slug: "ops", label: "Ops / admin", tone: "share" },
  { slug: "experimental", label: "Experimental", tone: "agent" },
] as const;

export const webmcp = {
  title: "WebMCP for agents",
  answer:
    "WebMCP is how agents use mybot.farm as a tool instead of a webpage. This site registers read-only pack tools — search_stalls, get_stall, download_pack, list_pack_skills, and get_install_prompt — and mirrors them as public JSON APIs. No Playwright-style clicking.",
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
      "WebMCP lets agents use mybot.farm as a tool. On this site they can call search_stalls, get_stall, download_pack, list_pack_skills, and get_install_prompt — or hit the same JSON under /api — instead of automating the interface.",
  },
  {
    question: "How do I add a pack to Grok Bot?",
    answer:
      "Open a stall and copy the install prompt, or download the GAF JSON from /packs or /api/packs/{slug}. In Grok Bot choose New → Create new agent and Edit Profile. Adding a Bot creates a copy on your account. It does not include the author’s computer, logins, or conversation history. You need the Grok Bot app to finish. Seed stalls today are GAF files. The How-To page walks through Grok Bot install, Hermes import, and sharing.",
  },
  {
    question: "How do I import a pack into Hermes?",
    answer:
      "Hermes installs from a scrubbed profile .tar.gz with hermes profile import, not from GAF JSON. Some seed stalls ship that way — Scholastic Research (one profile) and Workbench (three team members). After import, add your own API keys — auth.json and .env never ship. The How-To page has the commands.",
  },
  {
    question: "How do I share my Hermes agent?",
    answer:
      "Export with hermes profile export, then run scripts/scrub.py (also at https://mybot.farm/scripts/scrub.py) to drop chat history and secrets. Share only the clean archive. Never send the raw export. You can list a scrubbed GAF pack on /sell.",
  },
  {
    question: "Can I plant a share URL into my library?",
    answer:
      "Paste a mybot.farm stall, pack, or API URL on /plant to preview the pack. No login required for browse or preview. Saving into a library waits until you Start a plot. Copy install prompt and WebMCP remain the ways to install into Grok Bot or fetch packs as an agent.",
  },
  {
    question: "How do I share my own Grok Bot?",
    answer:
      "Scrub secrets first. Then list it on /sell: connect Stripe, paste a GAF pack, set a price. The farm hosts the stall and keeps 10% of each sale. You can still use Grok Bot’s public share link if you only want a free copy, not a paid stall. Hermes authors export, scrub with scrub.py, then share the clean .tar.gz or a GAF listing.",
  },
  {
    question: "What does the farm keep?",
    answer:
      "10% of the listing price as a hosting fee. Buyers check out on mybot.farm. The rest goes to the seller through Stripe Connect. Seed stalls from the farm stay free.",
  },
  {
    question: "When can I use it?",
    answer:
      "Seed stalls are up now: Gift Day, Sprout, Patch, Probe, Grant Research, Scholastic Research, the Pair Bench team, and the Workbench web team. Authors can list their own agents and teams on /sell.",
  },
] as const;

export type CapabilityTone = (typeof capabilities)[number]["tone"];
export type CategoryTone = (typeof categories)[number]["tone"];
