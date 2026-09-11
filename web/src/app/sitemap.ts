import type { MetadataRoute } from "next";
import { stallPageUrl, stalls } from "@/lib/packs";
import { site } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: site.url,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
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
