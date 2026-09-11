import { site } from "@/lib/site";

export default function Home() {
  return (
    <main className="relative flex flex-1 flex-col justify-center px-6 py-16 sm:px-10">
      <div className="mx-auto w-full max-w-xl">
        <p className="font-mono text-[0.7rem] uppercase tracking-[0.28em] text-sap">
          {site.name}
        </p>
        <h1 className="mt-6 text-[clamp(3rem,12vw,5.5rem)] font-medium leading-[0.95] tracking-[-0.04em] text-straw">
          Coming soon
        </h1>
        <p className="mt-8 max-w-md text-xl leading-relaxed text-straw/90 sm:text-2xl">
          {site.tagline}
        </p>
        <p className="mt-4 max-w-md text-base leading-relaxed text-chaff">
          Clear, simple, sharable, searchable, and agent-friendly.
        </p>
      </div>
    </main>
  );
}
