import type { MetadataRoute } from "next";
import { listCatalogStalls } from "@/lib/catalog";
import { authorHref, listAuthorUsernamesWithListings } from "@/lib/users";
import { stallPageUrl } from "@/lib/packs";
import { contentRoutes, site } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const stalls = await listCatalogStalls();
  const authors = await listAuthorUsernamesWithListings();

  return [
    {
      url: site.url,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    ...contentRoutes.map((page) => ({
      url: `${site.url}${page.path}`,
      lastModified: new Date(),
      changeFrequency: page.changeFrequency,
      priority: page.priority,
    })),
    ...stalls.map((stall) => ({
      url: stallPageUrl(stall),
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...authors.map((username) => ({
      url: `${site.url}${authorHref(username)}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    ...stalls
      .filter((stall) => (stall.priceCents ?? 0) <= 0)
      .map((stall) => ({
        url: `${site.url}${stall.downloadHref}`,
        lastModified: new Date(),
        changeFrequency: "monthly" as const,
        priority: 0.6,
      })),
  ];
}
