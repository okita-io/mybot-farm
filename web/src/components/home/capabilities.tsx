import { UsersRound, Search, Share2, type LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Container } from "@/components/container";
import { capabilities, type CapabilityTone } from "@/lib/site";
import { cn } from "@/lib/utils";

const icons: Record<CapabilityTone, LucideIcon> = {
  find: Search,
  share: Share2,
  agent: UsersRound,
};

const tones: Record<CapabilityTone, { card: string; icon: string; label: string }> = {
  find: {
    card: "bg-find-muted ring-find/20",
    icon: "bg-find text-primary-foreground",
    label: "text-find-foreground",
  },
  share: {
    card: "bg-share-muted ring-share/20",
    icon: "bg-share text-primary-foreground",
    label: "text-share-foreground",
  },
  agent: {
    card: "bg-agent-muted ring-agent/20",
    icon: "bg-agent text-primary-foreground",
    label: "text-agent-foreground",
  },
};

export function HomeCapabilities() {
  return (
    <section aria-labelledby="capabilities-heading" className="pb-16 sm:pb-20">
      <Container>
        <h2
          id="capabilities-heading"
          className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
        >
          What you can do
        </h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {capabilities.map((capability) => {
            const Icon = icons[capability.tone];
            const tone = tones[capability.tone];

            return (
              <Card
                key={capability.id}
                className={cn("min-w-0 gap-5 py-6 ring-1", tone.card)}
              >
                <CardHeader className="gap-4">
                  <span
                    className={cn(
                      "inline-flex size-10 items-center justify-center rounded-xl",
                      tone.icon,
                    )}
                  >
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <CardTitle
                    className={cn(
                      "text-2xl font-semibold tracking-tight",
                      tone.label,
                    )}
                  >
                    {capability.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-base leading-relaxed text-pretty text-foreground/80">
                    {capability.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
