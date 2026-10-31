/** Pure time helpers — all take an explicit `now` so they are trivially testable. */

export interface Countdown {
  /** Seconds remaining, floored at 0. */
  seconds: number;
  /** True once the target has passed. */
  done: boolean;
  days: number;
  hours: number;
  minutes: number;
}

export function countdownTo(targetUnix: number, nowMs: number = Date.now()): Countdown {
  const remaining = Math.max(0, Math.floor(targetUnix - nowMs / 1000));
  return {
    seconds: remaining,
    done: remaining === 0,
    days: Math.floor(remaining / 86400),
    hours: Math.floor((remaining % 86400) / 3600),
    minutes: Math.floor((remaining % 3600) / 60),
  };
}

/** "3d 4h", "5h 12m", "9m", "under a minute" or "now". */
export function formatCountdown(c: Countdown): string {
  if (c.done) return "now";
  if (c.days > 0) return `${c.days}d ${c.hours}h`;
  if (c.hours > 0) return `${c.hours}h ${c.minutes}m`;
  if (c.minutes > 0) return `${c.minutes}m`;
  return "under a minute";
}

/** "12s ago", "5m ago", "3h ago", "2d ago" — or a date for anything older than 30 days. */
export function timeAgo(unixSeconds: number, nowMs: number = Date.now()): string {
  if (!unixSeconds) return "—";
  const diff = Math.floor(nowMs / 1000 - unixSeconds);
  if (diff < 0) return "just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 30 * 86400) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(unixSeconds * 1000).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Fraction (0..1) of the time between `start` and `end` that has elapsed at `nowMs`. */
export function elapsedFraction(start: number, end: number, nowMs: number = Date.now()): number {
  if (!start || !end || end <= start) return 0;
  const f = (nowMs / 1000 - start) / (end - start);
  return Math.min(1, Math.max(0, f));
}
