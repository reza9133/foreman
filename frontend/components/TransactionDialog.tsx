"use client";

import { GenLayerTransactionPanel, type SubmitInput, type TrackedStatus } from "@genlayer/transaction-kit-react";
import { useTransactionKit } from "@/lib/genlayer/kit";
import { useWallet } from "@/lib/genlayer/wallet";
import { GENLAYER_NETWORK } from "@/lib/genlayer/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";

/**
 * Shared wrapper around Transaction Kit's review + submit panel. Every
 * write action in Foreman (claim, cancel, expire, submit deliverable,
 * appeal) funnels through this same dialog so the person always gets the
 * same "review before you sign" experience, regardless of which action
 * they triggered.
 */
export function TransactionDialog({
  open,
  onOpenChange,
  tx,
  userValue,
  title,
  description,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tx: SubmitInput | null;
  /** GEN (in wei) to attach to the call — e.g. the escrow on create_order.
   *  Separate from `tx` itself: Transaction Kit prices and signs value
   *  transfers through this dedicated prop, not through SubmitInput. */
  userValue?: bigint;
  title: string;
  description: string;
  onDone: (status: TrackedStatus) => void;
}) {
  const { address } = useWallet();
  const kit = useTransactionKit(address);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="brand-card border-2 sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {kit && tx ? (
          <div className="mt-4">
            <GenLayerTransactionPanel
              kit={kit}
              tx={tx}
              userValue={userValue}
              network={GENLAYER_NETWORK.chainName}
              theme="dark"
              trackUntil="decided"
              onDone={onDone}
            />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground mt-4">
            Connect your wallet to continue.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
