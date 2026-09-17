export const FLAG_REASONS = [
  { id: "illegal", label: "Illegal" },
  { id: "harmful", label: "Harmful or abusive" },
  { id: "corrupt", label: "Corrupt or broken pack" },
  { id: "invalid", label: "Unusable or invalid" },
  { id: "other", label: "Something else" },
] as const;

export type FlagReasonId = (typeof FLAG_REASONS)[number]["id"];

export const COMMENT_FLAG_REASONS = [
  { id: "spam", label: "Spam" },
  { id: "harmful", label: "Harmful or abusive" },
  { id: "illegal", label: "Illegal" },
  { id: "other", label: "Something else" },
] as const;

export type CommentFlagReasonId = (typeof COMMENT_FLAG_REASONS)[number]["id"];

export function isFlagReason(value: unknown): value is FlagReasonId {
  return (
    typeof value === "string" &&
    FLAG_REASONS.some((reason) => reason.id === value)
  );
}

export function isCommentFlagReason(value: unknown): value is CommentFlagReasonId {
  return (
    typeof value === "string" &&
    COMMENT_FLAG_REASONS.some((reason) => reason.id === value)
  );
}

export function flagReasonLabel(id: string) {
  return (
    FLAG_REASONS.find((reason) => reason.id === id)?.label ??
    COMMENT_FLAG_REASONS.find((reason) => reason.id === id)?.label ??
    id
  );
}
