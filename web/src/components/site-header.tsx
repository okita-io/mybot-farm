import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Container } from "@/components/container";
import { navLinks, site } from "@/lib/site";

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
      <Container className="flex h-14 items-center justify-between gap-3">
        <Link href="/" className="flex shrink-0 items-center gap-2.5 no-underline">
          <SiteMark />
          <span className="text-sm font-medium tracking-tight text-foreground">
            {site.name}
          </span>
        </Link>
        <nav
          aria-label="Primary"
          className="flex items-center gap-3 sm:gap-4"
        >
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              {link.label}
            </Link>
          ))}
          <Badge
            variant="secondary"
            className="hidden h-6 px-2.5 text-[0.7rem] sm:inline-flex"
          >
            Coming soon
          </Badge>
        </nav>
      </Container>
    </header>
  );
}
