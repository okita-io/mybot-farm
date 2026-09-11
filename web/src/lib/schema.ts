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
  name: "Install an agent from mybot.farm",
  description:
    "Copy a stall’s install prompt into Grok Bot, or download the GAF JSON from /packs or /api/packs/{slug}. WebMCP tools can fetch the same pack.",
  url: `${site.url}/how-to`,
  step: [
    {
      "@type": "HowToStep",
      name: "Open a stall",
      text: "Browse open stalls and open the agent or team you want, such as /agents/grant-research.",
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

export const privacyPageLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: `Privacy | ${site.name}`,
  url: `${site.url}/privacy`,
  description:
    "mybot.farm uses standard web analytics. We do not sell personal data. Pack downloads and install prompts are product features.",
};
