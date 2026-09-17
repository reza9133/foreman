"use client";

import { useMemo, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { OrderCard } from "@/components/OrderCard";
import { Button } from "@/components/ui/button";
import { useAllOrders, useOrdersByClient, useOrdersByProvider } from "@/lib/hooks/useForeman";
import { useWallet } from "@/lib/genlayer/wallet";
import type { Order } from "@/lib/contracts/types";

type Tab = "open" | "mine" | "all";

export default function OrdersPage() {
  const [tab, setTab] = useState<Tab>("open");
  const { address } = useWallet();

  const { data: allOrders, isLoading: loadingAll } = useAllOrders();
  const { data: myClientOrders } = useOrdersByClient(address);
  const { data: myProviderOrders } = useOrdersByProvider(address);

  const orders = useMemo(() => {
    if (tab === "all") return allOrders ?? [];
    if (tab === "open") return (allOrders ?? []).filter((o) => o.status === "open");
    if (tab === "mine") {
      const mine = new Map<number, Order>();
      for (const o of myClientOrders ?? []) mine.set(o.id, o);
      for (const o of myProviderOrders ?? []) mine.set(o.id, o);
      return Array.from(mine.values()).sort((a, b) => b.id - a.id);
    }
    return [];
  }, [tab, allOrders, myClientOrders, myProviderOrders]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-grow pt-24 pb-16 px-4 md:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <h1 className="text-3xl md:text-4xl font-bold">Work orders</h1>
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
          </div>

          {loadingAll ? (
            <div className="brand-card p-10 text-center text-muted-foreground">Loading orders…</div>
          ) : orders.length === 0 ? (
            <div className="brand-card p-10 text-center text-muted-foreground">
              {tab === "mine"
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
