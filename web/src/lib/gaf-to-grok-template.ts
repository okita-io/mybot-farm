import type { FarmPack, PackMemory, PackPlugin, PackRoutine, PackSkill } from "./pack-files";

/** Grok Bot mark shapes (`GROK_BOT_MARK_SHAPES`). */
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

/** Grok Bot mark colors (`GROK_BOT_MARK_COLORS`). */
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

const MARK_SHAPE_SET = new Set<string>(GROK_BOT_MARK_SHAPES);
const MARK_COLOR_SET = new Set<string>(GROK_BOT_MARK_COLORS);

/** Farm-only geometric ids → nearest Grok Bot mark enum. Pack maps may override. */
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

export type GrokBotTemplatePlugin = {
  pluginId: string;
  name?: string;
  description?: string;
};

export type GrokBotTemplate = {
  profile: {
    name: string;
    description: string;
    avatarShape?: GrokBotMarkShape;
    avatarColor?: GrokBotMarkColor;
  };
  memory: Array<{
    kind?: "profile" | "log";
    createdAt?: string;
    content: string;
  }>;
  skills: Array<{ name: string; description?: string; content: string }>;
  routines: Array<{
    slug: string;
    name: string;
    description: string;
    content: string;
  }>;
  plugins: GrokBotTemplatePlugin[];
  gettingStarted?: { skill: string };
  visibility: "public" | "team";
};

export function isGafTeamPack(pack: Pick<FarmPack, "format"> | Record<string, unknown>): boolean {
  return pack.format === "mybot.farm/team-pack";
}

export function isGafAgentPack(pack: Pick<FarmPack, "format"> | Record<string, unknown>): boolean {
  return pack.format === "mybot.farm/agent-pack";
}

function readTrimmed(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function mapAvatarValue(
  value: string | undefined,
  allowed: Set<string>,
  defaultFallbacks: Record<string, string>,
  packFallbacks?: Record<string, string>,
): string | undefined {
  const raw = value?.trim().toLowerCase();
  if (!raw) {
    return undefined;
  }

  if (allowed.has(raw)) {
    return raw;
  }

  const packHit = packFallbacks
    ? packFallbacks[raw] ??
      Object.entries(packFallbacks).find(([key]) => key.toLowerCase() === raw)?.[1]
    : undefined;
  const mapped = packHit ?? defaultFallbacks[raw];
  const next = typeof mapped === "string" ? mapped.trim().toLowerCase() : "";
  if (next && allowed.has(next)) {
    return next;
  }

  return undefined;
}

function mapMemory(entries: PackMemory[] | undefined): GrokBotTemplate["memory"] {
  const memory: GrokBotTemplate["memory"] = [];

  for (const entry of entries ?? []) {
    const content = readTrimmed(entry.content);
    if (!content) {
      continue;
    }

    const kind = readTrimmed(entry.kind).toLowerCase();
    const mapped: GrokBotTemplate["memory"][number] = { content };
    if (kind === "profile" || kind === "log") {
      mapped.kind = kind;
    }
    const createdAt = readTrimmed(entry.createdAt);
    if (createdAt) {
      mapped.createdAt = createdAt;
    }
    memory.push(mapped);
  }

  return memory;
}

function mapSkills(entries: PackSkill[] | undefined): GrokBotTemplate["skills"] {
  const skills: GrokBotTemplate["skills"] = [];

  for (const skill of entries ?? []) {
    const name = readTrimmed(skill.name);
    const content = typeof skill.content === "string" ? skill.content : "";
    if (!name) {
      continue;
    }

    const mapped: GrokBotTemplate["skills"][number] = { name, content };
    const description = readTrimmed(skill.description);
    if (description) {
      mapped.description = description;
    }
    skills.push(mapped);
  }

  return skills;
}

function mapRoutines(entries: PackRoutine[] | undefined): GrokBotTemplate["routines"] {
  const routines: GrokBotTemplate["routines"] = [];

  for (const routine of entries ?? []) {
    const slug = readTrimmed(routine.slug);
    const description = typeof routine.description === "string" ? routine.description : "";
    const content = typeof routine.content === "string" ? routine.content : "";
    if (!slug) {
      continue;
    }

    routines.push({
      slug,
      name: readTrimmed(routine.name) || slug,
      description,
      content,
    });
  }

  return routines;
}

function mapPlugins(entries: PackPlugin[] | undefined): GrokBotTemplatePlugin[] {
  const plugins: GrokBotTemplatePlugin[] = [];

  for (const plugin of entries ?? []) {
    const pluginId = readTrimmed(plugin.pluginId);
    if (!pluginId) {
      continue;
    }

    const mapped: GrokBotTemplatePlugin = { pluginId };
    const name = readTrimmed(plugin.name);
    const description = readTrimmed(plugin.description);
    if (name) {
      mapped.name = name;
    }
    if (description) {
      mapped.description = description;
    }
    plugins.push(mapped);
  }

  return plugins;
}

/**
 * Project a GAF agent-pack to a `create_bot_share_json`-shaped recipe.
 * Does not invent fields: farm-only `profile.title` is dropped; avatar enums
 * are mapped or omitted; missing optional arrays become `[]`.
 */
export function gafToGrokTemplate(pack: FarmPack): GrokBotTemplate {
  if (isGafTeamPack(pack)) {
    throw new Error(
      "Team packs have no 1:1 create_bot_share_json equivalent. Export each members[].pack agent as its own template.",
    );
  }

  const name = readTrimmed(pack.profile?.name);
  const override = readTrimmed(pack.exports?.grokBotTemplate?.profileDescriptionOverride);
  const description = override || readTrimmed(pack.profile?.description);
  if (!name || !description) {
    throw new Error("Agent pack needs profile.name and profile.description.");
  }

  const fallbacks = pack.exports?.grokBotTemplate?.avatarFallbacks;
  const avatarShape = mapAvatarValue(
    pack.profile?.avatar?.shape,
    MARK_SHAPE_SET,
    DEFAULT_AVATAR_SHAPE_FALLBACKS,
    fallbacks?.shape,
  ) as GrokBotMarkShape | undefined;
  const avatarColor = mapAvatarValue(
    pack.profile?.avatar?.color,
    MARK_COLOR_SET,
    DEFAULT_AVATAR_COLOR_FALLBACKS,
    fallbacks?.color,
  ) as GrokBotMarkColor | undefined;

  const gettingStartedSkill = readTrimmed(pack.gettingStarted?.skill);

  return {
    profile: {
      name,
      description,
      ...(avatarShape ? { avatarShape } : {}),
      ...(avatarColor ? { avatarColor } : {}),
    },
    memory: mapMemory(pack.memory),
    skills: mapSkills(pack.skills),
    routines: mapRoutines(pack.routines),
    plugins: mapPlugins(pack.plugins),
    ...(gettingStartedSkill ? { gettingStarted: { skill: gettingStartedSkill } } : {}),
    visibility: pack.visibility === "team" ? "team" : "public",
  };
}

const PLUGIN_KEYS = new Set(["pluginId", "name", "description"]);
const GROK_TEMPLATE_KEYS = new Set(["enabled", "avatarFallbacks", "profileDescriptionOverride"]);
const AVATAR_FALLBACK_KEYS = new Set(["shape", "color"]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function looksLikeUrl(value: string): boolean {
  return /:\/\//.test(value) || /^https?:/i.test(value);
}

function validateStringMap(
  value: unknown,
  label: string,
  allowedTargets: Set<string>,
): string | null {
  if (value === undefined) {
    return null;
  }

  if (!isPlainObject(value)) {
    return `${label} must be an object of string → string.`;
  }

  for (const [from, to] of Object.entries(value)) {
    if (!from.trim()) {
      return `${label} keys must be non-empty strings.`;
    }
    if (typeof to !== "string" || !to.trim()) {
      return `${label} values must be non-empty strings.`;
    }
    if (!allowedTargets.has(to.trim().toLowerCase()) && !allowedTargets.has(to.trim())) {
      return `${label}["${from}"] must be a Grok Bot mark enum, not "${to}".`;
    }
  }

  return null;
}

function skillNames(pack: Record<string, unknown>): Set<string> {
  const names = new Set<string>();
  const skills = pack.skills;
  if (!Array.isArray(skills)) {
    return names;
  }

  for (const skill of skills) {
    if (isPlainObject(skill) && typeof skill.name === "string" && skill.name.trim()) {
      names.add(skill.name.trim());
    }
  }

  return names;
}

function validatePlugins(plugins: unknown): string | null {
  if (plugins === undefined) {
    return null;
  }

  if (!Array.isArray(plugins)) {
    return "plugins must be an array of { pluginId, name?, description? }.";
  }

  for (const [index, item] of plugins.entries()) {
    if (!isPlainObject(item)) {
      return `plugins[${index}] must be an object with pluginId (marketplace id only).`;
    }

    const extra = Object.keys(item).filter((key) => !PLUGIN_KEYS.has(key));
    if (extra.length) {
      return `plugins[${index}] only allows pluginId, name, and description (no custom MCP). Unknown: ${extra.join(", ")}.`;
    }

    const pluginId = item.pluginId;
    if (typeof pluginId !== "string" || !pluginId.trim()) {
      return `plugins[${index}] needs a non-empty pluginId.`;
    }
    if (looksLikeUrl(pluginId)) {
      return `plugins[${index}].pluginId must be a marketplace id, not a URL.`;
    }

    if (item.name !== undefined && typeof item.name !== "string") {
      return `plugins[${index}].name must be a string.`;
    }
    if (item.description !== undefined && typeof item.description !== "string") {
      return `plugins[${index}].description must be a string.`;
    }
  }

  return null;
}

function validateGettingStarted(pack: Record<string, unknown>): string | null {
  const gettingStarted = pack.gettingStarted;
  if (gettingStarted === undefined) {
    return null;
  }

  if (typeof gettingStarted === "string") {
    if (isGafTeamPack(pack)) {
      return "Team packs use shared.gettingStarted as a string; do not set top-level gettingStarted to a string.";
    }
    return "gettingStarted must be { skill } naming a pack.skills[].name.";
  }

  if (!isPlainObject(gettingStarted)) {
    return "gettingStarted must be { skill } naming a pack.skills[].name.";
  }

  const skill = gettingStarted.skill;
  if (typeof skill !== "string" || !skill.trim()) {
    return "gettingStarted.skill must be a non-empty string.";
  }

  const names = skillNames(pack);
  if (!names.has(skill.trim())) {
    return `gettingStarted.skill "${skill.trim()}" must match a skills[].name.`;
  }

  return null;
}

function validateExports(exportsValue: unknown): string | null {
  if (exportsValue === undefined) {
    return null;
  }

  if (!isPlainObject(exportsValue)) {
    return "exports must be an object.";
  }

  const grok = exportsValue.grokBotTemplate;
  if (grok === undefined) {
    return null;
  }

  if (!isPlainObject(grok)) {
    return "exports.grokBotTemplate must be an object.";
  }

  const extra = Object.keys(grok).filter((key) => !GROK_TEMPLATE_KEYS.has(key));
  if (extra.length) {
    return `exports.grokBotTemplate unknown keys: ${extra.join(", ")}.`;
  }

  if (grok.enabled !== undefined && typeof grok.enabled !== "boolean") {
    return "exports.grokBotTemplate.enabled must be a boolean.";
  }

  if (
    grok.profileDescriptionOverride !== undefined &&
    typeof grok.profileDescriptionOverride !== "string"
  ) {
    return "exports.grokBotTemplate.profileDescriptionOverride must be a string.";
  }

  const fallbacks = grok.avatarFallbacks;
  if (fallbacks === undefined) {
    return null;
  }

  if (!isPlainObject(fallbacks)) {
    return "exports.grokBotTemplate.avatarFallbacks must be an object.";
  }

  const extraFallback = Object.keys(fallbacks).filter((key) => !AVATAR_FALLBACK_KEYS.has(key));
  if (extraFallback.length) {
    return `avatarFallbacks only allows shape and color. Unknown: ${extraFallback.join(", ")}.`;
  }

  return (
    validateStringMap(fallbacks.shape, "avatarFallbacks.shape", MARK_SHAPE_SET) ??
    validateStringMap(fallbacks.color, "avatarFallbacks.color", MARK_COLOR_SET)
  );
}

/**
 * Additive GAF checks for listing POST. Unknown top-level keys stay allowed so
 * Hermes/OpenClaw and older farm validators can ignore exports/visibility.
 */
export function validateFarmPack(value: unknown): { ok: true } | { ok: false; error: string } {
  if (!isPlainObject(value)) {
    return { ok: false, error: "Pack JSON must be an object." };
  }

  if (value.visibility !== undefined && value.visibility !== "public" && value.visibility !== "team") {
    return { ok: false, error: 'visibility must be "public" or "team".' };
  }

  const pluginsError = validatePlugins(value.plugins);
  if (pluginsError) {
    return { ok: false, error: pluginsError };
  }

  const gettingStartedError = validateGettingStarted(value);
  if (gettingStartedError) {
    return { ok: false, error: gettingStartedError };
  }

  const exportsError = validateExports(value.exports);
  if (exportsError) {
    return { ok: false, error: exportsError };
  }

  if (value.routines !== undefined && !Array.isArray(value.routines)) {
    return { ok: false, error: "routines must be an array of intention-prose jobs (never automation.json)." };
  }

  if (Array.isArray(value.routines)) {
    for (const [index, routine] of value.routines.entries()) {
      if (!isPlainObject(routine)) {
        return { ok: false, error: `routines[${index}] must be an object.` };
      }
      if (typeof routine.slug !== "string" || !routine.slug.trim()) {
        return { ok: false, error: `routines[${index}] needs a non-empty slug.` };
      }
      if (typeof routine.description !== "string") {
        return { ok: false, error: `routines[${index}].description must be a string.` };
      }
      if (typeof routine.content !== "string") {
        return { ok: false, error: `routines[${index}].content must be a string.` };
      }
    }
  }

  return { ok: true };
}
