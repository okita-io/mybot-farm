/** Grok Bot mark shapes (`GROK_BOT_MARK_SHAPES` / `create_bot_share_json`). */
export const GROK_BOT_MARK_SHAPES = [
  "blob",
  "pebble",
  "bean",
  "egg",
  "squircle",
  "tablet",
  "capsule",
  "cylinder",
  "hex",
  "gem",
  "crystal",
  "wedge",
  "shield",
  "dome",
  "arch",
  "cloud",
  "teardrop",
  "leaf",
] as const;

/** Grok Bot mark colors (`GROK_BOT_MARK_COLORS` / `create_bot_share_json`). */
export const GROK_BOT_MARK_COLORS = [
  "black",
  "brown",
  "red",
  "orange",
  "yellow",
  "green",
  "cyan",
  "blue",
  "violet",
  "magenta",
  "gray",
] as const;

export type GrokBotMarkShape = (typeof GROK_BOT_MARK_SHAPES)[number];
export type GrokBotMarkColor = (typeof GROK_BOT_MARK_COLORS)[number];

export const GROK_BOT_MARK_SHAPE_SET = new Set<string>(GROK_BOT_MARK_SHAPES);
export const GROK_BOT_MARK_COLOR_SET = new Set<string>(GROK_BOT_MARK_COLORS);

export const AGENT_PACK_FORMAT = "mybot.farm/agent-pack";
export const TEAM_PACK_FORMAT = "mybot.farm/team-pack";
export const MIN_TEAM_MEMBERS = 2;

/** Farm-only geometric shapes → nearest Grok mark enum. */
export const DEFAULT_AVATAR_SHAPE_FALLBACKS: Record<string, GrokBotMarkShape> = {
  book: "tablet",
  triangle: "wedge",
  circle: "pebble",
  diamond: "gem",
};

/** Farm-only palette tokens → nearest Grok mark enum. */
export const DEFAULT_AVATAR_COLOR_FALLBACKS: Record<string, GrokBotMarkColor> = {
  indigo: "violet",
  amber: "yellow",
  lime: "green",
};

export type GafPlugin = {
  pluginId: string;
  name?: string;
  description?: string;
};

export type GafRoutine = {
  slug: string;
  name?: string;
  description?: string;
  content?: string;
};

export type GafGettingStarted = {
  skill: string;
};

export type GafAvatarFallbacks = {
  shape?: Record<string, string>;
  color?: Record<string, string>;
};

export type GrokBotTemplateExport = {
  /** When present, consumers (e.g. Cursor catalog) may treat the pack as template-ready. */
  enabled?: boolean;
  avatarFallbacks?: GafAvatarFallbacks;
  profileDescriptionOverride?: string;
};

export type GafExports = {
  grokBotTemplate?: GrokBotTemplateExport;
  [key: string]: unknown;
};

export type GafVisibility = "public" | "team";

const PLUGIN_KEYS = new Set(["pluginId", "name", "description"]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function optionalString(
  value: unknown,
  field: string,
): { ok: true; value: string | undefined } | { ok: false; error: string } {
  if (value === undefined) {
    return { ok: true, value: undefined };
  }
  if (typeof value !== "string") {
    return { ok: false, error: `${field} must be a string.` };
  }
  return { ok: true, value };
}

function stringRecord(
  value: unknown,
  field: string,
): { ok: true; value: Record<string, string> } | { ok: false; error: string } {
  if (!isPlainObject(value)) {
    return { ok: false, error: `${field} must be an object of string values.` };
  }
  const out: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry !== "string" || !entry.trim()) {
      return { ok: false, error: `${field}.${key} must be a non-empty string.` };
    }
    out[key] = entry;
  }
  return { ok: true, value: out };
}

function validatePlugin(value: unknown, index: number): string | null {
  if (!isPlainObject(value)) {
    return `plugins[${index}] must be an object with pluginId.`;
  }

  for (const key of Object.keys(value)) {
    if (!PLUGIN_KEYS.has(key)) {
      return `plugins[${index}] only allows pluginId, name, and description (marketplace ids — no custom MCP URLs).`;
    }
  }

  const pluginId = typeof value.pluginId === "string" ? value.pluginId.trim() : "";
  if (!pluginId) {
    return `plugins[${index}].pluginId is required.`;
  }

  if (value.name !== undefined && typeof value.name !== "string") {
    return `plugins[${index}].name must be a string.`;
  }
  if (value.description !== undefined && typeof value.description !== "string") {
    return `plugins[${index}].description must be a string.`;
  }

  return null;
}

function validateGrokBotTemplateExport(value: unknown): string | null {
  if (!isPlainObject(value)) {
    return "exports.grokBotTemplate must be an object.";
  }

  if (value.enabled !== undefined && typeof value.enabled !== "boolean") {
    return "exports.grokBotTemplate.enabled must be a boolean.";
  }

  const override = optionalString(
    value.profileDescriptionOverride,
    "exports.grokBotTemplate.profileDescriptionOverride",
  );
  if (!override.ok) {
    return override.error;
  }

  if (value.avatarFallbacks !== undefined) {
    if (!isPlainObject(value.avatarFallbacks)) {
      return "exports.grokBotTemplate.avatarFallbacks must be an object.";
    }
    if (value.avatarFallbacks.shape !== undefined) {
      const shape = stringRecord(
        value.avatarFallbacks.shape,
        "exports.grokBotTemplate.avatarFallbacks.shape",
      );
      if (!shape.ok) {
        return shape.error;
      }
    }
    if (value.avatarFallbacks.color !== undefined) {
      const color = stringRecord(
        value.avatarFallbacks.color,
        "exports.grokBotTemplate.avatarFallbacks.color",
      );
      if (!color.ok) {
        return color.error;
      }
    }
  }

  return null;
}

/**
 * Additive GAF checks for listing POST. Unknown top-level keys (including
 * `exports` siblings) stay allowed. Old packs that omit plugins/exports still pass.
 */
export function validateGafPack(pack: unknown): { ok: true } | { ok: false; error: string } {
  if (!isPlainObject(pack)) {
    return { ok: false, error: "Pack JSON must be an object." };
  }

  if (pack.visibility !== undefined) {
    if (pack.visibility !== "public" && pack.visibility !== "team") {
      return { ok: false, error: 'visibility must be "public" or "team".' };
    }
  }

  if (pack.plugins !== undefined) {
    if (!Array.isArray(pack.plugins)) {
      return { ok: false, error: "plugins must be an array of marketplace plugin objects." };
    }
    for (let i = 0; i < pack.plugins.length; i += 1) {
      const error = validatePlugin(pack.plugins[i], i);
      if (error) {
        return { ok: false, error };
      }
    }
  }

  if (pack.gettingStarted !== undefined) {
    if (typeof pack.gettingStarted === "string") {
      return {
        ok: false,
        error:
          "gettingStarted must be { skill } naming a pack.skills[].name. Team Hermes install strings belong on shared.gettingStarted.",
      };
    }
    if (!isPlainObject(pack.gettingStarted)) {
      return { ok: false, error: "gettingStarted must be an object with skill." };
    }
    const skill =
      typeof pack.gettingStarted.skill === "string"
        ? pack.gettingStarted.skill.trim()
        : "";
    if (!skill) {
      return { ok: false, error: "gettingStarted.skill is required when gettingStarted is set." };
    }
    const skills = Array.isArray(pack.skills) ? pack.skills : [];
    const names = skills
      .map((entry) =>
        isPlainObject(entry) && typeof entry.name === "string" ? entry.name : "",
      )
      .filter(Boolean);
    if (!names.includes(skill)) {
      return {
        ok: false,
        error: `gettingStarted.skill "${skill}" must match a skills[].name.`,
      };
    }
  }

  if (pack.exports !== undefined) {
    if (!isPlainObject(pack.exports)) {
      return { ok: false, error: "exports must be an object." };
    }
    if (pack.exports.grokBotTemplate !== undefined) {
      const error = validateGrokBotTemplateExport(pack.exports.grokBotTemplate);
      if (error) {
        return { ok: false, error };
      }
    }
  }

  if (pack.routines !== undefined) {
    if (!Array.isArray(pack.routines)) {
      return { ok: false, error: "routines must be an array." };
    }
    for (let i = 0; i < pack.routines.length; i += 1) {
      const routine = pack.routines[i];
      if (!isPlainObject(routine)) {
        return { ok: false, error: `routines[${i}] must be an object.` };
      }
      const slug = typeof routine.slug === "string" ? routine.slug.trim() : "";
      if (!slug) {
        return { ok: false, error: `routines[${i}].slug is required.` };
      }
    }
  }

  return { ok: true };
}

function memberPackError(index: number, pack: unknown): string | null {
  if (typeof pack === "string") {
    return pack.trim()
      ? null
      : `members[${index}].pack must be a catalog path, slug, tarball URL, or nested agent-pack object`;
  }
  if (!isPlainObject(pack)) {
    return `members[${index}].pack must be a catalog path, slug, tarball URL, or nested agent-pack object`;
  }
  if (pack.format === TEAM_PACK_FORMAT) {
    return `members[${index}].pack nested object cannot be a team-pack`;
  }
  return null;
}

/**
 * Kind-aware checks for POST /api/listings (and plugin farm_post dry-run).
 * Additive on top of validateGafPack. Seed catalog files are not required to
 * pass this — only seller writes.
 */
export function validateListingPack(
  kind: string,
  pack: unknown,
): { ok: true } | { ok: false; error: string } {
  if (!isPlainObject(pack)) {
    return { ok: false, error: "Pack JSON must be an object." };
  }

  const format = typeof pack.format === "string" ? pack.format.trim() : "";

  if (kind === "team") {
    if (format !== TEAM_PACK_FORMAT) {
      return {
        ok: false,
        error: `kind "team" requires pack.format "${TEAM_PACK_FORMAT}"`,
      };
    }

    if (!Array.isArray(pack.members) || pack.members.length < MIN_TEAM_MEMBERS) {
      return {
        ok: false,
        error: `kind "team" requires members[] with at least ${MIN_TEAM_MEMBERS} agents`,
      };
    }

    for (let i = 0; i < pack.members.length; i += 1) {
      const member = pack.members[i];
      if (!isPlainObject(member)) {
        return {
          ok: false,
          error: `members[${i}] must be an object with role, summary, and pack`,
        };
      }
      const role = typeof member.role === "string" ? member.role.trim() : "";
      const summary = typeof member.summary === "string" ? member.summary.trim() : "";
      if (!role) {
        return { ok: false, error: `members[${i}].role is required` };
      }
      if (!summary) {
        return { ok: false, error: `members[${i}].summary is required` };
      }
      const packError = memberPackError(i, member.pack);
      if (packError) {
        return { ok: false, error: packError };
      }
    }

    if (pack.shared !== undefined) {
      if (!isPlainObject(pack.shared)) {
        return { ok: false, error: "shared must be an object." };
      }
      if (
        pack.shared.gettingStarted !== undefined &&
        typeof pack.shared.gettingStarted !== "string"
      ) {
        return {
          ok: false,
          error: "shared.gettingStarted must be a string (Hermes install steps).",
        };
      }
    }

    return { ok: true };
  }

  if (format === TEAM_PACK_FORMAT) {
    return {
      ok: false,
      error: `kind "agent" cannot use pack.format "${TEAM_PACK_FORMAT}"`,
    };
  }

  if (Array.isArray(pack.members) && pack.members.length > 0) {
    return {
      ok: false,
      error: 'kind "agent" listings cannot include members[] — use kind "team"',
    };
  }

  return { ok: true };
}

export function asGafPlugins(value: unknown): GafPlugin[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is GafPlugin => {
    return Boolean(
      item &&
        typeof item === "object" &&
        typeof (item as GafPlugin).pluginId === "string" &&
        (item as GafPlugin).pluginId.trim(),
    );
  });
}

export function asGafRoutines(value: unknown): GafRoutine[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is GafRoutine => {
    return Boolean(
      item &&
        typeof item === "object" &&
        typeof (item as GafRoutine).slug === "string" &&
        (item as GafRoutine).slug.trim(),
    );
  });
}

export function asGafSkills(
  value: unknown,
): Array<{ name: string; description?: string; content?: string }> {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(
    (item): item is { name: string; description?: string; content?: string } => {
      return Boolean(item && typeof item === "object" && typeof (item as { name?: string }).name === "string");
    },
  );
}

export function asGafMemory(
  value: unknown,
): Array<{ kind?: string; createdAt?: string; content: string }> {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(
    (item): item is { kind?: string; createdAt?: string; content: string } => {
      return Boolean(
        item && typeof item === "object" && typeof (item as { content?: string }).content === "string",
      );
    },
  );
}
