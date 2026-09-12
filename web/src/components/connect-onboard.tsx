"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ConnectOnboardButton({
  label = "Connect Stripe to get paid",
  country = "us",
}: {
  label?: string;
  country?: string;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/connect/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ country }),
      });
      const data: unknown = await response.json().catch(() => null);
      const record = data && typeof data === "object" ? (data as Record<string, unknown>) : {};

      if (typeof record.url === "string") {
        window.location.href = record.url;
        return;
      }

      setError(
        typeof record.message === "string"
          ? record.message
          : "Could not start Stripe onboarding.",
      );
    } catch {
      setError("Could not start Stripe onboarding.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        size="lg"
        className="h-11 rounded-full px-5"
        disabled={pending}
        onClick={() => {
          void start();
        }}
      >
        {pending ? "Opening Stripe…" : label}
      </Button>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function ConnectDashboardButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openDashboard() {
    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/connect/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dashboard: true }),
      });
      const data: unknown = await response.json().catch(() => null);
      const record = data && typeof data === "object" ? (data as Record<string, unknown>) : {};

      if (typeof record.url === "string") {
        window.location.href = record.url;
        return;
      }

      setError("Payouts dashboard is not ready yet.");
    } catch {
      setError("Could not open the payouts dashboard.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="h-11 rounded-full px-5"
        disabled={pending}
        onClick={() => {
          void openDashboard();
        }}
      >
        {pending ? "Opening…" : "Payouts dashboard"}
      </Button>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
