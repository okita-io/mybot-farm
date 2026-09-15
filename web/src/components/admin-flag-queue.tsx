"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { flagReasonLabel } from "@/lib/flag-reasons";
import { stallPagePath } from "@/lib/packs";

type AdminFlagGroup = {
  slug: string;
  name: string;
  kind: "agent" | "team";
  listingId: string | null;
  removable: boolean;
  takenDown: boolean;
  flags: Array<{
    id: string;
    slug: string;
    reason: string;
    details: string | null;
    status: string;
    createdAt: string;
    reporter: { id: string; username: string | null; email: string | null };
  }>;
};

function formatWhen(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function AdminFlagQueue({ groups }: { groups: AdminFlagGroup[] }) {
  const router = useRouter();
  const [pendingSlug, setPendingSlug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(slug: string, action: "remove" | "dismiss") {
    if (pendingSlug) return;
    if (action === "remove") {
      const confirmed = window.confirm(
        `Remove ${slug} from the catalog? Downloads and the public bot page will stop.`,
      );
      if (!confirmed) return;
    }

    setPendingSlug(slug);
    setError(null);
    const path =
      action === "remove"
        ? `/api/admin/stalls/${encodeURIComponent(slug)}/remove`
        : `/api/admin/stalls/${encodeURIComponent(slug)}/dismiss-flags`;

    try {
      const response = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: action === "remove" ? JSON.stringify({ note: "Removed from admin queue" }) : undefined,
      });
      if (!response.ok) {
        setError(
          action === "remove"
            ? "Could not remove that bot."
            : "Could not dismiss those reports.",
        );
        return;
      }
      router.refresh();
    } catch {
      setError("Could not update that report.");
    } finally {
      setPendingSlug(null);
    }
  }

  if (!groups.length) {
    return <p>No open reports. New flags from signed-in users land here.</p>;
  }

  return (
    <div className="space-y-6">
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {groups.map((group) => (
        <article
          key={group.slug}
          className="space-y-3 rounded-3xl bg-card/50 p-5 ring-1 ring-foreground/10"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold tracking-tight text-foreground">
                {group.takenDown ? (
                  group.name
                ) : (
                  <Link href={stallPagePath(group)}>{group.name}</Link>
                )}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {group.kind === "team" ? "Team" : "Agent"} · {group.slug}
                {group.takenDown ? " · already removed" : ""}
                {` · ${group.flags.length} ${group.flags.length === 1 ? "report" : "reports"}`}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {group.removable ? (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="rounded-full"
                  disabled={pendingSlug === group.slug}
                  onClick={() => void act(group.slug, "remove")}
                >
                  {pendingSlug === group.slug ? "Working…" : "Remove bot"}
                </Button>
              ) : null}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full"
                disabled={pendingSlug === group.slug}
                onClick={() => void act(group.slug, "dismiss")}
              >
                Dismiss reports
              </Button>
            </div>
          </div>
          <ul className="space-y-2 text-sm">
            {group.flags.map((flag) => (
              <li key={flag.id}>
                <span className="font-medium text-foreground">{flagReasonLabel(flag.reason)}</span>
                {` — ${flag.reporter.username ?? flag.reporter.email ?? "user"} · ${formatWhen(flag.createdAt)}`}
                {flag.details ? (
                  <p className="mt-1 text-foreground/80">{flag.details}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </article>
      ))}
    </div>
  );
}
