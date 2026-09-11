import { Container } from "@/components/container";
import { site } from "@/lib/site";

export function HomeHero() {
  return (
    <section className="py-20 sm:py-28">
      <Container className="max-w-4xl">
        <h1 className="text-[clamp(2.25rem,7vw,4.5rem)] font-semibold leading-[1.05] tracking-[-0.045em] text-balance text-foreground">
          {site.tagline}
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-pretty text-muted-foreground sm:text-xl">
          {site.byline}
        </p>
      </Container>
    </section>
  );
}
