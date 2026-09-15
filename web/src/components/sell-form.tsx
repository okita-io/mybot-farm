"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { dollarsToCents, formatUsd } from "@/lib/money";
import { categories } from "@/lib/site";

const SAMPLE_PACK = `{
  "format": "mybot.farm/agent-pack",
  "version": "0.1",
  "runtime": ["grok-bot"],
  "profile": {
    "name": "",
    "title": "",
    "description": ""
  },
  "skills": [],
  "memory": []
}`;

const PRICE_SUGGESTIONS = ["2.00", "5.00", "8.00", "10.00"] as const;

export type EditableListing = {
  id: string;
  slug: string;
  kind: "agent" | "team";
  name: string;
  title: string;
  description: string;
  category: string;
  priceCents: number;
  pack: unknown;
};

function packToText(pack: unknown) {
  try {
    return JSON.stringify(pack, null, 2);
  } catch {
    return SAMPLE_PACK;
  }
}

function dollarsFromCents(cents: number) {
  return (cents / 100).toFixed(2);
}

export function SellForm({
  canSellPaid = false,
  listing,
}: {
  canSellPaid?: boolean;
  listing?: EditableListing;
}) {
  const router = useRouter();
  const [kind, setKind] = useState<"agent" | "team">(listing?.kind ?? "agent");
  const [name, setName] = useState(listing?.name ?? "");
  const [title, setTitle] = useState(listing?.title ?? "");
  const [description, setDescription] = useState(listing?.description ?? "");
  const [category, setCategory] = useState<string>(
    listing?.category ?? categories[0]?.label ?? "Lifestyle",
  );
  const [isFree, setIsFree] = useState(!listing || listing.priceCents <= 0);
  const [price, setPrice] = useState(
    listing && listing.priceCents > 0 ? dollarsFromCents(listing.priceCents) : "5.00",
  );
  const [packText, setPackText] = useState(
    listing ? packToText(listing.pack) : SAMPLE_PACK,
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const priceCents = useMemo(() => {
    if (isFree) return 0;
    return dollarsToCents(price);
  }, [isFree, price]);
  const fee =
    priceCents && priceCents > 1 ? Math.round(priceCents * 0.1) : 0;

  async function publish() {
    setPending(true);
    setError(null);

    let pack: unknown;
    try {
      pack = JSON.parse(packText);
    } catch {
      setPending(false);
      setError("Pack JSON is not valid JSON.");
      return;
    }

    if (priceCents === null || (!isFree && (priceCents < 200 || priceCents > 999_900))) {
      setPending(false);
      setError("Choose Free, or enter a price between $2.00 and $9,999.00.");
      return;
    }

    if (!isFree && !canSellPaid) {
      setPending(false);
      setError("Connect Stripe payouts before listing a paid bot.");
      return;
    }

    try {
      const response = await fetch(
        listing ? `/api/listings/${listing.id}` : "/api/listings",
        {
          method: listing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind,
            name,
            title,
            description,
            category,
            priceCents,
            pack,
          }),
        },
      );
      const data: unknown = await response.json().catch(() => null);
      const record = data && typeof data === "object" ? (data as Record<string, unknown>) : {};

      if (response.ok && typeof record.pagePath === "string") {
        router.push(record.pagePath);
        router.refresh();
        return;
      }

      setError(
        typeof record.message === "string"
          ? record.message
          : listing
            ? "Could not update that bot."
            : "Could not publish that bot.",
      );
    } catch {
      setError(listing ? "Could not update that bot." : "Could not publish that bot.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        void publish();
      }}
    >
      {listing ? (
        <p className="text-sm text-muted-foreground">
          Updating <span className="font-medium text-foreground">{listing.name}</span>.
          The bot URL stays <code className="font-mono text-[0.9em]">{listing.slug}</code>.
        </p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-foreground">
          Kind
          <select
            className="mt-2 h-11 w-full rounded-full border border-border bg-background px-4 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            value={kind}
            onChange={(event) => setKind(event.target.value as "agent" | "team")}
          >
            <option value="agent">Agent</option>
            <option value="team">Team</option>
          </select>
        </label>
        <label className="block text-sm font-medium text-foreground">
          Category
          <select
            className="mt-2 h-11 w-full rounded-full border border-border bg-background px-4 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            {categories.map((item) => (
              <option key={item.slug} value={item.label}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="block text-sm font-medium text-foreground">
        Name
        <input
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="mt-2 h-11 w-full rounded-full border border-border bg-background px-4 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </label>
      <label className="block text-sm font-medium text-foreground">
        Title
        <input
          required
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="mt-2 h-11 w-full rounded-full border border-border bg-background px-4 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </label>
      <label className="block text-sm font-medium text-foreground">
        Description
        <textarea
          required
          rows={4}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className="mt-2 w-full rounded-3xl border border-border bg-background px-4 py-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </label>
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-foreground">Price</legend>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={isFree ? "default" : "outline"}
            className="rounded-full"
            onClick={() => setIsFree(true)}
          >
            Free
          </Button>
          <Button
            type="button"
            size="sm"
            variant={!isFree ? "default" : "outline"}
            className="rounded-full"
            onClick={() => setIsFree(false)}
          >
            Paid
          </Button>
        </div>
        {!isFree ? (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {PRICE_SUGGESTIONS.map((suggestion) => (
                <Button
                  key={suggestion}
                  type="button"
                  size="sm"
                  variant={price === suggestion ? "secondary" : "outline"}
                  className="rounded-full"
                  onClick={() => setPrice(suggestion)}
                >
                  ${suggestion.replace(/\.00$/, "")}
                </Button>
              ))}
            </div>
            <label className="block text-sm font-medium text-foreground">
              Amount (USD)
              <input
                required={!isFree}
                inputMode="decimal"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                className="mt-2 h-11 w-full rounded-full border border-border bg-background px-4 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </label>
            <p className="text-sm font-normal text-muted-foreground">
              {priceCents && priceCents >= 200
                ? `${formatUsd(priceCents)} listing. Farm hosting fee 10% (${formatUsd(fee)}). You receive ${formatUsd(Math.max(priceCents - fee, 0))} before Stripe processing.`
                : "Suggested $2–$10. Paid listings need Stripe Connect."}
            </p>
            {!canSellPaid ? (
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Connect Stripe payouts above before you can publish a paid bot.
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-sm font-normal text-muted-foreground">
            Free bots are downloadable by anyone. No Stripe Connect required.
          </p>
        )}
      </fieldset>
      <label className="block text-sm font-medium text-foreground">
        Scrubbed GAF JSON
        <textarea
          required
          rows={16}
          spellCheck={false}
          value={packText}
          onChange={(event) => setPackText(event.target.value)}
          className="mt-2 w-full rounded-3xl border border-border bg-background px-4 py-3 font-mono text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </label>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <p className="text-sm font-normal text-muted-foreground">
        You keep ownership of the pack. The farm keeps 10% of paid sales. You
        are responsible for how the agent or team behaves after someone
        installs it. Publishing agrees to the{" "}
        <Link
          href="/terms"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Terms of use
        </Link>
        .
      </p>
      <Button
        type="submit"
        size="lg"
        className="h-11 rounded-full px-5"
        disabled={pending || (!isFree && !canSellPaid)}
      >
        {pending
          ? listing
            ? "Saving…"
            : "Publishing…"
          : listing
            ? "Save updates"
            : "Publish bot"}
      </Button>
    </form>
  );
}
