import Link from "next/link";
import { StallActions } from "@/components/stall-actions";
import { StallHeaderMeta, StallPackStats } from "@/components/stall-meta";
import { Container } from "@/components/container";
import { JsonLd } from "@/components/json-ld";
import { installPrompt, shortInstallPrompt } from "@/lib/install-prompt";
import { catalogStallCardStats } from "@/lib/catalog";
import { formatPriceLabel, formatUsd } from "@/lib/money";
import {
  packFileUrl,
  stallApiPaths,
  stallPageUrl,
  stallToneClasses,
  type Stall,
} from "@/lib/packs";
import { cn } from "@/lib/utils";

export function stallJsonLd(stall: Stall) {
  const cents = stall.priceCents ?? 0;

  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: stall.name,
    description: stall.description,
    url: stallPageUrl(stall),
    applicationCategory: stall.category,
    offers: {
      "@type": "Offer",
      price: (cents / 100).toFixed(2),
      priceCurrency: (stall.currency ?? "usd").toUpperCase(),
    },
  };
}

export async function StallView({
  stall,
  canDownload,
  signedIn,
  checkout,
}: {
  stall: Stall;
  canDownload: boolean;
  signedIn: boolean;
  checkout?: "success" | "cancel" | null;
}) {
  const tone = stallToneClasses[stall.tone];
  const prompt = installPrompt(stall);
  const shortPrompt = shortInstallPrompt(stall);
  const api = stallApiPaths(stall.slug);
  const stats = await catalogStallCardStats(stall.slug);
  const paid = (stall.priceCents ?? 0) > 0;

  return (
    <section className="py-16 sm:py-20">
      <JsonLd data={stallJsonLd(stall)} />
      <Container className="max-w-3xl">
        <p className="text-sm text-muted-foreground">
          <Link href="/catalog" className="underline-offset-4 hover:underline">
            Catalog
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
          <StallHeaderMeta
            kind={stall.kind}
            category={stall.category}
            categoryClassName={tone.label}
            runtimes={stats?.runtimes ?? []}
            author={stall.author}
            priceCents={stall.priceCents ?? 0}
          />
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            {stall.name}
          </h1>
          <p className="mt-3 text-lg text-foreground/70">{stall.title}</p>
          <p className="mt-4 text-base leading-relaxed text-pretty text-foreground/80 sm:text-lg">
            {stall.description}
          </p>
          {paid ? (
            <p className="mt-4 text-sm font-medium text-foreground">
              {canDownload
                ? "Unlocked"
                : `${formatUsd(stall.priceCents ?? 0)} · farm keeps 10%`}
            </p>
          ) : (
            <p className="mt-4 text-sm font-medium text-foreground">
              {formatPriceLabel(0)} download
            </p>
          )}
          {checkout === "success" && !canDownload ? (
            <p className="mt-3 text-sm text-foreground/75" role="status">
              Payment received. Unlock the pack in a moment — refresh if the download is still locked.
            </p>
          ) : null}
          {checkout === "cancel" ? (
            <p className="mt-3 text-sm text-muted-foreground" role="status">
              Checkout canceled. The stall is still here if you want it later.
            </p>
          ) : null}
          {stats ? (
            <div className="mt-4">
              <StallPackStats
                skillCount={stats.skillCount}
                memoryLineCount={stats.memoryLineCount}
                soulLine={stats.soulLine}
              />
            </div>
          ) : null}
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
            <StallActions
              stall={stall}
              showShortCopy
              canDownload={canDownload}
              signedIn={signedIn}
            />
          </div>
        </div>

        <article className="mt-12">
          <h2 className="text-2xl font-semibold tracking-tight">
            Copy-paste install
          </h2>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">
            {canDownload
              ? "Paste this into a Grok Bot (or another agent). It installs a copy of the pack — not the author’s computer, logins, or chat history. Step by step:"
              : "Buy this stall to unlock the pack download and install prompt. Seed stalls on the farm stay free."}{" "}
            <Link href="/how-to" className="underline-offset-4 hover:underline">
              How-To
            </Link>{" "}
            covers Grok Bot (this GAF prompt) and Hermes (a scrubbed{" "}
            <code className="font-mono text-[0.9em] text-foreground">.tar.gz</code>
            ). OpenClaw install targets are still coming.
          </p>
          {canDownload ? (
            <pre
              id="install-prompt"
              className="mt-6 overflow-x-auto rounded-2xl bg-card px-5 py-5 font-mono text-sm leading-relaxed text-foreground ring-1 ring-foreground/10 whitespace-pre-wrap"
            >
              {prompt}
            </pre>
          ) : (
            <p className="mt-6 rounded-2xl bg-card px-5 py-5 text-sm leading-relaxed text-muted-foreground ring-1 ring-foreground/10">
              Install prompt unlocks after purchase.
            </p>
          )}
          {canDownload ? (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-medium text-foreground">
                Short prompt
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {shortPrompt}
              </p>
            </details>
          ) : null}
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
