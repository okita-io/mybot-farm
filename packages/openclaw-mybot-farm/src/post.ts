export { loadPack, postListing } from "./post.mjs";

export type PostListingArgs = {
  kind?: unknown;
  name?: unknown;
  title?: unknown;
  description?: unknown;
  category?: unknown;
  priceCents?: unknown;
  price_cents?: unknown;
  pack?: unknown;
  packPath?: unknown;
  pack_path?: unknown;
  dryRun?: unknown;
  dry_run?: unknown;
};

export type PostListingResult =
  | {
      ok: true;
      text: string;
      dryRun?: true;
      payload?: unknown;
      endpoint?: string;
      apiKey?: string;
      slug?: string;
      kind?: string;
      pagePath?: string;
      pageUrl?: string;
      hasReadme?: boolean;
    }
  | {
      ok: false;
      error: string;
      status?: number;
    };
