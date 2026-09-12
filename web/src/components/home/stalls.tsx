import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Container } from "@/components/container";
import { StallActions } from "@/components/stall-actions";
import { StallHeaderMeta, StallPackStats } from "@/components/stall-meta";
import { catalogStallCardStats, canDownloadStall, listCatalogStalls } from "@/lib/catalog";
import { formatUsd } from "@/lib/money";
import { stallPagePath, stallToneClasses } from "@/lib/packs";
import { cn } from "@/lib/utils";

export async function HomeStalls() {
  const { userId } = await auth();
  const stalls = await listCatalogStalls();

  return (
    <section id="stalls" aria-labelledby="stalls-heading" className="pb-16 sm:pb-20">
      <Container>
        <h2
          id="stalls-heading"
          className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
        >
          Open stalls
        </h2>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          Seed stalls are free. Authors can also list a priced pack — the farm
          hosts it and keeps 10%. You get the profile, skills, and routines, not
          the author’s computer, logins, or chat history.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {await Promise.all(
            stalls.map(async (stall) => {
              const tone = stallToneClasses[stall.tone];
              const href = stallPagePath(stall);
              const stats = await catalogStallCardStats(stall.slug);
              const canDownload = await canDownloadStall(stall, userId);
              const paid = (stall.priceCents ?? 0) > 0;

              return (
                <Card
                  key={stall.slug}
                  className={cn("min-w-0 gap-4 py-6 ring-1", tone.card)}
                >
                  <CardHeader className="gap-3">
                    <StallHeaderMeta
                      kind={stall.kind}
                      category={stall.category}
                      categoryClassName={tone.label}
                      runtimes={stats?.runtimes ?? []}
                    />
                    <CardTitle className="text-2xl font-semibold tracking-tight">
                      <Link href={href} className="underline-offset-4 hover:underline">
                        {stall.name}
                      </Link>
                    </CardTitle>
                    <CardDescription className="text-sm text-foreground/70">
                      {stall.title}
                      {paid ? ` · ${formatUsd(stall.priceCents ?? 0)}` : ""}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-base leading-relaxed text-pretty text-foreground/80">
                      {stall.description}
                    </p>
                    {stats ? (
                      <StallPackStats
                        skillCount={stats.skillCount}
                        memoryLineCount={stats.memoryLineCount}
                        soulLine={stats.soulLine}
                      />
                    ) : null}
                  </CardContent>
                  <CardFooter className="flex flex-wrap gap-2 border-t-0 bg-transparent">
                    <StallActions
                      stall={stall}
                      canDownload={canDownload}
                      signedIn={Boolean(userId)}
                    />
                  </CardFooter>
                </Card>
              );
            }),
          )}
          <Card className="min-w-0 justify-center gap-3 border-dashed bg-card/40 py-6 ring-1 ring-foreground/10">
            <CardHeader className="gap-3">
              <Badge variant="secondary" className="h-6 w-fit px-2.5">
                Sell
              </Badge>
              <CardTitle className="text-2xl font-semibold tracking-tight">
                List yours
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-base leading-relaxed text-pretty text-muted-foreground">
                Connect Stripe, post a scrubbed agent or team, set a price. The
                farm keeps 10% for hosting.
              </p>
              <Link
                href="/sell"
                className="mt-4 inline-block text-sm font-medium text-foreground underline-offset-4 hover:underline"
              >
                Open the sell stall
              </Link>
            </CardContent>
          </Card>
        </div>
      </Container>
    </section>
  );
}
