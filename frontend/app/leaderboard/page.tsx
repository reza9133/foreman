"use client";

import Link from "next/link";
import { Trophy, Medal, Coins, CheckCircle2, XCircle, Undo2 } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { AddressDisplay } from "@/components/AddressDisplay";
import { SpinnerBlock } from "@/components/ui/spinner";
import { TiltCard } from "@/components/TiltCard";
import { useTopProviders } from "@/lib/hooks/useForeman";
import { formatGen } from "@/lib/utils/gen";
import { formatReliability } from "@/lib/utils/orders";

const RANK_STYLES = ["text-amber-600", "text-stone-500", "text-orange-700"];

export default function LeaderboardPage() {
  // Ranked on-chain by get_top_providers (completions, then earnings) —
  // no client-side scan of every order.
  const { data: providers, isLoading } = useTopProviders(25);
  const list = providers ?? [];

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
              Every row comes straight from on-chain verdicts. Abandoned and expired claims count against reliability, so walking away from work is visible.
            </p>
          </div>

          {isLoading ? (
            <SpinnerBlock label="Loading leaderboard…" />
          ) : list.length === 0 ? (
            <div className="brand-card p-10 text-center">
              <p className="text-muted-foreground">
                No orders have been adjudicated yet. Once a work order settles, its provider shows up here.
              </p>
            </div>
          ) : (
            <ol className="space-y-3 animate-slide-up">
              {list.map((entry, i) => (
                <li key={entry.address}>
                  <TiltCard max={3}>
                    <Link
                      href={`/providers/detail?address=${entry.address}`}
                      className="brand-card brand-card-hover p-4 md:p-5 flex items-center gap-4"
                    >
                      <div className="w-9 text-center shrink-0">
                        {i < 3 ? (
                          <Medal className={`w-6 h-6 mx-auto ${RANK_STYLES[i]}`} aria-label={`Rank ${i + 1}`} />
                        ) : (
                          <span className="text-muted-foreground font-semibold">#{i + 1}</span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <AddressDisplay address={entry.address} maxLength={16} className="font-semibold" />
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
                          <span className="flex items-center gap-1 text-emerald-700">
                            <CheckCircle2 className="w-3.5 h-3.5" /> {entry.completed}
                          </span>
                          <span className="flex items-center gap-1 text-rose-700">
                            <XCircle className="w-3.5 h-3.5" /> {entry.rejected}
                          </span>
                          <span className="flex items-center gap-1">
                            <Undo2 className="w-3.5 h-3.5" /> {entry.abandoned ?? 0}
                          </span>
                          <span>{formatReliability(entry.reliability_bps)} reliable</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="flex items-center gap-1.5 text-accent font-bold">
                          <Coins className="w-4 h-4" />
                          {formatGen(entry.total_earned_wei)} GEN
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">earned</p>
                      </div>
                    </Link>
                  </TiltCard>
                </li>
              ))}
            </ol>
          )}
        </div>
      </main>
    </div>
  );
}
