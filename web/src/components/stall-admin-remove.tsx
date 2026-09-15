"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function StallAdminRemove({ slug }: { slug: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    if (pending) return;
    const confirmed = window.confirm(
      "Remove this bot from the farm? It will disappear from the catalog and downloads.",
    );
    if (!confirmed) return;

    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/stalls/${encodeURIComponent(slug)}/remove`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: "Removed from bot page" }),
      });
      if (!response.ok) {
        setError("Could not remove that bot.");
        return;
      }
      router.push("/admin");
      router.refresh();
    } catch {
      setError("Could not remove that bot.");
    } finally {
      setPending(false);
    }
  }

  return (
    <span className="inline-flex flex-col gap-1">
      <Button
        type="button"
        variant="destructive"
        size="lg"
        className="h-9 rounded-full px-4"
        disabled={pending}
        onClick={() => void remove()}
      >
        {pending ? "Removing…" : "Remove bot"}
      </Button>
      {error ? (
        <span className="text-xs text-destructive" role="alert">
          {error}
        </span>
      ) : null}
    </span>
  );
}
