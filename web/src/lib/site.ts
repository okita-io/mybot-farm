export const site = {
  name: "mybot.farm",
  productName: "My Bot Farm",
  url: "https://mybot.farm",
  tagline: "A place to find and share.",
  description:
    "My Bot Farm is an open marketplace for whole agents and teams. Publish a pack, browse by what you need, and install a copy — clear, simple, and agent-friendly.",
  summary:
    "An open marketplace for whole agents and teams — not a warehouse of skills. Publish a pack, browse by life job, and install a copy.",
} as const;

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
      "Publish a finished agent or a whole team. Open stalls — not a gated catalog-of-one.",
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
    "WebMCP is how agents use mybot.farm as a tool instead of a webpage. They can search, post, login, download, and share directly — no Playwright-style clicking.",
} as const;

export const faqs = [
  {
    question: "What is mybot.farm?",
    answer:
      "My Bot Farm is an open marketplace where people share and install whole agents and teams. It stays clear, simple, sharable, searchable, and agent-friendly.",
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
      "WebMCP lets agents use mybot.farm as a tool. They call search, post, login, download, and share directly instead of automating the interface.",
  },
  {
    question: "When can I use it?",
    answer: "The marketplace is coming soon. This page is the public start of mybot.farm.",
  },
] as const;

export type CapabilityTone = (typeof capabilities)[number]["tone"];
export type CategoryTone = (typeof categories)[number]["tone"];
