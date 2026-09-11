import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StallView } from "@/components/stall-view";
import { getStall, stallsOfKind, stallPagePath, stallSeo } from "@/lib/packs";

export function generateStaticParams() {
  return stallsOfKind("agent").map((stall) => ({ slug: stall.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/agents/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const stall = getStall(slug);

  if (!stall || stall.kind !== "agent") {
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

export default async function AgentStallPage({
  params,
}: PageProps<"/agents/[slug]">) {
  const { slug } = await params;
  const stall = getStall(slug);

  if (!stall || stall.kind !== "agent") {
    notFound();
  }

  return <StallView stall={stall} />;
}
