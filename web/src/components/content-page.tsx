import type { ReactNode } from "react";
import { Container } from "@/components/container";

export function ContentPage({
  kicker,
  title,
  lead,
  children,
}: {
  kicker?: string;
  title: string;
  lead: string;
  children: ReactNode;
}) {
  return (
    <section className="py-16 sm:py-20">
      <Container className="max-w-3xl">
        {kicker ? (
          <p className="font-mono text-[0.7rem] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            {kicker}
          </p>
        ) : null}
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          {title}
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-pretty text-muted-foreground">
          {lead}
        </p>
        <div className="mt-12 space-y-12">{children}</div>
      </Container>
    </section>
  );
}

export function ContentSection({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <article id={id}>
      <h2 className="text-2xl font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      <div className="mt-3 space-y-4 text-base leading-relaxed text-pretty text-muted-foreground [&_a]:font-medium [&_a]:text-foreground [&_a]:underline-offset-4 [&_a]:hover:underline [&_ol]:list-decimal [&_ol]:space-y-3 [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5 [&_strong]:font-medium [&_strong]:text-foreground [&_code]:font-mono [&_code]:text-[0.9em] [&_code]:text-foreground">
        {children}
      </div>
    </article>
  );
}
