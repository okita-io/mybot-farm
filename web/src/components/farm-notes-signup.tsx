"use client";

import Link from "next/link";
import { useId, useState, type FormEvent } from "react";
import { Container } from "@/components/container";
import { Button } from "@/components/ui/button";
import { farmNotes, type SignupSource } from "@/lib/site";

type Variant = "footer" | "block";
type Status = "idle" | "pending" | "success" | "error";

export function FarmNotesSignup({
  variant,
  source,
}: {
  variant: Variant;
  source: SignupSource;
}) {
  const emailId = useId();
  const honeypotId = useId();
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "pending") {
      return;
    }
    setStatus("pending");
    try {
      const response = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source, website }),
      });
      const payload: unknown = await response.json().catch(() => null);
      const ok =
        response.ok &&
        Boolean(payload && typeof payload === "object" && "ok" in payload && payload.ok);
      setStatus(ok ? "success" : "error");
    } catch {
      setStatus("error");
    }
  }

  if (variant === "block") {
    return (
      <section aria-labelledby="farm-notes-heading" className="pb-16 sm:pb-20">
        <Container className="max-w-3xl">
          <h2
            id="farm-notes-heading"
            className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
          >
            {farmNotes.headline}
          </h2>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {farmNotes.sub}
          </p>
          {status === "success" ? (
            <p className="mt-8 text-base text-foreground" aria-live="polite">
              {farmNotes.success}
            </p>
          ) : (
            <form className="mt-8 relative space-y-3" onSubmit={onSubmit}>
              <Honeypot id={honeypotId} value={website} onChange={setWebsite} />
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <label className="block min-w-0 flex-1 text-sm font-medium text-foreground">
                  Email
                  <input
                    id={emailId}
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    className="mt-2 h-11 w-full rounded-full border border-border bg-background px-4 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  />
                </label>
                <Button
                  type="submit"
                  size="lg"
                  disabled={status === "pending"}
                  className="sm:mt-7 sm:w-auto"
                >
                  {status === "pending" ? "Subscribing…" : farmNotes.blockButton}
                </Button>
              </div>
              <StatusMessage status={status} />
              <p className="text-sm text-muted-foreground">
                {farmNotes.finePrint}{" "}
                <Link
                  href="/privacy"
                  className="font-medium text-foreground underline-offset-4 hover:underline"
                >
                  Privacy
                </Link>
              </p>
            </form>
          )}
        </Container>
      </section>
    );
  }

  return (
    <div className="max-w-xl">
      {status === "success" ? (
        <p className="text-sm text-foreground" aria-live="polite">
          {farmNotes.success}
        </p>
      ) : (
        <form className="relative space-y-2" onSubmit={onSubmit}>
          <p className="text-sm text-muted-foreground">{farmNotes.footerLabel}</p>
          <Honeypot id={honeypotId} value={website} onChange={setWebsite} />
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label htmlFor={emailId} className="sr-only">
              Email
            </label>
            <input
              id={emailId}
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="h-9 w-full min-w-0 rounded-full border border-border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:flex-1"
            />
            <Button type="submit" size="sm" disabled={status === "pending"}>
              {status === "pending" ? "…" : farmNotes.footerButton}
            </Button>
          </div>
          <StatusMessage status={status} />
        </form>
      )}
    </div>
  );
}

function Honeypot({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="absolute -left-[10000px] h-0 w-0 overflow-hidden" aria-hidden="true">
      <label htmlFor={id}>Website</label>
      <input
        id={id}
        name="website"
        tabIndex={-1}
        autoComplete="off"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function StatusMessage({ status }: { status: Status }) {
  if (status !== "error") {
    return <p className="sr-only" aria-live="polite" />;
  }
  return (
    <p className="text-sm text-destructive" aria-live="polite">
      Couldn’t subscribe — try again.
    </p>
  );
}
