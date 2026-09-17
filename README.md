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

## What's included

- **`contracts/foreman.py`** — the Intelligent Contract: order lifecycle,
  escrow, atomic AI adjudication via a custom leader/validator Equivalence
  Principle function, appeals, expiry, and on-chain provider reputation.
- **Direct mode tests** (`tests/direct/test_foreman.py`, 30+ cases) — fast,
  in-memory tests covering every state transition, access control, escrow
  math, and — critically — that the validator function actually *disagrees*
  when a second opinion falls outside tolerance (proof the consensus logic
  isn't a rubber stamp).
- **Integration tests** (`tests/integration/`) — full end-to-end runs
  against a live network, targeting Studio Next by default.
- **Contract linting** via `genvm-lint`.
- A Next.js 16 frontend (TypeScript, TanStack Query, Radix UI,
  `@genlayer/transaction-kit-react`) with a live order book, a create-order
  flow, and a per-order action hub (claim / submit / appeal / expire) that
  adapts to the connected wallet's role.
- Deployment script and network config already pointed at **GenLayer Studio
  Next** (Consensus v0.6, chain id `61997`), as required for this hackathon.

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

### 4. Deploy to Studio Next

The Agent Tank Hackathon requires deployment on **Studio Next** (Consensus
v0.6, including fees; chain id `61997`, RPC
`https://studio-next.genlayer.com/api`). If the CLI does not yet list
`studio-next` as a built-in network, pick "custom" and enter the RPC URL and
chain id above:

```shell
genlayer network   # interactive — pick "custom" if Studio Next isn't listed
                    # by name yet, and enter the RPC URL and chain id above
genlayer deploy     # runs deploy/deployScript.ts
```

> `studio-dev.genlayer.com` was the previous RPC host for this hackathon and
> is no longer the required target. Use `studio-next.genlayer.com/api`
> everywhere a URL is asked for; the explorer for this chain is at
> `https://explorer-studio-dev.genlayer.com/`.

Save the printed contract address. See the
[GenLayer CLI reference](https://docs.genlayer.com/api-references/genlayer-cli)
for the full `genlayer network` / `genlayer deploy` flag set, including
`genlayer deploy --contract contracts/foreman.py --rpc <url>` as a
one-shot alternative that skips the deploy script.

### 5. Run integration tests (optional, targets a live network)

```shell
gltest tests/integration/ -v -s --network studio_devnet
```

### 6. Run the frontend

```shell
cp frontend/.env.example frontend/.env
# set NEXT_PUBLIC_CONTRACT_ADDRESS to the address from step 4
cd frontend
npm install
npm run dev
```

Open http://localhost:3000, connect a wallet on Studio Next, and open a
work order — the app will prompt MetaMask to add/switch to the network
automatically if it isn't already configured.

### Fee profile (developer suggestions)

The frontend uses published `@genlayer/transaction-kit` and
`@genlayer/transaction-kit-react` version `0.1.0-rc.2`, with `genlayer-js`
`2.0.0-rc.1`. Run `npm ci` from the repository root to install the locked
releases.

The default network is Studio Next (Consensus v0.6) at
`https://studio-next.genlayer.com/api` (chain ID `61997`). The installed SDK's
`studioDevnet` preset still points at the older Studio Dev host, so
`frontend/lib/genlayer/network.ts` overrides just the RPC URL and chain name
while keeping the rest of that preset. Copy `frontend/.env.example`; change
the RPC URL and chain ID together when targeting another deployment. Wallet,
SDK, and Transaction Kit share this configuration.

Transaction Kit falls back to live network fee defaults when no developer
profile is supplied, which is what this repo ships with. If you want faster,
tighter fee quotes in the UI, measure a profile for `contracts/foreman.py`'s
`deploy` and `create_order` calls against your deployment and pass it as
`suggestions` to `createTransactionKit` in `frontend/lib/genlayer/kit.ts` —
see `genlayer-test`'s `--fee-profile` tooling.

## Project structure

```
contracts/
  foreman.py              # the Intelligent Contract
tests/
  direct/
    conftest.py            # shared JSON-mock helper
    test_foreman.py        # 30+ in-memory tests, no network required
  integration/
    test_foreman.py        # full lifecycle against a live network
frontend/                  # Next.js 16 app (TypeScript, TanStack Query, Radix UI)
  app/
    page.tsx                # landing page
    orders/page.tsx         # browse (open / mine / all)
    orders/new/page.tsx     # create a work order (escrow flow)
    orders/[id]/page.tsx    # order detail + all lifecycle actions
    how-it-works/page.tsx
  components/               # OrderCard, StatusBadge, TransactionDialog, Navbar, …
  lib/
    contracts/Foreman.ts    # read wrapper
    hooks/useForeman.ts     # TanStack Query hooks
    genlayer/                # wallet, network, transaction-kit wiring (Studio Next by default)
deploy/
  deployScript.ts           # deploys contracts/foreman.py
docs/
  AGENT_TANK_SUBMISSION.md  # hackathon-track fit & review checklist, spelled out
gltest.config.yaml          # network config — defaults to studio_devnet
pyproject.toml
.github/workflows/          # CI: lint + direct tests
```

## Testing strategy

| Test Type | Command | Speed | Requires a network |
|-----------|---------|-------|---------------------|
| **Lint** | `genvm-lint check contracts/foreman.py` | ~250ms | No |
| **Direct** | `pytest tests/direct/ -v` | ~ms/test | No |
| **Integration** | `gltest tests/integration/ -v -s --network studio_devnet` | ~min/test | Yes |

**Recommended workflow:** lint after every contract change, run direct
tests constantly during development, run integration tests before (and
after) deploying to confirm real consensus behavior on Studio Next.

## Community

- **[Discord](https://discord.gg/8Jm4v89VAu)**: Discussions, support, and announcements
- **[Telegram](https://t.me/genlayer)**: Informal chats and quick updates

## Documentation

For detailed information, see the [GenLayer docs](https://docs.genlayer.com/).

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
