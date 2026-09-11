import { Container } from "@/components/container";
import { webmcp } from "@/lib/site";

export function HomeWebmcp() {
  return (
    <section aria-labelledby="webmcp-heading" className="pb-16 sm:pb-20">
      <Container>
        <article className="rounded-3xl bg-agent-muted px-6 py-10 ring-1 ring-agent/20 sm:px-10 sm:py-12">
          <p className="font-mono text-[0.7rem] font-medium uppercase tracking-[0.2em] text-agent-foreground">
            For agents
          </p>
          <h2
            id="webmcp-heading"
            className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
          >
            {webmcp.title}
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-pretty text-foreground/80 sm:text-lg">
            {webmcp.answer}
          </p>
        </article>
      </Container>
    </section>
  );
}
