"""Shared helpers for direct mode tests."""

import json


def to_hex(addr):
    """Convert a direct-mode test address into the hex string the contract
    stores. The contract normalizes every address through `_addr()` before
    storing or comparing it, so this matches that — lowercase, not the
    EIP-55 checksummed form `Address.as_hex` returns."""
    if hasattr(addr, "as_hex"):
        return addr.as_hex.lower()
    # `Address` is re-exported at the top level of `genlayer` by every SDK
    # layout (the stable py-genlayer runner keeps `genlayer.py.types`, newer
    # ones `genlayer.types`), so import it from there.
    from genlayer import Address

    return str(Address(addr)).lower()


def mock_json_llm(vm, prompt_pattern, response: dict):
    """Register a JSON dict at the direct runner's raw text response
    boundary. exec_prompt(response_format="json") decodes one layer of
    JSON off of whatever the mocked "LLM" returns as text, so the mock
    itself must be a JSON-encoded string containing the JSON-encoded
    payload — i.e. json.dumps applied twice."""
    vm.mock_llm(prompt_pattern, json.dumps(json.dumps(response)))


# ---------------------------------------------------------------------------
# Value ledger — direct mode does not track emitted GEN transfers, so the
# adversarial suite swaps the contract's `_Payable` stub for a recorder and
# checks conservation of funds (what went in == what went out + what is still
# escrowed) after arbitrary sequences of actions.
# ---------------------------------------------------------------------------

import sys

import pytest


class Ledger:
    def __init__(self):
        self.transfers = []  # (recipient_hex_lowercase, wei)
        self.deposits = 0

    def paid_to(self, addr) -> int:
        target = addr if isinstance(addr, str) else to_hex(addr)
        return sum(v for who, v in self.transfers if who == target.lower())

    @property
    def total_out(self) -> int:
        return sum(v for _, v in self.transfers)


@pytest.fixture
def ledger(direct_vm, direct_deploy):
    """Returns `install(contract) -> Ledger`. Call it right after deploying."""

    def install(contract) -> Ledger:
        led = Ledger()
        module = sys.modules[type(contract).__module__]

        class _SpyPayable:
            def __init__(self, address):
                self._address = str(address).lower()

            def emit_transfer(self, value=0, **_kw):
                led.transfers.append((self._address, int(value)))

        module._Payable = _SpyPayable
        return led

    return install


@pytest.fixture
def llm_spy(monkeypatch):
    """Recorder for `gl.nondet.exec_prompt` returning a scripted verdict, so
    tests can inspect the exact prompt the contract builds. The `genlayer`
    SDK only becomes importable once a contract has been deployed, so call
    `llm_spy.install(contract)` right after deploying."""

    class Spy:
        def __init__(self):
            self.prompts = []
            self.response = {
                "payout_percent": 100,
                "criteria_results": [],
                "reasoning": "ok",
                "red_flags": [],
            }

        def __call__(self, prompt, *args, **kwargs):
            self.prompts.append(prompt)
            return self.response

        def install(self, contract):
            gl = sys.modules[type(contract).__module__].gl
            monkeypatch.setattr(gl.nondet, "exec_prompt", self)

    return Spy()
