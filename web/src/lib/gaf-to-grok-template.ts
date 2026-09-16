import {
  DEFAULT_AVATAR_COLOR_FALLBACKS,
  DEFAULT_AVATAR_SHAPE_FALLBACKS,
  GROK_BOT_MARK_COLOR_SET,
  GROK_BOT_MARK_SHAPE_SET,
  asGafMemory,
  asGafPlugins,
  asGafRoutines,
  asGafSkills,
  type GafVisibility,
  type GrokBotMarkColor,
  type GrokBotMarkShape,
} from "./gaf-pack.ts";

export type GrokBotTemplateRecipe = {
  profile: {
    name: string;
    description: string;
    avatarShape?: GrokBotMarkShape;
    avatarColor?: GrokBotMarkColor;
  };
  memory: Array<{
    kind?: string;
    createdAt?: string;
    content: string;
  }>;
  skills: Array<{
    name: string;
    description?: string;
    content: string;
  }>;
  routines: Array<{
    slug: string;
    name: string;
    description: string;
    content: string;
  }>;
  plugins: Array<{
    pluginId: string;
    name?: string;
    description?: string;
  }>;
  gettingStarted?: { skill: string };
  visibility: GafVisibility;
};

function mapAvatarToken(
  value: string | undefined,
  allowed: Set<string>,
  defaults: Record<string, string>,
  overrides?: Record<string, string>,
): string | undefined {
  if (!value) {
    return undefined;
  }
  if (allowed.has(value)) {
    return value;
  }
  const mapped = overrides?.[value] ?? defaults[value];
  if (mapped && allowed.has(mapped)) {
    return mapped;
  }
  return undefined;
}

export function mapAvatarShape(
  shape: string | undefined,
  overrides?: Record<string, string>,
): GrokBotMarkShape | undefined {
  const mapped = mapAvatarToken(
    shape,
    GROK_BOT_MARK_SHAPE_SET,
    DEFAULT_AVATAR_SHAPE_FALLBACKS,
    overrides,
  );
  return mapped as GrokBotMarkShape | undefined;
}

export function mapAvatarColor(
  color: string | undefined,
  overrides?: Record<string, string>,
): GrokBotMarkColor | undefined {
  const mapped = mapAvatarToken(
    color,
    GROK_BOT_MARK_COLOR_SET,
    DEFAULT_AVATAR_COLOR_FALLBACKS,
    overrides,
  );
  return mapped as GrokBotMarkColor | undefined;
}

export type GafTemplateSource = {
  slug?: string;
  profile?: {
    name?: string;
    title?: string;
    description?: string;
    avatar?: { kind?: string; shape?: string; color?: string };
  };
  memory?: unknown;
  skills?: unknown;
  routines?: unknown;
  plugins?: unknown;
  gettingStarted?: { skill?: string };
  visibility?: GafVisibility;
  exports?: {
    grokBotTemplate?: {
      enabled?: boolean;
      avatarFallbacks?: {
        shape?: Record<string, string>;
        color?: Record<string, string>;
      };
      profileDescriptionOverride?: string;
    };
    [key: string]: unknown;
  };
};

/**
 * Project a GAF agent-pack onto a create_bot_share_json-shaped recipe.
 * Does not call create_bot_share_json. Omits farm listing fields (title,
 * stallId, packVersion, format, slug).
 */
export function gafToGrokTemplate(pack: GafTemplateSource): GrokBotTemplateRecipe {
  const grokExport = pack.exports?.grokBotTemplate;
  const avatar = pack.profile?.avatar;
  const shape = mapAvatarShape(avatar?.shape, grokExport?.avatarFallbacks?.shape);
  const color = mapAvatarColor(avatar?.color, grokExport?.avatarFallbacks?.color);
  const description =
    grokExport?.profileDescriptionOverride?.trim() ||
    pack.profile?.description?.trim() ||
    "";

  const recipe: GrokBotTemplateRecipe = {
    profile: {
      name: pack.profile?.name?.trim() || pack.slug || "",
      description,
      ...(shape ? { avatarShape: shape } : {}),
      ...(color ? { avatarColor: color } : {}),
    },
    memory: asGafMemory(pack.memory).map((entry) => ({
      ...(entry.kind ? { kind: entry.kind } : {}),
      ...(entry.createdAt ? { createdAt: entry.createdAt } : {}),
      content: entry.content,
    })),
    skills: asGafSkills(pack.skills)
      .filter((skill) => skill.name?.trim())
      .map((skill) => ({
        name: skill.name,
        ...(skill.description ? { description: skill.description } : {}),
        content: skill.content ?? "",
      })),
    routines: asGafRoutines(pack.routines).map((routine) => ({
      slug: routine.slug,
      name: routine.name?.trim() || routine.slug,
      description: routine.description ?? "",
      content: routine.content ?? "",
    })),
    plugins: asGafPlugins(pack.plugins).map((plugin) => ({
      pluginId: plugin.pluginId,
      ...(plugin.name ? { name: plugin.name } : {}),
      ...(plugin.description ? { description: plugin.description } : {}),
    })),
    visibility: pack.visibility === "team" ? "team" : "public",
  };

  const skill = pack.gettingStarted?.skill?.trim();
  if (skill) {
    recipe.gettingStarted = { skill };
  }

  return recipe;
}
