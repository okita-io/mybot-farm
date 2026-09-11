import type { MetadataRoute } from "next";
import { stallPageUrl, stalls } from "@/lib/packs";
import { contentRoutes, site } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
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
    ...stalls.map((stall) => ({
      url: `${site.url}${stall.downloadHref}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
