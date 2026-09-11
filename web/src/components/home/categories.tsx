import { Badge } from "@/components/ui/badge";
import { Container } from "@/components/container";
import { categories, type CategoryTone } from "@/lib/site";
import { cn } from "@/lib/utils";

const tones: Record<CategoryTone, string> = {
  find: "border-transparent bg-find-muted text-find-foreground",
  share: "border-transparent bg-share-muted text-share-foreground",
  agent: "border-transparent bg-agent-muted text-agent-foreground",
};

export function HomeCategories() {
  return (
    <section aria-labelledby="categories-heading" className="pb-16 sm:pb-20">
      <Container>
        <h2
          id="categories-heading"
          className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
        >
          Shop by life job
        </h2>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          Categories name the outcome, not the file format. Every public stall
          picks one primary.
        </p>
        <ul className="mt-8 flex flex-wrap gap-2">
          {categories.map((category) => (
            <li key={category.slug}>
              <Badge
                variant="secondary"
                className={cn("h-7 px-3 text-sm", tones[category.tone])}
              >
                {category.label}
              </Badge>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
