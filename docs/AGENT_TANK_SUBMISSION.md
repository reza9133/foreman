# Agent Tank Hackathon — submission notes

## Track fit

**Primary: Onchain Justice.** The hackathon's own idea list asks for
*"Agentic marketplace disputes — escrow released when a deliverable meets
machine-readable terms."* That is, verbatim, what `contracts/foreman.py`
does: every work order carries its own acceptance criteria, and escrow is
released only once GenLayer's AI-validator consensus judges the delivered
evidence against that standard.

**Secondary: Agentic Commerce Infrastructure.** The same idea list asks for
*"SLA and uptime enforcement — API escrow that releases against signed logs
or decentralized monitoring"* and *"agent-liability insurance."* Foreman
generalizes both: any agent-to-agent commitment that can be reduced to
"deliver X, judged against criteria Y" fits the same contract, whether that
commitment is a one-off task, a recurring SLA, or a subcontracted piece of
a larger agent workflow.

## Why GenLayer specifically (the "when to use GenLayer" checklist)

- **Real on-chain consequence.** Every adjudication moves GEN — escrow
  payout, split, or refund — not just a status flag.
- **Outcome requires judgment.** "Does this deliverable satisfy these
  acceptance criteria" is inherently a judgment call over unstructured
  evidence (API responses, rendered pages, free-text reports), not
  something a deterministic `if` statement can check.
- **Evidence is independently checkable.** Every validator fetches the
  same `deliverable_url` itself — nothing about the verdict depends on
  data only the leader or a centralized backend can see.
- **Neutral consensus matters.** Client and provider are counterparties
  with opposite incentives; neither should be trusted to grade their own
  work, and neither has to trust the other's backend either.
- **The result is explicit and structured.** The leader/validator function
  returns `{accepted, payout_percent, reasoning, red_flags}` — validators
  compare the decision fields (`accepted`, `payout_percent`, within
  tolerance), never the free-text reasoning, which is exactly the
  "partial field matching" pattern GenLayer's own docs recommend for
  Equivalence Principle design.

## Answering the review checklist directly

The hackathon's build-period guidance asks builders to check these before
submitting. Here's where each is answered in this repo:

- **Does my app actually call a real GenLayer contract?**
  Yes — every write in the frontend (`create_order`, `claim_order`,
  `cancel_order`, `submit_deliverable`, `appeal_delivery`, `expire_order`)
  goes through `@genlayer/transaction-kit-react`'s
  `<GenLayerTransactionPanel>` against the deployed contract address in
  `NEXT_PUBLIC_CONTRACT_ADDRESS`. No mocked backend, no simulated state.

- **Why does decentralized judgment matter to this problem?**
  See "Why this needs decentralized judgment, not a backend" in the root
  README — a centralized checker can verify a status code, not whether a
  scraped dataset is actually complete or a report actually answers the
  brief.

- **Does the contract maintain meaningful state, and does its validator
  check the meaningful outcome?**
  The contract's state *is* the order book: full lifecycle status,
  escrow amount, deadline, delivered evidence, verdict, reasoning, and
  on-chain provider reputation, all readable via view methods. The
  validator in `_adjudicate()` doesn't check that the leader's JSON
  merely parses — it independently re-fetches the evidence and
  re-derives its own `{accepted, payout_percent}`, then compares against
  the leader's. `tests/direct/test_foreman.py::test_validator_disagrees_*`
  prove this concretely: a validator landing outside the payout tolerance,
  or reaching the opposite accept/reject call, returns `False` and forces
  a leader rotation rather than agreeing by default.

- **Does the repository build and work?**
  `genvm-lint check contracts/foreman.py` passes; `pytest tests/direct/ -v`
  passes end to end (30+ cases) against the pinned SDK runtime. See the
  root README's Quick Start for the exact commands, in order, from a clean
  checkout through a running frontend.

- **What have I built beyond the starter or boilerplate?**
  Starting point was `genlayer-project-boilerplate`'s `v2-dev` branch
  (Transaction Kit RC2 wiring, Studio Next network config). Everything
  domain-specific is new: the entire contract, its full test suite, the
  order-book frontend (landing page, browse/filter, create-order escrow
  flow, per-order action hub with role-aware actions, how-it-works page),
  and the adjudication design itself (partial-field-matching consensus
  over `{accepted, payout_percent}`, the appeal-with-reputation-reversal
  mechanic, and permissionless expiry for silent providers).

- **Can someone use the frontend and follow clear instructions to verify
  the result?**
  Yes — root README "Quick start" walks from a clean checkout to a running
  app against Studio Next; the in-app **How it works** page explains the
  same flow for a non-technical reviewer without needing to read the repo.

## Security notes

- **Checks-effects-interactions.** `_resolve()` finalizes every piece of
  order and reputation state *before* the GEN transfer is emitted — the
  same pattern used throughout for `cancel_order` and `expire_order`.
- **Prompt-injection awareness.** The adjudication prompt explicitly frames
  fetched evidence as evidence to judge, not instructions to follow, and
  asks the model to flag manipulation attempts in `red_flags` rather than
  silently comply with them.
- **No admin path.** There is no owner-only function that can move escrow.
  The only paths GEN can take out of the contract are: an adjudicated
  verdict, one appeal, a pre-claim cancellation by the client, or a
  post-deadline expiry — all permissionless or counterparty-gated, none
  admin-gated.
- **Appeal is self-funded, not a second draw on the pool.** The first
  resolution pays out the order's entire escrow the moment it settles, so a
  naive re-run of `_resolve()` on appeal would have to fund a second full
  settlement out of the contract's general balance — i.e. out of other
  clients' still-open orders. `appeal_delivery` is `payable` and requires
  the appellant to attach GEN equal to the order's original `escrow_wei`
  before re-adjudicating, so the appeal's settlement is funded by that
  fresh deposit instead. See `test_appeal_requires_matching_deposit` in
  `tests/direct/test_foreman.py`.
