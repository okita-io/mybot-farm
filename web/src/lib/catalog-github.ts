import type { StallKind } from "@/lib/packs";
import type { FarmPack } from "@/lib/pack-files";

const DEFAULT_OWNER = "okita-io";
const DEFAULT_REPO = "mybot-farm-catalog";
const DEFAULT_BRANCH = "main";
const API_VERSION = "2022-11-28";

export class CatalogGithubError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "CatalogGithubError";
    this.code = code;
    this.status = status;
  }
}

export function catalogGithubConfig() {
  const token = process.env.CATALOG_GITHUB_TOKEN?.trim();
  return {
    token,
    owner: process.env.CATALOG_GITHUB_OWNER?.trim() || DEFAULT_OWNER,
    repo: process.env.CATALOG_GITHUB_REPO?.trim() || DEFAULT_REPO,
    branch: process.env.CATALOG_GITHUB_BRANCH?.trim() || DEFAULT_BRANCH,
  };
}

export function catalogPackPath(kind: StallKind, slug: string) {
  const dir = kind === "team" ? "teams" : "agents";
  return `${dir}/${slug}.json`;
}

function apiUrl(owner: string, repo: string, path: string, query?: string) {
  const encoded = path
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
  const base = `https://api.github.com/repos/${owner}/${repo}/contents/${encoded}`;
  return query ? `${base}?${query}` : base;
}

function authHeaders(token: string) {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": API_VERSION,
  };
}

function requireToken() {
  const config = catalogGithubConfig();
  if (!config.token) {
    throw new CatalogGithubError(
      "catalog_publish_unavailable",
      "CATALOG_GITHUB_TOKEN is not set.",
      503,
    );
  }
  return config as typeof config & { token: string };
}

export async function getCatalogFileSha(
  path: string,
): Promise<string | undefined> {
  const { token, owner, repo, branch } = requireToken();
  const response = await fetch(apiUrl(owner, repo, path, `ref=${encodeURIComponent(branch)}`), {
    headers: authHeaders(token),
    cache: "no-store",
  });

  if (response.status === 404) {
    return undefined;
  }

  if (!response.ok) {
    throw await githubError(response);
  }

  const body = (await response.json()) as { sha?: string };
  return typeof body.sha === "string" ? body.sha : undefined;
}

export async function putCatalogPack(input: {
  kind: StallKind;
  slug: string;
  pack: FarmPack;
  message: string;
}): Promise<{ path: string; commitSha: string; contentSha: string }> {
  const { token, owner, repo, branch } = requireToken();
  const path = catalogPackPath(input.kind, input.slug);
  const sha = await getCatalogFileSha(path);
  const content = Buffer.from(
    `${JSON.stringify(input.pack, null, 2)}\n`,
    "utf8",
  ).toString("base64");

  const response = await fetch(apiUrl(owner, repo, path), {
    method: "PUT",
    headers: {
      ...authHeaders(token),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: input.message,
      content,
      branch,
      ...(sha ? { sha } : {}),
    }),
  });

  if (response.status === 409) {
    throw new CatalogGithubError(
      "stale_version",
      "Catalog file changed; packVersion must be retried from the live stall.",
      409,
    );
  }

  if (!response.ok) {
    throw await githubError(response);
  }

  const body = (await response.json()) as {
    content?: { sha?: string };
    commit?: { sha?: string };
  };
  const commitSha = body.commit?.sha;
  const contentSha = body.content?.sha;
  if (!commitSha || !contentSha) {
    throw new CatalogGithubError(
      "catalog_publish_failed",
      "GitHub did not return a commit SHA.",
      502,
    );
  }

  return { path, commitSha, contentSha };
}

/**
 * Undo a catalog publish after the database write fails.
 * New files are deleted; updates restore the previous pack blob.
 */
export async function revertCatalogPack(input: {
  kind: StallKind;
  slug: string;
  previousPack: FarmPack | null;
}): Promise<{ path: string; commitSha: string }> {
  const { token, owner, repo, branch } = requireToken();
  const path = catalogPackPath(input.kind, input.slug);
  const sha = await getCatalogFileSha(path);
  if (!sha) {
    throw new CatalogGithubError(
      "catalog_revert_failed",
      "Catalog file is already gone; nothing to revert.",
      502,
    );
  }

  if (!input.previousPack) {
    const response = await fetch(apiUrl(owner, repo, path), {
      method: "DELETE",
      headers: {
        ...authHeaders(token),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: `revert ${input.slug}: drop orphaned catalog publish`,
        branch,
        sha,
      }),
    });

    if (!response.ok) {
      throw await githubError(response);
    }

    const body = (await response.json()) as { commit?: { sha?: string } };
    const commitSha = body.commit?.sha;
    if (!commitSha) {
      throw new CatalogGithubError(
        "catalog_revert_failed",
        "GitHub did not return a revert commit SHA.",
        502,
      );
    }
    return { path, commitSha };
  }

  const content = Buffer.from(
    `${JSON.stringify(input.previousPack, null, 2)}\n`,
    "utf8",
  ).toString("base64");

  const response = await fetch(apiUrl(owner, repo, path), {
    method: "PUT",
    headers: {
      ...authHeaders(token),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: `revert ${input.slug}: restore previous pack after DB failure`,
      content,
      branch,
      sha,
    }),
  });

  if (!response.ok) {
    throw await githubError(response);
  }

  const body = (await response.json()) as { commit?: { sha?: string } };
  const commitSha = body.commit?.sha;
  if (!commitSha) {
    throw new CatalogGithubError(
      "catalog_revert_failed",
      "GitHub did not return a revert commit SHA.",
      502,
    );
  }
  return { path, commitSha };
}

async function githubError(response: Response) {
  const text = await response.text().catch(() => "");
  let message = `GitHub catalog publish failed (${response.status}).`;
  try {
    const body = JSON.parse(text) as { message?: string };
    if (body.message) {
      message = body.message;
    }
  } catch {
    if (text.trim()) {
      message = text.trim().slice(0, 280);
    }
  }

  const code =
    response.status === 401 || response.status === 403
      ? "catalog_publish_unauthorized"
      : "catalog_publish_failed";
  return new CatalogGithubError(code, message, response.status === 401 ? 502 : 502);
}
