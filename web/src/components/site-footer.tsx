import Link from "next/link";
import { FarmNotesSignup } from "@/components/farm-notes-signup";
import { Container } from "@/components/container";
import { footerLinks, site } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border/80 py-8">
      <Container className="flex flex-col gap-6">
        <FarmNotesSignup variant="footer" source="footer" />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">{site.productName}</p>
          <div className="flex flex-col gap-3 sm:items-end">
            <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-4 gap-y-2">
              {footerLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={
                    link.href === "/catalog"
                      ? "text-sm font-semibold text-foreground underline-offset-4 hover:underline"
                      : "text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                  }
                >
                  {link.label}
                </Link>
              ))}
              <span className="font-mono text-xs text-muted-foreground">
                {site.url.replace("https://", "")}
              </span>
            </nav>
            <a
              href="https://earlyhunt.com/project/ai-agent-market"
              target="_blank"
              rel="noopener"
            >
              <img
                src="https://earlyhunt.com/badges/earlyhunt-badge-light.svg"
                alt="Featured on EarlyHunt"
                width={265}
                height={58}
                className="h-auto max-w-full"
              />
            </a>
          </div>
        </div>
      </Container>
    </footer>
  );
}
