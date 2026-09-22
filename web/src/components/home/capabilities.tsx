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
    card: "bg-find-muted",
    icon: "clay-chip bg-find text-white",
    label: "text-find-foreground",
  },
  share: {
    card: "bg-share-muted",
    icon: "clay-chip bg-share text-white",
    label: "text-share-foreground",
  },
  agent: {
    card: "bg-agent-muted",
    icon: "clay-chip bg-agent text-white",
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
                className={cn("min-w-0 gap-5 py-6", tone.card)}
              >
                <CardHeader className="gap-4">
                  <span
                    className={cn(
                      "clay-chip inline-flex size-10 items-center justify-center rounded-full",
                      tone.icon,
                    )}
                  >
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <CardTitle
                    className={cn(
                      "clay-title text-2xl font-extrabold tracking-tight",
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
