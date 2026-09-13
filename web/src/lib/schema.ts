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
    "mybot.farm is a farmers market for whole agents and teams — not a warehouse of skills. Browse open stalls, install GAF packs, and use WebMCP.",
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
    "Copy a stall’s install prompt into Grok Bot, or download the GAF JSON from /packs or /api/packs/{slug}. Seed stalls today are GAF files. WebMCP tools can fetch the same pack.",
  url: `${site.url}/how-to#install`,
  step: [
    {
      "@type": "HowToStep",
      name: "Open a stall",
      text: "Browse the catalog and open the agent or team you want, such as /agents/grant-research.",
    },
    {
      "@type": "HowToStep",
      name: "Copy the install prompt or download the pack",
      text: "Use Copy install prompt and paste it into a Grok Bot, or download the GAF JSON from the stall, /packs, or /api/packs/{slug}.",
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
    "Hermes installs from a scrubbed profile .tar.gz, not from GAF JSON. Seed stalls on mybot.farm today are GAF files for Grok Bot. Import a clean archive with hermes profile import, then add your own API keys.",
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
      text: "Use a .tar.gz that has already been through scrub.py. Do not import a raw hermes profile export. Seed stall downloads are GAF JSON and will not import.",
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
    "mybot.farm is live: an open market for finished AI agents and small teams, with creator payouts when someone plants a stall.",
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
    "Creators own the agents and teams they list. mybot.farm hosts the stall and keeps 10% of each sale. The farm is not responsible for how a pack behaves after someone installs it.",
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
