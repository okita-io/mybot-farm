import { getPack } from "@/lib/pack-files";
import { stallPageUrl, type Stall } from "@/lib/packs";
import { normalizeRuntimes } from "@/lib/runtimes";
import {
  grokInstallPromptText,
  grokShortInstallPromptText,
  hermesInstallPromptText,
  hermesShortInstallPromptText,
} from "@/lib/install-prompt-copy";

function isHermesOnly(stall: Stall): boolean {
  const runtimes = normalizeRuntimes(getPack(stall.slug)?.runtime);
  return runtimes.includes("hermes") && !runtimes.includes("grok-bot");
}

export {
  grokInstallPromptText,
  grokShortInstallPromptText,
  hermesInstallPromptText,
  hermesShortInstallPromptText,
} from "@/lib/install-prompt-copy";

export function installPrompt(stall: Stall): string {
  const url = stallPageUrl(stall);

  if (isHermesOnly(stall)) {
    return hermesInstallPromptText({
      slug: stall.slug,
      kind: stall.kind,
      url,
      teamGettingStarted: getPack(stall.slug)?.shared?.gettingStarted,
    });
  }

  return grokInstallPromptText({ slug: stall.slug, kind: stall.kind, url });
}

export function shortInstallPrompt(stall: Stall): string {
  const url = stallPageUrl(stall);

  if (isHermesOnly(stall)) {
    return hermesShortInstallPromptText({
      slug: stall.slug,
      kind: stall.kind,
      name: stall.name,
      url,
    });
  }

  return grokShortInstallPromptText({
    slug: stall.slug,
    kind: stall.kind,
    name: stall.name,
    url,
  });
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
