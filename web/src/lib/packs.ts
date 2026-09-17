import { site } from "@/lib/site";

export type StallKind = "agent" | "team";
export type StallTone = "find" | "share" | "agent";

export type StallAuthor = {
  username: string;
  href?: string;
};

export type Stall = {
  kind: StallKind;
  slug: string;
  /** Stable stall id: listing UUID, or uuid v5 for catalog/seed stalls. Marketplace identity for consumers (e.g. Cursor catalog); not a create_bot_share_json field. */
  stallId?: string;
  /** Content revision (same-slug GAF updates). Not the GAF format version. Pair with stallId + slug from GET /api/stalls. */
  packVersion?: number;
  name: string;
  title: string;
  description: string;
  category: string;
  tone: StallTone;
  downloadHref: string;
  /** Public .hermes.tar.gz when one exists for this slug. */
  hermesHref?: string;
  seoTitle?: string;
  seoDescription?: string;
  members?: { name: string; href: string }[];
  priceCents?: number;
  currency?: string;
  listingId?: string;
  sellerUserId?: string;
  author?: StallAuthor;
  listedAt?: string;
  updatedAt?: string;
  downloadCount?: number;
  likeCount?: number;
  readmeMarkdown?: string | null;
  readmeHtml?: string | null;
};

export const FARM_SEED_LISTED_AT = "2026-09-12T00:00:00.000Z";

export const stallToneClasses: Record<
  StallTone,
  { card: string; label: string }
> = {
  find: { card: "bg-find-muted/60 ring-find/20", label: "text-find-foreground" },
  share: {
    card: "bg-share-muted/60 ring-share/20",
    label: "text-share-foreground",
  },
  agent: {
    card: "bg-agent-muted/60 ring-agent/20",
    label: "text-agent-foreground",
  },
};

export function isStallKind(value: string | null | undefined): value is StallKind {
  return value === "agent" || value === "team";
}

/** User-facing noun. Catalog listings are bots; a team listing stays a team. */
export function listingNoun(
  kind?: StallKind | null,
  form: "one" | "many" | "One" | "Many" = "one",
): string {
  const isTeam = kind === "team";
  switch (form) {
    case "many":
      return isTeam ? "teams" : "bots";
    case "One":
      return isTeam ? "Team" : "Bot";
    case "Many":
      return isTeam ? "Teams" : "Bots";
    default:
      return isTeam ? "team" : "bot";
  }
}

export function stallPagePath(stall: Pick<Stall, "kind" | "slug">): string {
  return stall.kind === "team" ? `/teams/${stall.slug}` : `/agents/${stall.slug}`;
}

export function stallPageUrl(stall: Pick<Stall, "kind" | "slug">): string {
  return `${site.url}${stallPagePath(stall)}`;
}

export function packFileUrl(stall: Pick<Stall, "downloadHref">): string {
  return `${site.url}${stall.downloadHref}`;
}

export function hermesPackUrl(
  stall: Pick<Stall, "hermesHref">,
): string | undefined {
  if (!stall.hermesHref) {
    return undefined;
  }
  if (
    stall.hermesHref.startsWith("http://") ||
    stall.hermesHref.startsWith("https://")
  ) {
    return stall.hermesHref;
  }
  return `${site.url}${stall.hermesHref}`;
}

export function packFilename(stall: Pick<Stall, "downloadHref" | "slug">): string {
  const last = stall.downloadHref.split("/").at(-1)?.split("?")[0];
  if (last && last.includes(".")) {
    return last;
  }

  return `${stall.slug}.json`;
}

export function packPathStem(packPath: string): string {
  const filename = packPath.split("/").pop()?.split("?")[0] ?? packPath;
  return filename
    .replace(/\.hermes\.tar\.gz$/i, "")
    .replace(/\.tar\.gz$/i, "")
    .replace(/\.json$/i, "");
}

export function memberHref(member: { href: string }): string {
  const stall = getStall(packPathStem(member.href));
  return stall ? stallPagePath(stall) : member.href;
}

export function getStall(slug: string): Stall | undefined {
  return stalls.find((stall) => stall.slug === slug);
}

export function stallsOfKind(kind: StallKind): Stall[] {
  return stalls.filter((stall) => stall.kind === kind);
}

export function searchStalls(query?: string, kind?: StallKind): Stall[] {
  const needle = query?.trim().toLowerCase();

  return stalls.filter((stall) => {
    if (kind && stall.kind !== kind) {
      return false;
    }

    if (!needle) {
      return true;
    }

    const haystack = [
      stall.slug,
      stall.name,
      stall.title,
      stall.description,
      stall.category,
      stall.kind,
      stall.author?.username,
      ...(stall.members?.map((member) => member.name) ?? []),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(needle);
  });
}

export function stallSeo(stall: Stall) {
  return {
    title: stall.seoTitle ?? stall.name,
    description: stall.seoDescription ?? stall.description,
    ogTitle: stall.seoTitle ?? stall.name,
  };
}

export function stallApiPaths(slug: string) {
  return {
    get_stall: `/api/stalls/${slug}`,
    download_pack: `/api/packs/${slug}`,
    list_pack_skills: `/api/packs/${slug}/skills`,
    get_install_prompt: `/api/install-prompt/${slug}`,
    get_grok_template: `/api/packs/${slug}/grok-template`,
  };
}

export function stallRecord(stall: Stall) {
  return {
    kind: stall.kind,
    slug: stall.slug,
    stallId: stall.stallId ?? stall.listingId ?? null,
    packVersion: stall.packVersion ?? 1,
    name: stall.name,
    title: stall.title,
    description: stall.description,
    category: stall.category,
    pagePath: stallPagePath(stall),
    pageUrl: stallPageUrl(stall),
    downloadHref: stall.downloadHref,
    packUrl: packFileUrl(stall),
    hermesHref: stall.hermesHref ?? null,
    hermesUrl: hermesPackUrl(stall) ?? null,
    members: stall.members,
    priceCents: stall.priceCents ?? 0,
    currency: stall.currency ?? "usd",
    author: stall.author ?? null,
    listedAt: stall.listedAt ?? null,
    updatedAt: stall.updatedAt ?? null,
    downloadCount: stall.downloadCount ?? 0,
    likeCount: stall.likeCount ?? 0,
    hasReadme: Boolean(stall.readmeHtml?.trim() || stall.readmeMarkdown?.trim()),
    api: stallApiPaths(stall.slug),
  };
}

export const stalls: Stall[] = [
  {
    kind: "agent",
    slug: "gift-day",
    name: "Gift Day",
    title: "Family gift & birthday remembrancer",
    description:
      "Nudges you in time to buy or send something. Never charges or orders without your yes.",
    seoDescription:
      "Install Gift Day from mybot.farm: a lifestyle agent that nudges you in time to buy or send a gift. It never charges or orders without your yes.",
    category: "Lifestyle",
    tone: "find",
    downloadHref: "/packs/agents/gift-day.json",
    hermesHref: "/packs/agents/gift-day.hermes.tar.gz",
  },
  {
    kind: "agent",
    slug: "sprout-journal",
    name: "Sprout",
    title: "Houseplant care journal",
    description:
      "A private plant roster and watering reminders. Your copy keeps the journal.",
    seoDescription:
      "Install Sprout from mybot.farm: a houseplant care journal with a private roster and watering reminders. Your copy keeps the journal.",
    category: "Lifestyle",
    tone: "find",
    downloadHref: "/packs/agents/sprout-journal.json",
  },
  {
    kind: "agent",
    slug: "patch",
    name: "Patch",
    title: "Implementation programmer",
    description:
      "Writes small diffs and lands code. Pair with Probe on Pair Bench.",
    seoDescription:
      "Install Patch from mybot.farm: an implementation programmer that writes small diffs and lands code. Pair it with Probe on Pair Bench.",
    category: "Coding",
    tone: "share",
    downloadHref: "/packs/agents/patch.json",
    hermesHref: "/packs/agents/patch.hermes.tar.gz",
  },
  {
    kind: "agent",
    slug: "probe",
    name: "Probe",
    title: "Debugger & verifier",
    description:
      "Reproduces bugs and checks Patch’s work. A fix is not done until the verify path passes.",
    seoDescription:
      "Install Probe from mybot.farm: a debugger that reproduces bugs and checks Patch’s work. A fix is not done until the verify path passes.",
    category: "Coding",
    tone: "share",
    downloadHref: "/packs/agents/probe.json",
    hermesHref: "/packs/agents/probe.hermes.tar.gz",
  },
  {
    kind: "agent",
    slug: "grant-research",
    name: "Grant Research",
    title: "Grant research & proposal specialist",
    description:
      "Finds RFAs, RFPs, and NOFOs, then drafts narratives, budgets, attachments, and support letters. Research and draft only — never invents eligibility.",
    seoTitle: "Grant Research",
    seoDescription:
      "Install Grant Research from mybot.farm. Finds public solicitations and drafts grant narratives. Research and draft only — no invented eligibility.",
    category: "Education",
    tone: "find",
    downloadHref: "/packs/agents/grant-research.json",
    hermesHref: "/packs/agents/grant-research.hermes.tar.gz",
  },
  {
    kind: "agent",
    slug: "scholastic-research",
    name: "Scholastic Research",
    title: "Scholastic research & source-synthesis agent",
    description:
      "Clarifies your research question, plans the search strategy, verifies peer-reviewed sources, and synthesizes them with clean citations. Trained and verified by an automated judge panel — 9.14/10 on unseen questions, zero fabricated citations.",
    seoTitle: "Scholastic Research",
    seoDescription:
      "Install Scholastic Research from mybot.farm: a free Hermes-native agent that finds and verifies peer-reviewed sources, then synthesizes them with citations.",
    category: "Education",
    tone: "find",
    downloadHref: "/packs/agents/scholastic-research.hermes.tar.gz",
  },
  {
    kind: "team",
    slug: "pair-bench",
    name: "Pair Bench",
    title: "Programmer + debugger team",
    description:
      "Install Patch and Probe, then put them in one group. Bug reports start with Probe; features start with Patch.",
    seoDescription:
      "Install Pair Bench from mybot.farm: a programmer plus debugger team. Bug reports start with Probe; features start with Patch.",
    category: "Coding",
    tone: "agent",
    downloadHref: "/packs/teams/pair-bench.json",
    members: [
      { name: "Patch", href: "/packs/agents/patch.json" },
      { name: "Probe", href: "/packs/agents/probe.json" },
    ],
  },
  {
    kind: "team",
    slug: "workbench",
    name: "Workbench",
    title: "Spec + scaffold + QA web team",
    description:
      "Install Spec, Scaffold, and Smoke. Spec writes cards; Scaffold builds; Smoke gates release and never fixes.",
    seoDescription:
      "Install Workbench from mybot.farm: a free Hermes web-app team. Spec writes cards, Scaffold implements, Smoke verifies — a card ships only when the running app passes.",
    category: "Coding",
    tone: "agent",
    downloadHref: "/packs/teams/workbench.json",
    priceCents: 0,
    listedAt: "2026-09-13T00:00:00.000Z",
    members: [
      {
        name: "Spec",
        href: "/packs/teams/workbench/workbench-spec.hermes.tar.gz",
      },
      {
        name: "Scaffold",
        href: "/packs/teams/workbench/workbench-scaffold.hermes.tar.gz",
      },
      {
        name: "Smoke",
        href: "/packs/teams/workbench/workbench-smoke.hermes.tar.gz",
      },
    ],
  },
  {
    kind: "agent",
    slug: "scout",
    name: "Scout",
    title: "Live-music venue scout",
    description:
      "Finds bars, halls, DIY spaces, and house shows. Cites public sources; never invents venues. Hands venue cards to Finders.",
    seoDescription:
      "Install Scout from mybot.farm: a live-music venue scout for small bands. Shortlists bars, halls, and DIY spaces from public sources, then hands venue cards to Finders.",
    category: "Music",
    tone: "find",
    downloadHref: "/packs/agents/scout.json",
    priceCents: 0,
    listedAt: "2026-09-15T00:00:00.000Z",
  },
  {
    kind: "agent",
    slug: "finders",
    name: "Finders",
    title: "Booking contact digger",
    description:
      "Turns Scout’s venue cards into contact sheets with confidence levels. Never guesses emails. Hands sheets to Pitch.",
    seoDescription:
      "Install Finders from mybot.farm: a booking contact digger that turns venue cards into sourced contact sheets. Never fabricates emails or phones.",
    category: "Music",
    tone: "find",
    downloadHref: "/packs/agents/finders.json",
    hermesHref: "/packs/agents/finders.hermes.tar.gz",
    priceCents: 0,
    listedAt: "2026-09-15T00:00:00.000Z",
  },
  {
    kind: "agent",
    slug: "pitch",
    name: "Pitch",
    title: "Booking email drafter",
    description:
      "Writes the booking email and one follow-up. Drafts only — the band always sends.",
    seoDescription:
      "Install Pitch from mybot.farm: a booking email drafter for small bands. One email, one follow-up, drafts only — the band always presses send.",
    category: "Music",
    tone: "share",
    downloadHref: "/packs/agents/pitch.json",
    hermesHref: "/packs/agents/pitch.hermes.tar.gz",
    priceCents: 0,
    listedAt: "2026-09-15T00:00:00.000Z",
  },
  {
    kind: "team",
    slug: "road-crew",
    name: "Road Crew",
    title: "Live-music booking pipeline: scout, dig, draft",
    description:
      "Install Scout, Finders, and Pitch. Scout finds venues; Finders digs up bookers; Pitch drafts the email. The band always sends.",
    seoDescription:
      "Install Road Crew from mybot.farm: a free Grok Bot and OpenClaw team for small bands. Scout finds venues, Finders digs contacts, Pitch drafts emails — the band always sends.",
    category: "Music",
    tone: "agent",
    downloadHref: "/packs/teams/road-crew.json",
    priceCents: 0,
    listedAt: "2026-09-15T00:00:00.000Z",
    members: [
      { name: "Scout", href: "/packs/agents/scout.json" },
      { name: "Finders", href: "/packs/agents/finders.json" },
      { name: "Pitch", href: "/packs/agents/pitch.json" },
    ],
  },
];
