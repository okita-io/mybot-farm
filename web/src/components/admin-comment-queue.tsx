"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { flagReasonLabel } from "@/lib/flag-reasons";

type AdminCommentFlagGroup = {
  commentId: string;
  slug: string;
  name: string;
  kind: "agent" | "team";
  href: string;
  body: string;
  createdAt: string;
  deleted: boolean;
  author: { username: string | null; email: string | null };
  flags: Array<{
    id: string;
    reason: string;
    details: string | null;
    createdAt: string;
    reporter: { username: string | null; email: string | null };
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

export function AdminCommentQueue({ groups }: { groups: AdminCommentFlagGroup[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(commentId: string, action: "remove" | "dismiss") {
    if (pendingId) return;
    if (action === "remove") {
      const confirmed = window.confirm("Remove this comment from the public page?");
      if (!confirmed) return;
    }

    setPendingId(commentId);
    setError(null);
    const path =
      action === "remove"
        ? `/api/admin/comments/${encodeURIComponent(commentId)}/remove`
        : `/api/admin/comments/${encodeURIComponent(commentId)}/dismiss-flags`;

    try {
      const response = await fetch(path, { method: "POST" });
      if (!response.ok) {
        setError(
          action === "remove"
            ? "Could not prune that comment."
            : "Could not dismiss those reports.",
        );
        return;
      }
      router.refresh();
    } catch {
      setError("Could not update that report.");
    } finally {
      setPendingId(null);
    }
  }

  if (!groups.length) {
    return <p>No open comment reports.</p>;
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
          key={group.commentId}
          className="space-y-3 rounded-3xl bg-card/50 p-5 ring-1 ring-foreground/10"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold tracking-tight text-foreground">
                {group.deleted ? (
                  group.name
                ) : (
                  <Link href={group.href}>{group.name}</Link>
                )}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {group.kind === "team" ? "Team" : "Agent"} · {group.slug}
                {group.author.username ? ` · ${group.author.username}` : ""}
                {group.deleted ? " · already pruned" : ""}
                {` · ${group.flags.length} ${group.flags.length === 1 ? "report" : "reports"}`}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {group.deleted ? null : (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="rounded-full"
                  disabled={pendingId === group.commentId}
                  onClick={() => void act(group.commentId, "remove")}
                >
                  {pendingId === group.commentId ? "Working…" : "Prune comment"}
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full"
                disabled={pendingId === group.commentId}
                onClick={() => void act(group.commentId, "dismiss")}
              >
                Dismiss reports
              </Button>
            </div>
          </div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
            {group.body}
          </p>
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
