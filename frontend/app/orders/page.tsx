"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { OrderCard } from "@/components/OrderCard";
import { AddressDisplay } from "@/components/AddressDisplay";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SpinnerBlock } from "@/components/ui/spinner";
import { useOrdersByClient, useOrdersByProvider, useOrdersPage } from "@/lib/hooks/useForeman";
import { useWallet } from "@/lib/genlayer/wallet";
import type { Order } from "@/lib/contracts/types";

type Tab = "open" | "claimed" | "completed" | "rejected" | "all" | "mine";

const TABS: { id: Tab; label: string; status: string }[] = [
  { id: "open", label: "Open", status: "open" },
  { id: "claimed", label: "In progress", status: "claimed" },
  { id: "completed", label: "Completed", status: "completed" },
  { id: "rejected", label: "Rejected", status: "rejected" },
  { id: "all", label: "All", status: "" },
  { id: "mine", label: "Mine", status: "" },
];

const PAGE_SIZE = 12;

export default function OrdersPage() {
  const [tab, setTab] = useState<Tab>("open");
  const [page, setPage] = useState(0);
  const [query, setQuery] = useState("");
  const { address } = useWallet();

  // Read ?provider= client-side only (no useSearchParams / Suspense
  // boundary needed) — used by leaderboard rows to link straight into a
  // specific provider's order history instead of the generic list.
  const [providerFilter, setProviderFilter] = useState<string | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setProviderFilter(params.get("provider"));
  }, []);

  const status = TABS.find((t) => t.id === tab)?.status ?? "";
  const paged = useOrdersPage(page, PAGE_SIZE, status);
  const { data: myClientOrders } = useOrdersByClient(tab === "mine" ? address : null);
  const { data: myProviderOrders } = useOrdersByProvider(tab === "mine" ? address : null);
  const { data: filteredProviderOrders } = useOrdersByProvider(providerFilter);

  const mine = useMemo(() => {
    const m = new Map<number, Order>();
    for (const o of myClientOrders ?? []) m.set(o.id, o);
    for (const o of myProviderOrders ?? []) m.set(o.id, o);
    return Array.from(m.values()).sort((a, b) => b.id - a.id);
  }, [myClientOrders, myProviderOrders]);

  const base: Order[] = providerFilter
    ? [...(filteredProviderOrders ?? [])].sort((a, b) => b.id - a.id)
    : tab === "mine"
      ? mine
      : (paged.data?.orders ?? []);

  // Client-side text filter over the page already on screen.
  const q = query.trim().toLowerCase();
  const orders = q
    ? base.filter((o) => o.title.toLowerCase().includes(q) || o.spec.toLowerCase().includes(q) || String(o.id) === q)
    : base;

  const totalMatching = paged.data?.total_matching ?? 0;
  const pageCount = Math.max(1, Math.ceil(totalMatching / PAGE_SIZE));
  const paginated = !providerFilter && tab !== "mine";
  const loading = providerFilter ? false : tab === "mine" ? false : paged.isLoading;

  const clearProviderFilter = () => {
    setProviderFilter(null);
    window.history.replaceState(null, "", "/orders");
  };

  const choose = (t: Tab) => {
    setTab(t);
    setPage(0);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-grow pt-24 pb-16 px-4 md:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <h1 className="text-3xl md:text-4xl font-bold">Work orders</h1>
            {!providerFilter && (
              <div className="flex flex-wrap gap-2" role="tablist" aria-label="Order filters">
                {TABS.map((t) => (
                  <Button
                    key={t.id}
                    role="tab"
                    aria-selected={tab === t.id}
                    variant={tab === t.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => choose(t.id)}
                  >
                    {t.label}
                  </Button>
                ))}
              </div>
            )}
          </div>

          <div className="mb-5 max-w-md">
            <Input
              placeholder="Filter this page by title, spec or #id…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Filter orders"
            />
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

          {loading ? (
            <SpinnerBlock label="Loading orders…" />
          ) : orders.length === 0 ? (
            <div className="brand-card p-10 text-center text-muted-foreground">
              {providerFilter
                ? "This provider hasn't claimed any orders yet."
                : tab === "mine"
                  ? address
                    ? "You haven't opened or claimed any orders yet."
                    : "Connect your wallet to see your orders."
                  : q
                    ? "No order on this page matches your filter."
                    : "No orders here yet."}
            </div>
          ) : (
            <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 transition-opacity ${paged.isPlaceholderData ? "opacity-60" : ""}`}>
              {orders.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
            </div>
          )}

          {paginated && totalMatching > PAGE_SIZE && (
            <div className="flex items-center justify-center gap-3 mt-8">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
                <ChevronLeft /> Newer
              </Button>
              <span className="text-sm text-muted-foreground tabular-nums">
                Page {page + 1} of {pageCount} · {totalMatching} orders
              </span>
              <Button variant="outline" size="sm" disabled={page + 1 >= pageCount} onClick={() => setPage((p) => p + 1)}>
                Older <ChevronRight />
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
