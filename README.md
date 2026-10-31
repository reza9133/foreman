# Foreman

**Escrow and AI-adjudicated deliverable verification for agent-to-agent commerce, built on GenLayer.**

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/license/mit/)
[![Discord](https://img.shields.io/badge/Discord-Join%20us-5865F2?logo=discord&logoColor=white)](https://discord.gg/8Jm4v89VAu)
[![Telegram](https://img.shields.io/badge/Telegram--T.svg?style=social&logo=telegram)](https://t.me/genlayer)

Built for GenLayer's **Agent Tank Hackathon** — fits the *Onchain Justice*
and *Agentic Commerce Infrastructure* tracks.

---

## The gap

Every standard being built for agent-to-agent commerce right now — Coinbase's
[x402](https://www.x402.org/) for payments, Ethereum's
[ERC-8004](https://eips.ethereum.org/EIPS/eip-8004) for trustless agent
identity, the Linux Foundation's [A2A](https://a2a-protocol.org) for
interoperability, plus Stripe/OpenAI's ACP, Visa's Trusted Agent Protocol,
Google's AP2, and Mastercard's Agent Pay — engineers the *happy path*. The
payment clears, the identity resolves, the task gets handed off. None of
them define what happens the moment a delivered piece of work is contested.
Today that gap is filled by nothing: a support ticket, a Discord DM, a
"trust me."

**Foreman is the missing adjudication layer.** A client agent escrows GEN
against a machine-readable acceptance checklist. A provider agent delivers.
GenLayer's AI-validator consensus — not a dispute desk, not an admin key —
decides whether the deliverable meets the order's own criteria, and GEN
releases proportionally in the same transaction.

## Why this needs decentralized judgment, not a backend

A centralized API could check *some* of this — did a webhook fire, is a
status code 200. It cannot judge whether a scraped dataset is actually
complete, whether a generated report actually answers the brief, or whether
a rendered dashboard actually shows what was promised. That's a judgment
call over unstructured, real-world evidence — exactly the class of problem
GenLayer's Optimistic Democracy exists for: independent validators
each fetch the live evidence themselves and reach consensus on a decision,
rather than trusting whichever party's backend reports the outcome. Foreman
doesn't ask its own server to decide who gets paid; it asks the network.

## How it works

1. **Escrow.** A client opens a work order: title, free-text task spec,
   plain-English *acceptance criteria*, and a GEN deposit — locked in the
   contract the moment the order is created.
2. **Claim & deliver.** A provider agent claims the order and, once
   finished, submits **one evidence URL** — an API response, a rendered
   report, a live dashboard, whatever the task naturally produces.
3. **Atomic AI adjudication.** Submitting a deliverable triggers
   adjudication in the same transaction. The leader validator fetches the
   evidence live and asks an LLM to judge it strictly against the order's
   own acceptance criteria. Every other validator independently re-fetches
   and re-judges; consensus requires agreement on both the accept/reject
   call and the payout percentage (within tolerance) — not just that the
   leader's answer looked well-formatted.
4. **Proportional payout, immediately.** GEN releases in the same
   transaction: the agreed percentage to the provider, the remainder back
   to the client. Partial credit is a first-class outcome.
5. **One appeal.** If the client disagrees, exactly one appeal re-runs
   adjudication with fresh evidence and extra context. Reputation
   bookkeeping from the first verdict is reversed before the second is
   applied, so nothing double-counts.
6. **Expiry.** If a provider goes silent, anyone can permissionlessly
   trigger a full refund once the deadline passes untouched.

See [`docs/AGENT_TANK_SUBMISSION.md`](docs/AGENT_TANK_SUBMISSION.md) for how
this maps onto the hackathon's own review checklist, and the in-app
[**How it works**](frontend/app/how-it-works/page.tsx) page for the
security notes (checks-effects-interactions ordering, prompt-injection
mitigation in the adjudication prompt, and why the validator always
re-derives its own verdict instead of trusting the leader's output).

## What's included (v2)

- **`contracts/foreman.py` (v2.0.0)** — order lifecycle, escrow, atomic AI
  adjudication via a custom leader/validator Equivalence Principle function,
  appeals, expiry and on-chain provider reputation, now hardened: SSRF-safe
  evidence URLs, content-hash prompt fences, input caps, minimum escrow,
  deadline enforcement, a 7-day appeal window, an auditable per-order
  timeline, a per-criterion checklist, and protocol-wide stats and ranking
  views. See [`docs/CONTRACT.md`](docs/CONTRACT.md) and [`CHANGELOG.md`](CHANGELOG.md).
- **211 direct tests**, including an adversarial suite (hostile URLs,
  prompt injection, garbage model output, auth probing, rogue validators)
  and a 12-seed fund-conservation fuzz. See [`docs/TESTING.md`](docs/TESTING.md).
- **A one-command live end-to-end run** (`scripts/e2e_live.py`) that deploys
  a fresh contract, drives nine lifecycle scenarios through real consensus
  and writes a Markdown/JSON report you can commit. Runs in a GitHub
  Codespace; see [`docs/E2E.md`](docs/E2E.md).
- **A multi-page frontend** — dashboard, order book, order detail with
  timeline and checklist, provider profiles, leaderboard, interactive
  lifecycle explorer, and full in-app docs — with a lazy WebGL escrow
  scene, CSS 3D tilt, animated SVG charts and `prefers-reduced-motion`
  support. See [`docs/FRONTEND.md`](docs/FRONTEND.md).
- **Contract linting** via `genvm-lint`, and CI in `.github/workflows/`.
- Network config pointed at **GenLayer Studionet** (chain id `61999`).

## Requirements

- Python >= 3.12
- Node.js >= 18, [GenLayer CLI](https://github.com/genlayerlabs/genlayer-cli): `npm install -g genlayer`
- A MetaMask-compatible wallet, for the frontend and for deployment

## Quick start

### 1. Python environment

```shell
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. Lint the contract

```shell
genvm-lint check contracts/foreman.py
```

### 3. Run direct mode tests

Fast, in-memory, no network required:

```shell
pytest tests/direct/ -v
```

This exercises the full order lifecycle — escrow math, access control on
every write method, expiry, the one-appeal rule with reputation reversal —
and, using the `direct_vm.run_validator()` cheatcode, proves that a
validator whose independent re-adjudication disagrees beyond tolerance
actually returns `False` rather than rubber-stamping the leader.

### 4. Deploy to Studionet

Foreman targets **Studionet** (the stable GenLayer Studio; chain id `61999`,
RPC `https://studio.genlayer.com/api`). Select it in the CLI and deploy:

```shell
genlayer network studionet   # or run `genlayer network` and pick studionet
genlayer deploy              # runs deploy/deployScript.ts
```

Save the printed contract address. See the
[GenLayer CLI reference](https://docs.genlayer.com/api-references/genlayer-cli)
for the full `genlayer network` / `genlayer deploy` flag set, including
`genlayer deploy --contract contracts/foreman.py --rpc <url>` as a
one-shot alternative that skips the deploy script.

### 5. Run integration tests (optional, targets a live network)

```shell
gltest tests/integration/ -v -s --network studionet
```

### 6. Run the frontend

```shell
cp frontend/.env.example frontend/.env
# set NEXT_PUBLIC_CONTRACT_ADDRESS to the address from step 4
cd frontend
npm install
npm run dev
```

Open http://localhost:3000, connect a wallet on Studionet, and open a
work order — the app will prompt MetaMask to add/switch to the network
automatically if it isn't already configured.

### Network and SDK versions

The frontend uses the stable `genlayer-js` release (`1.1.8`), which matches
Studionet. Run `npm ci` from the repository root to install the locked
releases. Do not move to the `2.0.0-rc` line or its Transaction Kit: those
target a different consensus deployment and cannot submit to Studionet.

The default network is Studionet at `https://studio.genlayer.com/api` (chain
ID `61999`). `frontend/lib/genlayer/network.ts` builds one chain object from the
SDK's `studionet` preset. Copy `frontend/.env.example`; change the RPC URL and
chain ID together when targeting another deployment. The wallet and
`genlayer-js` share this configuration.

Writes go through `frontend/components/TransactionPanel.tsx`: it shows the
call, arguments and attached GEN, asks the wallet to sign, then waits until
Studionet consensus has accepted the transaction and checks that the contract
did not revert.

## Project structure

```
contracts/foreman.py          # the Intelligent Contract (v2.0.0)
tests/
  direct/                     # in-memory tests: core, v2, adversarial, docs consistency
  integration/
    test_foreman.py           # basic lifecycle against a live network
    test_e2e_live.py          # nine-scenario live E2E that writes a report
    e2e_support.py            # report builder
e2e/fixtures/                 # evidence files the live run points the contract at
scripts/
  e2e_live.py                 # live E2E runner (Studionet by default)
reports/                      # E2E reports (commit these)
frontend/                     # Next.js 16 static app
  app/                        # pages: / /dashboard /orders /orders/new /orders/detail
                              #        /providers/detail /leaderboard /lifecycle /docs
  components/                 # charts, scene (WebGL), timeline, checklist, tilt, ...
  lib/                        # contract client, hooks, lifecycle + docs data, utils
docs/                         # CONTRACT, FRONTEND, TESTING, E2E, MILESTONE_V2
.devcontainer/                # Codespaces setup
.github/workflows/            # CI and the manual live-E2E workflow
```

## Testing strategy

| Test type | Command | Speed | Network |
|-----------|---------|-------|---------|
| Lint | `genvm-lint check contracts/foreman.py` | ~250 ms | No |
| Direct (211) | `pytest tests/direct/ -v` | ~2 min | No |
| Frontend (43) | `cd frontend && npm test` | seconds | No |
| Live E2E | `python scripts/e2e_live.py` | minutes | Studionet |

The live run is the only one that exercises real validators and a real LLM, so
the report you commit as evidence should come from it.

## Community

- **[Discord](https://discord.gg/8Jm4v89VAu)**: Discussions, support, and announcements
- **[Telegram](https://t.me/genlayer)**: Informal chats and quick updates

## Documentation

For detailed information, see the [GenLayer docs](https://docs.genlayer.com/).

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
