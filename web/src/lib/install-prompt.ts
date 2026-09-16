import { grokAgentInstallPrompt, grokAgentShortInstallPrompt, grokTeamInstallPrompt, grokTeamShortInstallPrompt } from "./gaf-install-copy";
import { getPack } from "@/lib/pack-files";
import { stallPageUrl, type Stall } from "@/lib/packs";
import { normalizeRuntimes } from "@/lib/runtimes";

function isHermesOnly(stall: Stall): boolean {
  const runtimes = normalizeRuntimes(getPack(stall.slug)?.runtime);
  return runtimes.includes("hermes") && !runtimes.includes("grok-bot");
}

export function installPrompt(stall: Stall): string {
  const url = stallPageUrl(stall);

  if (isHermesOnly(stall)) {
    if (stall.kind === "team") {
      const gettingStarted = getPack(stall.slug)?.shared?.gettingStarted?.trim();

      return `Install the mybot.farm team pack at this URL:
${url}

1. Open that page (or call mybot.farm WebMCP / API: get_stall / download_pack for slug "${stall.slug}").
2. This is a Hermes team. Download each member's scrubbed profile .tar.gz from the bot page.
3. Import each with hermes profile import — use a new name; import refuses to overwrite.
4. ${gettingStarted || "Follow pack.shared.gettingStarted for workspace files, endpoints, and cron."}
5. Add your own API keys. auth.json and .env never ship.
6. Confirm: each member imported, workspace ready, anything needs_review.

Do not send emails or spend money. Do not invent fields missing from the pack.`;
    }

    return `Install the mybot.farm agent pack at this URL:
${url}

1. Open that page (or call mybot.farm WebMCP / API: get_stall / download_pack for slug "${stall.slug}").
2. This is a Hermes agent. Download the scrubbed profile .tar.gz — not GAF JSON.
3. Import it: hermes profile import path/to/${stall.slug}.hermes.tar.gz --name ${stall.slug}
4. Add your own API keys. auth.json and .env never ship.
5. Confirm: profile imported, name matches, anything needs_review.

Do not send emails or spend money. Do not invent fields missing from the pack.`;
  }

  if (stall.kind === "team") {
    return grokTeamInstallPrompt(url, stall.slug);
  }

  return grokAgentInstallPrompt(url, stall.slug);
}

export function shortInstallPrompt(stall: Stall): string {
  const url = stallPageUrl(stall);

  if (isHermesOnly(stall)) {
    if (stall.kind === "team") {
      return `Install ${stall.name} from ${url} (slug "${stall.slug}"). Hermes team: download each member .tar.gz, hermes profile import each one, then follow pack.shared.gettingStarted for workspace and cron. Add your own API keys. Confirm members imported and needs_review. Do not send emails or spend money.`;
    }

    return `Install ${stall.name} from ${url} (slug "${stall.slug}"). Hermes agent: download the scrubbed .tar.gz, then hermes profile import path/to/${stall.slug}.hermes.tar.gz --name ${stall.slug}. Add your own API keys. Confirm name and needs_review. Do not send emails or spend money.`;
  }

  if (stall.kind === "team") {
    return grokTeamShortInstallPrompt(url, stall.slug, stall.name);
  }

  return grokAgentShortInstallPrompt(url, stall.slug, stall.name);
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
