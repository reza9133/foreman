"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { SubmitInput, TrackedStatus } from "@genlayer/transaction-kit-react";
import { Navbar } from "@/components/Navbar";
import { TransactionDialog } from "@/components/TransactionDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getContractAddress } from "@/lib/genlayer/client";
import { useWallet } from "@/lib/genlayer/wallet";
import { useInvalidateOrdersData } from "@/lib/hooks/useForeman";
import { parseGen } from "@/lib/utils/gen";
import { error, success } from "@/lib/utils/toast";

export default function NewOrderPage() {
  const router = useRouter();
  const { address, isConnected } = useWallet();
  const contractAddress = getContractAddress();
  const invalidate = useInvalidateOrdersData();

  const [title, setTitle] = useState("");
  const [spec, setSpec] = useState("");
  const [criteria, setCriteria] = useState("");
  const [escrow, setEscrow] = useState("1");
  const [deadlineDays, setDeadlineDays] = useState("3");
  const [reviewing, setReviewing] = useState(false);

  const isValid =
    title.trim().length > 0 &&
    spec.trim().length > 0 &&
    criteria.trim().length > 0 &&
    Number(deadlineDays) > 0 &&
    parseGen(escrow) > 0n;

  const tx = useMemo<SubmitInput | null>(
    () =>
      reviewing && contractAddress
        ? {
            kind: "write",
            address: contractAddress as `0x${string}`,
            method: "create_order",
            args: [title.trim(), spec.trim(), criteria.trim(), Number(deadlineDays)],
          }
        : null,
    [reviewing, contractAddress, title, spec, criteria, deadlineDays],
  );
  // Transaction Kit prices and signs the attached GEN separately from the
  // call itself — see TransactionDialog's `userValue` prop.
  const userValue = useMemo(() => parseGen(escrow), [escrow]);

  const handleReview = () => {
    if (!isConnected) {
      error("Connect your wallet first");
      return;
    }
    if (!isValid) {
      error("Fill in every field", { description: "Escrow must be greater than zero." });
      return;
    }
    setReviewing(true);
  };

  const handleDone = (status: TrackedStatus) => {
    if (status.successful !== false) {
      invalidate();
      success("Work order opened", { description: "Your GEN is now held in escrow." });
      setReviewing(false);
      router.push("/orders");
      return;
    }
    error("Failed to open the order", {
      description: "The transaction completed without a successful outcome.",
    });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-grow pt-24 pb-16 px-4 md:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Open a work order</h1>
          <p className="text-muted-foreground mb-8">
            Write the acceptance criteria as precisely as you&rsquo;d want a strict
            reviewer to check them — that&rsquo;s exactly what GenLayer&rsquo;s validators will do.
          </p>

          <div className="brand-card p-6 space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="e.g. Scrape competitor pricing"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={120}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="spec">Task specification</Label>
              <textarea
                id="spec"
                className="w-full min-h-[90px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                placeholder="What should the provider actually do? Be concrete about inputs, sources, and format."
                value={spec}
                onChange={(e) => setSpec(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="criteria">Acceptance criteria</Label>
              <textarea
                id="criteria"
                className="w-full min-h-[90px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                placeholder="This is the ONLY standard validators judge against. e.g. 'JSON must be valid, contain at least 10 items, every item must have sku and price.'"
                value={criteria}
                onChange={(e) => setCriteria(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="escrow">Escrow (GEN)</Label>
                <Input
                  id="escrow"
                  type="number"
                  min="0"
                  step="0.01"
                  value={escrow}
                  onChange={(e) => setEscrow(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="deadline">Deadline (days)</Label>
                <Input
                  id="deadline"
                  type="number"
                  min="1"
                  max="365"
                  value={deadlineDays}
                  onChange={(e) => setDeadlineDays(e.target.value)}
                />
              </div>
            </div>

            <Button className="w-full" size="lg" onClick={handleReview} disabled={!isValid}>
              Review & escrow {escrow || "0"} GEN
            </Button>
          </div>
        </div>
      </main>

      <TransactionDialog
        open={reviewing}
        onOpenChange={setReviewing}
        tx={tx}
        userValue={userValue}
        title="Confirm work order"
        description="This locks your GEN in escrow. It only leaves the contract through an AI-adjudicated verdict, an appeal, cancellation before a provider claims it, or an expiry refund."
        onDone={handleDone}
      />
    </div>
  );
}
