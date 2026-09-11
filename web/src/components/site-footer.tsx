import { Container } from "@/components/container";
import { site } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border/80 py-8">
      <Container className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">{site.productName}</p>
        <p className="font-mono text-xs text-muted-foreground">{site.url.replace("https://", "")}</p>
      </Container>
    </footer>
  );
}
