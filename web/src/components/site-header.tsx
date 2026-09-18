import Link from "next/link";
import { Container } from "@/components/container";
import { HeaderAuth } from "@/components/header-auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { isAdminEmail } from "@/lib/admin";
import { getCachedViewer } from "@/lib/users";
import { navLinks, site } from "@/lib/site";
import { cn } from "@/lib/utils";

export function SiteMark() {
  return (
    <img
      src="/mybot.farm.logo.onwhite.svg"
      alt=""
      width={28}
      height={28}
      className="size-7 shrink-0"
      aria-hidden="true"
    />
  );
}

export async function SiteHeader() {
  const viewer = await getCachedViewer();
  const showAdmin = isAdminEmail(viewer?.email);

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
              className={cn(
                "shrink-0 text-sm underline-offset-4 hover:underline",
                "emphasis" in link && link.emphasis
                  ? "font-semibold text-foreground hover:text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {link.label}
            </Link>
          ))}
          {showAdmin ? (
            <Link
              href="/admin"
              className="shrink-0 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Admin
            </Link>
          ) : null}
        </nav>
        <div className="flex shrink-0 items-center gap-1.5">
          <HeaderAuth />
          <ThemeToggle />
        </div>
      </Container>
    </header>
  );
}
