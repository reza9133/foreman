"use client";

import Link from "next/link";
import { Trophy, Medal, Coins, CheckCircle2, XCircle } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { AddressDisplay } from "@/components/AddressDisplay";
import { SpinnerBlock } from "@/components/ui/spinner";
import { useAllOrders } from "@/lib/hooks/useForeman";
import { formatGen } from "@/lib/utils/gen";
import type { Order } from "@/lib/contracts/types";

interface ProviderStats {
  provider: string;
  completed: number;
  rejected: number;
  earnedWei: bigint;
  winRate: number;
}

function computeLeaderboard(orders: Order[]): ProviderStats[] {
  const byProvider = new Map<string, ProviderStats>();

  for (const order of orders) {
    if (order.status !== "completed" && order.status !== "rejected") continue;
    if (!order.provider || /^0x0+$/i.test(order.provider)) continue;

    const key = order.provider.toLowerCase();
    const entry =
      byProvider.get(key) ??
      ({ provider: order.provider, completed: 0, rejected: 0, earnedWei: 0n, winRate: 0 } as ProviderStats);

    if (order.status === "completed") entry.completed += 1;
    else entry.rejected += 1;

    try {
      const escrow = BigInt(order.escrow_wei || "0");
      const pct = BigInt(Math.max(0, Math.min(100, order.payout_percent || 0)));
      entry.earnedWei += (escrow * pct) / 100n;
    } catch {
      // malformed escrow value on a legacy order — skip the earnings add, keep the counts
    }

    byProvider.set(key, entry);
  }

  const list = Array.from(byProvider.values()).map((p) => ({
    ...p,
    winRate: p.completed + p.rejected > 0 ? Math.round((p.completed / (p.completed + p.rejected)) * 100) : 0,
  }));

  list.sort((a, b) => {
    if (b.completed !== a.completed) return b.completed - a.completed;
    if (b.earnedWei !== a.earnedWei) return b.earnedWei > a.earnedWei ? 1 : -1;
    return b.winRate - a.winRate;
  });

  return list;
}

const RANK_STYLES = [
  "text-amber-300",
  "text-slate-300",
  "text-orange-400",
];

export default function LeaderboardPage() {
  const { data: allOrders, isLoading } = useAllOrders();
  const leaderboard = computeLeaderboard(allOrders ?? []);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-grow pt-24 pb-16 px-4 md:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10 animate-fade-in">
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-accent bg-accent/10 border border-accent/20 rounded-full px-3 py-1 mb-5">
              <Trophy className="w-3.5 h-3.5" />
              Provider leaderboard
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-3">Ranked by AI-adjudicated work</h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Every row here comes straight from on-chain verdicts — completions, rejections,
              and GEN earned are read directly from settled orders, not self-reported.
            </p>
          </div>

          {isLoading ? (
            <SpinnerBlock label="Loading leaderboard…" />
          ) : leaderboard.length === 0 ? (
            <div className="brand-card p-10 text-center">
              <p className="text-muted-foreground">
                No orders have been adjudicated yet. Once a work order settles, its provider
                shows up here.
              </p>
            </div>
          ) : (
            <div className="space-y-3 animate-slide-up">
              {leaderboard.map((entry, i) => (
                <Link
                  key={entry.provider}
                  href={`/orders?provider=${entry.provider}`}
                  className="brand-card brand-card-hover p-4 md:p-5 flex items-center gap-4"
                >
                  <div className="w-9 text-center shrink-0">
                    {i < 3 ? (
                      <Medal className={`w-6 h-6 mx-auto ${RANK_STYLES[i]}`} />
                    ) : (
                      <span className="text-muted-foreground font-semibold">#{i + 1}</span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <AddressDisplay address={entry.provider} maxLength={16} className="font-semibold" />
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                      <span className="flex items-center gap-1 text-emerald-300">
                        <CheckCircle2 className="w-3.5 h-3.5" /> {entry.completed}
                      </span>
                      <span className="flex items-center gap-1 text-rose-300">
                        <XCircle className="w-3.5 h-3.5" /> {entry.rejected}
                      </span>
                      <span>{entry.winRate}% win rate</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="flex items-center gap-1.5 text-accent font-bold">
                      <Coins className="w-4 h-4" />
                      {formatGen(entry.earnedWei)} GEN
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">earned</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
