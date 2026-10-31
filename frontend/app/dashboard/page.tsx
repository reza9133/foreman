"use client";

import { useMemo } from "react";
import { Coins, Gavel, Layers, RotateCcw, Undo2, Wallet } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { StatTile } from "@/components/StatTile";
import { CountUp } from "@/components/CountUp";
import { Reveal } from "@/components/Reveal";
import { StatusDonut } from "@/components/charts/StatusDonut";
import { PayoutHistogram } from "@/components/charts/PayoutHistogram";
import { OrderCard } from "@/components/OrderCard";
import { SpinnerBlock } from "@/components/ui/spinner";
import { useOrdersPage, useProtocolStats } from "@/lib/hooks/useForeman";
import { formatGen } from "@/lib/utils/gen";
import { payoutHistogram, statusCounts } from "@/lib/utils/orders";

const SAMPLE = 50; // the most recent orders used for the distribution charts

export default function DashboardPage() {
  const { data: stats, isLoading: loadingStats } = useProtocolStats();
  const { data: recent, isLoading: loadingRecent } = useOrdersPage(0, SAMPLE, "");

  const orders = recent?.orders ?? [];
  const counts = useMemo(() => statusCounts(orders), [orders]);
  const bins = useMemo(() => payoutHistogram(orders, 5), [orders]);
  const settled = counts.completed + counts.rejected;
  const accepted = settled > 0 ? Math.round((counts.completed / settled) * 100) : null;
  const gen = (wei: string | undefined) => Number(formatGen(wei ?? "0", 4));

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow pt-24 pb-16 px-4 md:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto space-y-10">
          <div className="animate-fade-in">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">Protocol dashboard</h1>
            <p className="text-muted-foreground max-w-2xl">
              Live counters straight from the contract (maintained incrementally on-chain, so this view costs the same at ten
              orders or ten thousand) plus a look at the most recent {SAMPLE} orders.
            </p>
          </div>

          {loadingStats ? (
            <SpinnerBlock label="Reading protocol counters…" />
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <StatTile icon={Layers} label="Orders opened">
                <CountUp value={stats?.order_count ?? 0} />
              </StatTile>
              <StatTile icon={Gavel} label="Verdicts by consensus" hint="includes appeal re-verdicts">
                <CountUp value={stats?.settled_count ?? 0} />
              </StatTile>
              <StatTile icon={RotateCcw} label="Appeals filed">
                <CountUp value={stats?.appeal_count ?? 0} />
              </StatTile>
              <StatTile icon={Wallet} label="GEN escrowed" hint="incl. appeal deposits">
                <CountUp value={gen(stats?.total_escrowed_wei)} format={(n) => n.toLocaleString(undefined, { maximumFractionDigits: 2 })} />
              </StatTile>
              <StatTile icon={Coins} label="GEN paid to providers">
                <CountUp value={gen(stats?.total_paid_to_providers_wei)} format={(n) => n.toLocaleString(undefined, { maximumFractionDigits: 2 })} />
              </StatTile>
              <StatTile icon={Undo2} label="GEN refunded to clients">
                <CountUp value={gen(stats?.total_refunded_wei)} format={(n) => n.toLocaleString(undefined, { maximumFractionDigits: 2 })} />
              </StatTile>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Reveal>
              <div className="brand-card p-6 h-full">
                <h2 className="text-lg font-bold mb-4">Orders by status</h2>
                <StatusDonut counts={counts} />
              </div>
            </Reveal>
            <Reveal delay={100}>
              <div className="brand-card p-6 h-full">
                <div className="flex items-baseline justify-between mb-4">
                  <h2 className="text-lg font-bold">Verdict distribution</h2>
                  {accepted !== null && <span className="chip chip-ok">{accepted}% accepted</span>}
                </div>
                {settled === 0 ? (
                  <p className="text-sm text-muted-foreground">No settled orders yet.</p>
                ) : (
                  <PayoutHistogram bins={bins} />
                )}
              </div>
            </Reveal>
          </div>

          <div>
            <h2 className="text-2xl font-bold mb-4">Latest orders</h2>
            {loadingRecent ? (
              <SpinnerBlock label="Loading orders…" />
            ) : orders.length === 0 ? (
              <div className="brand-card p-10 text-center text-muted-foreground">No orders yet.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {orders.slice(0, 6).map((o) => (
                  <OrderCard key={o.id} order={o} />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
