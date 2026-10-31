export type OrderStatus =
  | "open"
  | "claimed"
  | "completed"
  | "rejected"
  | "cancelled"
  | "expired";

export const ORDER_STATUSES: OrderStatus[] = [
  "open",
  "claimed",
  "completed",
  "rejected",
  "cancelled",
  "expired",
];

/** One validator-attested criterion from the verdict checklist (v2). */
export interface CriterionResult {
  criterion: string;
  met: boolean;
}

/** One entry of an order's on-chain timeline (v2). */
export interface TimelineEntry {
  t: number;
  event: string;
  actor: string;
  detail: string;
}

export interface Order {
  id: number;
  client: string;
  provider: string;
  title: string;
  spec: string;
  acceptance_criteria: string;
  deliverable_url: string;
  deliverable_note: string;
  escrow_wei: string;
  deadline: number;
  status: OrderStatus;
  payout_percent: number;
  verdict_reasoning: string;
  red_flags: string[];
  appeal_used: boolean;
  created_at: number;
  claimed_at: number;
  delivered_at: number;
  resolved_at: number;
  // v2 fields. Optional so orders written by a v1 deployment still render.
  criteria_results?: CriterionResult[];
  evidence_fingerprint?: string;
  evidence_chars?: number;
  evidence_truncated?: boolean;
  appeal_deadline?: number;
  extensions?: number;
  timeline?: TimelineEntry[];
}

export interface ProviderReputation {
  completed: number;
  rejected: number;
  disputed: number;
  abandoned?: number;
  total_earned_wei: string;
  reliability_bps?: number;
}

export interface TopProvider extends ProviderReputation {
  address: string;
  reliability_bps: number;
}

export interface OrdersPage {
  orders: Order[];
  total_matching: number;
  total: number;
}

export interface ProtocolStats {
  version: string;
  order_count: number;
  settled_count: number;
  appeal_count: number;
  total_escrowed_wei: string;
  total_paid_to_providers_wei: string;
  total_refunded_wei: string;
}

export const EMPTY_STATS: ProtocolStats = {
  version: "—",
  order_count: 0,
  settled_count: 0,
  appeal_count: 0,
  total_escrowed_wei: "0",
  total_paid_to_providers_wei: "0",
  total_refunded_wei: "0",
};

export const EMPTY_REPUTATION: ProviderReputation = {
  completed: 0,
  rejected: 0,
  disputed: 0,
  abandoned: 0,
  total_earned_wei: "0",
  reliability_bps: 0,
};
