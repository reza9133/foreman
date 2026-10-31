# Changelog

## 2.0.1 - Studionet compatibility

Foreman v2 is deployed and verified on Studionet (chain id `61999`,
`https://studio.genlayer.com/api`) at
`0x239c12eBC52100196486C5E966723AB169555393`. The live E2E run in
`reports/e2e-report.md` passed 44/44 checks against it.

Why the live runs used to fail: the repository was pinned to a release-candidate
toolchain (`genlayer-py` 0.19 RC, `genlayer-test` 0.30 RC, `genvm-linter`
0.11.1 RC, `genlayer-js` 2.0 RC, Transaction Kit RC) that belongs to a different
Studio deployment than the stable hosted Studionet.

### Toolchain
- `requirements.txt`: stable `genlayer-py` 0.16.3, `genlayer-test` 0.29.2,
  `genvm-linter` 0.11.0. `fastapi`/`uvicorn`/`httpx` (simulator only) removed.
- Frontend: `genlayer-js` 1.1.8; Transaction Kit and wagmi removed.
- `deploy/deployScript.ts`: `waitForTransactionReceipt({ status })` and no
  deprecated consensus initialisation.
- CI runs the linter, the direct tests and the frontend checks.

### Contract
- `contracts/foreman.py` is ASCII only. The stable SDK hex-encodes the source as
  ASCII when it deploys or fetches the schema, so the em-dashes in the file made
  every deploy and schema call raise `UnicodeEncodeError`.
- Types use the documented `u256` / `Address` / `TreeMap` names with
  `from genlayer import *`.
- Network config is Studionet only: `gltest.config.yaml` defaults to
  `studionet`; `localnet` declares `chain_type: localnet` so it no longer
  inherits Studionet's chain; `config/genlayer_config.py` exposes `STUDIONET_*`.

### Live tests and frontend
- The live suites fund their throw-away accounts from the Studio faucet before
  the first transaction (`tests/integration/e2e_support.py: ensure_funded`).
  Studionet accounts are random per run and start empty, so every payable call
  used to fail.
- Removed the glsim `--offline` mode and `scripts/glsim_offline.py`; they
  depended on release-candidate internals.
- Writes use `TransactionPanel` + `lib/genlayer/transactions.ts`, which sign
  through the selected wallet, wait for `ACCEPTED` and treat a contract revert
  as a failure.
- Frontend tests: 43.

## 2.0.0 — Milestone: hardened contract, multi-page app, live E2E

### Contract
- Evidence URLs are validated before any fetch: http(s) only, no credentials,
  no single-label or `.local`/`.internal` hosts, no private, loopback,
  link-local, CGNAT or multicast IPv4 (including decimal/hex/octal tricks).
- Evidence, delivery note and appeal context reach the model inside fences
  derived from a hash of their own content, so they cannot forge a closing tag.
- Input caps on every free-text field, a 0.001 GEN minimum escrow, enforced
  deadlines (no submission after the deadline), a 7-day appeal window.
- Non-2xx or empty evidence reverts instead of being judged.
- A validator agrees with a leader failure only if it fails too.
- A claimed order that expires is counted `abandoned`, not `rejected`.
- New writes: `abandon_claim`, `extend_deadline`.
- New views: `version`, `get_orders_page`, `get_top_providers`, `get_stats`,
  `can_appeal`.
- Orders now carry `criteria_results`, `evidence_fingerprint`,
  `evidence_chars`, `evidence_truncated`, `appeal_deadline`, `extensions` and a
  `timeline` of `{t, event, actor, detail}`.
- Fixed: `get_orders_by_client/provider("")` leaked the whole open book.
- Fixed: the appeal now adjudicates before it does bookkeeping.
- **Storage layout changed — v2 must be deployed as a new contract.**

### Frontend
- New pages: `/dashboard`, `/lifecycle`, `/docs`, `/providers/detail`;
  reworked landing, order book, order detail, create and leaderboard pages.
- Lazy-loaded WebGL escrow scene (falls back cleanly without WebGL), CSS 3D
  tilt, scroll reveals, count-up numbers, animated SVG charts. All motion
  respects `prefers-reduced-motion`.
- Performance: paginated on-chain reads, O(1) stats, no always-running
  page-level animation, Three.js loaded only when the scene is on screen.

### Tests and tooling
- Direct tests 30 → 211, including adversarial suites and a fuzz that checks
  funds are conserved. Frontend tests: 42.
- `scripts/e2e_live.py`: live end-to-end run with a committed report.
- CI workflow and a manual E2E workflow that commits the report.
