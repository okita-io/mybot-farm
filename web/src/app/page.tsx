import { HomeCapabilities } from "@/components/home/capabilities";
import { HomeCategories } from "@/components/home/categories";
import { HomeFaq } from "@/components/home/faq";
import { HomeHero } from "@/components/home/hero";
import { HomeTeams } from "@/components/home/teams";
import { HomeWebmcp } from "@/components/home/webmcp";
import { JsonLd } from "@/components/json-ld";
import { faqLd } from "@/lib/schema";

export default function Home() {
  return (
    <>
      <JsonLd data={faqLd} />
      <HomeHero />
      <HomeCapabilities />
      <HomeTeams />
      <HomeCategories />
      <HomeWebmcp />
      <HomeFaq />
    </>
  );
}
