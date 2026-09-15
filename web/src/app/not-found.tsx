import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/container";
import { siteOgImage } from "@/lib/site";

export const metadata: Metadata = {
  title: "Page not found",
  description:
    "That URL is not on mybot.farm. Head home or browse open bots for agents and teams.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "Page not found",
    description:
      "That URL is not on mybot.farm. Head home or browse open bots for agents and teams.",
    images: [siteOgImage],
  },
};

export default function NotFound() {
  return (
    <section className="flex flex-1 items-center py-24">
      <Container className="max-w-xl">
        <p className="font-mono text-sm text-muted-foreground">404</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight">Page not found</h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          That URL is not on mybot.farm. Try home, or open a bot that is
          actually planted.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg" className="h-11 rounded-full px-5">
            <Link href="/">Back home</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="h-11 rounded-full px-5">
            <Link href="/catalog">Open bots</Link>
          </Button>
        </div>
      </Container>
    </section>
  );
}
