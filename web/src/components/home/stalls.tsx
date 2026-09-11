import { Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Container } from "@/components/container";
import { stalls, type StallTone } from "@/lib/packs";
import { cn } from "@/lib/utils";

const tones: Record<StallTone, { card: string; label: string }> = {
  find: { card: "bg-find-muted/60 ring-find/20", label: "text-find-foreground" },
  share: { card: "bg-share-muted/60 ring-share/20", label: "text-share-foreground" },
  agent: { card: "bg-agent-muted/60 ring-agent/20", label: "text-agent-foreground" },
};

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
          Download a scrubbed pack, then add a copy in Grok Bot. You get the
          profile, skills, and routines — not the author’s computer, logins, or
          chat history.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {stalls.map((stall) => {
            const tone = tones[stall.tone];
            const filename = stall.downloadHref.split("/").at(-1) ?? `${stall.slug}.json`;

            return (
              <Card
                key={stall.slug}
                className={cn("min-w-0 gap-4 py-6 ring-1", tone.card)}
              >
                <CardHeader className="gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className={cn("h-6 px-2.5", tone.label)}>
                      {stall.category}
                    </Badge>
                    <Badge variant="outline" className="h-6 px-2.5">
                      {stall.kind === "team" ? "Team" : "Agent"}
                    </Badge>
                  </div>
                  <CardTitle className="text-2xl font-semibold tracking-tight">
                    {stall.name}
                  </CardTitle>
                  <CardDescription className="text-sm text-foreground/70">
                    {stall.title}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-base leading-relaxed text-pretty text-foreground/80">
                    {stall.description}
                  </p>
                </CardContent>
                <CardFooter className="flex flex-wrap gap-2 border-t-0 bg-transparent">
                  <Button asChild size="lg" className="h-9 rounded-full px-4">
                    <a href={stall.downloadHref} download={filename}>
                      <Download data-icon="inline-start" />
                      Download pack
                    </a>
                  </Button>
                  {stall.members?.map((member) => (
                    <Button
                      key={member.href}
                      asChild
                      variant="outline"
                      size="lg"
                      className="h-9 rounded-full px-4"
                    >
                      <a
                        href={member.href}
                        download={member.href.split("/").at(-1)}
                      >
                        {member.name}
                      </a>
                    </Button>
                  ))}
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
