import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Container } from "@/components/container";
import { site } from "@/lib/site";

export function SiteMark() {
  return (
    <span className="inline-flex size-7 items-center justify-center rounded-lg bg-primary">
      <svg
        viewBox="0 0 16 16"
        className="size-3.5 fill-primary-foreground"
        aria-hidden="true"
      >
        <rect x="1" y="1" width="6" height="6" rx="1.4" />
        <rect x="9" y="1" width="6" height="6" rx="1.4" opacity="0.72" />
        <rect x="1" y="9" width="6" height="6" rx="1.4" opacity="0.72" />
        <rect x="9" y="9" width="6" height="6" rx="1.4" opacity="0.44" />
      </svg>
    </span>
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-background/80 backdrop-blur-xl">
      <Container className="flex h-14 items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 no-underline">
          <SiteMark />
          <span className="text-sm font-medium tracking-tight text-foreground">
            {site.name}
          </span>
        </Link>
        <Badge variant="secondary" className="h-6 px-2.5 text-[0.7rem]">
          Coming soon
        </Badge>
      </Container>
    </header>
  );
}
