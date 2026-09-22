"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { SignInButton } from "@clerk/nextjs";
import { Flag, ThumbsDown, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  MAX_COMMENT_CHARS,
  MAX_COMMENT_WORDS,
  countWords,
  type CommentVote,
  type StallComment,
} from "@/lib/comment-text";
import { COMMENT_FLAG_REASONS, type CommentFlagReasonId } from "@/lib/flag-reasons";
import { cn } from "@/lib/utils";

function formatCommentDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

function CommentAuthor({ comment }: { comment: StallComment }) {
  const avatar = comment.author.imageUrl ? (
    <Image
      src={comment.author.imageUrl}
      alt=""
      width={32}
      height={32}
      className="clay-chip size-8 rounded-full"
    />
  ) : (
    <div
      aria-hidden="true"
      className="clay-chip flex size-8 items-center justify-center rounded-full border border-foreground/10 bg-background/80 text-xs font-semibold text-foreground"
    >
      {comment.author.username.slice(0, 1).toUpperCase()}
    </div>
  );

  const name = comment.author.href ? (
    <Link
      href={comment.author.href}
      className="font-medium text-foreground underline-offset-4 hover:underline"
    >
      {comment.author.username}
    </Link>
  ) : (
    <span className="font-medium text-foreground">{comment.author.username}</span>
  );

  return (
    <div className="flex items-center gap-2.5">
      {avatar}
      <div className="min-w-0">
        {name}
        <p className="text-xs text-muted-foreground">
          <time dateTime={comment.createdAt}>{formatCommentDate(comment.createdAt)}</time>
        </p>
      </div>
    </div>
  );
}

function CommentItem({
  slug,
  comment,
  signedIn,
  isAdmin,
  onChange,
  onRemoved,
}: {
  slug: string;
  comment: StallComment;
  signedIn: boolean;
  isAdmin: boolean;
  onChange: (next: StallComment) => void;
  onRemoved: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [flagOpen, setFlagOpen] = useState(false);
  const [reason, setReason] = useState<CommentFlagReasonId>("spam");
  const [details, setDetails] = useState("");
  const [flagError, setFlagError] = useState<string | null>(null);
  const [prunePending, setPrunePending] = useState(false);

  async function vote(value: 1 | -1) {
    if (pending || comment.isOwn) return;
    setPending(true);
    const previous = comment;

    const nextVote = comment.vote === value ? 0 : value;
    const upDelta = (nextVote === 1 ? 1 : 0) - (comment.vote === 1 ? 1 : 0);
    const downDelta = (nextVote === -1 ? 1 : 0) - (comment.vote === -1 ? 1 : 0);
    onChange({
      ...comment,
      vote: nextVote as CommentVote,
      upCount: Math.max(comment.upCount + upDelta, 0),
      downCount: Math.max(comment.downCount + downDelta, 0),
    });

    try {
      const response = await fetch(
        `/api/stalls/${encodeURIComponent(slug)}/comments/${encodeURIComponent(comment.id)}/vote`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ value }),
        },
      );
      const data: unknown = await response.json().catch(() => null);
      const record = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
      if (!response.ok) {
        onChange(previous);
        return;
      }
      onChange({
        ...comment,
        vote: record.vote === 1 || record.vote === -1 ? record.vote : 0,
        upCount: typeof record.upCount === "number" ? record.upCount : comment.upCount,
        downCount: typeof record.downCount === "number" ? record.downCount : comment.downCount,
      });
    } catch {
      onChange(previous);
    } finally {
      setPending(false);
    }
  }

  async function submitFlag() {
    if (pending || comment.flagged || comment.isOwn) return;
    setPending(true);
    setFlagError(null);
    try {
      const response = await fetch(
        `/api/stalls/${encodeURIComponent(slug)}/comments/${encodeURIComponent(comment.id)}/flag`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason, details }),
        },
      );
      const data: unknown = await response.json().catch(() => null);
      const record = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
      if (response.status === 409) {
        onChange({ ...comment, flagged: true });
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
      onChange({ ...comment, flagged: true });
      setFlagOpen(false);
    } catch {
      setFlagError("Could not send that report.");
    } finally {
      setPending(false);
    }
  }

  async function prune() {
    if (prunePending) return;
    const confirmed = window.confirm("Remove this comment from the public page?");
    if (!confirmed) return;
    setPrunePending(true);
    try {
      const response = await fetch(
        `/api/admin/comments/${encodeURIComponent(comment.id)}/remove`,
        { method: "POST" },
      );
      if (!response.ok) {
        return;
      }
      onRemoved();
    } finally {
      setPrunePending(false);
    }
  }

  const upButton = (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-8 rounded-full px-3"
      aria-pressed={signedIn ? comment.vote === 1 : undefined}
      aria-label={
        signedIn
          ? comment.vote === 1
            ? "Remove thumbs up"
            : "Thumbs up"
          : "Sign in to thumbs up"
      }
      disabled={pending || comment.isOwn}
      onClick={signedIn ? () => void vote(1) : undefined}
    >
      <ThumbsUp
        data-icon="inline-start"
        className={comment.vote === 1 ? "fill-current" : undefined}
        aria-hidden="true"
      />
      {comment.upCount}
    </Button>
  );

  const downButton = (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-8 rounded-full px-3"
      aria-pressed={signedIn ? comment.vote === -1 : undefined}
      aria-label={
        signedIn
          ? comment.vote === -1
            ? "Remove thumbs down"
            : "Thumbs down"
          : "Sign in to thumbs down"
      }
      disabled={pending || comment.isOwn}
      onClick={signedIn ? () => void vote(-1) : undefined}
    >
      <ThumbsDown
        data-icon="inline-start"
        className={comment.vote === -1 ? "fill-current" : undefined}
        aria-hidden="true"
      />
      {comment.downCount}
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
        comment.flagged
          ? "You already reported this comment"
          : signedIn
            ? "Report this comment"
            : "Sign in to report this comment"
      }
      disabled={comment.flagged || comment.isOwn}
      onClick={
        signedIn && !comment.flagged && !comment.isOwn
          ? () => {
              setFlagOpen((open) => !open);
              setFlagError(null);
            }
          : undefined
      }
    >
      <Flag data-icon="inline-start" aria-hidden="true" />
      {comment.flagged ? "Reported" : "Report"}
    </Button>
  );

  return (
    <li className="clay-surface rounded-2xl bg-background/50 px-4 py-4">
      <CommentAuthor comment={comment} />
      <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
        {comment.body}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {signedIn ? upButton : <SignInButton mode="modal">{upButton}</SignInButton>}
        {signedIn ? downButton : <SignInButton mode="modal">{downButton}</SignInButton>}
        {comment.isOwn ? null : signedIn ? (
          flagButton
        ) : (
          <SignInButton mode="modal">{flagButton}</SignInButton>
        )}
        {isAdmin ? (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="h-8 rounded-full px-3"
            disabled={prunePending}
            onClick={() => void prune()}
          >
            {prunePending ? "Removing…" : "Prune"}
          </Button>
        ) : null}
      </div>
      {signedIn && flagOpen && !comment.flagged && !comment.isOwn ? (
        <form
          className="clay-surface mt-3 space-y-3 rounded-2xl bg-background/70 p-4"
          onSubmit={(event) => {
            event.preventDefault();
            void submitFlag();
          }}
        >
          <p className="text-sm font-medium text-foreground">Why are you reporting this comment?</p>
          <div className="grid gap-2">
            {COMMENT_FLAG_REASONS.map((item) => (
              <label key={item.id} className="flex items-center gap-2 text-sm text-foreground/80">
                <input
                  type="radio"
                  name={`comment-flag-${comment.id}`}
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
              className="clay-field mt-2 w-full rounded-2xl border px-3 py-2 text-sm font-normal outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </label>
          {flagError ? (
            <p className="text-sm text-destructive" role="alert">
              {flagError}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="sm" className="rounded-full" disabled={pending}>
              {pending ? "Sending…" : "Send report"}
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
    </li>
  );
}

export function StallComments({
  slug,
  signedIn,
  isAdmin = false,
  toneCardClassName,
  initialComments,
}: {
  slug: string;
  signedIn: boolean;
  isAdmin?: boolean;
  toneCardClassName: string;
  initialComments: StallComment[];
}) {
  const [comments, setComments] = useState(initialComments);
  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wordCount = countWords(body);
  const overWords = wordCount > MAX_COMMENT_WORDS;
  const canPost = Boolean(body.trim()) && !overWords && !pending;

  async function submit() {
    if (!canPost) {
      return;
    }

    setPending(true);
    setError(null);

    try {
      const response = await fetch(`/api/stalls/${encodeURIComponent(slug)}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data: unknown = await response.json().catch(() => null);
      const record = data && typeof data === "object" ? (data as Record<string, unknown>) : {};

      if (!response.ok) {
        setError(
          typeof record.message === "string"
            ? record.message
            : response.status === 401
              ? "Sign in to leave a comment."
              : "Could not post that comment.",
        );
        return;
      }

      const created = record.comment;
      if (created && typeof created === "object") {
        setComments((current) => [created as StallComment, ...current]);
      }
      setBody("");
    } catch {
      setError("Could not post that comment.");
    } finally {
      setPending(false);
    }
  }

  const composer = signedIn ? (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <label className="block text-sm font-medium text-foreground">
        Leave a comment
        <textarea
          rows={4}
          maxLength={MAX_COMMENT_CHARS}
          value={body}
          onChange={(event) => {
            setBody(event.target.value);
            setError(null);
          }}
          placeholder="What did you think of this bot?"
          className="clay-field mt-2 w-full rounded-3xl border px-4 py-3 text-sm font-normal outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </label>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p
          className={cn(
            "text-xs text-muted-foreground",
            overWords && "text-destructive",
          )}
        >
          {wordCount}/{MAX_COMMENT_WORDS} words
        </p>
        <Button
          type="submit"
          size="sm"
          className="rounded-full"
          disabled={!canPost}
        >
          {pending ? "Posting…" : "Post comment"}
        </Button>
      </div>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  ) : (
    <div className="clay-surface flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-background/60 px-4 py-3">
      <p className="text-sm text-muted-foreground">Sign in to leave a comment.</p>
      <SignInButton mode="modal">
        <Button type="button" size="sm" className="rounded-full">
          Sign in
        </Button>
      </SignInButton>
    </div>
  );

  return (
    <section
      className={cn("mt-4 rounded-3xl px-6 py-6 sm:px-8", toneCardClassName)}
      aria-labelledby="stall-comments-heading"
    >
      <h2
        id="stall-comments-heading"
        className="text-lg font-semibold tracking-tight text-foreground"
      >
        Comments
        {comments.length ? (
          <span className="ml-2 text-sm font-medium text-muted-foreground">
            {comments.length}
          </span>
        ) : null}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Anyone can read these. Signing in is enough to post, vote, or report — no
        Stripe account needed.
      </p>
      <div className="mt-4">{composer}</div>
      {comments.length ? (
        <ul className="mt-6 space-y-4">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              slug={slug}
              comment={comment}
              signedIn={signedIn}
              isAdmin={isAdmin}
              onChange={(next) =>
                setComments((current) =>
                  current.map((item) => (item.id === next.id ? next : item)),
                )
              }
              onRemoved={() =>
                setComments((current) => current.filter((item) => item.id !== comment.id))
              }
            />
          ))}
        </ul>
      ) : (
        <p className="mt-6 text-sm text-muted-foreground">No comments yet.</p>
      )}
    </section>
  );
}
