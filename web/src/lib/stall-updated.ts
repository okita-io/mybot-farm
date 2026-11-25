/** Show the "Updated" chip for packs whose content changed within this many days. */
export const STALL_UPDATED_WINDOW_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

export type RecentStallUpdate = {
  /** ISO timestamp for <time dateTime>. */
  iso: string;
  /** Short date, e.g. "Nov 24". */
  dateLabel: string;
  version: number;
};

/** "Nov 24" (UTC, matches formatStallDate's timezone). */
export function formatShortUpdatedDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));
}

/**
 * Returns chip data when a stall was really revised (packVersion > 1) and its
 * updatedAt falls inside the recency window. Never invents a date: both
 * values come from the pack / listing.
 */
export function recentStallUpdate(
  input: { packVersion?: number | null; updatedAt?: string | null },
  now: Date | number = Date.now(),
  windowDays: number = STALL_UPDATED_WINDOW_DAYS,
): RecentStallUpdate | null {
  const version = input.packVersion ?? 1;
  if (!Number.isInteger(version) || version <= 1 || !input.updatedAt) {
    return null;
  }

  const updated = Date.parse(input.updatedAt);
  if (Number.isNaN(updated)) {
    return null;
  }

  const age = (typeof now === "number" ? now : now.getTime()) - updated;
  // Allow a day of clock skew for dates stamped "today" in a later timezone.
  if (age < -DAY_MS || age > windowDays * DAY_MS) {
    return null;
  }

  const iso = new Date(updated).toISOString();
  return { iso, dateLabel: formatShortUpdatedDate(iso), version };
}
