import {
  stallPageUrl,
  type Stall,
} from "@/lib/packs";

export function installPrompt(stall: Stall): string {
  const url = stallPageUrl(stall);

  return `Install the mybot.farm agent pack at this URL:
${url}

1. Open that page (or call mybot.farm WebMCP / API: get_stall / download_pack for slug "${stall.slug}").
2. Download the Generic Agent Format (GAF) JSON pack.
3. Create a new Grok Bot agent using profile.name and profile.description from the pack.
4. Save each pack.skills entry as a skill (name, description, content).
5. Write pack.memory facts into the new agent’s durable memory.
6. If pack.team is present, create each member and apply shared teammate memory.
7. Confirm: agent name created, skills installed, anything needs_review.

Do not send emails or spend money. Do not invent fields missing from the pack.`;
}

export function shortInstallPrompt(stall: Stall): string {
  const url = stallPageUrl(stall);

  return `Install ${stall.name} from ${url} (slug "${stall.slug}"). Download the GAF JSON, create a Grok Bot from profile.name and profile.description, save pack.skills, write pack.memory, and install pack.team members if present. Confirm name, skills, and needs_review. Do not send emails or spend money. Do not invent missing fields.`;
}

export function installPromptPayload(stall: Stall) {
  return {
    slug: stall.slug,
    kind: stall.kind,
    name: stall.name,
    url: stallPageUrl(stall),
    prompt: installPrompt(stall),
    shortPrompt: shortInstallPrompt(stall),
  };
}
