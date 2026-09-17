export type OrderStatus =
  | "open"
  | "claimed"
  | "completed"
  | "rejected"
  | "cancelled"
  | "expired";

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
}

export interface ProviderReputation {
  completed: number;
  rejected: number;
  disputed: number;
  total_earned_wei: string;
}
