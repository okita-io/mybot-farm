import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/container";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <section className="flex flex-1 items-center py-24">
      <Container className="max-w-xl">
        <p className="font-mono text-sm text-muted-foreground">404</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight">Page not found</h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          That URL is not on mybot.farm.
        </p>
        <Button asChild size="lg" className="mt-8 h-11 rounded-full px-5">
          <Link href="/">Back home</Link>
        </Button>
      </Container>
    </section>
  );
}
