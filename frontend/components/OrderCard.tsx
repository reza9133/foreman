import Link from "next/link";
import { Clock, Coins } from "lucide-react";
import { AddressDisplay } from "./AddressDisplay";
import { StatusBadge } from "./StatusBadge";
import { TiltCard } from "./TiltCard";
import { formatGen, formatDeadline } from "@/lib/utils/gen";
import type { Order } from "@/lib/contracts/types";

export function OrderCard({ order, tilt = true }: { order: Order; tilt?: boolean }) {
  const body = (
    <Link
      href={`/orders/detail?id=${order.id}`}
      className="brand-card p-5 flex flex-col gap-3 h-full hover:border-accent/50 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-lg leading-snug line-clamp-2">{order.title}</h3>
        <StatusBadge status={order.status} className="shrink-0" />
      </div>

      <p className="text-sm text-muted-foreground line-clamp-2">{order.spec}</p>

      <div className="flex items-center justify-between text-sm mt-auto pt-3 border-t border-border/70">
        <div className="flex items-center gap-1.5 text-accent font-semibold">
          <Coins className="w-3.5 h-3.5" />
          {formatGen(order.escrow_wei)} GEN
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Clock className="w-3.5 h-3.5" />
          {formatDeadline(order.deadline)}
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Client: <AddressDisplay address={order.client} maxLength={10} />
        </span>
        {order.provider && (
          <span>
            Provider: <AddressDisplay address={order.provider} maxLength={10} />
          </span>
        )}
      </div>
    </Link>
  );
  return tilt ? <TiltCard max={5}>{body}</TiltCard> : body;
}
