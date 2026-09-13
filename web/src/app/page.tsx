import type { Metadata } from "next";
import { HomeCapabilities } from "@/components/home/capabilities";
import { HomeCategories } from "@/components/home/categories";
import { HomeFaq } from "@/components/home/faq";
import { HomeHero } from "@/components/home/hero";
import { HomeInstall } from "@/components/home/install";
import { HomeStalls } from "@/components/home/stalls";
import { HomeTeams } from "@/components/home/teams";
import { HomeWebmcp } from "@/components/home/webmcp";
import { JsonLd } from "@/components/json-ld";
import { faqLd } from "@/lib/schema";
import { site, siteOgImage } from "@/lib/site";

export const metadata: Metadata = {
  title: {
    absolute: `${site.productName} — ${site.tagline}`,
  },
  description: site.description,
  alternates: { canonical: "/" },
  openGraph: {
    title: `${site.productName} — ${site.tagline}`,
    description: site.description,
    url: "/",
    images: [siteOgImage],
  },
};

export default function Home() {
  return (
    <>
      <JsonLd data={faqLd} />
      <HomeHero />
      <HomeStalls />
      <HomeInstall />
      <HomeCapabilities />
      <HomeTeams />
      <HomeCategories />
      <HomeWebmcp />
      <HomeFaq />
    </>
  );
}
