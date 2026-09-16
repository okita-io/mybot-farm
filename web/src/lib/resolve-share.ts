import { installPromptPayload } from "@/lib/install-prompt";
import { packSummaryFields } from "@/lib/pack-files";
import { findStall, getCatalogPack, requireCatalogStallAndPack } from "@/lib/catalog";
import { stallPageUrl, stallRecord, type StallKind, type StallTone } from "@/lib/packs";
import { site } from "@/lib/site";

export const MAX_SHARE_URL_LENGTH = 2048;
export const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;

export const ALLOWED_SHARE_HOSTS = [
  "mybot.farm",
  "www.mybot.farm",
  "localhost",
  "127.0.0.1",
] as const;

export type ResolveShareErrorCode =
  | "url_required"
  | "url_too_long"
  | "invalid_url"
  | "host_not_allowed"
  | "raw_gaf_not_supported"
  | "unsupported_path"
  | "stall_not_found";

export type PackSummary = {
  format?: string;
  version?: string;
  profile?: {
    name?: string;
    title?: string;
    description?: string;
  };
  runtime: string[];
  skillCount: number;
  memoryCount: number;
  memoryLineCount: number;
  soulLine: string | null;
  memberCount: number;
  scrubbed: boolean;
};

export type ResolveShareSuccess = {
  ok: true;
  kind: StallKind;
  slug: string;
  sourceUrl: string;
  canonicalUrl: string;
  stall: ReturnType<typeof stallRecord> & { tone: StallTone };
  packSummary: PackSummary;
  installPrompt: ReturnType<typeof installPromptPayload>;
  warnings: string[];
};

export type ResolveShareFailure = {
  ok: false;
  error: ResolveShareErrorCode;
  warnings: string[];
  slug?: string;
};

export type ResolveShareResult = ResolveShareSuccess | ResolveShareFailure;

export type ResolveShareInput = {
  url?: string;
  slug?: string;
};

export type ResolveShareOptions = {
  requestHost?: string;
};

export type UserLibraryItem = {
  userId: string;
  slug: string;
  kind: StallKind;
  sourceUrl: string;
  plantedAt: string;
  gafSnapshotRef?: string;
};

type PathKind = "agent" | "team" | "pack" | "api" | "install-prompt";

function normalizeHost(host: string): string {
  return host.toLowerCase().replace(/\.$/, "").split(":")[0] ?? host;
}

function isAllowedHost(host: string, requestHost?: string): boolean {
  const normalized = normalizeHost(host);

  if ((ALLOWED_SHARE_HOSTS as readonly string[]).includes(normalized)) {
    return true;
  }

  return Boolean(requestHost && normalizeHost(requestHost) === normalized);
}

function looksLikeJsonPack(pathname: string): boolean {
  return pathname.toLowerCase().endsWith(".json");
}

function isValidSlug(value: string): boolean {
  return SLUG_PATTERN.test(value);
}

function stripSlugExt(value: string): string {
  return value.replace(/\.json$/i, "");
}

function parsePath(pathname: string):
  | { slug: string; pathKind: PathKind }
  | { error: ResolveShareErrorCode } {
  const path = pathname.replace(/\/+$/, "") || "/";

  const patterns: { re: RegExp; pathKind: PathKind }[] = [
    { re: /^\/agents\/([^/]+)$/, pathKind: "agent" },
    { re: /^\/teams\/([^/]+)$/, pathKind: "team" },
    { re: /^\/packs\/agents\/([^/]+)$/, pathKind: "pack" },
    { re: /^\/packs\/teams\/([^/]+)$/, pathKind: "pack" },
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

function coerceToUrl(raw: string): URL | { slug: string } | { error: ResolveShareErrorCode } {
  const trimmed = raw.trim();

  if (!trimmed) {
    return { error: "url_required" };
  }

  if (trimmed.length > MAX_SHARE_URL_LENGTH) {
    return { error: "url_too_long" };
  }

  if (isValidSlug(trimmed)) {
    return { slug: trimmed };
  }

  try {
    if (trimmed.startsWith("/")) {
      return new URL(trimmed, site.url);
    }

    if (/^https?:\/\//i.test(trimmed)) {
      return new URL(trimmed);
    }

    if (
      trimmed.startsWith("localhost") ||
      trimmed.startsWith("127.0.0.1") ||
      /^[a-z0-9.-]+\.[a-z]{2,}([/:?#].*)?$/i.test(trimmed)
    ) {
      return new URL(`https://${trimmed}`);
    }
  } catch {
    return { error: "invalid_url" };
  }

  return { error: "invalid_url" };
}

async function resolveFromSlug(
  slug: string,
  sourceUrl: string,
  pathKind: PathKind | "slug",
): Promise<ResolveShareResult> {
  const loaded = await requireCatalogStallAndPack(slug);
  const stall = loaded?.stall ?? (await findStall(slug));
  const pack = loaded?.pack ?? (await getCatalogPack(slug));

  if (!stall || !pack) {
    return {
      ok: false,
      error: "stall_not_found",
      slug,
      warnings: [],
    };
  }

  const warnings: string[] = [];

  if (pathKind === "agent" && stall.kind !== "agent") {
    warnings.push(`Path says /agents/ but "${slug}" is a ${stall.kind}.`);
  }

  if (pathKind === "team" && stall.kind !== "team") {
    warnings.push(`Path says /teams/ but "${slug}" is a ${stall.kind}.`);
  }

  if (pathKind === "install-prompt") {
    warnings.push("That URL is an install-prompt API. Preview uses the bot pack, not the prompt text as the pack.");
  }

  const summary = packSummaryFields(pack);

  return {
    ok: true,
    kind: stall.kind,
    slug: stall.slug,
    sourceUrl,
    canonicalUrl: stallPageUrl(stall),
    stall: {
      ...stallRecord(stall),
      tone: stall.tone,
    },
    packSummary: {
      format: summary.format,
      version: summary.version,
      profile: summary.profile,
      runtime: summary.runtime,
      skillCount: summary.skillCount,
      memoryCount: summary.memoryCount,
      memoryLineCount: summary.memoryLineCount,
      soulLine: summary.soulLine,
      memberCount: summary.memberCount,
      scrubbed: summary.scrubbed,
    },
    installPrompt: installPromptPayload(stall),
    warnings,
  };
}

async function resolveParsedUrl(
  parsed: URL,
  options: ResolveShareOptions,
  alreadyUnwrapped: boolean,
): Promise<ResolveShareResult> {
  if (!isAllowedHost(parsed.host, options.requestHost)) {
    return {
      ok: false,
      error: looksLikeJsonPack(parsed.pathname)
        ? "raw_gaf_not_supported"
        : "host_not_allowed",
      warnings: looksLikeJsonPack(parsed.pathname)
        ? ["Raw GAF JSON URLs on other hosts are v2. v1 only resolves mybot.farm share links."]
        : ["v1 only accepts mybot.farm (or local / this preview host) share URLs."],
    };
  }

  const path = parsed.pathname.replace(/\/+$/, "") || "/";

  if (path === "/plant") {
    if (alreadyUnwrapped) {
      return {
        ok: false,
        error: "unsupported_path",
        warnings: ["Plant carry URLs can only unwrap once."],
      };
    }

    const innerUrl = parsed.searchParams.get("url")?.trim();
    const innerSlug = parsed.searchParams.get("slug")?.trim();

    if (innerUrl) {
      return resolveShare({ url: innerUrl }, options, true);
    }

    if (innerSlug) {
      return resolveShare({ slug: innerSlug }, options, true);
    }

    return {
      ok: false,
      error: "unsupported_path",
      warnings: ["A /plant link needs ?url= or ?slug=."],
    };
  }

  const match = parsePath(parsed.pathname);

  if ("error" in match) {
    return { ok: false, error: match.error, warnings: [] };
  }

  return resolveFromSlug(match.slug, parsed.toString(), match.pathKind);
}

export async function resolveShare(
  input: ResolveShareInput,
  options: ResolveShareOptions = {},
  alreadyUnwrapped = false,
): Promise<ResolveShareResult> {
  const rawUrl = input.url?.trim();
  const rawSlug = input.slug?.trim();

  if (!rawUrl && !rawSlug) {
    return { ok: false, error: "url_required", warnings: [] };
  }

  if (rawSlug && !rawUrl) {
    if (rawSlug.length > MAX_SHARE_URL_LENGTH) {
      return { ok: false, error: "url_too_long", warnings: [] };
    }

    if (!isValidSlug(rawSlug)) {
      return { ok: false, error: "invalid_url", warnings: [] };
    }

    return resolveFromSlug(rawSlug, `${site.url}/plant?slug=${rawSlug}`, "slug");
  }

  const coerced = coerceToUrl(rawUrl ?? "");

  if ("error" in coerced) {
    return { ok: false, error: coerced.error, warnings: [] };
  }

  if ("slug" in coerced) {
    return resolveFromSlug(coerced.slug, `${site.url}/plant?slug=${coerced.slug}`, "slug");
  }

  return resolveParsedUrl(coerced, options, alreadyUnwrapped);
}

export function resolveShareStatus(result: ResolveShareResult): number {
  if (result.ok) {
    return 200;
  }

  if (result.error === "stall_not_found") {
    return 404;
  }

  return 400;
}

export function requestHostFrom(request: Request): string | undefined {
  try {
    return new URL(request.url).host;
  } catch {
    return undefined;
  }
}

export function inputFromSearchParams(url: URL): ResolveShareInput {
  return {
    url: url.searchParams.get("url") ?? undefined,
    slug: url.searchParams.get("slug") ?? undefined,
  };
}

export async function inputFromRequest(request: Request): Promise<ResolveShareInput> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const body: unknown = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return {};
    }

    const record = body as Record<string, unknown>;
    return {
      url: typeof record.url === "string" ? record.url : undefined,
      slug: typeof record.slug === "string" ? record.slug : undefined,
    };
  }

  if (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  ) {
    const form = await request.formData().catch(() => null);
    const url = form?.get("url");
    const slug = form?.get("slug");
    return {
      url: typeof url === "string" ? url : undefined,
      slug: typeof slug === "string" ? slug : undefined,
    };
  }

  return inputFromSearchParams(new URL(request.url));
}
