export const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;

export type SharePathKind = "agent" | "team" | "world" | "pack" | "api" | "install-prompt";

export type SharePathErrorCode = "unsupported_path";

function isValidSlug(value: string): boolean {
  return SLUG_PATTERN.test(value);
}

function stripSlugExt(value: string): string {
  return value.replace(/\.json$/i, "");
}

export function parseSharePath(pathname: string):
  | { slug: string; pathKind: SharePathKind }
  | { error: SharePathErrorCode } {
  const path = pathname.replace(/\/+$/, "") || "/";

  const patterns: { re: RegExp; pathKind: SharePathKind }[] = [
    { re: /^\/agents\/([^/]+)$/, pathKind: "agent" },
    { re: /^\/teams\/([^/]+)$/, pathKind: "team" },
    { re: /^\/worlds\/([^/]+)$/, pathKind: "world" },
    { re: /^\/packs\/agents\/([^/]+)$/, pathKind: "pack" },
    { re: /^\/packs\/teams\/([^/]+)$/, pathKind: "pack" },
    { re: /^\/packs\/worlds\/([^/]+)$/, pathKind: "pack" },
    { re: /^\/api\/stalls\/([^/]+)$/, pathKind: "api" },
    { re: /^\/api\/packs\/([^/]+)\/skills$/, pathKind: "api" },
    { re: /^\/api\/packs\/([^/]+)\/grok-template$/, pathKind: "api" },
    { re: /^\/api\/packs\/([^/]+)$/, pathKind: "api" },
    { re: /^\/api\/install-prompt\/([^/]+)$/, pathKind: "install-prompt" },
  ];

  for (const { re, pathKind } of patterns) {
    const match = path.match(re);
    if (!match?.[1]) {
      continue;
    }

    const slug = stripSlugExt(match[1]);
    if (!isValidSlug(slug)) {
      return { error: "unsupported_path" };
    }

    return { slug, pathKind };
  }

  return { error: "unsupported_path" };
}
