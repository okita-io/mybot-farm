"use client";

import { Download } from "lucide-react";
import { BuyButton, SignedOutBuyButton } from "@/components/buy-button";
import { CopyInstallPrompt } from "@/components/copy-install-prompt";
import { Button } from "@/components/ui/button";
import { installPrompt, shortInstallPrompt } from "@/lib/install-prompt";
import { memberHref, packFilename, type Stall } from "@/lib/packs";

function tracksViaPackApi(href: string) {
  return href.includes("/api/packs/") && /[?&]download=1(?:&|$)/.test(href);
}

export function StallMembers({
  stall,
  canDownload = true,
  className,
}: {
  stall: Stall;
  canDownload?: boolean;
  className?: string;
}) {
  if (!stall.members?.length) {
    return null;
  }

  const paid = (stall.priceCents ?? 0) > 0;
  const locked = paid && !canDownload;

  return (
    <div className={className ?? "mt-3 flex flex-wrap gap-2"}>
      {stall.members.map((member) => {
        const href = memberHref(member);
        const isStallPage =
          href.startsWith("/agents/") || href.startsWith("/teams/");

        if (locked) {
          return (
            <Button
              key={member.href}
              type="button"
              variant="outline"
              size="lg"
              className="h-9 rounded-full px-4"
              disabled
              title="Buy this bot to unlock"
            >
              {member.name}
            </Button>
          );
        }

        if (isStallPage) {
          return (
            <Button
              key={member.href}
              asChild
              variant="outline"
              size="lg"
              className="h-9 rounded-full px-4"
            >
              <a href={href}>{member.name}</a>
            </Button>
          );
        }

        return (
          <Button
            key={member.href}
            asChild
            variant="outline"
            size="lg"
            className="h-9 rounded-full px-4"
          >
            <a href={href} download={href.split("/").at(-1)}>
              {member.name}
            </a>
          </Button>
        );
      })}
    </div>
  );
}

export function StallActions({
  stall,
  showShortCopy = false,
  canDownload = true,
  signedIn = false,
}: {
  stall: Stall;
  showShortCopy?: boolean;
  canDownload?: boolean;
  signedIn?: boolean;
}) {
  const filename = packFilename(stall);
  const prompt = installPrompt(stall);
  const paid = (stall.priceCents ?? 0) > 0;
  const locked = paid && !canDownload;

  return (
    <div className="flex flex-wrap gap-2">
      {locked ? (
        signedIn ? (
          <BuyButton stall={stall} />
        ) : (
          <SignedOutBuyButton stall={stall} />
        )
      ) : null}
      {locked ? (
        <Button
          type="button"
          size="lg"
          className="h-9 rounded-full px-4"
          disabled
          title="Buy this bot to unlock"
        >
          <Download data-icon="inline-start" />
          Download pack
        </Button>
      ) : (
        <Button asChild size="lg" className="h-9 rounded-full px-4">
          <a
            href={stall.downloadHref}
            download={filename}
            onClick={() => {
              if (!tracksViaPackApi(stall.downloadHref)) {
                void fetch(`/api/stalls/${encodeURIComponent(stall.slug)}/download`, {
                  method: "POST",
                });
              }
            }}
          >
            <Download data-icon="inline-start" />
            Download pack
          </a>
        </Button>
      )}
      <CopyInstallPrompt prompt={prompt} disabled={locked} />
      {showShortCopy ? (
        <CopyInstallPrompt
          prompt={shortInstallPrompt(stall)}
          label="Copy short prompt"
          variant="ghost"
          disabled={locked}
        />
      ) : null}
    </div>
  );
}
