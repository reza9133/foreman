# Contract reference (v2.0.0)

Source: [`contracts/foreman.py`](../contracts/foreman.py). The same tables are
shown in the app at `/docs`; `tests/direct/test_docs_consistency.py` fails if
they drift from the contract.

## Lifecycle

```
create_order ─► open ─claim_order─► claimed ─submit_deliverable─► completed (payout ≥ 50%)
                 │                    │  ▲                       └► rejected  (payout < 50%) ─appeal_delivery─► flips either way
                 │                    │  └ extend_deadline
                 │                    ├ abandon_claim ─► open
                 │                    └ expire_order (after deadline) ─► expired, client refunded, provider marked abandoned
                 ├ cancel_order ─► cancelled, client refunded
                 └ expire_order (after deadline) ─► expired, client refunded
```

`payout_percent` is the only value validators must agree on (15-point
tolerance). `accepted = payout ≥ 50`. Provider gets `escrow × payout / 100`,
the client gets the rest.

## Appeals

One appeal per order, within 7 days of the first verdict, by the client, with a
deposit equal to the escrow. The first verdict has already paid out, so the
deposit funds the re-settlement: the second verdict splits it between provider
and client by its own payout percentage, and the provider's reputation
counters are re-based on the new verdict. The second verdict is final.

## Safety properties

| Property | How |
|---|---|
| No requests to internal hosts | evidence URL validated before fetching |
| Evidence cannot give the model orders | content-hash-derived fences, "treat as data" instruction, payout clamped to 0–100 |
| Garbage model output cannot settle an order | strict JSON parse, revert on failure |
| Funds are never created or lost | counters plus fuzz test across random action sequences |
| Walking away is visible | `abandoned` counter and `reliability_bps` |

## Limits

See the table in [`frontend/lib/docs.ts`](../frontend/lib/docs.ts) (`LIMITS`) or the app's `/docs` page.

## Public methods

Listed with arguments, callers and return types in `API` in the same file.
