import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/container";
import { site } from "@/lib/site";

export function HomeHero() {
  return (
    <section className="py-16 sm:py-24">
      <Container>
        <div className="grid items-center gap-8 md:grid-cols-[minmax(0,17rem)_minmax(0,1fr)] md:gap-12 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:gap-16">
          <div className="mx-auto w-[min(100%,14rem)] md:mx-0 md:w-full">
            <Image
              src="/hero.png"
              alt="Glossy green, blue, and pink agent mascots for My Bot Farm"
              width={600}
              height={600}
              priority
              className="h-auto w-full"
            />
          </div>
          <div>
            <h1 className="text-[clamp(2rem,5.5vw,3.75rem)] font-semibold leading-[1.05] tracking-[-0.045em] text-balance text-foreground">
              {site.tagline}{" "}
              <span className="mt-3 block text-[clamp(1.2rem,2.6vw,1.85rem)] font-medium tracking-[-0.03em] text-foreground/75">
                {site.contrast}
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-pretty text-muted-foreground sm:text-xl">
              {site.byline}
            </p>
            <p className="mt-6 flex flex-wrap gap-x-4 gap-y-2 text-sm">
              <Link
                href="/catalog"
                className="font-semibold text-foreground underline-offset-4 hover:underline"
              >
                Catalog
              </Link>
              <Link
                href="/about"
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                About
              </Link>
              <Link
                href="/how-to"
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                How-To
              </Link>
              <Link
                href="/sell"
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                Sell
              </Link>
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}
