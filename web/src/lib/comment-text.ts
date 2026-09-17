export const MAX_COMMENT_WORDS = 500;
export const MAX_COMMENT_CHARS = 4000;
export const COMMENT_LIST_LIMIT = 50;
export const COMMENT_COOLDOWN_MS = 30_000;
export const COMMENT_HOUR_LIMIT = 8;
export const COMMENT_DAY_LIMIT = 20;
export const COMMENT_STALL_HOUR_LIMIT = 3;

export type CommentVote = -1 | 0 | 1;

export type StallComment = {
  id: string;
  body: string;
  createdAt: string;
  upCount: number;
  downCount: number;
  vote: CommentVote;
  flagged: boolean;
  isOwn: boolean;
  author: {
    username: string;
    href?: string;
    imageUrl: string | null;
  };
};

export type CommentStamp = {
  slug: string;
  createdAt: Date;
};

export type CommentBodyResult =
  | { ok: true; body: string; wordCount: number }
  | { ok: false; error: "empty" | "too_long"; message: string };

export type CommentRateLimitResult =
  | { ok: true }
  | { ok: false; error: "rate_limited"; message: string; retryAfter: number };

export function countWords(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  return parts.length;
}

export function parseCommentBody(value: unknown): CommentBodyResult {
  if (typeof value !== "string") {
    return {
      ok: false,
      error: "empty",
      message: "Write a comment before posting.",
    };
  }

  const body = value.replace(/\r\n/g, "\n").trim();
  if (!body) {
    return {
      ok: false,
      error: "empty",
      message: "Write a comment before posting.",
    };
  }

  if (body.length > MAX_COMMENT_CHARS) {
    return {
      ok: false,
      error: "too_long",
      message: `Keep comments under ${MAX_COMMENT_WORDS} words.`,
    };
  }

  const wordCount = countWords(body);
  if (wordCount > MAX_COMMENT_WORDS) {
    return {
      ok: false,
      error: "too_long",
      message: `Keep comments under ${MAX_COMMENT_WORDS} words.`,
    };
  }

  return { ok: true, body, wordCount };
}

export function evaluateCommentRateLimit(
  recentDayComments: CommentStamp[],
  slug: string,
  now = new Date(),
): CommentRateLimitResult {
  const latest = recentDayComments[0];
  if (latest) {
    const waitMs = COMMENT_COOLDOWN_MS - (now.getTime() - latest.createdAt.getTime());
    if (waitMs > 0) {
      return {
        ok: false,
        error: "rate_limited",
        message: "Please wait a few seconds before posting another comment.",
        retryAfter: Math.max(1, Math.ceil(waitMs / 1000)),
      };
    }
  }

  const hourAgo = now.getTime() - 60 * 60 * 1000;
  const hourComments = recentDayComments.filter(
    (row) => row.createdAt.getTime() >= hourAgo,
  );
  if (hourComments.length >= COMMENT_HOUR_LIMIT) {
    const oldestInWindow = hourComments[hourComments.length - 1];
    const retryAfter = Math.max(
      1,
      Math.ceil((oldestInWindow.createdAt.getTime() + 60 * 60 * 1000 - now.getTime()) / 1000),
    );
    return {
      ok: false,
      error: "rate_limited",
      message: "You have posted several comments recently. Try again in a bit.",
      retryAfter,
    };
  }

  if (recentDayComments.length >= COMMENT_DAY_LIMIT) {
    const oldest = recentDayComments[recentDayComments.length - 1];
    const retryAfter = Math.max(
      1,
      Math.ceil((oldest.createdAt.getTime() + 24 * 60 * 60 * 1000 - now.getTime()) / 1000),
    );
    return {
      ok: false,
      error: "rate_limited",
      message: "Daily comment limit reached. Come back tomorrow.",
      retryAfter,
    };
  }

  const stallHourCount = hourComments.filter((row) => row.slug === slug).length;
  if (stallHourCount >= COMMENT_STALL_HOUR_LIMIT) {
    const oldestOnStall = hourComments
      .filter((row) => row.slug === slug)
      .at(-1);
    const retryAfter = oldestOnStall
      ? Math.max(
          1,
          Math.ceil(
            (oldestOnStall.createdAt.getTime() + 60 * 60 * 1000 - now.getTime()) / 1000,
          ),
        )
      : 60;
    return {
      ok: false,
      error: "rate_limited",
      message: "Give this bot a rest — you can comment here again later.",
      retryAfter,
    };
  }

  return { ok: true };
}

export function parseCommentVote(value: unknown): 1 | -1 | null {
  if (value === 1 || value === -1) {
    return value;
  }
  return null;
}

export function nextCommentVote(current: CommentVote, clicked: 1 | -1): CommentVote {
  return current === clicked ? 0 : clicked;
}

export function voteDeltas(from: CommentVote, to: CommentVote) {
  return {
    up: (to === 1 ? 1 : 0) - (from === 1 ? 1 : 0),
    down: (to === -1 ? 1 : 0) - (from === -1 ? 1 : 0),
  };
}

export function emptyCommentVotes(): Pick<
  StallComment,
  "upCount" | "downCount" | "vote" | "flagged" | "isOwn"
> {
  return {
    upCount: 0,
    downCount: 0,
    vote: 0,
    flagged: false,
    isOwn: true,
  };
}
