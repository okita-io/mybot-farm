"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const MAX_BIO_LENGTH = 280;

export function AuthorBioEditor({ initialBio }: { initialBio: string }) {
  const router = useRouter();
  const [bio, setBio] = useState(initialBio);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setPending(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/users/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bio }),
      });
      const data: unknown = await response.json().catch(() => null);
      const record = data && typeof data === "object" ? (data as Record<string, unknown>) : {};

      if (!response.ok) {
        setError(
          typeof record.message === "string"
            ? record.message
            : "Could not save your bio.",
        );
        return;
      }

      setMessage("Bio saved.");
      router.refresh();
    } catch {
      setError("Could not save your bio.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      className="mt-6 space-y-3 rounded-3xl bg-card/50 p-5 ring-1 ring-foreground/10"
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <label className="block text-sm font-medium text-foreground">
        Short description
        <textarea
          rows={3}
          maxLength={MAX_BIO_LENGTH}
          value={bio}
          onChange={(event) => setBio(event.target.value)}
          placeholder="Optional note about what you grow on the farm…"
          className="mt-2 w-full rounded-3xl border border-border bg-background px-4 py-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </label>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {bio.length}/{MAX_BIO_LENGTH}
        </p>
        <Button
          type="submit"
          size="sm"
          className="rounded-full"
          disabled={pending}
        >
          {pending ? "Saving…" : "Save bio"}
        </Button>
      </div>
      {message ? (
        <p className="text-sm text-foreground/80" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
