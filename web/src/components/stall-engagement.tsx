"use client";

import { useState } from "react";
import { SignInButton } from "@clerk/nextjs";
import { Download, Flag, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FLAG_REASONS, type FlagReasonId } from "@/lib/flag-reasons";

export function StallEngagement({
  slug,
  downloadCount,
  likeCount,
  liked,
  signedIn,
  flagged = false,
}: {
  slug: string;
  downloadCount: number;
  likeCount: number;
  liked: boolean;
  signedIn: boolean;
  flagged?: boolean;
}) {
  const [pending, setPending] = useState(false);
  const [likes, setLikes] = useState(likeCount);
  const [isLiked, setIsLiked] = useState(liked);
  const [isFlagged, setIsFlagged] = useState(flagged);
  const [flagOpen, setFlagOpen] = useState(false);
  const [reason, setReason] = useState<FlagReasonId>("invalid");
  const [details, setDetails] = useState("");
  const [flagError, setFlagError] = useState<string | null>(null);
  const [flagPending, setFlagPending] = useState(false);

  async function toggleLike() {
    if (pending) return;
    setPending(true);

    const previousLiked = isLiked;
    const previousLikes = likes;
    setIsLiked(!previousLiked);
    setLikes(previousLikes + (previousLiked ? -1 : 1));

    try {
      const response = await fetch(`/api/stalls/${encodeURIComponent(slug)}/like`, {
        method: "POST",
      });
      const data: unknown = await response.json().catch(() => null);
      const record = data && typeof data === "object" ? (data as Record<string, unknown>) : {};

      if (!response.ok) {
        setIsLiked(previousLiked);
        setLikes(previousLikes);
        return;
      }

      if (typeof record.likeCount === "number") {
        setLikes(record.likeCount);
      }
      if (typeof record.liked === "boolean") {
        setIsLiked(record.liked);
      }
    } catch {
      setIsLiked(previousLiked);
      setLikes(previousLikes);
    } finally {
      setPending(false);
    }
  }

  async function submitFlag() {
    if (flagPending || isFlagged) return;
    setFlagPending(true);
    setFlagError(null);

    try {
      const response = await fetch(`/api/stalls/${encodeURIComponent(slug)}/flag`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, details }),
      });
      const data: unknown = await response.json().catch(() => null);
      const record = data && typeof data === "object" ? (data as Record<string, unknown>) : {};

      if (response.status === 409) {
        setIsFlagged(true);
        setFlagOpen(false);
        return;
      }

      if (!response.ok) {
        setFlagError(
          typeof record.message === "string"
            ? record.message
            : "Could not send that report.",
        );
        return;
      }

      setIsFlagged(true);
      setFlagOpen(false);
    } catch {
      setFlagError("Could not send that report.");
    } finally {
      setFlagPending(false);
    }
  }

  const likeLabel = isLiked ? "Unlike this bot" : "Like this bot";
  const likeButton = (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-8 rounded-full px-3"
      aria-pressed={signedIn ? isLiked : undefined}
      aria-label={signedIn ? likeLabel : "Sign in to like this bot"}
      disabled={pending}
      onClick={signedIn ? () => void toggleLike() : undefined}
    >
      <Heart
        data-icon="inline-start"
        className={isLiked ? "fill-current" : undefined}
        aria-hidden="true"
      />
      {likes}
    </Button>
  );

  const flagButton = (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-8 rounded-full px-3"
      aria-expanded={signedIn ? flagOpen : undefined}
      aria-label={
        isFlagged
          ? "You already reported this bot"
          : signedIn
            ? "Report this bot"
            : "Sign in to report this bot"
      }
      disabled={isFlagged}
      onClick={
        signedIn && !isFlagged
          ? () => {
              setFlagOpen((open) => !open);
              setFlagError(null);
            }
          : undefined
      }
    >
      <Flag data-icon="inline-start" aria-hidden="true" />
      {isFlagged ? "Reported" : "Report"}
    </Button>
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border px-3 text-sm text-foreground/80"
          title={`${downloadCount} downloads`}
        >
          <Download className="size-3.5" aria-hidden="true" />
          <span>{downloadCount}</span>
          <span className="sr-only">
            {downloadCount === 1 ? "download" : "downloads"}
          </span>
        </span>
        {signedIn ? likeButton : <SignInButton mode="modal">{likeButton}</SignInButton>}
        {signedIn ? flagButton : <SignInButton mode="modal">{flagButton}</SignInButton>}
      </div>
      {signedIn && flagOpen && !isFlagged ? (
        <form
          className="space-y-3 rounded-2xl bg-background/70 p-4 ring-1 ring-foreground/10"
          onSubmit={(event) => {
            event.preventDefault();
            void submitFlag();
          }}
        >
          <p className="text-sm font-medium text-foreground">Why are you reporting this bot?</p>
          <div className="grid gap-2">
            {FLAG_REASONS.map((item) => (
              <label key={item.id} className="flex items-center gap-2 text-sm text-foreground/80">
                <input
                  type="radio"
                  name={`flag-${slug}`}
                  value={item.id}
                  checked={reason === item.id}
                  onChange={() => setReason(item.id)}
                />
                {item.label}
              </label>
            ))}
          </div>
          <label className="block text-sm font-medium text-foreground">
            Optional details
            <textarea
              rows={3}
              maxLength={500}
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm font-normal outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </label>
          {flagError ? (
            <p className="text-sm text-destructive" role="alert">
              {flagError}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="sm" className="rounded-full" disabled={flagPending}>
              {flagPending ? "Sending…" : "Send report"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="rounded-full"
              onClick={() => setFlagOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
