import { Badge } from "./ui/badge";
import type { OrderStatus } from "@/lib/contracts/types";

const STATUS_STYLES: Record<OrderStatus, string> = {
  open: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  claimed: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  completed: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  rejected: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  cancelled: "bg-white/10 text-muted-foreground border-white/15",
  expired: "bg-white/10 text-muted-foreground border-white/15",
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
  return (
    <Badge variant="outline" className={`${STATUS_STYLES[status] ?? ""} ${className}`}>
      {STATUS_LABELS[status] ?? status}
    </Badge>
  );
}
