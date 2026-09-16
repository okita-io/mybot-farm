type PackVersionSource = {
  packVersion?: unknown;
  slug?: string;
  version?: string;
};

const MAX_PACK_VERSION = 1_000_000;

export function parsePackVersion(value: unknown): number | null {
  let n: number;
  if (typeof value === "string" && value.trim()) {
    n = Number(value.trim());
  } else if (typeof value === "number") {
    n = value;
  } else {
    return null;
  }

  if (!Number.isInteger(n) || n < 1 || n > MAX_PACK_VERSION) {
    return null;
  }

  return n;
}

export function readOptionalPackVersion(
  value: unknown,
): { ok: true; value: number | null } | { ok: false } {
  if (value === undefined || value === null || value === "") {
    return { ok: true, value: null };
  }

  const parsed = parsePackVersion(value);
  if (parsed == null) {
    return { ok: false };
  }

  return { ok: true, value: parsed };
}

/** Content revision. Missing/invalid values count as 1. Not the GAF format `version`. */
export function packVersionOf(pack: PackVersionSource | null | undefined): number {
  return parsePackVersion(pack?.packVersion) ?? 1;
}

export function applyPackVersion<T extends PackVersionSource>(
  pack: T,
  slug: string,
  packVersion: number,
): T & { slug: string; packVersion: number } {
  return {
    ...pack,
    slug,
    packVersion,
  };
}

export function resolveCreatePackVersion(
  requestedTopLevel: number | null,
  pack: PackVersionSource,
): number {
  return requestedTopLevel ?? packVersionOf(pack);
}

export function resolveUpdatePackVersion(
  current: number,
  requestedTopLevel: number | null,
  pack: PackVersionSource,
):
  | { ok: true; version: number }
  | { ok: false; error: "stale_version"; message: string } {
  const fromPack = parsePackVersion(pack.packVersion);
  const requested =
    requestedTopLevel ?? (fromPack != null && fromPack > current ? fromPack : null);

  if (requested == null) {
    return { ok: true, version: current + 1 };
  }

  if (requested <= current) {
    return {
      ok: false,
      error: "stale_version",
      message: `packVersion must be greater than ${current}.`,
    };
  }

  return { ok: true, version: requested };
}
