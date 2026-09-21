"use client";

import { useEffect, useMemo, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { OrderCard } from "@/components/OrderCard";
import { AddressDisplay } from "@/components/AddressDisplay";
import { Button } from "@/components/ui/button";
import { SpinnerBlock } from "@/components/ui/spinner";
import { useAllOrders, useOrdersByClient, useOrdersByProvider } from "@/lib/hooks/useForeman";
import { useWallet } from "@/lib/genlayer/wallet";
import type { Order } from "@/lib/contracts/types";

type Tab = "open" | "mine" | "all";

export default function OrdersPage() {
  const [tab, setTab] = useState<Tab>("open");
  const { address } = useWallet();

  // Read ?provider= client-side only (no useSearchParams / Suspense
  // boundary needed) — used by leaderboard rows to link straight into a
  // specific provider's order history instead of the generic list.
  const [providerFilter, setProviderFilter] = useState<string | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setProviderFilter(params.get("provider"));
  }, []);

  const { data: allOrders, isLoading: loadingAll } = useAllOrders();
  const { data: myClientOrders } = useOrdersByClient(address);
  const { data: myProviderOrders } = useOrdersByProvider(address);
  const { data: filteredProviderOrders } = useOrdersByProvider(providerFilter);

  const orders = useMemo(() => {
    if (providerFilter) return filteredProviderOrders ?? [];
    if (tab === "all") return allOrders ?? [];
    if (tab === "open") return (allOrders ?? []).filter((o) => o.status === "open");
    if (tab === "mine") {
      const mine = new Map<number, Order>();
      for (const o of myClientOrders ?? []) mine.set(o.id, o);
      for (const o of myProviderOrders ?? []) mine.set(o.id, o);
      return Array.from(mine.values()).sort((a, b) => b.id - a.id);
    }
    return [];
  }, [tab, allOrders, myClientOrders, myProviderOrders, providerFilter, filteredProviderOrders]);

  const clearProviderFilter = () => {
    setProviderFilter(null);
    window.history.replaceState(null, "", "/orders");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-grow pt-24 pb-16 px-4 md:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <h1 className="text-3xl md:text-4xl font-bold">Work orders</h1>
            {!providerFilter && (
              <div className="flex gap-2">
                <Button variant={tab === "open" ? "default" : "outline"} size="sm" onClick={() => setTab("open")}>
                  Open
                </Button>
                <Button variant={tab === "mine" ? "default" : "outline"} size="sm" onClick={() => setTab("mine")}>
                  Mine
                </Button>
                <Button variant={tab === "all" ? "default" : "outline"} size="sm" onClick={() => setTab("all")}>
                  All
                </Button>
              </div>
            )}
          </div>

          {providerFilter && (
            <div className="brand-card p-3 mb-4 flex items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground">
                Showing orders provided by <AddressDisplay address={providerFilter} maxLength={16} className="font-semibold text-foreground" />
              </span>
              <Button variant="outline" size="sm" onClick={clearProviderFilter}>
                Clear
              </Button>
            </div>
          )}

          {loadingAll ? (
            <SpinnerBlock label="Loading orders…" />
          ) : orders.length === 0 ? (
            <div className="brand-card p-10 text-center text-muted-foreground">
              {providerFilter
                ? "This provider hasn't settled any orders yet."
                : tab === "mine"
                  ? address
                    ? "You haven't opened or claimed any orders yet."
                    : "Connect your wallet to see your orders."
                  : "No orders here yet."}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {orders.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
