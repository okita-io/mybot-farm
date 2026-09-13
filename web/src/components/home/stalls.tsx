import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Container } from "@/components/container";
import { StallCard } from "@/components/stall-card";
import { canDownloadStall, listCatalogStalls } from "@/lib/catalog";

export async function HomeStalls() {
  const { userId } = await auth();
  const stalls = await listCatalogStalls();
  const preview = stalls.slice(0, 4);

  return (
    <section id="stalls" aria-labelledby="stalls-heading" className="pb-16 sm:pb-20">
      <Container>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2
              id="stalls-heading"
              className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
            >
              Open stalls
            </h2>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Seed stalls are free. Authors can also list a free or priced pack —
              the farm hosts it and keeps 10% of paid sales.
            </p>
          </div>
          <Link
            href="/catalog"
            className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
          >
            Browse catalog
          </Link>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {await Promise.all(
            preview.map(async (stall) => {
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
                Sign in, post a scrubbed agent or team, mark it free or set a
                price. Connect Stripe when you sell paid stalls — the farm keeps
                10%.
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
