import { createClient } from "genlayer-js";
import { TransactionStatus } from "genlayer-js/types";
import { GENLAYER_CHAIN } from "./network";
import { getEthereumProvider } from "./client";

/**
 * A single contract write the person is about to sign. Every state-changing
 * call in Foreman (create, claim, cancel, expire, submit, appeal, abandon,
 * extend) is described by one of these and sent through `submitWrite`.
 */
export interface TxRequest {
  kind: "write";
  address: `0x${string}`;
  method: string;
  args: Array<string | number | bigint | boolean>;
}

export type TxPhase = "signing" | "consensus" | "decided" | "failed";

export interface TxProgress {
  phase: TxPhase;
  hash?: string;
}

export interface TxOutcome {
  /** "decided" once consensus accepted the transaction, "failed" otherwise. */
  phase: "decided" | "failed";
  /** True only when consensus accepted the transaction AND the contract ran without reverting. */
  successful: boolean;
  hash?: string;
  statusName?: string;
  error?: string;
}

type Receipt = {
  status?: number | string;
  statusName?: string;
  txExecutionResultName?: string;
  consensus_data?: { leader_receipt?: Array<{ execution_result?: string }> };
};

const ACCEPTED_STATUS_NUMBERS = new Set([5, 7]); // ACCEPTED, FINALIZED
const ACCEPTED_STATUS_NAMES = new Set(["ACCEPTED", "FINALIZED"]);

/**
 * A transaction is only a success when consensus accepted it AND the contract
 * did not revert. Studio reports reverts as an accepted transaction whose
 * leader receipt carries `execution_result: "ERROR"`, so status alone is not
 * enough.
 */
export function isSuccessfulReceipt(receipt: Receipt | null | undefined): boolean {
  if (!receipt) return false;
  const accepted =
    ACCEPTED_STATUS_NUMBERS.has(Number(receipt.status)) ||
    (receipt.statusName !== undefined && ACCEPTED_STATUS_NAMES.has(receipt.statusName));
  if (!accepted) return false;

  const leader = receipt.consensus_data?.leader_receipt?.[0];
  if (leader?.execution_result !== undefined) {
    return leader.execution_result === "SUCCESS";
  }
  return receipt.txExecutionResultName !== "FINISHED_WITH_ERROR";
}

/** Short, human-readable text for a wallet or RPC error. */
export function describeTxError(error: unknown): string {
  const e = error as { code?: number; shortMessage?: string; message?: string } | undefined;
  if (e?.code === 4001) return "You rejected the request in your wallet.";
  return e?.shortMessage || e?.message || "The transaction could not be submitted.";
}

/**
 * Sign and submit a write with the connected wallet, then wait until Studionet
 * consensus has accepted it. `onProgress` fires as the transaction moves from
 * waiting for the wallet to waiting for the validators.
 */
export async function submitWrite(
  request: TxRequest,
  account: string,
  value: bigint = 0n,
  onProgress?: (progress: TxProgress) => void,
): Promise<TxOutcome> {
  const provider = getEthereumProvider();
  if (!provider) {
    return { phase: "failed", successful: false, error: "No wallet is connected." };
  }

  let hash: `0x${string}` | undefined;
  try {
    onProgress?.({ phase: "signing" });
    // genlayer-js signs through `provider` (the wallet the person picked) and
    // refuses to send when the wallet is on another chain.
    const client = createClient({
      chain: GENLAYER_CHAIN,
      account: account as `0x${string}`,
      provider: provider as never,
    } as never);

    hash = (await client.writeContract({
      address: request.address,
      functionName: request.method,
      args: request.args as never,
      value,
    })) as `0x${string}`;

    onProgress?.({ phase: "consensus", hash });
    const receipt = (await client.waitForTransactionReceipt({
      hash: hash as never,
      status: TransactionStatus.ACCEPTED,
      interval: 3000,
      retries: 200,
    })) as Receipt;

    const successful = isSuccessfulReceipt(receipt);
    const outcome: TxOutcome = {
      phase: successful ? "decided" : "failed",
      successful,
      hash,
      statusName: receipt.statusName,
      error: successful ? undefined : "The contract rejected this call (it reverted).",
    };
    onProgress?.({ phase: outcome.phase, hash });
    return outcome;
  } catch (error) {
    onProgress?.({ phase: "failed", hash });
    return { phase: "failed", successful: false, hash, error: describeTxError(error) };
  }
}
