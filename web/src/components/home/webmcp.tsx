import Link from "next/link";
import { Container } from "@/components/container";
import { packTools } from "@/lib/webmcp-catalog";
import { webmcp } from "@/lib/site";

export function HomeWebmcp() {
  return (
    <section aria-labelledby="webmcp-heading" className="pb-16 sm:pb-20">
      <Container>
        <article className="clay-surface rounded-3xl bg-agent-muted px-6 py-10 sm:px-10 sm:py-12">
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
          <ul className="mt-8 space-y-3">
            {packTools.map((tool) => (
              <li key={tool.name}>
                <p className="font-mono text-sm font-medium text-foreground">
                  {tool.name}{" "}
                  <span className="font-sans font-normal text-foreground/70">
                    {tool.method} {tool.path}
                  </span>
                </p>
                <p className="mt-1 max-w-2xl text-sm leading-relaxed text-foreground/75">
                  {tool.description}
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-8 text-sm leading-relaxed text-foreground/70">
            Public JSON:{" "}
            <Link href="/api" className="font-medium underline-offset-4 hover:underline">
              /api
            </Link>
            ,{" "}
            <Link href="/api/stalls" className="font-medium underline-offset-4 hover:underline">
              /api/stalls
            </Link>
            ,{" "}
            <Link
              href="/api/packs/gift-day"
              className="font-medium underline-offset-4 hover:underline"
            >
              /api/packs/{"{slug}"}
            </Link>
            ,{" "}
            <Link
              href="/api/install-prompt/gift-day"
              className="font-medium underline-offset-4 hover:underline"
            >
              /api/install-prompt/{"{slug}"}
            </Link>
            . Free GAF files stay at{" "}
            <a
              href="/packs/agents/gift-day.json"
              className="font-medium underline-offset-4 hover:underline"
            >
              /packs/
            </a>
            .
          </p>
        </article>
      </Container>
    </section>
  );
}
