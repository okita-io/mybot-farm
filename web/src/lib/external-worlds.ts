// Community towns that live outside the farm catalog. Pure data so the worlds
// page can introduce them without a catalog row, and so tests can load this
// file under the plain-node runner.

export type ExternalWorld = {
  id: string;
  name: string;
  /** Project home. Always an absolute https URL. */
  href: string;
  linkLabel: string;
  author: string;
  summary: string;
  /** How someone takes an agent they already have on the farm into this world. */
  bring: string;
  /** Still from the project page. Site path (`/…`) or an absolute https URL. */
  image?: {
    src: string;
    alt: string;
  };
};

export const externalWorlds: readonly ExternalWorld[] = [
  {
    id: "agent-machi",
    name: "Agent Machi",
    href: "https://github.com/happyeric77/agent-machi",
    linkLabel: "View on GitHub",
    author: "happyeric77",
    summary:
      "A small 3D Kamakura town for Herdr. Working agents stay in their offices, blocked agents wait on the station platform, and idle agents head to the beach. One binary, on your machine.",
    bring:
      "Plant an agent from the catalog into the runtime you work in, then run Agent Machi next to Herdr. The town gives each agent Herdr is running a resident: an office while they work, the station when they need you, the beach when they are idle.",
    image: {
      src: "/external-worlds/agent-machi.webp",
      alt: "Agent Machi town: an agent works in an office with a lit sign, one waits on the station platform, and one rests on the beach",
    },
  },
];
