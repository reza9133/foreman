import { ORDER_STATUSES, type OrderStatus } from "@/lib/contracts/types";

export const STATUS_COLORS: Record<OrderStatus, string> = {
  open: "oklch(0.62 0.13 235)",
  claimed: "oklch(0.72 0.15 75)",
  completed: "oklch(0.6 0.14 160)",
  rejected: "oklch(0.58 0.2 20)",
  cancelled: "oklch(0.6 0.02 80)",
  expired: "oklch(0.74 0.02 80)",
};

const LABELS: Record<OrderStatus, string> = {
  open: "Open",
  claimed: "In progress",
  completed: "Completed",
  rejected: "Rejected",
  cancelled: "Cancelled",
  expired: "Expired",
};

/**
 * Donut of orders by status. Pure SVG (stroke-dasharray arcs) — no chart
 * library, no layout thrash, and a text legend so colour is never the only
 * channel.
 */
export function StatusDonut({ counts }: { counts: Record<OrderStatus, number> }) {
  const total = ORDER_STATUSES.reduce((n, s) => n + counts[s], 0);
  const R = 52;
  const C = 2 * Math.PI * R;
  let offset = 0;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <svg viewBox="0 0 140 140" className="w-40 h-40 shrink-0" role="img" aria-label={`${total} orders by status`}>
        <circle cx="70" cy="70" r={R} fill="none" stroke="oklch(0.5 0.02 80 / 0.12)" strokeWidth="16" />
        {total > 0 &&
          ORDER_STATUSES.map((s) => {
            const len = (counts[s] / total) * C;
            if (len <= 0) return null;
            const el = (
              <circle
                key={s}
                cx="70"
                cy="70"
                r={R}
                fill="none"
                stroke={STATUS_COLORS[s]}
                strokeWidth="16"
                strokeDasharray={`${Math.max(0, len - 1.5)} ${C - Math.max(0, len - 1.5)}`}
                strokeDashoffset={-offset}
                transform="rotate(-90 70 70)"
              />
            );
            offset += len;
            return el;
          })}
        <text x="70" y="68" textAnchor="middle" className="fill-foreground" fontSize="24" fontWeight="700">
          {total}
        </text>
        <text x="70" y="86" textAnchor="middle" className="fill-muted-foreground" fontSize="9">
          orders
        </text>
      </svg>
      <ul className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
        {ORDER_STATUSES.map((s) => (
          <li key={s} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: STATUS_COLORS[s] }} />
            <span className="text-muted-foreground">{LABELS[s]}</span>
            <span className="font-semibold ml-auto tabular-nums">{counts[s]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
