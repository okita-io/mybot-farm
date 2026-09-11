import { Download } from "lucide-react";
import { CopyInstallPrompt } from "@/components/copy-install-prompt";
import { Button } from "@/components/ui/button";
import { installPrompt, shortInstallPrompt } from "@/lib/install-prompt";
import { packFilename, type Stall } from "@/lib/packs";

export function StallActions({
  stall,
  showShortCopy = false,
}: {
  stall: Stall;
  showShortCopy?: boolean;
}) {
  const filename = packFilename(stall);
  const prompt = installPrompt(stall);

  return (
    <div className="flex flex-wrap gap-2">
      <Button asChild size="lg" className="h-9 rounded-full px-4">
        <a href={stall.downloadHref} download={filename}>
          <Download data-icon="inline-start" />
          Download pack
        </a>
      </Button>
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
    </div>
  );
}
