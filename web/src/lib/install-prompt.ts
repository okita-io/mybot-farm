import { getPack } from "@/lib/pack-files";
import { stallPageUrl, type Stall } from "@/lib/packs";
import { normalizeRuntimes } from "@/lib/runtimes";
import {
  catalogProvenanceLine,
  grokAgentInstallPrompt,
  grokTeamInstallPrompt,
  shortGrokAgentInstallPrompt,
  shortGrokTeamInstallPrompt,
  type InstallPromptInput,
} from "@/lib/install-prompt-copy";

function isHermesOnly(stall: Stall): boolean {
  const runtimes = normalizeRuntimes(getPack(stall.slug)?.runtime);
  return runtimes.includes("hermes") && !runtimes.includes("grok-bot");
}

function hermesImportLine(stall: Stall): string {
  return `hermes profile import path/to/${stall.slug}.hermes.tar.gz --name ${stall.slug}`;
}

function promptInput(stall: Stall): InstallPromptInput {
  return {
    url: stallPageUrl(stall),
    slug: stall.slug,
    name: stall.name,
    kind: stall.kind,
    stallId: stall.stallId ?? stall.listingId ?? null,
    packVersion: stall.packVersion ?? 1,
  };
}

function hermesFollowUp(stall: Stall): string {
  if (!stall.hermesHref) {
    return "";
  }

  return `

Hermes: download ${stall.hermesHref} (or farm_plant ${stall.slug}) then ${hermesImportLine(stall)}. Add your own API keys.`;
}

function shortHermesFollowUp(stall: Stall): string {
  if (!stall.hermesHref) {
    return "";
  }

  return ` Hermes: download the .hermes.tar.gz and ${hermesImportLine(stall)}.`;
}

export function installPrompt(stall: Stall): string {
  const input = promptInput(stall);

  if (isHermesOnly(stall)) {
    if (stall.kind === "team") {
      const gettingStarted = getPack(stall.slug)?.shared?.gettingStarted?.trim();

      return `Install the mybot.farm team pack at this URL:
${input.url}

${catalogProvenanceLine(input)}

1. Open that page (or call mybot.farm WebMCP / API: get_stall / download_pack for slug "${stall.slug}").
2. This is a Hermes team. Download each member's scrubbed profile .tar.gz from the bot page.
3. Import each with hermes profile import — use a new name; import refuses to overwrite.
4. ${gettingStarted || "Follow pack.shared.gettingStarted for workspace and cron."}
5. Add your own API keys. auth.json and .env never ship.
6. Confirm: each member imported, workspace ready, anything needs_review.

Do not send emails or spend money. Do not invent fields missing from the pack.`;
    }

    return `Install the mybot.farm agent pack at this URL:
${input.url}

${catalogProvenanceLine(input)}

1. Open that page (or call mybot.farm WebMCP / API: get_stall / download_pack for slug "${stall.slug}").
2. This is a Hermes agent. Download the scrubbed profile .tar.gz — not GAF JSON.
3. Import it: ${hermesImportLine(stall)}
4. Add your own API keys. auth.json and .env never ship.
5. Confirm: profile imported, name matches, anything needs_review.

Do not send emails or spend money. Do not invent fields missing from the pack.`;
  }

  if (stall.kind === "team") {
    return grokTeamInstallPrompt(input) + hermesFollowUp(stall);
  }

  return grokAgentInstallPrompt(input) + hermesFollowUp(stall);
}

export function shortInstallPrompt(stall: Stall): string {
  const input = promptInput(stall);
  const provenance = `slug "${input.slug}"${input.stallId ? `, stallId ${input.stallId}` : ""}, packVersion ${input.packVersion ?? 1}`;

  if (isHermesOnly(stall)) {
    if (stall.kind === "team") {
      return `Install ${stall.name} from ${input.url} (${provenance}). Hermes team: download each member .tar.gz, hermes profile import each one, then follow pack.shared.gettingStarted for workspace and cron. Add your own API keys. Confirm members imported and needs_review. Do not send emails or spend money.`;
    }

    return `Install ${stall.name} from ${input.url} (${provenance}). Hermes agent: download the scrubbed .tar.gz, then ${hermesImportLine(stall)}. Add your own API keys. Confirm name and needs_review. Do not send emails or spend money.`;
  }

  if (stall.kind === "team") {
    return shortGrokTeamInstallPrompt(input) + shortHermesFollowUp(stall);
  }

  return shortGrokAgentInstallPrompt(input) + shortHermesFollowUp(stall);
}

export function installPromptPayload(stall: Stall) {
  return {
    slug: stall.slug,
    stallId: stall.stallId ?? stall.listingId ?? null,
    packVersion: stall.packVersion ?? 1,
    kind: stall.kind,
    name: stall.name,
    url: stallPageUrl(stall),
    prompt: installPrompt(stall),
    shortPrompt: shortInstallPrompt(stall),
  };
}
