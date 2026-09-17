"""Shared helpers for direct mode tests."""

import json


def to_hex(addr):
    """Convert a direct-mode test address into the hex string the contract
    stores (str(gl.Address(...)))."""
    if hasattr(addr, "as_hex"):
        return addr.as_hex
    from genlayer.types import Address

    return str(Address(addr))


def mock_json_llm(vm, prompt_pattern, response: dict):
    """Register a JSON dict at the direct runner's raw text response
    boundary. exec_prompt(response_format="json") decodes one layer of
    JSON off of whatever the mocked "LLM" returns as text, so the mock
    itself must be a JSON-encoded string containing the JSON-encoded
    payload — i.e. json.dumps applied twice."""
    vm.mock_llm(prompt_pattern, json.dumps(json.dumps(response)))
