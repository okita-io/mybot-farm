import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { ContentPage } from "@/components/content-page";
import { PlantShareForm } from "@/components/plant-share-form";
import { resolveShare } from "@/lib/resolve-share";
import { site, siteOgImage } from "@/lib/site";

export const metadata: Metadata = {
  title: "Plant",
  description:
    "Paste a mybot.farm bot, pack, or API URL to preview the agent. No login required. Persisting a library item waits until you Start a plot.",
  alternates: { canonical: "/plant" },
  openGraph: {
    title: `Plant | ${site.name}`,
    description:
      "Resolve a farm share link to a pack preview. Complementary to Copy install prompt and WebMCP.",
    url: "/plant",
    images: [siteOgImage],
  },
};

export default async function PlantPage({ searchParams }: PageProps<"/plant">) {
  const params = await searchParams;
  const urlParam = typeof params.url === "string" ? params.url : "";
  const slugParam = typeof params.slug === "string" ? params.slug : "";
  const initialUrl = urlParam || slugParam;
  const requestHost = (await headers()).get("host") ?? undefined;
  const initialResult = initialUrl
    ? await resolveShare(
        urlParam ? { url: urlParam } : { slug: slugParam },
        { requestHost },
      )
    : undefined;

  return (
    <ContentPage
      kicker="Plant"
      title="Paste a share link, preview the pack"
      lead="Bring a mybot.farm bot or pack URL here. The farm resolves it to the same GAF data the read APIs already serve — no HTML scrape, no invented skills, no login. Saving into a library waits until you Start a plot."
    >
      <PlantShareForm initialUrl={initialUrl} initialResult={initialResult} />
      <p className="text-sm leading-relaxed text-muted-foreground">
        This sits beside{" "}
        <Link href="/how-to" className="font-medium text-foreground underline-offset-4 hover:underline">
          How-To
        </Link>{" "}
        (Grok Bot GAF prompt, Hermes scrubbed archive),{" "}
        <Link href="/teams" className="font-medium text-foreground underline-offset-4 hover:underline">
          Agent Teams
        </Link>
        , and WebMCP (agent tools). Preview is anonymous. Starting a plot (and
        persisting a library) comes later.
      </p>
    </ContentPage>
  );
}
