"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { ApiKeyPublic } from "@/lib/api-keys";

function formatStamp(value: string | null) {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Never";
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function ApiKeysManager({
  initialKeys,
}: {
  initialKeys: ApiKeyPublic[];
}) {
  const router = useRouter();
  const [keys, setKeys] = useState(initialKeys);
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createKey() {
    setPending(true);
    setError(null);
    setCopied(false);

    try {
      const response = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(name.trim() ? { name: name.trim() } : {}),
      });
      const data: unknown = await response.json().catch(() => null);
      const record =
        data && typeof data === "object" ? (data as Record<string, unknown>) : {};

      if (!response.ok) {
        setError(
          typeof record.message === "string"
            ? record.message
            : "Could not create that key.",
        );
        return;
      }

      const created = record as Partial<ApiKeyPublic> & { key?: unknown };
      const id = created.id;
      const createdName = created.name;
      const prefix = created.prefix;
      const createdAt = created.createdAt;
      const key = created.key;
      if (
        typeof id !== "string" ||
        typeof createdName !== "string" ||
        typeof prefix !== "string" ||
        typeof createdAt !== "string" ||
        typeof key !== "string"
      ) {
        setError("Could not create that key.");
        return;
      }

      setKeys((current) => [
        {
          id,
          name: createdName,
          prefix,
          createdAt,
          lastUsedAt:
            typeof created.lastUsedAt === "string" ? created.lastUsedAt : null,
        },
        ...current,
      ]);
      setRevealedKey(key);
      setName("");
      router.refresh();
    } catch {
      setError("Could not create that key.");
    } finally {
      setPending(false);
    }
  }

  async function revokeKey(id: string) {
    if (!window.confirm("Revoke this API key? Agents using it will stop working.")) {
      return;
    }

    setPending(true);
    setError(null);

    try {
      const response = await fetch(`/api/api-keys/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data: unknown = await response.json().catch(() => null);
      const record =
        data && typeof data === "object" ? (data as Record<string, unknown>) : {};

      if (!response.ok) {
        setError(
          typeof record.message === "string"
            ? record.message
            : "Could not revoke that key.",
        );
        return;
      }

      setKeys((current) => current.filter((key) => key.id !== id));
      router.refresh();
    } catch {
      setError("Could not revoke that key.");
    } finally {
      setPending(false);
    }
  }

  async function copyRevealed() {
    if (!revealedKey) return;
    try {
      await navigator.clipboard.writeText(revealedKey);
      setCopied(true);
    } catch {
      setCopied(false);
      setError("Could not copy the key. Select it and copy manually.");
    }
  }

  return (
    <div className="space-y-5">
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          void createKey();
        }}
      >
        <label className="block text-sm font-medium text-foreground">
          Label
          <input
            value={name}
            maxLength={64}
            placeholder="Agent poster"
            onChange={(event) => setName(event.target.value)}
            className="mt-2 h-11 w-full rounded-full border border-border bg-background px-4 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </label>
        <Button
          type="submit"
          size="sm"
          className="rounded-full"
          disabled={pending}
        >
          {pending ? "Working…" : "Create key"}
        </Button>
      </form>

      {revealedKey ? (
        <div
          className="space-y-3 rounded-3xl bg-card/50 p-5 ring-1 ring-foreground/10"
          role="status"
        >
          <p className="text-sm font-medium text-foreground">
            Copy this key now. The farm will not show it again.
          </p>
          <code className="block overflow-x-auto rounded-2xl bg-background px-4 py-3 font-mono text-sm text-foreground ring-1 ring-foreground/10">
            {revealedKey}
          </code>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              className="rounded-full"
              onClick={() => void copyRevealed()}
            >
              {copied ? "Copied" : "Copy key"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="rounded-full"
              onClick={() => {
                setRevealedKey(null);
                setCopied(false);
              }}
            >
              Hide
            </Button>
          </div>
        </div>
      ) : null}

      {keys.length ? (
        <ul className="space-y-3">
          {keys.map((key) => (
            <li
              key={key.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-card/50 px-5 py-4 ring-1 ring-foreground/10"
            >
              <div>
                <p className="text-sm font-medium text-foreground">{key.name}</p>
                <p className="mt-1 font-mono text-xs text-muted-foreground">
                  {key.prefix}…
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Created {formatStamp(key.createdAt)} · Last used{" "}
                  {formatStamp(key.lastUsedAt)}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                className="rounded-full"
                disabled={pending}
                onClick={() => void revokeKey(key.id)}
              >
                Revoke
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          No active keys yet. Create one to post listings from an agent.
        </p>
      )}

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
