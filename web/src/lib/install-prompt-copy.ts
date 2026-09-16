export type InstallPromptInput = {
  url: string;
  slug: string;
  name: string;
  kind: "agent" | "team";
  stallId?: string | null;
  packVersion?: number | null;
  hermesOnly?: boolean;
  hermesTeamGettingStarted?: string;
};

export function catalogProvenanceLine(input: InstallPromptInput): string {
  const stallId = input.stallId;
  const packVersion = input.packVersion && input.packVersion > 0 ? input.packVersion : 1;
  const idBit = stallId ? `, stallId ${stallId}` : "";
  return `Catalog listing: slug "${input.slug}"${idBit}, packVersion ${packVersion}. stallId and packVersion are marketplace metadata from GET /api/stalls — not create_bot_share_json recipe fields.`;
}

export function shortProvenance(input: InstallPromptInput): string {
  const stallId = input.stallId;
  const packVersion = input.packVersion && input.packVersion > 0 ? input.packVersion : 1;
  return `slug "${input.slug}"${stallId ? `, stallId ${stallId}` : ""}, packVersion ${packVersion}`;
}

export function grokAgentInstallPrompt(input: InstallPromptInput): string {
  const provenance = catalogProvenanceLine(input);
  return `Install the mybot.farm agent pack at this URL:
${input.url}

${provenance}

1. Open that page (or call mybot.farm WebMCP / API: get_stall / download_pack for slug "${input.slug}").
2. Download the Generic Agent Format (GAF) JSON pack. Optional projector: GET /api/packs/${input.slug}/grok-template returns a create_bot_share_json-shaped recipe (the farm does not call create_bot_share_json).
3. Create a new Grok Bot using profile.name and profile.description. Set the avatar from profile.avatar (nested shape/color → avatarShape/avatarColor). Map farm-only values: book→tablet, triangle→wedge, circle→pebble, diamond→gem; indigo→violet, amber→yellow, lime→green. Omit profile.title (farm listing/UI only).
4. Save each pack.skills entry as a skill (name, description, content).
5. Write pack.memory facts into the new agent’s durable memory.
6. Save each pack.routines entry as a routine (slug, name or slug, description, content). Intention prose only — confirm schedules with the owner; do not invent automation.json.
7. If pack.plugins is non-empty, list each pluginId for the owner to install from the Grok Bot marketplace. Do not add custom MCP URLs.
8. If pack.gettingStarted.skill is set, use that named skill for the first conversation (it must match a pack.skills[].name).
9. Confirm: agent name created, avatar set, skills, memory, routines, plugins noted, gettingStarted applied, anything needs_review.

Do not send emails or spend money. Do not invent fields missing from the pack.`;
}

export function grokTeamInstallPrompt(input: InstallPromptInput): string {
  const provenance = catalogProvenanceLine(input);
  return `Install the mybot.farm team pack at this URL:
${input.url}

${provenance}

1. Open that page (or call mybot.farm WebMCP / API: get_stall / download_pack for slug "${input.slug}").
2. Download the Generic Agent Format (GAF) JSON pack.
3. This is a team pack (format team-pack, members[]). There is no 1:1 create_bot_share_json recipe. Create a Grok Bot from each member's agent pack.
4. Apply shared teammate memory from pack.shared.memory. Do not treat pack.shared.gettingStarted as a Grok skill name (it is a Hermes-oriented install string).
5. Confirm: each member created, skills/memory/routines applied, anything needs_review.

Do not send emails or spend money. Do not invent fields missing from the pack. The farm cannot call create_bot_share_json.`;
}

export function shortGrokAgentInstallPrompt(input: InstallPromptInput): string {
  const provenance = shortProvenance(input);
  return `Install ${input.name} from ${input.url} (${provenance}). Download the GAF JSON, create a Grok Bot from profile.name and profile.description, map profile.avatar (book→tablet, triangle→wedge, circle→pebble, diamond→gem; indigo→violet, amber→yellow, lime→green), save pack.skills, write pack.memory, save pack.routines, list pack.plugins marketplace ids for the owner to install, and start from pack.gettingStarted.skill. Confirm name, avatar, skills, routines, and needs_review. Do not send emails or spend money. Do not invent missing fields.`;
}

export function shortGrokTeamInstallPrompt(input: InstallPromptInput): string {
  const provenance = shortProvenance(input);
  return `Install ${input.name} from ${input.url} (${provenance}). Team pack: download GAF JSON and create a Grok Bot per members[] agent pack. Apply pack.shared.memory. Do not treat shared.gettingStarted as a Grok skill. Confirm members, skills, and needs_review. Do not send emails or spend money.`;
}
