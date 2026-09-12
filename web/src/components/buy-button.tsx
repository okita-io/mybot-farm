"use client";

import { SignInButton } from "@clerk/nextjs";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { formatUsd } from "@/lib/money";
import { stallPagePath, type Stall } from "@/lib/packs";

export function SignedOutBuyButton({ stall }: { stall: Stall }) {
  const price = stall.priceCents ?? 0;

  return (
    <SignInButton
      mode="modal"
      forceRedirectUrl={stallPagePath(stall)}
      fallbackRedirectUrl={stallPagePath(stall)}
    >
      <Button type="button" size="lg" className="h-9 rounded-full px-4">
        Sign in to buy {formatUsd(price)}
      </Button>
    </SignInButton>
  );
}

export function BuyButton({ stall }: { stall: Stall }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const price = stall.priceCents ?? 0;

  async function buy() {
    setPending(true);
    setMessage(null);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: stall.slug }),
      });
      const data: unknown = await response.json().catch(() => null);
      const record = data && typeof data === "object" ? (data as Record<string, unknown>) : {};

      if (typeof record.url === "string") {
        window.location.href = record.url;
        return;
      }

      if (record.error === "already_owned" || record.error === "own_listing") {
        window.location.reload();
        return;
      }

      if (record.error === "unauthorized") {
        setMessage("Sign in to buy this stall.");
        return;
      }

      setMessage("Checkout could not start. Try again in a moment.");
    } catch {
      setMessage("Checkout could not start.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        size="lg"
        className="h-9 rounded-full px-4"
        disabled={pending}
        onClick={() => {
          void buy();
        }}
      >
        {pending ? "Starting checkout…" : `Buy ${formatUsd(price)}`}
      </Button>
      {message ? (
        <p className="text-sm text-destructive" role="alert">
          {message}
        </p>
      ) : null}
    </div>
  );
}
