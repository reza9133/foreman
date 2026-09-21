"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { GenLayerTransactionPanel, type SubmitInput, type TrackedStatus } from "@genlayer/transaction-kit-react";
import { useTransactionKit } from "@/lib/genlayer/kit";
import { useWallet } from "@/lib/genlayer/wallet";
import { GENLAYER_NETWORK, switchToGenLayerNetwork } from "@/lib/genlayer/client";
import { Button } from "./ui/button";
import { SpinnerIcon } from "./ui/spinner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { error as toastError } from "@/lib/utils/toast";

/**
 * Shared wrapper around Transaction Kit's review + submit panel. Every
 * write action in Foreman (claim, cancel, expire, submit deliverable,
 * appeal) funnels through this same dialog so the person always gets the
 * same "review before you sign" experience, regardless of which action
 * they triggered.
 *
 * Transaction Kit trusts the wallet's currently-active chain — it does
 * not itself verify or switch networks before signing. If MetaMask is
 * still on a different chain (e.g. a stale mainnet session from before
 * this dapp was opened), `eth_sendTransaction` sends the escrow value as
 * that chain's native currency instead of GEN, which both misprices the
 * transaction and trips wallet security warnings (e.g. Blockaid flagging
 * a multi-thousand-dollar "malicious transfer"). So this component is the
 * one place in the app that gates every write behind an explicit network
 * check, and offers a one-click switch instead of ever letting the panel
 * render against the wrong chain.
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
  const { address, isOnCorrectNetwork } = useWallet();
  const kit = useTransactionKit(address);
  const [switching, setSwitching] = useState(false);

  const handleSwitchNetwork = async () => {
    setSwitching(true);
    try {
      await switchToGenLayerNetwork();
    } catch (err: any) {
      toastError("Couldn't switch network", {
        description: err?.message || "Please switch networks manually in your wallet.",
      });
    } finally {
      setSwitching(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="brand-card border-2 sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {!kit ? (
          <p className="text-sm text-muted-foreground mt-4">
            Connect your wallet to continue.
          </p>
        ) : !isOnCorrectNetwork ? (
          <div className="mt-4 space-y-3">
            <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                Your wallet isn&rsquo;t on {GENLAYER_NETWORK.chainName}. Signing from the
                wrong network would send this value as that chain&rsquo;s own currency,
                not GEN — switch first so your wallet prices and labels this
                correctly.
              </span>
            </div>
            <Button className="w-full" onClick={handleSwitchNetwork} disabled={switching}>
              {switching ? (
                <>
                  <SpinnerIcon size="sm" /> Switching…
                </>
              ) : (
                `Switch to ${GENLAYER_NETWORK.chainName}`
              )}
            </Button>
          </div>
        ) : tx ? (
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
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
