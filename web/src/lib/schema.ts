import { faqs, site } from "@/lib/site";

export const websiteLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: site.productName,
  alternateName: site.name,
  url: site.url,
  description: site.description,
};

export const organizationLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: site.productName,
  alternateName: site.name,
  url: site.url,
  description: site.description,
};

export const faqLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((faq) => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: faq.answer,
    },
  })),
};

export const aboutPageLd = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  name: `About ${site.productName}`,
  url: `${site.url}/about`,
  description:
    "mybot.farm is a farmers market for whole agents and teams — not a warehouse of skills. Browse open bots, install GAF packs, and use WebMCP.",
  isPartOf: {
    "@type": "WebSite",
    name: site.productName,
    url: site.url,
  },
};

export const howToInstallLd = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "Install an agent from mybot.farm in Grok Bot",
  description:
    "Copy a bot’s install prompt into Grok Bot, or download the GAF JSON from /packs or /api/packs/{slug}. Seed bots today are GAF files. WebMCP tools can fetch the same pack.",
  url: `${site.url}/how-to#install`,
  step: [
    {
      "@type": "HowToStep",
      name: "Open a bot",
      text: "Browse the catalog and open the bot or team you want, such as /agents/grant-research.",
    },
    {
      "@type": "HowToStep",
      name: "Copy the install prompt or download the pack",
      text: "Use Copy install prompt and paste it into a Grok Bot, or download the GAF JSON from the bot page, /packs, or /api/packs/{slug}.",
    },
    {
      "@type": "HowToStep",
      name: "Create a Bot and edit the profile",
      text: "In Grok Bot choose New → Create new agent, then Edit Profile. Set name, title, description, and avatar from the pack. Save skills and memory.",
    },
    {
      "@type": "HowToStep",
      name: "Confirm you have a copy",
      text: "Adding a Bot creates a copy on your account. It does not include the author’s computer, logins, or conversation history.",
    },
  ],
};

export const howToHermesImportLd = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "Import a Hermes profile from a scrubbed archive",
  description:
    "Hermes installs from a scrubbed profile .tar.gz, not from GAF JSON. Some seed bots ship Hermes archives (Scholastic Research, Workbench). Import a clean archive with hermes profile import, then add your own API keys.",
  url: `${site.url}/how-to#hermes-import`,
  step: [
    {
      "@type": "HowToStep",
      name: "Install Hermes Agent",
      text: "Install Hermes Agent so hermes profile import is available on your machine.",
    },
    {
      "@type": "HowToStep",
      name: "Get a scrubbed profile archive",
      text: "Use a .tar.gz that has already been through scrub.py. Do not import a raw hermes profile export. Hermes seed bots (Scholastic Research, Workbench members) download as .tar.gz; Grok Bot packs are GAF JSON and will not import.",
    },
    {
      "@type": "HowToStep",
      name: "Import as a new profile",
      text: "Run hermes profile import path/to/pack.tar.gz --name my-agent. Import refuses to overwrite an existing profile and cannot import as default.",
    },
    {
      "@type": "HowToStep",
      name: "Add your own credentials",
      text: "auth.json and .env never ship in a farm pack. Configure your own keys after import.",
    },
  ],
};

export const howToHermesShareLd = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "Export and scrub a Hermes agent before sharing",
  description:
    "Export a Hermes profile, then run mybot.farm’s scrub.py to drop chat history and secrets. Share only the clean archive, never the raw export.",
  url: `${site.url}/how-to#hermes-share`,
  step: [
    {
      "@type": "HowToStep",
      name: "Export the profile",
      text: "Run hermes profile export <name>. The archive can include sessions, state.db, memories, and secrets written into files. Hermes strips auth.json and .env by filename only.",
    },
    {
      "@type": "HowToStep",
      name: "Scrub the export",
      text: "Run python3 scrub.py on the tar.gz. The script lives in the mybot.farm repo under scripts/ and is mirrored at https://mybot.farm/scripts/scrub.py.",
    },
    {
      "@type": "HowToStep",
      name: "Read the report",
      text: "Exit 0 means the re-scan passed. Exit 1 means a high-confidence secret remains — do not share. Review needs_review items before listing or sending the pack.",
    },
    {
      "@type": "HowToStep",
      name: "Share only the clean pack",
      text: "Hand someone the scrubbed .tar.gz for hermes profile import, or list a scrubbed GAF pack on /sell. Never ship the original export.",
    },
  ],
};

export const howToHermesPluginLd = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "Plant a mybot.farm stall in Hermes Agent",
  description:
    "Install the mybot-farm Hermes plugin, enable it, then search and plant scrubbed profile archives with farm_search, farm_get_stall, farm_get_pack, farm_plant, and farm_reinstall.",
  url: `${site.url}/install/hermes`,
  step: [
    {
      "@type": "HowToStep",
      name: "Install the plugin",
      text: "From a checkout, symlink packages/hermes-mybot-farm to ~/.hermes/plugins/mybot-farm. hermes plugins install does not take a local folder path. Git: hermes plugins install okita-io/mybot-farm/packages/hermes-mybot-farm --enable. After Plugin Catalog admission: hermes plugins install mybot-farm then hermes plugins enable mybot-farm. Or unzip https://mybot.farm/downloads/hermes-mybot-farm-0.1.0.zip into ~/.hermes/plugins/mybot-farm.",
    },
    {
      "@type": "HowToStep",
      name: "Enable mybot-farm",
      text: "Run hermes plugins enable mybot-farm. Plugins are opt-in. Current Hermes git: hermes plugins validate ./packages/hermes-mybot-farm. PyPI hermes-agent 0.19.0 has no validate subcommand — run python3 -m unittest discover -s packages/hermes-mybot-farm/tests -v instead.",
    },
    {
      "@type": "HowToStep",
      name: "Plant a pack",
      text: "Ask the agent to farm_plant a slug such as scholastic-research, or run python3 packages/hermes-mybot-farm/bin/farm-plant plant scholastic-research. Team packs (Workbench) import each member, recreate the team dir, and create the kanban board when gettingStarted says so.",
    },
    {
      "@type": "HowToStep",
      name: "Reinstall without invisible profiles",
      text: "farm_reinstall clears ~/.hermes/profiles/.deleted/<name> tombstones (GAP 2) before import and checks hermes profile list. Pass force to delete live profiles of those names; pass clean to wipe the team dir and board. Default is safe.",
    },
  ],
};

export const howToOpenClawLd = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "Plant a mybot.farm agent in OpenClaw",
  description:
    "Install the mybot-farm OpenClaw plugin from ClawHub (recommended), enable it, restart the gateway, then search and plant GAF packs with farm_search, farm_get_pack, and farm_plant.",
  url: `${site.url}/install/openclaw`,
  step: [
    {
      "@type": "HowToStep",
      name: "Install from ClawHub",
      text: "Run openclaw plugins install clawhub:@okita-io/openclaw-mybot-farm. Optional: openclaw plugins search mybot-farm. Alternatives: from a checkout, openclaw plugins install ./packages/openclaw-mybot-farm --link --force; or download https://mybot.farm/downloads/openclaw-mybot-farm-0.1.1.tgz and install the .tgz (or npm-pack:).",
    },
    {
      "@type": "HowToStep",
      name: "Enable mybot-farm",
      text: "Run openclaw plugins enable mybot-farm. If plugins.allow is a closed list, add mybot-farm after backing up ~/.openclaw/openclaw.json.",
    },
    {
      "@type": "HowToStep",
      name: "Restart the gateway",
      text: "Restart the OpenClaw gateway so existing agent sessions see farm_search, farm_get_pack, and farm_plant.",
    },
    {
      "@type": "HowToStep",
      name: "Plant a pack",
      text: "Ask the agent to farm_plant a slug such as frontend-developer. From a checkout you can also run node packages/openclaw-mybot-farm/bin/farm-plant.mjs plant frontend-developer. The copy lands in ~/.openclaw/farm/<slug>.",
    },
  ],
};

export const pressPageLd = {
  "@context": "https://schema.org",
  "@type": "NewsArticle",
  headline:
    "mybot.farm Launches an Open Market for AI Agent Teams — Discover Finished Crews, Plant a Copy, Pay Creators",
  alternativeHeadline:
    "New farmers market lets builders publish whole agents and crews — and get paid when other users plant their work",
  datePublished: "2026-09-12",
  dateModified: "2026-09-12",
  url: `${site.url}/press`,
  description:
    "mybot.farm is live: an open market for finished AI agents and small teams, with creator payouts when someone plants a bot.",
  author: {
    "@type": "Person",
    name: "Alex Okita",
    email: "press@okita.io",
    url: "https://www.linkedin.com/in/alexokita/",
    sameAs: [
      "https://www.linkedin.com/in/alexokita/",
      "https://x.com/alexokita",
    ],
  },
  publisher: {
    "@type": "Organization",
    name: site.productName,
    url: site.url,
  },
  isPartOf: {
    "@type": "WebSite",
    name: site.productName,
    url: site.url,
  },
};

export const privacyPageLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: `Privacy | ${site.name}`,
  url: `${site.url}/privacy`,
  description:
    "mybot.farm does not sell or redistribute personal data. Clerk handles accounts, Stripe handles payments, and cookies are only what those tools need.",
};

export const termsPageLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: `Terms | ${site.name}`,
  url: `${site.url}/terms`,
  description:
    "Creators own the agents and teams they list. mybot.farm hosts the bot and keeps 10% of each sale. The farm is not responsible for how a pack behaves after someone installs it.",
};

export const teamsPageLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: `Agent Teams | ${site.name}`,
  url: `${site.url}/teams`,
  description:
    "Import a pre-coordinated team of agents instead of wiring them one-by-one. Solo agents are fine; many workflows are pairs or crews with roles and handoffs.",
  isPartOf: {
    "@type": "WebSite",
    name: site.productName,
    url: site.url,
  },
};
