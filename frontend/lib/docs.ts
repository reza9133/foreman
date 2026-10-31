export interface ApiMethod {
  name: string;
  kind: "write" | "payable" | "view";
  args: string;
  returns: string;
  caller: string;
  summary: string;
  since: "v1" | "v2";
}

/** Public contract surface. tests/direct/test_docs_consistency.py asserts this matches foreman.py exactly. */
export const API: ApiMethod[] = [
  { name: "create_order", kind: "payable", args: "title, spec, acceptance_criteria, deadline_days", returns: "int (order id)", caller: "anyone", summary: "Opens a work order and locks the attached GEN (min 0.001) as escrow.", since: "v1" },
  { name: "claim_order", kind: "write", args: "order_id", returns: "—", caller: "provider (not the client)", summary: "Commits to deliver before the deadline.", since: "v1" },
  { name: "abandon_claim", kind: "write", args: "order_id", returns: "—", caller: "claimed provider", summary: "Releases the claim; the order reopens and the provider's abandoned counter rises.", since: "v2" },
  { name: "extend_deadline", kind: "write", args: "order_id, extra_days", returns: "—", caller: "client", summary: "Adds 1–30 days to an open or claimed order, capped at 365 days of total lifetime.", since: "v2" },
  { name: "cancel_order", kind: "write", args: "order_id", returns: "—", caller: "client", summary: "Refunds the escrow while the order is still unclaimed.", since: "v1" },
  { name: "expire_order", kind: "write", args: "order_id", returns: "—", caller: "anyone", summary: "After the deadline, refunds the client. A claimed provider is marked abandoned.", since: "v1" },
  { name: "submit_deliverable", kind: "write", args: "order_id, deliverable_url, deliverable_note", returns: "—", caller: "claimed provider", summary: "Validates the URL, runs adjudication and pays out atomically. Rejected after the deadline.", since: "v1" },
  { name: "appeal_delivery", kind: "payable", args: "order_id, additional_context", returns: "—", caller: "client", summary: "One appeal within 7 days of the first verdict; attach exactly the original escrow.", since: "v1" },
  { name: "version", kind: "view", args: "—", returns: "str", caller: "anyone", summary: "Contract version string.", since: "v2" },
  { name: "get_order", kind: "view", args: "order_id", returns: "dict", caller: "anyone", summary: "One order including timeline, checklist and evidence fingerprint.", since: "v1" },
  { name: "get_order_count", kind: "view", args: "—", returns: "int", caller: "anyone", summary: "Number of orders ever opened.", since: "v1" },
  { name: "get_all_orders", kind: "view", args: "—", returns: "list", caller: "anyone", summary: "Every order, oldest first. Cost grows with the book; prefer get_orders_page.", since: "v1" },
  { name: "get_orders_page", kind: "view", args: "offset, limit, status", returns: "{orders, total_matching, total}", caller: "anyone", summary: "Newest-first page (limit clamped to 50) with optional status filter.", since: "v2" },
  { name: "get_orders_by_client", kind: "view", args: "address", returns: "list", caller: "anyone", summary: "Orders opened by an address. Empty address returns [].", since: "v1" },
  { name: "get_orders_by_provider", kind: "view", args: "address", returns: "list", caller: "anyone", summary: "Orders claimed by an address. Empty address returns [] (v1 leaked the open book).", since: "v1" },
  { name: "get_open_orders", kind: "view", args: "—", returns: "list", caller: "anyone", summary: "Orders still waiting for a provider.", since: "v1" },
  { name: "get_provider_reputation", kind: "view", args: "address", returns: "dict", caller: "anyone", summary: "completed / rejected / disputed / abandoned / total_earned_wei / reliability_bps.", since: "v1" },
  { name: "get_top_providers", kind: "view", args: "limit", returns: "list", caller: "anyone", summary: "Ranked by completions, then earnings (limit clamped to 50).", since: "v2" },
  { name: "get_stats", kind: "view", args: "—", returns: "dict", caller: "anyone", summary: "O(1) protocol counters: volume, payouts, refunds, verdicts, appeals.", since: "v2" },
  { name: "is_expired", kind: "view", args: "order_id", returns: "bool", caller: "anyone", summary: "True when an open/claimed order is past its deadline.", since: "v1" },
  { name: "can_appeal", kind: "view", args: "order_id", returns: "bool", caller: "anyone", summary: "True while the appeal window is open and unused.", since: "v2" },
];

export interface Limit {
  name: string;
  value: string;
  why: string;
}

export const LIMITS: Limit[] = [
  { name: "MIN_ESCROW_WEI", value: "10^15 (0.001 GEN)", why: "Dust orders cost every validator storage and reads while carrying no economic weight." },
  { name: "MAX_TITLE_CHARS", value: "120", why: "Storage and UI bound." },
  { name: "MAX_SPEC_CHARS", value: "4000", why: "Prompt-stuffing and storage bound." },
  { name: "MAX_CRITERIA_CHARS", value: "2000", why: "Prompt-stuffing and storage bound." },
  { name: "MAX_NOTE_CHARS", value: "1000", why: "The delivery note is untrusted text that reaches the model." },
  { name: "MAX_CONTEXT_CHARS", value: "2000", why: "Appeal context is untrusted text that reaches the model." },
  { name: "MAX_URL_CHARS", value: "500", why: "Bounds stored URL size." },
  { name: "MAX_EVIDENCE_CHARS", value: "15000", why: "Caps what is decoded and sent to the model; truncation is flagged on the order." },
  { name: "PAYOUT_TOLERANCE", value: "15 points", why: "Two honest validators may disagree by this much on the payout and still reach consensus." },
  { name: "APPEAL_WINDOW", value: "7 days", why: "After this the verdict is final, so providers can rely on a settled result." },
  { name: "MAX_EXTENSION_DAYS", value: "30 per call", why: "Prevents silent open-ended extensions." },
  { name: "MAX_ORDER_LIFETIME", value: "365 days", why: "Hard ceiling on how long escrow can be locked." },
  { name: "MAX_PAGE_SIZE", value: "50", why: "Bounds the cost of a paginated read." },
];

export interface ThreatRow {
  threat: string;
  defence: string;
  test: string;
}

export const THREATS: ThreatRow[] = [
  { threat: "Request forgery: evidence URL aims every validator at an internal or metadata endpoint", defence: "http(s) only; no credentials; no single-label, .local/.internal hosts; private, loopback, link-local, CGNAT and multicast IPv4 refused, including decimal/hex/octal obfuscations", test: "test_hostile_urls_are_rejected_before_any_fetch (46 cases)" },
  { threat: "Prompt injection through the evidence page", defence: "Evidence is wrapped in a boundary tag derived from the SHA-256 of its own bytes, so it cannot forge its closing tag", test: "test_evidence_cannot_forge_its_own_fence" },
  { threat: "Prompt injection through the delivery note or appeal context", defence: "Both are fenced with their own content-derived tags and labelled untrusted", test: "test_delivery_note_is_fenced…, test_appeal_context_is_fenced" },
  { threat: "Malformed or malicious model output", defence: "Payout clamped to 0–100; non-numeric or missing payout reverts; JSON fences stripped; oversized fields truncated; checklist is informational only", test: "test_payout_is_clamped_to_0_100, test_garbage_llm_output_reverts_…" },
  { threat: "Evidence that is an error page or empty", defence: "Non-2xx and empty bodies revert instead of being judged, so the provider can retry", test: "test_non_2xx_evidence_reverts_…, test_empty_evidence_reverts" },
  { threat: "Late delivery racing the client's refund", defence: "submit_deliverable rejects after the deadline", test: "test_cannot_submit_after_deadline" },
  { threat: "Rogue leader pays itself for junk", defence: "Every validator re-fetches and re-judges; agreement requires payouts within tolerance; a leader-reported failure is accepted only if the validator fails the same way", test: "test_validator_does_not_trust_leader_judgment, test_validator_accepts_leader_failure_only_if_it_also_fails" },
  { threat: "Value leaks or double payouts", defence: "Checks-effects-interactions; appeal needs an exact fresh deposit; adjudicate before any bookkeeping", test: "test_funds_are_conserved_under_random_action_sequences (12 seeds)" },
  { threat: "Stranger moves someone else's order", defence: "Per-method caller checks on every write", test: "test_stranger_cannot_do_privileged_things" },
  { threat: "Unbounded reads and storage bloat", defence: "Length caps, minimum escrow, paginated views, O(1) stats", test: "test_length_caps, test_pagination_clamps_hostile_arguments" },
];
