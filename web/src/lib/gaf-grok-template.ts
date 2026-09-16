import type { FarmPack } from "./pack-files";

/** Grok Bot mark shapes from `GROK_BOT_MARK_SHAPES` / `create_bot_share_json`. */
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

/** Grok Bot mark colors from `GROK_BOT_MARK_COLORS`. */
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
export type GrokBotVisibility = "public" | "team";

export const GROK_BOT_MARK_SHAPE_SET = new Set<string>(GROK_BOT_MARK_SHAPES);
export const GROK_BOT_MARK_COLOR_SET = new Set<string>(GROK_BOT_MARK_COLORS);

/** Farm-only geometric ids → nearest Grok Bot mark enum. */
export const DEFAULT_AVATAR_SHAPE_FALLBACKS: Record<string, GrokBotMarkShape> = {
  book: "tablet",
  triangle: "wedge",
  circle: "pebble",
  diamond: "gem",
};

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
  description: string;
  content: string;
};

export type GafMemory = {
  kind?: "profile" | "log";
  createdAt?: string;
  content: string;
};

export type GafSkill = {
  name: string;
  description?: string;
  content: string;
};

export type GrokBotTemplateExports = {
  enabled?: boolean;
  avatarFallbacks?: {
    shape?: Record<string, string>;
    color?: Record<string, string>;
  };
  profileDescriptionOverride?: string;
};

export type GrokBotTemplateRecipe = {
  profile: {
    name: string;
    description: string;
    avatarShape?: GrokBotMarkShape;
    avatarColor?: GrokBotMarkColor;
  };
  memory: GafMemory[];
  skills: GafSkill[];
  routines: Array<GafRoutine & { name: string }>;
  plugins: GafPlugin[];
  gettingStarted?: { skill: string };
  visibility: GrokBotVisibility;
};

const PLUGIN_KEYS = new Set(["pluginId", "name", "description"]);
const TEMPLATE_EXPORT_KEYS = new Set([
  "enabled",
  "avatarFallbacks",
  "profileDescriptionOverride",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readTrimmedString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function isGafAgentPack(pack: Pick<FarmPack, "format" | "members">): boolean {
  if (pack.format === "mybot.farm/team-pack") {
    return false;
  }

  if (pack.format === "mybot.farm/agent-pack") {
    return true;
  }

  return !(Array.isArray(pack.members) && pack.members.length > 0);
}

export function mapGrokAvatarValue(
  raw: string | undefined,
  allowed: Set<string>,
  defaults: Record<string, string>,
  packFallbacks?: Record<string, string>,
): string | undefined {
  if (!raw) {
    return undefined;
  }

  if (allowed.has(raw)) {
    return raw;
  }

  const fromPack = packFallbacks?.[raw];
  if (fromPack && allowed.has(fromPack)) {
    return fromPack;
  }

  const fromDefault = defaults[raw];
  if (fromDefault && allowed.has(fromDefault)) {
    return fromDefault;
  }

  return undefined;
}

function projectMemory(pack: FarmPack): GafMemory[] {
  return (pack.memory ?? []).map((entry) => {
    const memory: GafMemory = { content: entry.content };
    if (entry.kind === "profile" || entry.kind === "log") {
      memory.kind = entry.kind;
    }
    if (entry.createdAt) {
      memory.createdAt = entry.createdAt;
    }
    return memory;
  });
}

function projectSkills(pack: FarmPack): GafSkill[] {
  return (pack.skills ?? [])
    .filter((skill) => skill.name && typeof skill.content === "string")
    .map((skill) => {
      const item: GafSkill = { name: skill.name, content: skill.content ?? "" };
      if (skill.description) {
        item.description = skill.description;
      }
      return item;
    });
}

function projectRoutines(pack: FarmPack): Array<GafRoutine & { name: string }> {
  return (pack.routines ?? [])
    .filter((routine) => typeof routine.slug === "string" && routine.slug.trim())
    .map((routine) => ({
      slug: routine.slug,
      name: routine.name?.trim() || routine.slug,
      description: routine.description ?? "",
      content: routine.content ?? "",
    }));
}

function projectPlugins(pack: FarmPack): GafPlugin[] {
  const plugins = pack.plugins;
  if (!Array.isArray(plugins)) {
    return [];
  }

  const projected: GafPlugin[] = [];
  for (const item of plugins) {
    if (!isRecord(item)) {
      continue;
    }
    const pluginId = readTrimmedString(item.pluginId);
    if (!pluginId) {
      continue;
    }
    const plugin: GafPlugin = { pluginId };
    const name = readTrimmedString(item.name);
    const description = readTrimmedString(item.description);
    if (name) plugin.name = name;
    if (description) plugin.description = description;
    projected.push(plugin);
  }
  return projected;
}

function projectGettingStarted(
  pack: FarmPack,
  skills: GafSkill[],
): { skill: string } | undefined {
  const skill = pack.gettingStarted?.skill?.trim();
  if (!skill) {
    return undefined;
  }

  if (!skills.some((entry) => entry.name === skill)) {
    return undefined;
  }

  return { skill };
}

/**
 * Project a GAF agent-pack to `create_bot_share_json` args.
 * Does not call Grok. Farm metadata (title, format, tags) is stripped.
 */
export function gafToGrokTemplate(pack: FarmPack): GrokBotTemplateRecipe {
  const grok = pack.exports?.grokBotTemplate;
  const shape = mapGrokAvatarValue(
    pack.profile?.avatar?.shape,
    GROK_BOT_MARK_SHAPE_SET,
    DEFAULT_AVATAR_SHAPE_FALLBACKS,
    grok?.avatarFallbacks?.shape,
  ) as GrokBotMarkShape | undefined;
  const color = mapGrokAvatarValue(
    pack.profile?.avatar?.color,
    GROK_BOT_MARK_COLOR_SET,
    DEFAULT_AVATAR_COLOR_FALLBACKS,
    grok?.avatarFallbacks?.color,
  ) as GrokBotMarkColor | undefined;

  const skills = projectSkills(pack);
  const gettingStarted = projectGettingStarted(pack, skills);
  const visibility: GrokBotVisibility =
    pack.visibility === "team" || pack.visibility === "public"
      ? pack.visibility
      : "public";

  const recipe: GrokBotTemplateRecipe = {
    profile: {
      name: pack.profile?.name ?? "",
      description:
        grok?.profileDescriptionOverride ?? pack.profile?.description ?? "",
      ...(shape ? { avatarShape: shape } : {}),
      ...(color ? { avatarColor: color } : {}),
    },
    memory: projectMemory(pack),
    skills,
    routines: projectRoutines(pack),
    plugins: projectPlugins(pack),
    visibility,
  };

  if (gettingStarted) {
    recipe.gettingStarted = gettingStarted;
  }

  return recipe;
}

function validatePlugins(value: unknown): { ok: true } | { ok: false; error: string } {
  if (value === undefined) {
    return { ok: true };
  }

  if (!Array.isArray(value)) {
    return { ok: false, error: "plugins must be an array of marketplace plugin objects." };
  }

  for (const [index, item] of value.entries()) {
    if (!isRecord(item)) {
      return {
        ok: false,
        error: `plugins[${index}] must be an object with pluginId.`,
      };
    }

    if ("url" in item || "command" in item) {
      return {
        ok: false,
        error:
          "plugins[] items are marketplace ids only ({pluginId, name?, description?}). Do not ship url, command, or custom MCP.",
      };
    }

    for (const key of Object.keys(item)) {
      if (!PLUGIN_KEYS.has(key)) {
        return {
          ok: false,
          error: `plugins[${index}] has unknown field "${key}". Allowed: pluginId, name, description.`,
        };
      }
    }

    if (!readTrimmedString(item.pluginId)) {
      return {
        ok: false,
        error: `plugins[${index}] requires a non-empty pluginId.`,
      };
    }

    if (item.name !== undefined && typeof item.name !== "string") {
      return { ok: false, error: `plugins[${index}].name must be a string.` };
    }

    if (item.description !== undefined && typeof item.description !== "string") {
      return { ok: false, error: `plugins[${index}].description must be a string.` };
    }
  }

  return { ok: true };
}

function validateVisibility(
  value: unknown,
): { ok: true } | { ok: false; error: string } {
  if (value === undefined) {
    return { ok: true };
  }

  if (value !== "public" && value !== "team") {
    return { ok: false, error: 'visibility must be "public" or "team".' };
  }

  return { ok: true };
}

function validateGettingStarted(
  pack: Record<string, unknown>,
): { ok: true } | { ok: false; error: string } {
  const value = pack.gettingStarted;
  if (value === undefined) {
    return { ok: true };
  }

  if (!isRecord(value)) {
    return {
      ok: false,
      error: 'gettingStarted must be { "skill": "<skills[].name>" } on agent packs.',
    };
  }

  const skill = readTrimmedString(value.skill);
  if (!skill) {
    return { ok: false, error: "gettingStarted.skill must be a non-empty string." };
  }

  const skills = pack.skills;
  if (!Array.isArray(skills)) {
    return {
      ok: false,
      error: "gettingStarted.skill must name an entry in skills[].",
    };
  }

  const names = skills
    .filter(isRecord)
    .map((entry) => readTrimmedString(entry.name))
    .filter((name): name is string => Boolean(name));

  if (!names.includes(skill)) {
    return {
      ok: false,
      error: `gettingStarted.skill "${skill}" must match a skills[].name.`,
    };
  }

  return { ok: true };
}

function validateAvatarFallbacks(
  value: unknown,
): { ok: true } | { ok: false; error: string } {
  if (value === undefined) {
    return { ok: true };
  }

  if (!isRecord(value)) {
    return { ok: false, error: "avatarFallbacks must be an object." };
  }

  for (const key of ["shape", "color"] as const) {
    const map = value[key];
    if (map === undefined) {
      continue;
    }
    if (!isRecord(map) || Object.values(map).some((item) => typeof item !== "string")) {
      return {
        ok: false,
        error: `avatarFallbacks.${key} must be a string-to-string map.`,
      };
    }
  }

  return { ok: true };
}

function validateExports(
  value: unknown,
): { ok: true } | { ok: false; error: string } {
  if (value === undefined) {
    return { ok: true };
  }

  if (!isRecord(value)) {
    return { ok: false, error: "exports must be an object." };
  }

  const grok = value.grokBotTemplate;
  if (grok === undefined) {
    return { ok: true };
  }

  if (!isRecord(grok)) {
    return { ok: false, error: "exports.grokBotTemplate must be an object." };
  }

  for (const key of Object.keys(grok)) {
    if (!TEMPLATE_EXPORT_KEYS.has(key)) {
      return {
        ok: false,
        error: `exports.grokBotTemplate has unknown field "${key}".`,
      };
    }
  }

  if (grok.enabled !== undefined && typeof grok.enabled !== "boolean") {
    return { ok: false, error: "exports.grokBotTemplate.enabled must be a boolean." };
  }

  if (
    grok.profileDescriptionOverride !== undefined &&
    typeof grok.profileDescriptionOverride !== "string"
  ) {
    return {
      ok: false,
      error: "exports.grokBotTemplate.profileDescriptionOverride must be a string.",
    };
  }

  return validateAvatarFallbacks(grok.avatarFallbacks);
}

/** Listing POST checks for Grok-template fields. Unknown pack keys stay allowed. */
export function validateGafListingPack(
  pack: unknown,
): { ok: true } | { ok: false; error: string } {
  if (!isRecord(pack)) {
    return { ok: false, error: "Pack JSON must be an object." };
  }

  const plugins = validatePlugins(pack.plugins);
  if (!plugins.ok) {
    return plugins;
  }

  const visibility = validateVisibility(pack.visibility);
  if (!visibility.ok) {
    return visibility;
  }

  const exportsResult = validateExports(pack.exports);
  if (!exportsResult.ok) {
    return exportsResult;
  }

  if (pack.format === "mybot.farm/agent-pack") {
    const gettingStarted = validateGettingStarted(pack);
    if (!gettingStarted.ok) {
      return gettingStarted;
    }
  }

  return { ok: true };
}
