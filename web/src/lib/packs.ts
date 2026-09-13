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
  name: string;
  title: string;
  description: string;
  category: string;
  tone: StallTone;
  downloadHref: string;
  seoTitle?: string;
  seoDescription?: string;
  members?: { name: string; href: string }[];
  priceCents?: number;
  currency?: string;
  listingId?: string;
  sellerUserId?: string;
  author?: StallAuthor;
  listedAt?: string;
};

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

export function stallPagePath(stall: Pick<Stall, "kind" | "slug">): string {
  return stall.kind === "team" ? `/teams/${stall.slug}` : `/agents/${stall.slug}`;
}

export function stallPageUrl(stall: Pick<Stall, "kind" | "slug">): string {
  return `${site.url}${stallPagePath(stall)}`;
}

export function packFileUrl(stall: Pick<Stall, "downloadHref">): string {
  return `${site.url}${stall.downloadHref}`;
}

export function packFilename(stall: Pick<Stall, "downloadHref" | "slug">): string {
  return stall.downloadHref.split("/").at(-1) ?? `${stall.slug}.json`;
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
  };
}

export function stallRecord(stall: Stall) {
  return {
    kind: stall.kind,
    slug: stall.slug,
    name: stall.name,
    title: stall.title,
    description: stall.description,
    category: stall.category,
    pagePath: stallPagePath(stall),
    pageUrl: stallPageUrl(stall),
    downloadHref: stall.downloadHref,
    packUrl: packFileUrl(stall),
    members: stall.members,
    priceCents: stall.priceCents ?? 0,
    currency: stall.currency ?? "usd",
    author: stall.author ?? null,
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
];
