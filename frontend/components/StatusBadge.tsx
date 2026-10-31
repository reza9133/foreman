import type { OrderStatus } from "@/lib/contracts/types";

const STATUS_CHIP: Record<OrderStatus, string> = {
  open: "chip-info",
  claimed: "chip-warn",
  completed: "chip-ok",
  rejected: "chip-bad",
  cancelled: "chip-mute",
  expired: "chip-mute",
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  open: "Open",
  claimed: "In progress",
  completed: "Completed",
  rejected: "Rejected",
  cancelled: "Cancelled",
  expired: "Expired",
};

export function StatusBadge({ status, className = "" }: { status: OrderStatus; className?: string }) {
  return <span className={`chip ${STATUS_CHIP[status] ?? "chip-mute"} ${className}`}>{STATUS_LABELS[status] ?? status}</span>;
}
