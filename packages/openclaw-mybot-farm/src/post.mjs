/**
 * farm_post handler — publish a GAF listing with a seller API key.
 * Shared by the OpenClaw tool, CLI, and optional MCP bridge.
 */

import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import {
  FarmError,
  buildListingPayload,
  createListing,
  listingPageUrl,
  listingPayloadSummary,
  resolveApiKey,
  resolveFarmConfig,
} from "./farm-api.mjs";

function expandHome(p) {
  if (!p) return p;
  if (p === "~") return os.homedir();
  if (p.startsWith("~/")) return path.join(os.homedir(), p.slice(2));
  return p;
}

function truthy(value) {
  if (typeof value === "string") {
    return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
  }
  return Boolean(value);
}

export async function loadPack(args) {
  const pack = args.pack;
  const pathArg = args.packPath ?? args.pack_path;
  const hasPack = pack != null && pack !== "";
  const hasPath = typeof pathArg === "string" && pathArg.trim();
  if (hasPack && hasPath) {
    throw new FarmError("provide pack or packPath, not both");
  }
  if (hasPath) {
    const filePath = expandHome(path.resolve(String(pathArg).trim()));
    let raw;
    try {
      raw = await fs.readFile(filePath, "utf8");
    } catch (err) {
      if (err && typeof err === "object" && "code" in err && err.code === "ENOENT") {
        throw new FarmError(`pack file not found: ${filePath}`);
      }
      throw new FarmError(`cannot read pack file: ${err instanceof Error ? err.message : String(err)}`);
    }
    try {
      return JSON.parse(raw);
    } catch (err) {
      throw new FarmError(`pack file is not JSON: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  if (hasPack) return pack;
  throw new FarmError("pack (GAF JSON object) or packPath (path to a .json GAF file) required");
}

function errPayload(message, extra = {}) {
  return { ok: false, error: message, ...extra };
}

/**
 * @param {{ args: Record<string, unknown>, pluginConfig?: Record<string, unknown> }} opts
 */
export async function postListing({ args, pluginConfig } = { args: {} }) {
  const cfg = pluginConfig && typeof pluginConfig === "object" ? pluginConfig : {};
  const dryRun = truthy("dryRun" in args ? args.dryRun : args.dry_run);
  const override = args.apiKey != null ? args.apiKey : args.api_key;
  const overrideS = typeof override === "string" ? override.trim() : undefined;
  const apiKey = resolveApiKey(cfg, overrideS);

  let payload;
  try {
    const pack = await loadPack(args);
    payload = buildListingPayload({
      kind: args.kind,
      name: args.name,
      title: args.title,
      description: args.description,
      category: args.category,
      priceCents: "priceCents" in args ? args.priceCents : args.price_cents,
      pack,
      slug: args.slug,
      packVersion: "packVersion" in args ? args.packVersion : args.pack_version,
    });
  } catch (err) {
    if (err instanceof FarmError) return errPayload(err.message, err.status != null ? { status: err.status } : {});
    throw err;
  }

  const summary = listingPayloadSummary(payload);
  const { baseUrl } = resolveFarmConfig(cfg);
  if (dryRun) {
    const keyNote = apiKey ? "configured (redacted)" : "missing (POST would fail)";
    const lines = [
      "Dry-run: listing payload is valid (not posted)",
      `kind: ${payload.kind}`,
      `name: ${payload.name}`,
      `title: ${payload.title}`,
      `category: ${payload.category}`,
      `priceCents: ${payload.priceCents}`,
      `slug: ${payload.slug || "(from name)"}`,
      `packVersion: ${payload.packVersion != null ? payload.packVersion : "(auto)"}`,
      `pack format: ${summary.pack?.format || "(none)"}`,
      `pack skills: ${summary.pack?.skillCount}`,
      `pack members: ${summary.pack?.memberCount || 0}`,
      `pack encoded chars: ${summary.pack?.encodedChars}`,
      `POST ${baseUrl}/api/listings`,
      `apiKey: ${keyNote}`,
    ];
    return {
      ok: true,
      dryRun: true,
      text: lines.join("\n"),
      payload: summary,
      endpoint: `${baseUrl}/api/listings`,
      apiKey: keyNote,
    };
  }

  if (!apiKey) {
    return errPayload(
      "seller API key required (set MYBOT_FARM_API_KEY, plugin config apiKey, or pass apiKey). Create a key at https://mybot.farm/sell — see docs/api-keys.md",
    );
  }

  let result;
  try {
    result = await createListing(baseUrl, payload, apiKey);
  } catch (err) {
    if (err instanceof FarmError) {
      return errPayload(err.message, err.status != null ? { status: err.status } : {});
    }
    throw err;
  }

  const slug = String(result.slug || "").trim();
  const kind = String(result.kind || payload.kind);
  const pagePath = String(result.pagePath || "");
  const pageUrl = pagePath ? listingPageUrl(baseUrl, pagePath) : `${baseUrl}/${kind}s/${slug}`;
  const listingId = String(result.id || result.stallId || "").trim();
  const packVersion = result.packVersion;
  const updated = Boolean(result.updated);
  const verb = updated ? "Updated" : "Posted";
  const lines = [`${verb} ${kind} \`${slug}\``, pageUrl];
  if (listingId) lines.push(`stall id: ${listingId}`);
  if (packVersion != null) lines.push(`pack version: ${packVersion}`);
  if (result.hasReadme) lines.push("README extracted from pack.");
  return {
    ok: true,
    text: lines.join("\n"),
    id: listingId || undefined,
    stallId: listingId || undefined,
    slug,
    kind,
    pagePath,
    pageUrl,
    packVersion,
    created: Boolean(result.created ?? !updated),
    updated,
    hasReadme: Boolean(result.hasReadme),
  };
}

export async function updateListing({ args, pluginConfig } = { args: {} }) {
  const slug = typeof args.slug === "string" ? args.slug.trim() : "";
  if (!slug) {
    return errPayload("slug required");
  }
  return postListing({ args: { ...args, slug }, pluginConfig });
}
