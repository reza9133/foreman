# Testing

```bash
genvm-lint check contracts/foreman.py
pytest tests/direct -v          # 211 tests, no network
cd frontend && npm test         # 43 tests
```

## Direct suites

| File | Covers |
|---|---|
| `test_foreman.py` | v1 behaviour: every transition, access control, escrow maths, validator disagreement |
| `test_foreman_v2.py` | timeline, checklist, pagination, stats, abandon/extend, appeal window, caps |
| `test_foreman_adversarial.py` | 46 hostile URLs, prompt-injection fences, garbage model output, auth probing, rogue validators, 12-seed fund-conservation fuzz |
| `test_docs_consistency.py` | documented API and lifecycle match the contract |

The direct harness does not roll storage back on a revert and does not track
transfers, so `conftest.py` adds a `ledger` fixture (tracks paid-out value) and
an `llm_spy` fixture (records prompts) for the tests that need them.

## What the direct suites do not prove

Direct mode mocks the web and the LLM. It proves the contract's logic; only the
live run (`python scripts/e2e_live.py`) shows how real validators and a real
model behave on Studionet.
