import { Download } from "lucide-react";
import { BuyButton, SignedOutBuyButton } from "@/components/buy-button";
import { CopyInstallPrompt } from "@/components/copy-install-prompt";
import { Button } from "@/components/ui/button";
import { installPrompt, shortInstallPrompt } from "@/lib/install-prompt";
import { packFilename, type Stall } from "@/lib/packs";

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

  return (
    <div className="flex flex-wrap gap-2">
      {paid && !canDownload ? (
        signedIn ? (
          <BuyButton stall={stall} />
        ) : (
          <SignedOutBuyButton stall={stall} />
        )
      ) : (
        <Button asChild size="lg" className="h-9 rounded-full px-4">
          <a href={stall.downloadHref} download={filename}>
            <Download data-icon="inline-start" />
            Download pack
          </a>
        </Button>
      )}
      {canDownload ? (
        <>
          <CopyInstallPrompt prompt={prompt} />
          {showShortCopy ? (
            <CopyInstallPrompt
              prompt={shortInstallPrompt(stall)}
              label="Copy short prompt"
              variant="ghost"
            />
          ) : null}
          {stall.members?.map((member) => (
            <Button
              key={member.href}
              asChild
              variant="outline"
              size="lg"
              className="h-9 rounded-full px-4"
            >
              <a href={member.href} download={member.href.split("/").at(-1)}>
                {member.name}
              </a>
            </Button>
          ))}
        </>
      ) : null}
    </div>
  );
}
