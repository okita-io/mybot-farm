export type StallKind = "agent" | "team";
export type StallTone = "find" | "share" | "agent";

export type Stall = {
  kind: StallKind;
  slug: string;
  name: string;
  title: string;
  description: string;
  category: string;
  tone: StallTone;
  downloadHref: string;
  members?: { name: string; href: string }[];
};

export const stalls: Stall[] = [
  {
    kind: "agent",
    slug: "gift-day",
    name: "Gift Day",
    title: "Family gift & birthday remembrancer",
    description:
      "Nudges you in time to buy or send something. Never charges or orders without your yes.",
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
    category: "Coding",
    tone: "share",
    downloadHref: "/packs/agents/probe.json",
  },
  {
    kind: "team",
    slug: "pair-bench",
    name: "Pair Bench",
    title: "Programmer + debugger team",
    description:
      "Install Patch and Probe, then put them in one group. Bug reports start with Probe; features start with Patch.",
    category: "Coding",
    tone: "agent",
    downloadHref: "/packs/teams/pair-bench.json",
    members: [
      { name: "Patch", href: "/packs/agents/patch.json" },
      { name: "Probe", href: "/packs/agents/probe.json" },
    ],
  },
];
