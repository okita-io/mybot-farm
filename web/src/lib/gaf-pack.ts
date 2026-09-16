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
