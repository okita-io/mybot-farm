import { readFile } from "node:fs/promises";
import path from "node:path";
import { parseStallReadme } from "@/lib/readme";
import type { Stall } from "@/lib/packs";

const seedReadmeCache = new Map<
  string,
  { markdown: string; html: string } | null
>();

/** Load sibling public/packs/{kind}/{slug}/README.md for seed stalls. */
export async function loadSeedStallReadme(
  stall: Pick<Stall, "kind" | "slug" | "listingId">,
): Promise<{ markdown: string; html: string } | null> {
  if (stall.listingId) {
    return null;
  }

  const cacheKey = `${stall.kind}:${stall.slug}`;
  if (seedReadmeCache.has(cacheKey)) {
    return seedReadmeCache.get(cacheKey) ?? null;
  }

  const filePath = path.join(
    process.cwd(),
    "public",
    "packs",
    stall.kind === "team" ? "teams" : "agents",
    stall.slug,
    "README.md",
  );

  try {
    const markdown = await readFile(filePath, "utf8");
    const parsed = parseStallReadme(markdown);
    const value = parsed.ok
      ? { markdown: parsed.markdown, html: parsed.html }
      : null;
    seedReadmeCache.set(cacheKey, value);
    return value;
  } catch {
    seedReadmeCache.set(cacheKey, null);
    return null;
  }
}

export async function withSeedReadme(stall: Stall): Promise<Stall> {
  if (stall.listingId || stall.readmeHtml) {
    return stall;
  }

  const seed = await loadSeedStallReadme(stall);
  if (!seed) {
    return stall;
  }

  return {
    ...stall,
    readmeMarkdown: seed.markdown,
    readmeHtml: seed.html,
  };
}
