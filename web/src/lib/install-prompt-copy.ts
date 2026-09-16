export type InstallPromptKind = "agent" | "team";

export function grokInstallPromptText(input: {
  slug: string;
  kind: InstallPromptKind;
  url: string;
}): string {
  const kindLabel = input.kind === "team" ? "team" : "agent";

  return `Install the mybot.farm ${kindLabel} pack at this URL:
${input.url}

1. Open that page (or call mybot.farm WebMCP / API: get_stall / download_pack for slug "${input.slug}").
2. Download the Generic Agent Format (GAF) JSON pack. Optional: GET /api/packs/${input.slug}/grok-template for a create_bot_share_json-ready projection (agent packs only).
3. Create a new Grok Bot agent using profile.name and profile.description from the pack. Do not copy profile.title into the template (farm listing only).
4. Set the avatar from profile.avatar (nested shape/color → flat avatarShape/avatarColor). Map farm-only values: book→tablet, triangle→wedge, circle→pebble, diamond→gem; indigo→violet, amber→yellow, lime→green. Prefer pack.exports.grokBotTemplate.avatarFallbacks when present.
5. Save each pack.skills entry as a skill (name, description, content).
6. Write pack.memory facts into the new agent’s durable memory (kinds profile and log only).
7. Save each pack.routines entry as a routine (slug, name, description, content). Routines are intention prose, not cron or automation.json — the user confirms any schedule.
8. If pack.plugins is present, record those marketplace pluginId values for the owner to install. Do not add custom MCP servers, URLs, or commands.
9. If pack.gettingStarted.skill is set and names a pack.skills entry, use that skill for the first conversation.
10. If format is mybot.farm/team-pack, create each members[] agent from its pack (not a single template) and apply shared.memory. There is no pack.team key.
11. Confirm: agent name created, avatar set, skills and routines saved, plugins noted, anything needs_review.

Do not send emails or spend money. Do not invent fields missing from the pack. Do not ship secrets, custom MCP, or automation.json.`;
}

export function grokShortInstallPromptText(input: {
  slug: string;
  kind: InstallPromptKind;
  name: string;
  url: string;
}): string {
  const teamBit =
    input.kind === "team"
      ? " For a team-pack, create each members[] agent (not pack.team) and apply shared.memory."
      : "";

  return `Install ${input.name} from ${input.url} (slug "${input.slug}"). Download the GAF JSON (or GET /api/packs/${input.slug}/grok-template). Create a Grok Bot from profile.name and profile.description; map profile.avatar to avatarShape/avatarColor; save pack.skills, pack.memory, and pack.routines as routines (prose triggers; user confirms schedules). Note pack.plugins marketplace ids for the owner to install. If pack.gettingStarted.skill is in pack.skills, use it for the first conversation.${teamBit} Confirm name, skills, routines, and needs_review. Do not send emails or spend money. Do not invent missing fields.`;
}

export function hermesInstallPromptText(input: {
  slug: string;
  kind: InstallPromptKind;
  url: string;
  teamGettingStarted?: string;
}): string {
  if (input.kind === "team") {
    const gettingStarted =
      input.teamGettingStarted?.trim() ||
      "Follow pack.shared.gettingStarted for workspace files, endpoints, and cron.";

    return `Install the mybot.farm team pack at this URL:
${input.url}

1. Open that page (or call mybot.farm WebMCP / API: get_stall / download_pack for slug "${input.slug}").
2. This is a Hermes team. Download each member's scrubbed profile .tar.gz from the bot page.
3. Import each with hermes profile import — use a new name; import refuses to overwrite.
4. ${gettingStarted}
5. Add your own API keys. auth.json and .env never ship.
6. Confirm: each member imported, workspace ready, anything needs_review.

Do not send emails or spend money. Do not invent fields missing from the pack.`;
  }

  return `Install the mybot.farm agent pack at this URL:
${input.url}

1. Open that page (or call mybot.farm WebMCP / API: get_stall / download_pack for slug "${input.slug}").
2. This is a Hermes agent. Download the scrubbed profile .tar.gz — not GAF JSON.
3. Import it: hermes profile import path/to/${input.slug}.hermes.tar.gz --name ${input.slug}
4. Add your own API keys. auth.json and .env never ship.
5. Confirm: profile imported, name matches, anything needs_review.

Do not send emails or spend money. Do not invent fields missing from the pack.`;
}

export function hermesShortInstallPromptText(input: {
  slug: string;
  kind: InstallPromptKind;
  name: string;
  url: string;
}): string {
  if (input.kind === "team") {
    return `Install ${input.name} from ${input.url} (slug "${input.slug}"). Hermes team: download each member .tar.gz, hermes profile import each one, then follow pack.shared.gettingStarted for workspace and cron. Add your own API keys. Confirm members imported and needs_review. Do not send emails or spend money.`;
  }

  return `Install ${input.name} from ${input.url} (slug "${input.slug}"). Hermes agent: download the scrubbed .tar.gz, then hermes profile import path/to/${input.slug}.hermes.tar.gz --name ${input.slug}. Add your own API keys. Confirm name and needs_review. Do not send emails or spend money.`;
}
