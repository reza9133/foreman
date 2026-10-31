"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, Coins, Flag, ShieldCheck, Undo2, XCircle } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { AddressDisplay } from "@/components/AddressDisplay";
import { OrderCard } from "@/components/OrderCard";
import { StatTile } from "@/components/StatTile";
import { Spinner, SpinnerBlock } from "@/components/ui/spinner";
import { useOrdersByProvider, useProviderReputation } from "@/lib/hooks/useForeman";
import { formatGen } from "@/lib/utils/gen";
import { formatReliability } from "@/lib/utils/orders";

function ProviderContent() {
  const params = useSearchParams();
  const address = params.get("address");

  const { data: rep, isLoading } = useProviderReputation(address);
  const { data: orders, isLoading: loadingOrders } = useOrdersByProvider(address);

  if (!address) {
    return <p className="text-center text-muted-foreground">No provider address given.</p>;
  }
  if (isLoading) return <Spinner size="lg" label="Loading provider…" />;

  const total = (rep?.completed ?? 0) + (rep?.rejected ?? 0) + (rep?.abandoned ?? 0);
  const rel = rep?.reliability_bps ?? 0;

  return (
    <div className="max-w-5xl mx-auto space-y-8 w-full">
      <Link href="/leaderboard" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Leaderboard
      </Link>

      <div className="brand-card p-6 space-y-4">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Provider</p>
          <AddressDisplay address={address} showCopy maxLength={24} className="text-xl font-bold" />
        </div>
        <div>
          <div className="flex items-center justify-between text-sm mb-1.5">
            <span className="font-semibold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-accent" /> Reliability
            </span>
            <span className="font-bold tabular-nums">{total === 0 ? "—" : formatReliability(rel)}</span>
          </div>
          <div className="h-2.5 rounded-full bg-foreground/10 overflow-hidden" role="progressbar" aria-valuenow={Math.round(rel / 100)} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full gradient-purple-pink transition-[width] duration-700" style={{ width: `${rel / 100}%` }} />
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">
            Share of this provider&rsquo;s commitments that ended in an accepted delivery. Abandoned and expired claims count against it.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile icon={CheckCircle2} label="Completed">{rep?.completed ?? 0}</StatTile>
        <StatTile icon={XCircle} label="Rejected">{rep?.rejected ?? 0}</StatTile>
        <StatTile icon={Undo2} label="Abandoned">{rep?.abandoned ?? 0}</StatTile>
        <StatTile icon={Flag} label="Disputed">{rep?.disputed ?? 0}</StatTile>
      </div>

      <div className="brand-card p-5 flex items-center gap-3">
        <Coins className="w-5 h-5 text-accent" />
        <span className="font-semibold">{formatGen(rep?.total_earned_wei ?? "0")} GEN</span>
        <span className="text-muted-foreground text-sm">earned from adjudicated work (net of reversed appeals)</span>
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-4">Orders</h2>
        {loadingOrders ? (
          <SpinnerBlock label="Loading orders…" />
        ) : !orders || orders.length === 0 ? (
          <div className="brand-card p-8 text-center text-muted-foreground">No orders yet.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...orders].sort((a, b) => b.id - a.id).map((o) => (
              <OrderCard key={o.id} order={o} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProviderDetailPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow pt-24 pb-16 px-4 md:px-6 lg:px-8 flex flex-col items-center">
        <Suspense fallback={<Spinner size="lg" label="Loading provider…" />}>
          <ProviderContent />
        </Suspense>
      </main>
    </div>
  );
}
