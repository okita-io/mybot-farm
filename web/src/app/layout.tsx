import { ClerkProvider } from "@clerk/nextjs";
import { shadcn } from "@clerk/ui/themes";
import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Geist, Geist_Mono } from "next/font/google";
import { JsonLd } from "@/components/json-ld";
import { KofiWidget } from "@/components/kofi-widget";
import { MobileSponsors, SponsorRail } from "@/components/sponsor-rails";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ThemeProvider } from "@/components/theme-provider";
import { UserSync } from "@/components/user-sync";
import { WebmcpTools } from "@/components/webmcp-tools";
import { organizationLd, websiteLd } from "@/lib/schema";
import { site, siteOgImage } from "@/lib/site";
import { cn } from "@/lib/utils";
import "./globals.css";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.productName} — ${site.tagline}`,
    template: `%s | ${site.name}`,
  },
  description: site.description,
  applicationName: site.productName,
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
  },
  alternates: { canonical: "/" },
  openGraph: {
    title: `${site.productName} — ${site.tagline}`,
    description: site.description,
    url: "/",
    siteName: site.name,
    type: "website",
    locale: "en_US",
    images: [siteOgImage],
  },
  twitter: {
    card: "summary_large_image",
    title: `${site.productName} — ${site.tagline}`,
    description: site.description,
    images: [siteOgImage],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f5f8" },
    { media: "(prefers-color-scheme: dark)", color: "#1c1e27" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      className={cn(
        geistSans.variable,
        geistMono.variable,
        "h-full antialiased",
      )}
    >
      <body className="min-h-full bg-background text-foreground">
        <ClerkProvider appearance={{ theme: shadcn }}>
          <ThemeProvider>
            <JsonLd data={websiteLd} />
            <JsonLd data={organizationLd} />
            <a
              href="#content"
              className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
            >
              Skip to content
            </a>
            <div className="mx-auto grid min-h-dvh w-full max-w-5xl grid-cols-1 min-[90rem]:max-w-[88rem] min-[90rem]:grid-cols-[11rem_minmax(0,64rem)_11rem] min-[90rem]:gap-4">
              <SponsorRail side="left" />
              <div className="flex min-h-dvh min-w-0 flex-col">
                <SiteHeader />
                <UserSync />
                <WebmcpTools />
                <main id="content" className="flex flex-1 flex-col max-[89.99rem]:pt-24">
                  {children}
                </main>
                <SiteFooter />
              </div>
              <SponsorRail side="right" />
            </div>
            <MobileSponsors />
            <KofiWidget />
            <Analytics />
          </ThemeProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
