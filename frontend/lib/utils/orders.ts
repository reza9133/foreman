import { ORDER_STATUSES, type Order, type OrderStatus } from "../contracts/types";

export const SETTLED: OrderStatus[] = ["completed", "rejected"];
export const TERMINAL: OrderStatus[] = ["completed", "rejected", "cancelled", "expired"];

export function isSettled(o: Pick<Order, "status">): boolean {
  return SETTLED.includes(o.status);
}

export function isTerminal(o: Pick<Order, "status">): boolean {
  return TERMINAL.includes(o.status);
}

/** Count of orders per status, with every status present. */
export function statusCounts(orders: Pick<Order, "status">[]): Record<OrderStatus, number> {
  const out = Object.fromEntries(ORDER_STATUSES.map((s) => [s, 0])) as Record<OrderStatus, number>;
  for (const o of orders) if (o.status in out) out[o.status] += 1;
  return out;
}

/** Histogram of payout percentages for settled orders in `bins` equal buckets over 0..100. */
export function payoutHistogram(orders: Pick<Order, "status" | "payout_percent">[], bins = 5): number[] {
  const out = new Array(bins).fill(0);
  for (const o of orders) {
    if (!isSettled(o)) continue;
    const p = Math.max(0, Math.min(100, Number(o.payout_percent) || 0));
    const idx = Math.min(bins - 1, Math.floor((p / 100) * bins));
    out[idx] += 1;
  }
  return out;
}

/** Share (0..1) of a checklist that was met; null when there is no checklist. */
export function checklistScore(results: { met: boolean }[] | undefined): number | null {
  if (!results || results.length === 0) return null;
  return results.filter((r) => r.met).length / results.length;
}

/** Reliability basis points (0..10000) → "87%"; "—" when the provider has no record. */
export function formatReliability(bps: number | undefined, hasRecord = true): string {
  if (!hasRecord || bps === undefined) return "—";
  return `${Math.round(bps / 100)}%`;
}

/** Human label for a timeline event key. */
export const TIMELINE_LABELS: Record<string, string> = {
  created: "Order opened & escrow locked",
  claimed: "Claimed by provider",
  abandoned: "Claim released by provider",
  extended: "Deadline extended",
  delivered: "Deliverable submitted",
  settled: "Settled by validator consensus",
  appealed: "Verdict appealed",
  cancelled: "Cancelled — escrow refunded",
  expired: "Expired — escrow refunded",
};

export function timelineLabel(event: string): string {
  return TIMELINE_LABELS[event] ?? event;
}

/** Trim an address for compact display. */
export function shortAddress(addr: string, head = 6, tail = 4): string {
  if (!addr) return "—";
  if (addr.length <= head + tail + 2) return addr;
  return `${addr.slice(0, head)}…${addr.slice(-tail)}`;
}
