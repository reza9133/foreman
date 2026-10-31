import type { OrderStatus } from "./contracts/types";

export type Caller = "client" | "provider" | "anyone" | "consensus";

export interface Transition {
  id: string;
  method: string;
  from: OrderStatus | "none";
  to: OrderStatus;
  caller: Caller;
  guard: string;
  payable?: string;
  effect: string;
}

/**
 * The contract's order state machine, as data. The /lifecycle page renders it,
 * and tests/direct/test_docs_consistency.py checks every `method` here exists
 * on the contract, so the documentation cannot drift from the code.
 */
export const TRANSITIONS: Transition[] = [
  {
    id: "create",
    method: "create_order",
    from: "none",
    to: "open",
    caller: "client",
    payable: "escrow ≥ 0.001 GEN",
    guard: "Non-empty, length-capped title/spec/criteria; 1–365 day deadline.",
    effect: "GEN is locked in the contract; order and timeline are recorded.",
  },
  {
    id: "claim",
    method: "claim_order",
    from: "open",
    to: "claimed",
    caller: "provider",
    guard: "Before the deadline; the client cannot claim their own order.",
    effect: "The provider commits to deliver by the deadline.",
  },
  {
    id: "abandon",
    method: "abandon_claim",
    from: "claimed",
    to: "open",
    caller: "provider",
    guard: "Only the claimed provider, before the deadline.",
    effect: "Order returns to the open pool; provider's abandoned counter rises.",
  },
  {
    id: "extend",
    method: "extend_deadline",
    from: "claimed",
    to: "claimed",
    caller: "client",
    guard: "Before the deadline; 1–30 days per call; total lifetime ≤ 365 days.",
    effect: "Deadline moves later. (Also allowed while the order is open.)",
  },
  {
    id: "cancel",
    method: "cancel_order",
    from: "open",
    to: "cancelled",
    caller: "client",
    guard: "Only while nobody has claimed it.",
    effect: "Full escrow refunded to the client.",
  },
  {
    id: "submit",
    method: "submit_deliverable",
    from: "claimed",
    to: "completed",
    caller: "provider",
    guard:
      "Before the deadline; public http(s) evidence URL; evidence must return 2xx and a non-empty body. Verdict ≥ 50% → completed, otherwise rejected.",
    effect:
      "Validators fetch the evidence, reach consensus on a payout %, and GEN splits provider/client in the same transaction.",
  },
  {
    id: "reject",
    method: "submit_deliverable",
    from: "claimed",
    to: "rejected",
    caller: "consensus",
    guard: "Consensus payout below 50%.",
    effect: "Provider receives the (possibly partial) share; remainder refunds the client.",
  },
  {
    id: "expire",
    method: "expire_order",
    from: "claimed",
    to: "expired",
    caller: "anyone",
    guard: "Deadline passed without a delivery (also applies to unclaimed open orders).",
    effect: "Full escrow refunded to the client; a claimed provider is marked abandoned.",
  },
  {
    id: "appeal",
    method: "appeal_delivery",
    from: "rejected",
    to: "completed",
    caller: "client",
    payable: "exactly the original escrow",
    guard: "Within 7 days of the first verdict; once per order; context ≤ 2000 chars.",
    effect:
      "Re-adjudicates with fresh evidence and the client's context; the second verdict is final and may flip the outcome either way.",
  },
];

export const STATES: { id: OrderStatus; label: string; terminal: boolean; blurb: string }[] = [
  { id: "open", label: "Open", terminal: false, blurb: "Escrow locked, waiting for a provider." },
  { id: "claimed", label: "Claimed", terminal: false, blurb: "A provider is working against the deadline." },
  { id: "completed", label: "Completed", terminal: true, blurb: "Consensus accepted the delivery (payout ≥ 50%)." },
  { id: "rejected", label: "Rejected", terminal: true, blurb: "Consensus rejected the delivery (payout < 50%)." },
  { id: "cancelled", label: "Cancelled", terminal: true, blurb: "Client cancelled before any claim." },
  { id: "expired", label: "Expired", terminal: true, blurb: "Deadline passed; escrow refunded." },
];

/** Scripted walkthroughs the /lifecycle page can play. Each step is a transition id. */
export const SCENARIOS: { id: string; title: string; summary: string; steps: string[] }[] = [
  {
    id: "happy",
    title: "Happy path",
    summary: "Escrow, claim, deliver, paid in full.",
    steps: ["create", "claim", "submit"],
  },
  {
    id: "partial",
    title: "Partial credit",
    summary: "Evidence meets most criteria: the escrow splits proportionally.",
    steps: ["create", "claim", "submit"],
  },
  {
    id: "appeal",
    title: "Appeal flips a rejection",
    summary: "Client appeals inside the window with a fresh deposit; the final verdict reverses.",
    steps: ["create", "claim", "reject", "appeal"],
  },
  {
    id: "abandon",
    title: "Provider walks away",
    summary: "Claim released, order reopens, someone else delivers.",
    steps: ["create", "claim", "abandon", "claim", "submit"],
  },
  {
    id: "silent",
    title: "Provider goes silent",
    summary: "Deadline passes with no delivery: anyone can trigger the refund.",
    steps: ["create", "claim", "expire"],
  },
];

export function transitionsFrom(state: OrderStatus | "none"): Transition[] {
  return TRANSITIONS.filter((t) => t.from === state);
}

export function transitionById(id: string): Transition | undefined {
  return TRANSITIONS.find((t) => t.id === id);
}

/** Walk a scenario and return the state after each step (state before the first step is "none"). */
export function walk(steps: string[]): OrderStatus[] {
  const out: OrderStatus[] = [];
  for (const id of steps) {
    const t = transitionById(id);
    if (!t) throw new Error(`unknown transition ${id}`);
    out.push(t.to);
  }
  return out;
}
