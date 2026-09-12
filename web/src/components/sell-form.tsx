"use client";

import { useRouter } from "next/navigation";
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

export function SellForm() {
  const router = useRouter();
  const [kind, setKind] = useState<"agent" | "team">("agent");
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>(
    categories[0]?.label ?? "Lifestyle",
  );
  const [price, setPrice] = useState("9.00");
  const [packText, setPackText] = useState(SAMPLE_PACK);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const priceCents = useMemo(() => dollarsToCents(price), [price]);
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

    if (priceCents === null) {
      setPending(false);
      setError("Enter a price of at least $1.00.");
      return;
    }

    try {
      const response = await fetch("/api/listings", {
        method: "POST",
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
      });
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
          : "Could not publish that stall.",
      );
    } catch {
      setError("Could not publish that stall.");
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
      <label className="block text-sm font-medium text-foreground">
        Price (USD)
        <input
          required
          inputMode="decimal"
          value={price}
          onChange={(event) => setPrice(event.target.value)}
          className="mt-2 h-11 w-full rounded-full border border-border bg-background px-4 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        <span className="mt-2 block text-sm font-normal text-muted-foreground">
          {priceCents
            ? `${formatUsd(priceCents)} listing. Farm hosting fee 10% (${formatUsd(fee)}). You receive ${formatUsd(Math.max(priceCents - fee, 0))} before Stripe processing.`
            : "Minimum $1.00."}
        </span>
      </label>
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
      <Button
        type="submit"
        size="lg"
        className="h-11 rounded-full px-5"
        disabled={pending}
      >
        {pending ? "Publishing…" : "Publish stall"}
      </Button>
    </form>
  );
}
