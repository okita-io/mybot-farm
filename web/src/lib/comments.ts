import { and, desc, eq, gte, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { cache } from "react";
import {
  COMMENT_LIST_LIMIT,
  emptyCommentVotes,
  evaluateCommentRateLimit,
  nextCommentVote,
  voteDeltas,
  type CommentVote,
  type StallComment,
} from "@/lib/comment-text";
import { getDb, hasDatabase } from "@/lib/db";
import {
  stallCommentFlags,
  stallComments,
  stallCommentVotes,
  users,
} from "@/lib/db/schema";
import type { CommentFlagReasonId } from "@/lib/flag-reasons";
import { getListingBySlug } from "@/lib/listings";
import { getStall, stallPagePath } from "@/lib/packs";
import { authorHref } from "@/lib/users";

export type { StallComment };

function displayName(username: string | null, firstName: string | null) {
  if (username?.trim()) {
    return username.trim();
  }
  if (firstName?.trim()) {
    return firstName.trim();
  }
  return "grower";
}

function toComment(
  row: {
    id: string;
    body: string;
    createdAt: Date;
    upCount: number;
    downCount: number;
    userId: string;
    username: string | null;
    firstName: string | null;
    imageUrl: string | null;
  },
  extra: Pick<StallComment, "vote" | "flagged" | "isOwn">,
): StallComment {
  const username = displayName(row.username, row.firstName);
  return {
    id: row.id,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
    upCount: row.upCount,
    downCount: row.downCount,
    vote: extra.vote,
    flagged: extra.flagged,
    isOwn: extra.isOwn,
    author: {
      username,
      href: row.username ? authorHref(row.username) : undefined,
      imageUrl: row.imageUrl,
    },
  };
}

export const listStallComments = cache(
  async (slug: string, viewerUserId?: string | null): Promise<StallComment[]> => {
    if (!slug || !hasDatabase()) {
      return [];
    }

    try {
      const db = getDb();
      const rows = await db
        .select({
          id: stallComments.id,
          body: stallComments.body,
          createdAt: stallComments.createdAt,
          upCount: stallComments.upCount,
          downCount: stallComments.downCount,
          userId: stallComments.userId,
          username: users.username,
          firstName: users.firstName,
          imageUrl: users.imageUrl,
        })
        .from(stallComments)
        .innerJoin(users, eq(users.id, stallComments.userId))
        .where(and(eq(stallComments.slug, slug), isNull(stallComments.deletedAt)))
        .orderBy(desc(stallComments.createdAt))
        .limit(COMMENT_LIST_LIMIT);

      const ids = rows.map((row) => row.id);
      const voteByComment = new Map<string, CommentVote>();
      const flaggedIds = new Set<string>();

      if (viewerUserId && ids.length) {
        const [votes, flags] = await Promise.all([
          db
            .select({
              commentId: stallCommentVotes.commentId,
              value: stallCommentVotes.value,
            })
            .from(stallCommentVotes)
            .where(
              and(
                eq(stallCommentVotes.userId, viewerUserId),
                inArray(stallCommentVotes.commentId, ids),
              ),
            ),
          db
            .select({ commentId: stallCommentFlags.commentId })
            .from(stallCommentFlags)
            .where(
              and(
                eq(stallCommentFlags.userId, viewerUserId),
                inArray(stallCommentFlags.commentId, ids),
              ),
            ),
        ]);

        for (const vote of votes) {
          if (vote.value === 1 || vote.value === -1) {
            voteByComment.set(vote.commentId, vote.value);
          }
        }
        for (const flag of flags) {
          flaggedIds.add(flag.commentId);
        }
      }

      return rows.map((row) =>
        toComment(row, {
          vote: voteByComment.get(row.id) ?? 0,
          flagged: flaggedIds.has(row.id),
          isOwn: Boolean(viewerUserId && row.userId === viewerUserId),
        }),
      );
    } catch (error) {
      console.error("listStallComments failed:", error);
      return [];
    }
  },
);

async function recentCommentsForUser(userId: string, now: Date) {
  const db = getDb();
  const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  return db
    .select({
      slug: stallComments.slug,
      createdAt: stallComments.createdAt,
    })
    .from(stallComments)
    .where(
      and(eq(stallComments.userId, userId), gte(stallComments.createdAt, since)),
    )
    .orderBy(desc(stallComments.createdAt));
}

export async function createStallComment(input: {
  slug: string;
  userId: string;
  body: string;
  username: string | null;
  firstName: string | null;
  imageUrl: string | null;
}): Promise<
  | { ok: true; comment: StallComment }
  | { ok: false; error: "rate_limited"; message: string; retryAfter: number }
  | { ok: false; error: "failed"; message: string }
> {
  const db = getDb();
  const now = new Date();
  const recent = await recentCommentsForUser(input.userId, now);
  const limit = evaluateCommentRateLimit(recent, input.slug, now);
  if (!limit.ok) {
    return limit;
  }

  try {
    const [row] = await db
      .insert(stallComments)
      .values({
        slug: input.slug,
        userId: input.userId,
        body: input.body,
        createdAt: now,
      })
      .returning();

    if (!row) {
      return { ok: false, error: "failed", message: "Could not save that comment." };
    }

    const username = displayName(input.username, input.firstName);
    return {
      ok: true,
      comment: {
        id: row.id,
        body: row.body,
        createdAt: row.createdAt.toISOString(),
        author: {
          username,
          href: input.username ? authorHref(input.username) : undefined,
          imageUrl: input.imageUrl,
        },
        ...emptyCommentVotes(),
      },
    };
  } catch (error) {
    console.error("createStallComment failed:", error);
    return { ok: false, error: "failed", message: "Could not save that comment." };
  }
}

async function getLiveComment(slug: string, commentId: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(stallComments)
    .where(
      and(
        eq(stallComments.id, commentId),
        eq(stallComments.slug, slug),
        isNull(stallComments.deletedAt),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function voteOnStallComment(input: {
  slug: string;
  commentId: string;
  userId: string;
  value: 1 | -1;
}): Promise<
  | { ok: true; upCount: number; downCount: number; vote: CommentVote }
  | { ok: false; error: "not_found" | "own_comment" | "failed"; message: string }
> {
  const db = getDb();
  const comment = await getLiveComment(input.slug, input.commentId);
  if (!comment) {
    return { ok: false, error: "not_found", message: "That comment is gone." };
  }
  if (comment.userId === input.userId) {
    return {
      ok: false,
      error: "own_comment",
      message: "You cannot vote on your own comment.",
    };
  }

  const [existing] = await db
    .select()
    .from(stallCommentVotes)
    .where(
      and(
        eq(stallCommentVotes.commentId, input.commentId),
        eq(stallCommentVotes.userId, input.userId),
      ),
    )
    .limit(1);

  const current: CommentVote =
    existing?.value === 1 || existing?.value === -1 ? existing.value : 0;
  const next = nextCommentVote(current, input.value);
  const delta = voteDeltas(current, next);
  const now = new Date();

  try {
    if (!existing && next !== 0) {
      await db.insert(stallCommentVotes).values({
        commentId: input.commentId,
        userId: input.userId,
        value: next,
        createdAt: now,
      });
    } else if (existing && next === 0) {
      await db.delete(stallCommentVotes).where(eq(stallCommentVotes.id, existing.id));
    } else if (existing && next !== 0) {
      await db
        .update(stallCommentVotes)
        .set({ value: next })
        .where(eq(stallCommentVotes.id, existing.id));
    }

    const [updated] = await db
      .update(stallComments)
      .set({
        upCount: sql`greatest(${stallComments.upCount} + ${delta.up}, 0)`,
        downCount: sql`greatest(${stallComments.downCount} + ${delta.down}, 0)`,
      })
      .where(eq(stallComments.id, input.commentId))
      .returning({
        upCount: stallComments.upCount,
        downCount: stallComments.downCount,
      });

    return {
      ok: true,
      upCount: updated?.upCount ?? Math.max(comment.upCount + delta.up, 0),
      downCount: updated?.downCount ?? Math.max(comment.downCount + delta.down, 0),
      vote: next,
    };
  } catch (error) {
    console.error("voteOnStallComment failed:", error);
    return { ok: false, error: "failed", message: "Could not save that vote." };
  }
}

export async function flagStallComment(input: {
  slug: string;
  commentId: string;
  userId: string;
  reason: CommentFlagReasonId;
  details: string;
}): Promise<
  | { ok: true }
  | {
      ok: false;
      error: "not_found" | "own_comment" | "already_flagged" | "failed";
      message: string;
    }
> {
  const db = getDb();
  const comment = await getLiveComment(input.slug, input.commentId);
  if (!comment) {
    return { ok: false, error: "not_found", message: "That comment is gone." };
  }
  if (comment.userId === input.userId) {
    return {
      ok: false,
      error: "own_comment",
      message: "You cannot report your own comment.",
    };
  }

  try {
    await db.insert(stallCommentFlags).values({
      commentId: input.commentId,
      userId: input.userId,
      reason: input.reason,
      details: input.details || null,
      status: "open",
      createdAt: new Date(),
    });
    return { ok: true };
  } catch (error) {
    console.error("flagStallComment failed:", error);
    const [existing] = await db
      .select({ id: stallCommentFlags.id })
      .from(stallCommentFlags)
      .where(
        and(
          eq(stallCommentFlags.commentId, input.commentId),
          eq(stallCommentFlags.userId, input.userId),
        ),
      )
      .limit(1);
    if (existing) {
      return {
        ok: false,
        error: "already_flagged",
        message: "You already reported this comment.",
      };
    }
    return { ok: false, error: "failed", message: "Could not send that report." };
  }
}

export type AdminCommentFlagGroup = {
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

export async function listOpenCommentFlagGroups(): Promise<AdminCommentFlagGroup[]> {
  if (!hasDatabase()) {
    return [];
  }

  const db = getDb();
  const flags = await db
    .select({
      id: stallCommentFlags.id,
      commentId: stallCommentFlags.commentId,
      reason: stallCommentFlags.reason,
      details: stallCommentFlags.details,
      createdAt: stallCommentFlags.createdAt,
      reporterId: stallCommentFlags.userId,
    })
    .from(stallCommentFlags)
    .where(eq(stallCommentFlags.status, "open"))
    .orderBy(desc(stallCommentFlags.createdAt));

  if (!flags.length) {
    return [];
  }

  const commentIds = [...new Set(flags.map((flag) => flag.commentId))];
  const comments = await db
    .select({
      id: stallComments.id,
      slug: stallComments.slug,
      body: stallComments.body,
      createdAt: stallComments.createdAt,
      deletedAt: stallComments.deletedAt,
      authorId: stallComments.userId,
    })
    .from(stallComments)
    .where(inArray(stallComments.id, commentIds));

  const userIds = [
    ...new Set([
      ...comments.map((row) => row.authorId),
      ...flags.map((row) => row.reporterId),
    ]),
  ];
  const userRows = userIds.length
    ? await db
        .select({
          id: users.id,
          username: users.username,
          email: users.email,
        })
        .from(users)
        .where(inArray(users.id, userIds))
    : [];
  const userById = new Map(userRows.map((row) => [row.id, row]));
  const commentById = new Map(comments.map((row) => [row.id, row]));
  const listingSlugs = [...new Set(comments.map((row) => row.slug))];
  const listingRows = await Promise.all(
    listingSlugs.map(async (slug) => [slug, await getListingBySlug(slug)] as const),
  );
  const listingBySlug = new Map(listingRows);

  const groups = new Map<string, AdminCommentFlagGroup>();
  for (const flag of flags) {
    const comment = commentById.get(flag.commentId);
    if (!comment) continue;
    const listing = listingBySlug.get(comment.slug);
    const seed = getStall(comment.slug);
    const kind = listing?.kind === "team" || seed?.kind === "team" ? "team" : "agent";
    const name = listing?.name ?? seed?.name ?? comment.slug;
    const author = userById.get(comment.authorId);
    const reporter = userById.get(flag.reporterId);
    const existing = groups.get(comment.id);
    const item = {
      id: flag.id,
      reason: flag.reason,
      details: flag.details,
      createdAt: flag.createdAt.toISOString(),
      reporter: {
        username: reporter?.username ?? null,
        email: reporter?.email ?? null,
      },
    };
    if (existing) {
      existing.flags.push(item);
      continue;
    }
    groups.set(comment.id, {
      commentId: comment.id,
      slug: comment.slug,
      name,
      kind,
      href: stallPagePath({ kind, slug: comment.slug }),
      body: comment.body,
      createdAt: comment.createdAt.toISOString(),
      deleted: Boolean(comment.deletedAt),
      author: {
        username: author?.username ?? null,
        email: author?.email ?? null,
      },
      flags: [item],
    });
  }

  return [...groups.values()];
}

export async function listRecentPrunedComments(limit = 20) {
  if (!hasDatabase()) {
    return [];
  }

  const db = getDb();
  const rows = await db
    .select({
      id: stallComments.id,
      slug: stallComments.slug,
      body: stallComments.body,
      deletedAt: stallComments.deletedAt,
      authorUsername: users.username,
    })
    .from(stallComments)
    .innerJoin(users, eq(users.id, stallComments.userId))
    .where(isNotNull(stallComments.deletedAt))
    .orderBy(desc(stallComments.deletedAt))
    .limit(limit);

  return rows.map((row) => {
    const seed = getStall(row.slug);
    const kind = seed?.kind === "team" ? "team" : "agent";
    return {
      id: row.id,
      slug: row.slug,
      name: seed?.name ?? row.slug,
      href: stallPagePath({ kind, slug: row.slug }),
      body: row.body,
      authorUsername: row.authorUsername,
      deletedAt: row.deletedAt?.toISOString() ?? "",
    };
  });
}

export async function dismissOpenCommentFlags(commentId: string, adminUserId: string) {
  const db = getDb();
  const now = new Date();
  const rows = await db
    .update(stallCommentFlags)
    .set({
      status: "dismissed",
      resolvedAt: now,
      resolvedByUserId: adminUserId,
    })
    .where(
      and(eq(stallCommentFlags.commentId, commentId), eq(stallCommentFlags.status, "open")),
    )
    .returning({ id: stallCommentFlags.id });
  return rows.length;
}

export async function pruneStallComment(input: {
  commentId: string;
  adminUserId: string;
}): Promise<
  | { ok: true; slug: string }
  | { ok: false; error: "not_found" | "already_removed" }
> {
  const db = getDb();
  const [comment] = await db
    .select()
    .from(stallComments)
    .where(eq(stallComments.id, input.commentId))
    .limit(1);

  if (!comment) {
    return { ok: false, error: "not_found" };
  }
  if (comment.deletedAt) {
    await dismissOrActionFlags(input.commentId, input.adminUserId, "actioned");
    return { ok: false, error: "already_removed" };
  }

  const now = new Date();
  await db
    .update(stallComments)
    .set({
      deletedAt: now,
      deletedByUserId: input.adminUserId,
    })
    .where(eq(stallComments.id, input.commentId));

  await dismissOrActionFlags(input.commentId, input.adminUserId, "actioned");
  return { ok: true, slug: comment.slug };
}

async function dismissOrActionFlags(
  commentId: string,
  adminUserId: string,
  status: "dismissed" | "actioned",
) {
  const db = getDb();
  const now = new Date();
  await db
    .update(stallCommentFlags)
    .set({
      status,
      resolvedAt: now,
      resolvedByUserId: adminUserId,
    })
    .where(
      and(eq(stallCommentFlags.commentId, commentId), eq(stallCommentFlags.status, "open")),
    );
}
