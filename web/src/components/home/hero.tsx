import { Container } from "@/components/container";
import { site } from "@/lib/site";

export function HomeHero() {
  return (
    <section className="py-20 sm:py-28">
      <Container className="max-w-3xl">
        <h1 className="text-[clamp(2.25rem,8vw,4.75rem)] font-semibold leading-[1.05] tracking-[-0.045em] text-balance text-foreground">
          {site.tagline}
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-pretty text-muted-foreground sm:text-xl">
          {site.summary}
        </p>
      </Container>
    </section>
  );
}
