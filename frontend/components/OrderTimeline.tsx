import { CheckCircle2, Circle, Flag, RotateCcw, Send, Timer, Undo2, Gavel, Ban, Hourglass } from "lucide-react";
import type { ComponentType } from "react";
import { AddressDisplay } from "./AddressDisplay";
import type { TimelineEntry } from "@/lib/contracts/types";
import { timelineLabel } from "@/lib/utils/orders";

const ICONS: Record<string, ComponentType<{ className?: string }>> = {
  created: Circle,
  claimed: CheckCircle2,
  abandoned: Undo2,
  extended: Timer,
  delivered: Send,
  settled: Gavel,
  appealed: RotateCcw,
  cancelled: Ban,
  expired: Hourglass,
};

/** On-chain event log for an order (v2 contracts record it in `timeline`). */
export function OrderTimeline({ entries }: { entries: TimelineEntry[] }) {
  if (!entries || entries.length === 0) {
    return <p className="text-sm text-muted-foreground">No timeline recorded (order created by a v1 contract).</p>;
  }
  return (
    <ol className="timeline-rail space-y-4 pl-0">
      {entries.map((e, i) => {
        const Icon = ICONS[e.event] ?? Flag;
        return (
          <li key={`${e.t}-${i}`} className="relative flex gap-3 pl-0">
            <span className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-card border border-accent/50 text-accent">
              <Icon className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0 -mt-0.5">
              <p className="text-sm font-semibold leading-snug">{timelineLabel(e.event)}</p>
              <p className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-2">
                <time dateTime={new Date(e.t * 1000).toISOString()}>
                  {new Date(e.t * 1000).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </time>
                {e.actor && e.actor !== "consensus" && <AddressDisplay address={e.actor} maxLength={10} />}
                {e.actor === "consensus" && <span className="chip chip-info !py-0">validators</span>}
                {e.detail && <span className="font-mono">{e.detail}</span>}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
