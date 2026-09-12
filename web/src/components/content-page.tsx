import type { ReactNode } from "react";
import { Container } from "@/components/container";

export function ContentPage({
  kicker,
  title,
  lead,
  hero,
  children,
}: {
  kicker?: string;
  title: string;
  lead: string;
  hero?: ReactNode;
  children: ReactNode;
}) {
  const heading = (
    <>
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
    </>
  );

  return (
    <section className="py-16 sm:py-20">
      <Container className="max-w-3xl">
        {hero ? (
          <div className="grid items-center gap-8 md:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] md:gap-10">
            <div className="mx-auto w-[min(100%,14rem)] md:mx-0 md:w-full">
              {hero}
            </div>
            <div>{heading}</div>
          </div>
        ) : (
          heading
        )}
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
      <div className="mt-3 space-y-4 text-base leading-relaxed text-pretty text-muted-foreground [&_a]:font-medium [&_a]:text-foreground [&_a]:underline-offset-4 [&_a]:hover:underline [&_h3]:mt-8 [&_h3]:text-lg [&_h3]:font-medium [&_h3]:tracking-tight [&_h3]:text-foreground [&_ol]:list-decimal [&_ol]:space-y-3 [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5 [&_strong]:font-medium [&_strong]:text-foreground [&_code]:font-mono [&_code]:text-[0.9em] [&_code]:text-foreground [&_pre]:mt-4 [&_pre]:overflow-x-auto [&_pre]:rounded-2xl [&_pre]:bg-card [&_pre]:px-5 [&_pre]:py-4 [&_pre]:font-mono [&_pre]:text-sm [&_pre]:leading-relaxed [&_pre]:text-foreground [&_pre]:ring-1 [&_pre]:ring-foreground/10 [&_pre]:whitespace-pre-wrap">
        {children}
      </div>
    </article>
  );
}
