import Link from "next/link";
import { Container } from "@/components/container";

const steps = [
  {
    title: "Copy the install prompt or download a pack",
    body: "Each stall has a Copy install prompt button and a public GAF JSON file: identity, description, skills, and routines. Secrets stay out. Agents can also call /api/packs/{slug} or /api/install-prompt/{slug}.",
  },
  {
    title: "Create a Bot",
    body: "In Grok Bot, choose New or press Cmd/Ctrl+N, then Create new agent.",
  },
  {
    title: "Edit Profile",
    body: "Open Bot actions → Edit Profile. Set the name, title, description, and avatar from the pack, then start a concrete task.",
  },
] as const;

export function HomeInstall() {
  return (
    <section aria-labelledby="install-heading" className="pb-16 sm:pb-20">
      <Container className="max-w-3xl">
        <h2
          id="install-heading"
          className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
        >
          Add to Grok Bot
        </h2>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground sm:text-lg">
          Official sharing creates a copy on your account. It does not give you
          the author’s computer, logins, or conversation history. You need the{" "}
          <a
            href="https://docs.x.ai/grok-bot/bots"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Grok Bot app
          </a>{" "}
          to finish adding it.
        </p>
        <ol className="mt-8 space-y-6">
          {steps.map((step, index) => (
            <li key={step.title} className="flex gap-4">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
                {index + 1}
              </span>
              <div>
                <h3 className="text-lg font-medium tracking-tight">{step.title}</h3>
                <p className="mt-1 text-base leading-relaxed text-muted-foreground">
                  {step.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-8 text-sm leading-relaxed text-muted-foreground">
          Shared Bots are created by other users, not by SpaceXAI. Adding one
          accepts the third-party bot terms. Full install and share steps:{" "}
          <Link
            href="/how-to"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            How-To
          </Link>
          . Hermes uses a scrubbed profile archive, not this GAF prompt — see{" "}
          <Link
            href="/how-to#hermes-import"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            import a Hermes profile
          </Link>
          . Already have a stall or pack URL?{" "}
          <Link
            href="/plant"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Plant
          </Link>{" "}
          it to preview the pack.
        </p>
      </Container>
    </section>
  );
}
