export const SPONSOR_SLOT_COUNT = 5;
export const SPONSOR_PRICE_USD = 25;
export const SPONSOR_PRICE_LABEL = "$25 / month";
export const SPONSOR_DESKTOP_ROTATION_MS = 6000;
export const SPONSOR_MOBILE_ROTATION_MS = 4000;

export type SponsorTone = "find" | "share" | "agent";
export type SponsorSide = "left" | "right";
export type SponsorKind = "house" | "sponsor" | "open";

export type SponsorCreative = {
  id: string;
  name: string;
  blurb: string;
  href: string;
  hrefLabel: string;
  icon: string;
  tone: SponsorTone;
  kind: SponsorKind;
  external?: boolean;
};

export type SponsorSlot = {
  id: `${SponsorSide}-${number}`;
  side: SponsorSide;
  creatives: SponsorCreative[];
};

const OPEN_BLURBS = [
  "Your agent.\nThis stall.",
  "Meet the next\nplanter here.",
  "A named stall\non the farm.",
] as const;

const HOUSE_LEFT: SponsorCreative[] = [
  {
    id: "house-catalog",
    name: "Catalog",
    blurb: "Browse finished\nagents and teams.",
    href: "/catalog",
    hrefLabel: "Open bots",
    icon: "C",
    tone: "find",
    kind: "house",
  },
  {
    id: "house-teams",
    name: "Teams",
    blurb: "Install a crew\nas one pack.",
    href: "/teams",
    hrefLabel: "See teams",
    icon: "T",
    tone: "agent",
    kind: "house",
  },
  {
    id: "house-plant",
    name: "Plant",
    blurb: "Paste a farm URL.\nPreview the pack.",
    href: "/plant",
    hrefLabel: "Plant a pack",
    icon: "P",
    tone: "find",
    kind: "house",
  },
];

const SPONSORED_LEFT: SponsorCreative[] = [
  {
    id: "sponsor-applied-ai",
    name: "Applied AI",
    blurb: "Step inside.\nExplore what’s next.",
    href: "https://appliedai.solutions/",
    hrefLabel: "appliedai.solutions",
    icon: "A",
    tone: "find",
    kind: "sponsor",
    external: true,
  },
];

const HOUSE_RIGHT: SponsorCreative[] = [
  {
    id: "house-sell",
    name: "Sell a bot",
    blurb: "List a scrubbed pack.\nKeep 90%.",
    href: "/sell",
    hrefLabel: "List a pack",
    icon: "S",
    tone: "share",
    kind: "house",
  },
  {
    id: "house-hermes",
    name: "Hermes",
    blurb: "Plant a farm pack\nin Hermes.",
    href: "/install/hermes",
    hrefLabel: "Install Hermes",
    icon: "H",
    tone: "share",
    kind: "house",
  },
  {
    id: "house-openclaw",
    name: "OpenClaw",
    blurb: "Plant a pack\nin OpenClaw.",
    href: "/install/openclaw",
    hrefLabel: "Install OpenClaw",
    icon: "O",
    tone: "agent",
    kind: "house",
  },
];

const SPONSORED_RIGHT: SponsorCreative[] = [
  {
    id: "sponsor-aicookd",
    name: "aicookd",
    blurb: "The freshest AI\ngames and creations.",
    href: "https://aicookd.com/",
    hrefLabel: "aicookd.com",
    icon: "a",
    tone: "share",
    kind: "sponsor",
    external: true,
  },
];

export function openSponsorCreative(
  side: SponsorSide,
  index: number,
): SponsorCreative {
  const blurb = OPEN_BLURBS[index % OPEN_BLURBS.length];
  return {
    id: `open-${side}-${index + 1}`,
    name: "Sponsor a spot",
    blurb,
    href: `/sponsor#${side}`,
    hrefLabel: SPONSOR_PRICE_LABEL,
    icon: "+",
    tone: side === "left" ? "find" : "share",
    kind: "open",
  };
}

export function fillSponsorSlots(
  side: SponsorSide,
  occupied: SponsorCreative[][],
): SponsorSlot[] {
  const slots: SponsorSlot[] = [];
  for (let index = 0; index < SPONSOR_SLOT_COUNT; index += 1) {
    const creatives = occupied[index]?.filter(Boolean) ?? [];
    slots.push({
      id: `${side}-${index + 1}`,
      side,
      creatives: creatives.length ? creatives : [openSponsorCreative(side, index)],
    });
  }
  return slots;
}

export function sponsorRails() {
  return {
    left: fillSponsorSlots("left", [
      ...SPONSORED_LEFT.map((creative) => [creative]),
      ...HOUSE_LEFT.map((creative) => [creative]),
    ]),
    right: fillSponsorSlots("right", [
      ...SPONSORED_RIGHT.map((creative) => [creative]),
      ...HOUSE_RIGHT.map((creative) => [creative]),
    ]),
  };
}

export function mobileSponsorCreatives() {
  const { left, right } = sponsorRails();
  const seen = new Set<string>();
  const creatives: SponsorCreative[] = [];
  for (const slot of [...left, ...right]) {
    for (const creative of slot.creatives) {
      if (seen.has(creative.id)) continue;
      seen.add(creative.id);
      creatives.push(creative);
    }
  }
  const featured = creatives.filter((creative) => creative.kind !== "open");
  const offsite = featured.filter((creative) => creative.kind === "sponsor");
  const house = featured.filter((creative) => creative.kind === "house");
  const open = creatives.find((creative) => creative.kind === "open");
  return open ? [...offsite, ...house, open] : [...offsite, ...house];
}

export function openSlotCount() {
  const { left, right } = sponsorRails();
  return [...left, ...right].filter((slot) =>
    slot.creatives.every((creative) => creative.kind === "open"),
  ).length;
}
