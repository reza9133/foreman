"use client";

import { useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { Button } from "./ui/button";
import { SpinnerIcon } from "./ui/spinner";
import { formatGen } from "@/lib/utils/gen";
import {
  submitWrite,
  type TxOutcome,
  type TxProgress,
  type TxRequest,
} from "@/lib/genlayer/transactions";

function formatArg(arg: TxRequest["args"][number]): string {
  const text = typeof arg === "string" ? arg : String(arg);
  return text.length > 80 ? `${text.slice(0, 77)}…` : text;
}

/**
 * Review-then-sign panel for one contract write. It shows exactly what will
 * be sent (method, arguments, attached GEN), asks the wallet to sign, then
 * follows the transaction until Studionet consensus has accepted it.
 */
export function TransactionPanel({
  tx,
  account,
  userValue,
  network,
  onDone,
}: {
  tx: TxRequest;
  account: string;
  /** GEN (in wei) attached to the call, e.g. the escrow on `create_order`. */
  userValue?: bigint;
  network: string;
  onDone?: (outcome: TxOutcome) => void;
}) {
  const [progress, setProgress] = useState<TxProgress | null>(null);
  const [outcome, setOutcome] = useState<TxOutcome | null>(null);

  const busy = progress?.phase === "signing" || progress?.phase === "consensus";

  const handleSubmit = async () => {
    setOutcome(null);
    const result = await submitWrite(tx, account, userValue ?? 0n, setProgress);
    setOutcome(result);
    onDone?.(result);
  };

  return (
    <div className="space-y-4" data-testid="transaction-panel">
      <dl className="rounded-md border border-border bg-background/40 p-3 text-sm space-y-2">
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Network</dt>
          <dd>{network}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Call</dt>
          <dd className="font-mono">{tx.method}</dd>
        </div>
        {tx.args.map((arg, index) => (
          <div key={index} className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Argument {index + 1}</dt>
            <dd className="max-w-[60%] truncate text-right font-mono" title={String(arg)}>
              {formatArg(arg)}
            </dd>
          </div>
        ))}
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">GEN attached</dt>
          <dd className="font-mono">{formatGen(userValue ?? 0n)} GEN</dd>
        </div>
      </dl>

      {progress?.phase === "signing" && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
          <SpinnerIcon size="sm" /> Confirm the transaction in your wallet…
        </p>
      )}
      {progress?.phase === "consensus" && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
          <SpinnerIcon size="sm" /> Submitted. Waiting for the validators to reach consensus…
        </p>
      )}
      {outcome?.successful && (
        <p className="flex items-center gap-2 text-sm text-emerald-400" role="status">
          <CheckCircle2 className="w-4 h-4" /> Accepted by consensus.
        </p>
      )}
      {outcome && !outcome.successful && (
        <p className="flex items-start gap-2 text-sm text-red-400" role="alert">
          <XCircle className="w-4 h-4 mt-0.5 shrink-0" /> {outcome.error}
        </p>
      )}
      {progress?.hash && (
        <p className="break-all font-mono text-xs text-muted-foreground">tx {progress.hash}</p>
      )}

      {!outcome?.successful && (
        <Button className="w-full" onClick={handleSubmit} disabled={busy}>
          {busy ? "Working…" : outcome ? "Try again" : "Sign and submit"}
        </Button>
      )}
    </div>
  );
}
