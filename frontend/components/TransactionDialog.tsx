"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { TransactionPanel } from "./TransactionPanel";
import type { TxOutcome, TxRequest } from "@/lib/genlayer/transactions";
import { useWallet } from "@/lib/genlayer/wallet";
import { GENLAYER_NETWORK, switchToGenLayerNetwork } from "@/lib/genlayer/client";
import { Button } from "./ui/button";
import { SpinnerIcon } from "./ui/spinner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { error as toastError } from "@/lib/utils/toast";

/**
 * Shared wrapper around the review + submit panel. Every write action in
 * Foreman (claim, cancel, expire, submit deliverable, appeal) funnels
 * through this same dialog so the person always gets the same "review
 * before you sign" experience, regardless of which action they triggered.
 *
 * The panel trusts the wallet's currently-active chain. If MetaMask is
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
  tx: TxRequest | null;
  /** GEN (in wei) to attach to the call, e.g. the escrow on create_order.
   *  Kept separate from `tx`, which only describes the method and arguments. */
  userValue?: bigint;
  title: string;
  description: string;
  onDone: (outcome: TxOutcome) => void;
}) {
  const { address, isOnCorrectNetwork } = useWallet();
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

        {!address ? (
          <p className="text-sm text-muted-foreground mt-4">
            Connect your wallet to continue.
          </p>
        ) : !isOnCorrectNetwork ? (
          <div className="mt-4 space-y-3">
            <div className="flex items-start gap-2 rounded-md border border-amber-600/35 bg-amber-500/10 p-3 text-sm text-amber-200">
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
            <TransactionPanel
              tx={tx}
              account={address}
              userValue={userValue}
              network={GENLAYER_NETWORK.chainName}
              onDone={onDone}
            />
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
