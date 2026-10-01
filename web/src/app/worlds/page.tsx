import type { Metadata } from "next";
import { Container } from "@/components/container";
import { WorldCard } from "@/components/world-card";
import { searchCatalogStalls } from "@/lib/catalog";
import { site, siteOgImage } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Worlds",
  description:
    "Browse Worlds on mybot.farm: shareable settings where a cast of agents is embodied as characters. Install a world into KiroCrew, Hermes, OpenClaw, or GrokBot.",
  alternates: { canonical: "/worlds" },
  openGraph: {
    title: `Worlds | ${site.name}`,
    description:
      "Shareable agent worlds — a cast embodied as characters in a themed setting. Install into KiroCrew, Hermes, OpenClaw, or GrokBot.",
    url: "/worlds",
    images: [siteOgImage],
  },
};

export default async function WorldsPage() {
  const worlds = await searchCatalogStalls(undefined, "world", "newest");

  return (
    <section className="py-16 sm:py-20">
      <Container>
        <p className="font-mono text-[0.7rem] font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Worlds
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          Step into a world
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-pretty text-muted-foreground">
          A world is a cast of agents embodied as characters in a shared,
          themed setting. Install a world and you get your own copy of the
          cast — it plants as a team on any runtime. The world block (places,
          greeter, turn model) travels with the pack as data for a later pane;
          setting up the group chat is still a manual step in the install prompt.
        </p>

        {worlds.length ? (
          <ul className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {worlds.map((world) => (
              <li key={world.slug} className="min-w-0">
                <WorldCard stall={world} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="clay-surface mt-10 rounded-3xl bg-card/50 px-6 py-10 text-base text-muted-foreground">
            No worlds yet. Share one from the{" "}
            <a
              href="/sell"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              Sell
            </a>{" "}
            page, or browse{" "}
            <a
              href="/catalog"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              all bots and teams
            </a>
            .
          </p>
        )}
      </Container>
    </section>
  );
}
