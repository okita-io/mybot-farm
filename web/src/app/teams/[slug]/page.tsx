import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StallView } from "@/components/stall-view";
import { getStall, stallsOfKind, stallPagePath, stallSeo } from "@/lib/packs";

export function generateStaticParams() {
  return stallsOfKind("team").map((stall) => ({ slug: stall.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/teams/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const stall = getStall(slug);

  if (!stall || stall.kind !== "team") {
    return { title: "Stall not found" };
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
    },
  };
}

export default async function TeamStallPage({
  params,
}: PageProps<"/teams/[slug]">) {
  const { slug } = await params;
  const stall = getStall(slug);

  if (!stall || stall.kind !== "team") {
    notFound();
  }

  return <StallView stall={stall} />;
}
