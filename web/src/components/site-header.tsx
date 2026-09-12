import Link from "next/link";
import { Container } from "@/components/container";
import { HeaderAuth } from "@/components/header-auth";
import { ThemeToggle } from "@/components/theme-toggle";
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
      <Container className="flex h-14 items-center gap-2 sm:gap-3">
        <Link
          href="/"
          aria-label={site.name}
          className="flex shrink-0 items-center gap-2.5 no-underline"
        >
          <SiteMark />
          <span className="hidden text-sm font-medium tracking-tight text-foreground sm:inline">
            {site.name}
          </span>
        </Link>
        <nav
          aria-label="Primary"
          className="flex min-w-0 flex-1 items-center justify-end gap-2.5 overflow-x-auto sm:gap-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="shrink-0 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex shrink-0 items-center gap-1.5">
          <HeaderAuth />
          <ThemeToggle />
        </div>
      </Container>
    </header>
  );
}
