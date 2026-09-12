import Link from "next/link";
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
import { stallCardStats } from "@/lib/pack-files";
import { stalls, stallPagePath, stallToneClasses } from "@/lib/packs";
import { cn } from "@/lib/utils";

export function HomeStalls() {
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
          Download a scrubbed pack, or copy the install prompt for a Grok Bot.
          You get the profile, skills, and routines — not the author’s computer,
          logins, or chat history.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {stalls.map((stall) => {
            const tone = stallToneClasses[stall.tone];
            const href = stallPagePath(stall);
            const stats = stallCardStats(stall.slug);

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
                  <StallActions stall={stall} />
                </CardFooter>
              </Card>
            );
          })}
          <Card className="min-w-0 justify-center gap-3 border-dashed bg-card/40 py-6 ring-1 ring-foreground/10">
            <CardHeader className="gap-3">
              <Badge variant="secondary" className="h-6 w-fit px-2.5">
                Soon
              </Badge>
              <CardTitle className="text-2xl font-semibold tracking-tight text-muted-foreground">
                More coming soon
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-base leading-relaxed text-pretty text-muted-foreground">
                New agents and teams will show up here as stalls open.
              </p>
            </CardContent>
          </Card>
        </div>
      </Container>
    </section>
  );
}
