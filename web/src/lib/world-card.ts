// Pure, dependency-free world-card helpers. Kept out of packs.ts (which pulls
// the "@/lib/site" alias) so they load under the plain-node test runner.

export type StallKindLike = "agent" | "team" | "world";

/** Catalog/public directory for a stall kind: agents / teams / worlds. */
export function catalogDirForKind(
  kind: StallKindLike,
): "agents" | "teams" | "worlds" {
  if (kind === "team") return "teams";
  if (kind === "world") return "worlds";
  return "agents";
}

/**
 * True when a thumbnail string is safe to use as an `<img src>`.
 * Seller thumbnails must be `https://…` or a site path starting with `/`.
 * Bundle-relative paths (e.g. `assets/foo.webp`) are for zip export only —
 * cards show the gradient placeholder instead of a broken image.
 */
export function isRenderableThumbnail(
  thumbnail: string | undefined,
): thumbnail is string {
  if (!thumbnail) {
    return false;
  }
  return (
    thumbnail.startsWith("/") ||
    thumbnail.startsWith("http://") ||
    thumbnail.startsWith("https://")
  );
}

export type WorldPlaceSummary = {
  id: string;
  name: string;
  present: string[];
};

export type WorldCastSummary = {
  role: string;
  name: string;
  home?: string;
};

export type WorldStallSummary = {
  title: string;
  places: WorldPlaceSummary[];
  cast: WorldCastSummary[];
  greeterRole?: string;
  greeterName?: string;
  entryPlace?: string;
  turnModel?: string;
};

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

/** Display fields for a world stall page from a GAF world block. */
export function worldStallSummary(pack: { world?: unknown }): WorldStallSummary | null {
  const world = pack?.world;
  if (!world || typeof world !== "object" || Array.isArray(world)) {
    return null;
  }

  const block = world as Record<string, unknown>;
  const title = readString(block.title) ?? "World";
  const castByRole = new Map<string, WorldCastSummary>();

  if (Array.isArray(block.cast)) {
    for (const item of block.cast) {
      if (!item || typeof item !== "object" || Array.isArray(item)) continue;
      const row = item as Record<string, unknown>;
      const role = readString(row.role);
      if (!role) continue;
      castByRole.set(role, {
        role,
        name: readString(row.name) ?? role,
        home: readString(row.home),
      });
    }
  }

  const places: WorldPlaceSummary[] = [];
  if (Array.isArray(block.places)) {
    for (const item of block.places) {
      if (!item || typeof item !== "object" || Array.isArray(item)) continue;
      const row = item as Record<string, unknown>;
      const id = readString(row.id);
      const name = readString(row.name);
      if (!id || !name) continue;
      const present = Array.isArray(row.present)
        ? row.present.filter((role): role is string => typeof role === "string")
        : [];
      places.push({ id, name, present });
    }
  }

  const entrypoint =
    block.entrypoint && typeof block.entrypoint === "object" && !Array.isArray(block.entrypoint)
      ? (block.entrypoint as Record<string, unknown>)
      : null;
  const greeterRole = entrypoint ? readString(entrypoint.greeter) : undefined;
  const entryPlace = entrypoint ? readString(entrypoint.place) : undefined;
  const greeterName = greeterRole ? castByRole.get(greeterRole)?.name : undefined;

  const rules =
    block.rules && typeof block.rules === "object" && !Array.isArray(block.rules)
      ? (block.rules as Record<string, unknown>)
      : null;
  const turnModel = rules ? readString(rules.turnModel) : undefined;

  return {
    title,
    places,
    cast: [...castByRole.values()],
    greeterRole,
    greeterName,
    entryPlace,
    turnModel,
  };
}

/**
 * Pure pack -> world-card fields: the thumbnail from the world block and the
 * runtime badges from pack.runtime. Both undefined for packs with no world
 * block / no runtime, so agent and team stalls are unaffected.
 */
export function worldCardFields(pack: {
  runtime?: unknown;
  world?: unknown;
}): { thumbnail: string | undefined; runtimes: string[] | undefined } {
  const world = pack?.world as { thumbnail?: unknown } | undefined;
  const rawThumb =
    world && typeof world === "object" ? world.thumbnail : undefined;
  const thumbnail =
    typeof rawThumb === "string" && rawThumb.trim() ? rawThumb.trim() : undefined;

  const runtime = pack?.runtime;
  const runtimes =
    Array.isArray(runtime) && runtime.length
      ? runtime.filter((r): r is string => typeof r === "string")
      : undefined;

  return { thumbnail, runtimes };
}
