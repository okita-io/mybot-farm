import type { Metadata } from "next";
import { StallView } from "@/components/stall-view";
import { findStall } from "@/lib/catalog";
import { stallsOfKind, stallPagePath, stallSeo } from "@/lib/packs";
import { stallPageState } from "@/lib/stall-page";
import { siteOgImage } from "@/lib/site";

export function generateStaticParams() {
  return stallsOfKind("world").map((stall) => ({ slug: stall.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/worlds/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const stall = await findStall(slug);

  if (!stall || stall.kind !== "world") {
    return {
      title: "World not found",
      description:
        "That world is not on mybot.farm. Browse worlds or go back home.",
    };
  }

  const path = stallPagePath(stall);
  const seo = stallSeo(stall);

  return {
    title: seo.title,
    description: seo.description,
    alternates: { canonical: path },
    openGraph: {
      title: seo.ogTitle,
      description: seo.description,
      url: path,
      images: [siteOgImage],
    },
  };
}

export default async function WorldStallPage({
  params,
  searchParams,
}: PageProps<"/worlds/[slug]">) {
  const { slug } = await params;
  const query = await searchParams;
  const state = await stallPageState(slug, "world", {
    checkout: typeof query.checkout === "string" ? query.checkout : undefined,
    session_id:
      typeof query.session_id === "string" ? query.session_id : undefined,
  });

  return (
    <StallView
      stall={state.stall}
      canDownload={state.canDownload}
      signedIn={state.signedIn}
      checkout={state.checkout}
    />
  );
}
