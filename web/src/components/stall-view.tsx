import Link from "next/link";
import { StallActions } from "@/components/stall-actions";
import { Badge } from "@/components/ui/badge";
import { Container } from "@/components/container";
import { JsonLd } from "@/components/json-ld";
import { installPrompt, shortInstallPrompt } from "@/lib/install-prompt";
import {
  packFileUrl,
  stallApiPaths,
  stallPageUrl,
  stallToneClasses,
  type Stall,
} from "@/lib/packs";
import { cn } from "@/lib/utils";

export function stallJsonLd(stall: Stall) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: stall.name,
    description: stall.description,
    url: stallPageUrl(stall),
    applicationCategory: stall.category,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  };
}

export function StallView({ stall }: { stall: Stall }) {
  const tone = stallToneClasses[stall.tone];
  const prompt = installPrompt(stall);
  const shortPrompt = shortInstallPrompt(stall);
  const api = stallApiPaths(stall.slug);

  return (
    <section className="py-16 sm:py-20">
      <JsonLd data={stallJsonLd(stall)} />
      <Container className="max-w-3xl">
        <p className="text-sm text-muted-foreground">
          <Link href="/#stalls" className="underline-offset-4 hover:underline">
            Open stalls
          </Link>
          {stall.kind === "team" ? (
            <>
              {" · "}
              <Link href="/teams" className="underline-offset-4 hover:underline">
                Agent Teams
              </Link>
            </>
          ) : null}
        </p>
        <div className={cn("mt-6 rounded-3xl px-6 py-8 ring-1 sm:px-8", tone.card)}>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className={cn("h-6 px-2.5", tone.label)}>
              {stall.category}
            </Badge>
            <Badge variant="outline" className="h-6 px-2.5">
              {stall.kind === "team" ? "Team" : "Agent"}
            </Badge>
          </div>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            {stall.name}
          </h1>
          <p className="mt-3 text-lg text-foreground/70">{stall.title}</p>
          <p className="mt-4 text-base leading-relaxed text-pretty text-foreground/80 sm:text-lg">
            {stall.description}
          </p>
          {stall.members?.length ? (
            <p className="mt-4 text-sm text-foreground/70">
              Members:{" "}
              {stall.members.map((member, index) => {
                const memberSlug = member.href
                  .split("/")
                  .pop()
                  ?.replace(/\.json$/, "");
                const href = memberSlug ? `/agents/${memberSlug}` : member.href;

                return (
                  <span key={member.href}>
                    {index > 0 ? ", " : null}
                    <Link href={href} className="underline-offset-4 hover:underline">
                      {member.name}
                    </Link>
                  </span>
                );
              })}
            </p>
          ) : null}
          <div className="mt-8">
            <StallActions stall={stall} showShortCopy />
          </div>
        </div>

        <article className="mt-12">
          <h2 className="text-2xl font-semibold tracking-tight">
            Copy-paste install
          </h2>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">
            Paste this into a Grok Bot (or another agent). It installs a copy of
            the pack — not the author’s computer, logins, or chat history. Step
            by step:{" "}
            <Link href="/how-to" className="underline-offset-4 hover:underline">
              How-To
            </Link>
            . OpenClaw and Hermes install targets are coming soon.
          </p>
          <pre
            id="install-prompt"
            className="mt-6 overflow-x-auto rounded-2xl bg-card px-5 py-5 font-mono text-sm leading-relaxed text-foreground ring-1 ring-foreground/10 whitespace-pre-wrap"
          >
            {prompt}
          </pre>
          <details className="mt-4">
            <summary className="cursor-pointer text-sm font-medium text-foreground">
              Short prompt
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {shortPrompt}
            </p>
          </details>
        </article>

        <article className="mt-12">
          <h2 className="text-2xl font-semibold tracking-tight">
            For agents
          </h2>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">
            Skip the HTML. Fetch the GAF JSON and install prompt directly, or
            call the same tools via WebMCP when the browser exposes{" "}
            <code className="font-mono text-[0.9em]">document.modelContext</code>.
          </p>
          <ul className="mt-6 space-y-2 font-mono text-sm text-foreground/80">
            <li>
              Pack file:{" "}
              <a className="underline-offset-4 hover:underline" href={stall.downloadHref}>
                {packFileUrl(stall)}
              </a>
            </li>
            <li>
              get_stall:{" "}
              <a className="underline-offset-4 hover:underline" href={api.get_stall}>
                {api.get_stall}
              </a>
            </li>
            <li>
              download_pack:{" "}
              <a className="underline-offset-4 hover:underline" href={api.download_pack}>
                {api.download_pack}
              </a>
            </li>
            <li>
              list_pack_skills:{" "}
              <a className="underline-offset-4 hover:underline" href={api.list_pack_skills}>
                {api.list_pack_skills}
              </a>
            </li>
            <li>
              get_install_prompt:{" "}
              <a
                className="underline-offset-4 hover:underline"
                href={api.get_install_prompt}
              >
                {api.get_install_prompt}
              </a>
            </li>
          </ul>
        </article>
      </Container>
    </section>
  );
}
