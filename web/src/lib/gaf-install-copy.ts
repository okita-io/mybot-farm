export const AVATAR_FALLBACKS =
  "book→tablet, triangle→wedge, circle→pebble, diamond→gem; indigo→violet, amber→yellow, lime→green";

export function grokAgentInstallPrompt(url: string, slug: string): string {
  return `Install the mybot.farm agent pack at this URL:
${url}

1. Open that page (or call mybot.farm WebMCP / API: get_stall / download_pack for slug "${slug}").
2. Download the Generic Agent Format (GAF) JSON pack. Optional: GET /api/packs/${slug}/grok-template for a create_bot_share_json-shaped projection (avatar already mapped).
3. Create a new Grok Bot agent using profile.name and profile.description from the pack. profile.title is farm-only — omit it on the template.
4. Set the avatar from profile.avatar (nested geometric shape/color). Grok Bot uses flat avatarShape / avatarColor. Farm-only fallbacks: ${AVATAR_FALLBACKS}. Do not invent a photo avatar.
5. Save each pack.skills entry as a skill (name, description, content). Skills are scrubbed prose, not raw SKILL.md files.
6. Write pack.memory facts into the new agent’s durable memory (kinds profile and log only).
7. Save pack.routines as routines (slug, name, description, content). These are intention prose — the user confirms any schedule. Never invent automation.json or cron JSON.
8. Record pack.plugins marketplace pluginIds (pluginId, optional name/description) for the owner to install. Never custom MCP URLs.
9. If pack.gettingStarted.skill is set, use that named skill for the first conversation (it must match a skills[].name).
10. Confirm: agent name created, avatar set, skills, memory, routines, plugins, gettingStarted applied, anything needs_review.

Do not send emails or spend money. Do not invent fields missing from the pack.`;
}

export function grokTeamInstallPrompt(url: string, slug: string): string {
  return `Install the mybot.farm team pack at this URL:
${url}

1. Open that page (or call mybot.farm WebMCP / API: get_stall / download_pack for slug "${slug}").
2. Download the Generic Agent Format (GAF) JSON. This is format mybot.farm/team-pack — there is no pack.team key.
3. Create each member from members[].pack (those are agent-packs). Optionally GET /api/packs/{memberSlug}/grok-template for a Grok Bot recipe.
4. Apply pack.shared.memory to each member. Treat topology.handoffs as intention prose (a shared log or README), not a live orchestrator.
5. Follow pack.shared.gettingStarted when present (install prose, not a skill name).
6. Confirm: each member created, shared memory applied, anything needs_review.

Do not send emails or spend money. Do not invent fields missing from the pack.`;
}

export function grokAgentShortInstallPrompt(url: string, slug: string, name: string): string {
  return `Install ${name} from ${url} (slug "${slug}"). Download the GAF JSON (or /api/packs/${slug}/grok-template). Create a Grok Bot from profile.name and profile.description, map profile.avatar to avatarShape/avatarColor (${AVATAR_FALLBACKS}), save pack.skills, write pack.memory, save pack.routines as intention prose, record pack.plugins marketplace ids, and start from pack.gettingStarted.skill if set. Confirm name, avatar, skills, memory, routines, plugins, gettingStarted, and needs_review. Do not send emails or spend money. Do not invent missing fields.`;
}

export function grokTeamShortInstallPrompt(url: string, slug: string, name: string): string {
  return `Install ${name} from ${url} (slug "${slug}"). Team pack: create each members[].pack agent (not pack.team), apply pack.shared.memory, follow pack.shared.gettingStarted. Confirm members and needs_review. Do not send emails or spend money. Do not invent missing fields.`;
}
