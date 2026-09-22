import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { AuthorBioEditor } from "@/components/author-bio-editor";
import { Container } from "@/components/container";
import { StallCard } from "@/components/stall-card";
import { canDownloadStall, listAuthorStalls } from "@/lib/catalog";
import { site, siteOgImage } from "@/lib/site";
import { authorHref, getUserByUsername } from "@/lib/users";

export const dynamic = "force-dynamic";

type AuthorPageProps = {
  params: Promise<{ username: string }>;
};

export async function generateMetadata({
  params,
}: AuthorPageProps): Promise<Metadata> {
  const { username: raw } = await params;
  const username = decodeURIComponent(raw);
  const author = await getUserByUsername(username);

  if (!author?.username) {
    return {
      title: "Author",
      description: "Author profile on mybot.farm.",
    };
  }

  const description =
    author.bio?.trim() ||
    `Bots by ${author.username} on mybot.farm — free contributions and packs for sale.`;

  return {
    title: author.username,
    description,
    alternates: { canonical: authorHref(author.username) },
    openGraph: {
      title: `${author.username} | ${site.name}`,
      description,
      url: authorHref(author.username),
      images: [siteOgImage],
    },
  };
}

function formatJoined(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(date);
}

export default async function AuthorPage({ params }: AuthorPageProps) {
  const { username: raw } = await params;
  const username = decodeURIComponent(raw);
  const author = await getUserByUsername(username);

  if (!author?.username) {
    notFound();
  }

  const { userId } = await auth();
  const isOwner = Boolean(userId && userId === author.clerkUserId);
  const stalls = await listAuthorStalls(author.id);
  const contributions = stalls.filter((stall) => (stall.priceCents ?? 0) <= 0);
  const forSale = stalls.filter((stall) => (stall.priceCents ?? 0) > 0);

  return (
    <section className="py-16 sm:py-20">
      <Container>
        <div className="clay-surface flex flex-col gap-6 rounded-3xl bg-card/80 px-6 py-8 sm:flex-row sm:items-start sm:px-8">
          {author.imageUrl ? (
            <Image
              src={author.imageUrl}
              alt=""
              width={96}
              height={96}
              className="clay-chip size-24 rounded-full"
            />
          ) : (
            <div
              aria-hidden="true"
              className="clay-chip flex size-24 items-center justify-center rounded-full border border-foreground/10 bg-background/80 text-2xl font-semibold text-foreground"
            >
              {author.username.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[0.7rem] font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Author
            </p>
            <h1 className="clay-title mt-3 text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
              {author.username}
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Joined {formatJoined(author.createdAt)}
            </p>
            {author.bio ? (
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-pretty text-foreground/80">
                {author.bio}
              </p>
            ) : isOwner ? (
              <p className="mt-5 text-sm text-muted-foreground">
                Add a short description so visitors know what you grow.
              </p>
            ) : null}
            {isOwner ? <AuthorBioEditor initialBio={author.bio ?? ""} /> : null}
          </div>
        </div>

        {!stalls.length ? (
          <p className="clay-surface mt-12 rounded-3xl bg-card/50 px-6 py-10 text-base text-muted-foreground">
            No bots yet.
          </p>
        ) : (
          <div className="mt-12 space-y-12">
            {contributions.length ? (
              <section aria-labelledby="contributions-heading">
                <h2
                  id="contributions-heading"
                  className="text-2xl font-semibold tracking-tight text-foreground"
                >
                  Contributions
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Free bots this author shared with the farm.
                </p>
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {await Promise.all(
                    contributions.map(async (stall) => {
                      const canDownload = await canDownloadStall(stall, userId);
                      return (
                        <StallCard
                          key={stall.slug}
                          stall={stall}
                          canDownload={canDownload}
                          signedIn={Boolean(userId)}
                        />
                      );
                    }),
                  )}
                </div>
              </section>
            ) : null}

            {forSale.length ? (
              <section aria-labelledby="for-sale-heading">
                <h2
                  id="for-sale-heading"
                  className="text-2xl font-semibold tracking-tight text-foreground"
                >
                  For sale
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Priced packs listed on the farm.
                </p>
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {await Promise.all(
                    forSale.map(async (stall) => {
                      const canDownload = await canDownloadStall(stall, userId);
                      return (
                        <StallCard
                          key={stall.slug}
                          stall={stall}
                          canDownload={canDownload}
                          signedIn={Boolean(userId)}
                        />
                      );
                    }),
                  )}
                </div>
              </section>
            ) : null}
          </div>
        )}
      </Container>
    </section>
  );
}
