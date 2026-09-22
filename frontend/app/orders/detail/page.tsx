"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { SubmitInput, TrackedStatus } from "@genlayer/transaction-kit-react";
import { AlertTriangle, ArrowLeft, Coins, FileText, Flag, Link as LinkIcon } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { StatusBadge } from "@/components/StatusBadge";
import { AddressDisplay } from "@/components/AddressDisplay";
import { TransactionDialog } from "@/components/TransactionDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getContractAddress } from "@/lib/genlayer/client";
import { useWallet } from "@/lib/genlayer/wallet";
import { useOrder, useInvalidateOrdersData } from "@/lib/hooks/useForeman";
import { Spinner } from "@/components/ui/spinner";
import { formatGen, formatDeadline } from "@/lib/utils/gen";
import { error, success } from "@/lib/utils/toast";

type Action = "claim" | "cancel" | "expire" | "submit" | "appeal";

const ACTION_COPY: Record<Action, { title: string; description: string }> = {
  claim: {
    title: "Claim this order",
    description: "You're committing to deliver before the deadline.",
  },
  cancel: {
    title: "Cancel this order",
    description: "No provider has claimed it yet, so your full escrow is refunded.",
  },
  expire: {
    title: "Expire this order",
    description: "The deadline has passed with no accepted delivery — this refunds the client.",
  },
  submit: {
    title: "Submit your deliverable",
    description:
      "GenLayer validators will fetch this URL live and adjudicate it against the order's acceptance criteria, atomically. This cannot be undone.",
  },
  appeal: {
    title: "Appeal the verdict",
    description:
      "One appeal is allowed per order. This re-runs adjudication with fresh evidence and any extra context you provide. The first verdict already paid out the original escrow, so appealing requires depositing that same amount again to fund the new settlement — whatever the new verdict doesn't award the provider comes straight back to you.",
  },
};

function OrderDetailContent() {
  // The id arrives as ?id=<n> rather than a path segment. A static export has
  // to enumerate every dynamic route at build time, and order ids are minted
  // on-chain long after the build runs, so there is nothing to enumerate.
  const searchParams = useSearchParams();
  const orderId = Number(searchParams.get("id"));

  const { address, isConnected } = useWallet();
  const contractAddress = getContractAddress();
  const invalidate = useInvalidateOrdersData();
  const { data: order, isLoading } = useOrder(Number.isFinite(orderId) ? orderId : null);

  const [showDeliverableForm, setShowDeliverableForm] = useState(false);
  const [showAppealForm, setShowAppealForm] = useState(false);
  const [pendingAction, setPendingAction] = useState<Action | null>(null);

  const [deliverableUrl, setDeliverableUrl] = useState("");
  const [deliverableNote, setDeliverableNote] = useState("");
  const [appealContext, setAppealContext] = useState("");

  const isClient = !!address && !!order && address.toLowerCase() === order.client.toLowerCase();
  const isProvider = !!address && !!order && address.toLowerCase() === order.provider.toLowerCase();
  const deadlinePassed = !!order && Date.now() / 1000 >= order.deadline;
  const isSettled = !!order && ["completed", "rejected", "cancelled", "expired"].includes(order.status);

  const tx = useMemo<SubmitInput | null>(() => {
    if (!pendingAction || !contractAddress || !order) return null;
    const base = { address: contractAddress as `0x${string}`, kind: "write" as const };

    switch (pendingAction) {
      case "claim":
        return { ...base, method: "claim_order", args: [order.id] };
      case "cancel":
        return { ...base, method: "cancel_order", args: [order.id] };
      case "expire":
        return { ...base, method: "expire_order", args: [order.id] };
      case "submit":
        return {
          ...base,
          method: "submit_deliverable",
          args: [order.id, deliverableUrl.trim(), deliverableNote.trim()],
        };
      case "appeal":
        return { ...base, method: "appeal_delivery", args: [order.id, appealContext.trim()] };
    }
  }, [pendingAction, contractAddress, order, deliverableUrl, deliverableNote, appealContext]);

  // `appeal_delivery` is payable and requires the appellant to attach GEN
  // equal to the order's original escrow, so the contract can fund the
  // re-settlement itself instead of drawing on other orders' escrow (see
  // Foreman.appeal_delivery). Every other action here is non-payable.
  const userValue = useMemo(() => {
    if (pendingAction !== "appeal" || !order) return undefined;
    return BigInt(order.escrow_wei);
  }, [pendingAction, order]);

  const requireWallet = () => {
    if (!isConnected) {
      error("Connect your wallet first");
      return false;
    }
    return true;
  };

  const startAction = (action: Action) => {
    if (!requireWallet()) return;
    setPendingAction(action);
  };

  const handleDone = (status: TrackedStatus) => {
    if (status.successful !== false) {
      invalidate();
      success("Transaction confirmed");
      setPendingAction(null);
      setShowDeliverableForm(false);
      setShowAppealForm(false);
      setDeliverableUrl("");
      setDeliverableNote("");
      setAppealContext("");
      return;
    }
    error("Transaction did not succeed", {
      description: "The transaction completed without a successful outcome.",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow pt-24 pb-16 px-4 flex items-center justify-center">
          <Spinner size="lg" label="Loading order…" />
        </main>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow pt-24 pb-16 px-4 flex flex-col items-center justify-center gap-4 text-center">
          <p className="text-muted-foreground">Order not found.</p>
          <Link href="/orders">
            <Button variant="outline">Back to orders</Button>
          </Link>
        </main>
      </div>
    );
  }

  const canAppeal = (order.status === "completed" || order.status === "rejected") && isClient && !order.appeal_used;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-grow pt-24 pb-16 px-4 md:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto space-y-6">
          <Link href="/orders" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> Back to orders
          </Link>

          <div className="brand-card p-6 space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Order #{order.id}</p>
                <h1 className="text-2xl md:text-3xl font-bold leading-tight">{order.title}</h1>
              </div>
              <StatusBadge status={order.status} />
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-accent" />
                <span className="font-semibold">{formatGen(order.escrow_wei)} GEN</span>
                <span className="text-muted-foreground">escrowed</span>
              </div>
              <div className="text-muted-foreground">{formatDeadline(order.deadline)}</div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm pt-2 border-t border-white/10">
              <div>
                <p className="text-muted-foreground mb-1">Client</p>
                <AddressDisplay address={order.client} showCopy maxLength={16} />
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Provider</p>
                {order.provider ? (
                  <AddressDisplay address={order.provider} showCopy maxLength={16} />
                ) : (
                  <span className="text-muted-foreground">Unclaimed</span>
                )}
              </div>
            </div>

            <div className="space-y-3 pt-2 border-t border-white/10">
              <div>
                <p className="text-sm font-semibold mb-1">Specification</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{order.spec}</p>
              </div>
              <div>
                <p className="text-sm font-semibold mb-1">Acceptance criteria</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{order.acceptance_criteria}</p>
              </div>
            </div>

            {order.deliverable_url && (
              <div className="pt-2 border-t border-white/10 space-y-1">
                <p className="text-sm font-semibold flex items-center gap-1.5">
                  <FileText className="w-4 h-4" /> Delivered evidence
                </p>
                <a
                  href={order.deliverable_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-accent hover:underline flex items-center gap-1 break-all"
                >
                  <LinkIcon className="w-3.5 h-3.5 shrink-0" /> {order.deliverable_url}
                </a>
                {order.deliverable_note && (
                  <p className="text-sm text-muted-foreground">{order.deliverable_note}</p>
                )}
              </div>
            )}

            {(order.status === "completed" || order.status === "rejected") && (
              <div className="pt-2 border-t border-white/10 space-y-2">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold">Verdict</p>
                  <span className="text-sm text-accent font-semibold">
                    {order.payout_percent}% released to provider
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{order.verdict_reasoning}</p>
                {order.red_flags?.length > 0 && (
                  <div className="flex items-start gap-1.5 text-sm text-amber-300">
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{order.red_flags.join("; ")}</span>
                  </div>
                )}
                {order.appeal_used && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Flag className="w-3.5 h-3.5" /> This verdict was reached after one appeal.
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="brand-card p-6 space-y-4">
            <p className="text-sm font-semibold">Actions</p>

            <div className="flex flex-wrap gap-2">
              {order.status === "open" && !isClient && !deadlinePassed && (
                <Button onClick={() => startAction("claim")}>Claim order</Button>
              )}
              {order.status === "open" && isClient && (
                <Button variant="outline" onClick={() => startAction("cancel")}>
                  Cancel & refund
                </Button>
              )}
              {order.status === "claimed" && isProvider && !deadlinePassed && (
                <Button
                  onClick={() => {
                    if (requireWallet()) setShowDeliverableForm(true);
                  }}
                >
                  Submit deliverable
                </Button>
              )}
              {(order.status === "open" || order.status === "claimed") && deadlinePassed && (
                <Button variant="outline" onClick={() => startAction("expire")}>
                  Expire & refund client
                </Button>
              )}
              {canAppeal && (
                <Button
                  variant="outline"
                  onClick={() => {
                    if (requireWallet()) setShowAppealForm(true);
                  }}
                >
                  Appeal verdict
                </Button>
              )}
            </div>

            {order.status === "open" && isClient && (
              <p className="text-sm text-muted-foreground">Waiting for a provider to claim this order.</p>
            )}
            {isSettled && !canAppeal && (
              <p className="text-sm text-muted-foreground">
                This order is settled — no further action available.
              </p>
            )}

            {showDeliverableForm && (
              <div className="space-y-3 pt-3 border-t border-white/10">
                <div className="space-y-1.5">
                  <Label htmlFor="deliverable-url">Evidence URL</Label>
                  <Input
                    id="deliverable-url"
                    placeholder="https://…"
                    value={deliverableUrl}
                    onChange={(e) => setDeliverableUrl(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Validators fetch this URL themselves and judge exactly what&rsquo;s there — an
                    independently-hosted page (a client&rsquo;s own system, a public API, a third-party
                    dashboard) carries more weight than one you control yourself.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="deliverable-note">Note to the reviewer (optional)</Label>
                  <textarea
                    id="deliverable-note"
                    className="w-full min-h-[70px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    value={deliverableNote}
                    onChange={(e) => setDeliverableNote(e.target.value)}
                  />
                </div>
                <Button
                  className="w-full"
                  disabled={!deliverableUrl.trim()}
                  onClick={() => startAction("submit")}
                >
                  Review submission
                </Button>
              </div>
            )}

            {showAppealForm && (
              <div className="space-y-3 pt-3 border-t border-white/10">
                <div className="space-y-1.5">
                  <Label htmlFor="appeal-context">Additional context for the re-review</Label>
                  <textarea
                    id="appeal-context"
                    className="w-full min-h-[70px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    placeholder="What should validators re-check or weigh differently?"
                    value={appealContext}
                    onChange={(e) => setAppealContext(e.target.value)}
                  />
                </div>
                <Button className="w-full" onClick={() => startAction("appeal")}>
                  Review appeal
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>

      <TransactionDialog
        open={pendingAction !== null}
        onOpenChange={(open) => !open && setPendingAction(null)}
        tx={tx}
        userValue={userValue}
        title={pendingAction ? ACTION_COPY[pendingAction].title : ""}
        description={pendingAction ? ACTION_COPY[pendingAction].description : ""}
        onDone={handleDone}
      />
    </div>
  );
}

export default function OrderDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col">
          <Navbar />
          <main className="flex-grow pt-24 pb-16 px-4 flex items-center justify-center">
            <Spinner size="lg" label="Loading order…" />
          </main>
        </div>
      }
    >
      <OrderDetailContent />
    </Suspense>
  );
}
