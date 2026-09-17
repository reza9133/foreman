"""Direct-mode tests for Foreman — runs the contract in-process, no Studio
or Docker required. See tests/integration/ for the full-network suite.
"""

import pytest

from tests.direct.conftest import mock_json_llm, to_hex

CONTRACT_PATH = "contracts/foreman.py"

ONE_GEN = 10**18
BASE_TIME = "2026-01-01T00:00:00+00:00"

ACCEPT_FULL = {
    "accepted": True,
    "payout_percent": 100,
    "reasoning": "All three acceptance criteria are met by the evidence.",
    "red_flags": [],
}
ACCEPT_PARTIAL = {
    "accepted": True,
    "payout_percent": 60,
    "reasoning": "Two of three criteria are met; the uptime log is missing.",
    "red_flags": [],
}
REJECT = {
    "accepted": False,
    "payout_percent": 0,
    "reasoning": "The evidence does not match the requested deliverable at all.",
    "red_flags": [],
}


def _deploy(direct_deploy, direct_vm):
    direct_vm.warp(BASE_TIME)
    return direct_deploy(CONTRACT_PATH)


def _create_order(
    contract,
    direct_vm,
    sender,
    title="Scrape competitor pricing",
    spec="Return a JSON array of {sku, price} for all products on example.com/shop.",
    criteria="JSON must be valid, contain at least 10 items, and every item must have both 'sku' and 'price' keys.",
    deadline_days=3,
    escrow=ONE_GEN,
):
    direct_vm.sender = sender
    direct_vm.value = escrow
    order_id = contract.create_order(title, spec, criteria, deadline_days)
    direct_vm.value = 0
    return order_id


# ---------------------------------------------------------------------------
# create_order
# ---------------------------------------------------------------------------


def test_create_order_stores_expected_fields(direct_vm, direct_deploy, direct_alice):
    contract = _deploy(direct_deploy, direct_vm)
    order_id = _create_order(contract, direct_vm, direct_alice)

    order = contract.get_order(order_id)
    assert order["id"] == 0
    assert order["client"] == to_hex(direct_alice)
    assert order["provider"] == ""
    assert order["status"] == "open"
    assert order["escrow_wei"] == str(ONE_GEN)
    assert order["payout_percent"] == 0
    assert order["appeal_used"] is False
    assert contract.get_order_count() == 1


def test_create_order_requires_escrow(direct_vm, direct_deploy, direct_alice):
    contract = _deploy(direct_deploy, direct_vm)
    direct_vm.sender = direct_alice
    direct_vm.value = 0
    with direct_vm.expect_revert("Escrow must be greater than zero"):
        contract.create_order("Title", "Spec", "Criteria", 3)


def test_create_order_requires_title(direct_vm, direct_deploy, direct_alice):
    contract = _deploy(direct_deploy, direct_vm)
    direct_vm.sender = direct_alice
    direct_vm.value = ONE_GEN
    with direct_vm.expect_revert("Title is required"):
        contract.create_order("   ", "Spec", "Criteria", 3)


def test_create_order_rejects_bad_deadline(direct_vm, direct_deploy, direct_alice):
    contract = _deploy(direct_deploy, direct_vm)
    direct_vm.sender = direct_alice
    direct_vm.value = ONE_GEN
    with direct_vm.expect_revert("deadline_days"):
        contract.create_order("Title", "Spec", "Criteria", 0)


def test_multiple_orders_get_sequential_ids(direct_vm, direct_deploy, direct_alice):
    contract = _deploy(direct_deploy, direct_vm)
    first = _create_order(contract, direct_vm, direct_alice)
    second = _create_order(contract, direct_vm, direct_alice)
    assert first == 0
    assert second == 1
    assert contract.get_order_count() == 2


# ---------------------------------------------------------------------------
# claim_order / cancel_order
# ---------------------------------------------------------------------------


def test_claim_order_success(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = _deploy(direct_deploy, direct_vm)
    order_id = _create_order(contract, direct_vm, direct_alice)

    direct_vm.sender = direct_bob
    contract.claim_order(order_id)

    order = contract.get_order(order_id)
    assert order["status"] == "claimed"
    assert order["provider"] == to_hex(direct_bob)
    assert order["claimed_at"] > 0


def test_client_cannot_claim_own_order(direct_vm, direct_deploy, direct_alice):
    contract = _deploy(direct_deploy, direct_vm)
    order_id = _create_order(contract, direct_vm, direct_alice)

    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("Client cannot claim"):
        contract.claim_order(order_id)


def test_cannot_claim_already_claimed_order(
    direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie
):
    contract = _deploy(direct_deploy, direct_vm)
    order_id = _create_order(contract, direct_vm, direct_alice)

    direct_vm.sender = direct_bob
    contract.claim_order(order_id)

    direct_vm.sender = direct_charlie
    with direct_vm.expect_revert("Order is not open"):
        contract.claim_order(order_id)


def test_cancel_order_before_claim(direct_vm, direct_deploy, direct_alice):
    contract = _deploy(direct_deploy, direct_vm)
    order_id = _create_order(contract, direct_vm, direct_alice)

    direct_vm.sender = direct_alice
    contract.cancel_order(order_id)

    order = contract.get_order(order_id)
    assert order["status"] == "cancelled"
    assert order["resolved_at"] > 0


def test_only_client_can_cancel(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = _deploy(direct_deploy, direct_vm)
    order_id = _create_order(contract, direct_vm, direct_alice)

    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("Only the client"):
        contract.cancel_order(order_id)


def test_cannot_cancel_after_claim(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = _deploy(direct_deploy, direct_vm)
    order_id = _create_order(contract, direct_vm, direct_alice)

    direct_vm.sender = direct_bob
    contract.claim_order(order_id)

    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("no longer be cancelled"):
        contract.cancel_order(order_id)


# ---------------------------------------------------------------------------
# submit_deliverable — the atomic AI-adjudication path
# ---------------------------------------------------------------------------


def _claim_and_deliver(
    contract, direct_vm, client, provider, order_id, verdict, note="Done, see report."
):
    direct_vm.sender = provider
    contract.claim_order(order_id)

    mock_json_llm(direct_vm, r".*", verdict)
    direct_vm.mock_web(r".*", {"status": 200, "body": "the delivered report content"})

    direct_vm.sender = provider
    contract.submit_deliverable(order_id, "https://example.com/report", note)


def test_submit_deliverable_full_acceptance_pays_provider_in_full(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    contract = _deploy(direct_deploy, direct_vm)
    order_id = _create_order(contract, direct_vm, direct_alice)
    _claim_and_deliver(contract, direct_vm, direct_alice, direct_bob, order_id, ACCEPT_FULL)

    order = contract.get_order(order_id)
    assert order["status"] == "completed"
    assert order["payout_percent"] == 100
    assert order["deliverable_url"] == "https://example.com/report"
    assert order["delivered_at"] > 0
    assert order["resolved_at"] > 0

    rep = contract.get_provider_reputation(to_hex(direct_bob))
    assert rep["completed"] == 1
    assert rep["rejected"] == 0
    assert rep["total_earned_wei"] == str(ONE_GEN)


def test_submit_deliverable_partial_acceptance_splits_escrow(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    contract = _deploy(direct_deploy, direct_vm)
    order_id = _create_order(contract, direct_vm, direct_alice, escrow=ONE_GEN)
    _claim_and_deliver(contract, direct_vm, direct_alice, direct_bob, order_id, ACCEPT_PARTIAL)

    order = contract.get_order(order_id)
    assert order["status"] == "completed"
    assert order["payout_percent"] == 60

    rep = contract.get_provider_reputation(to_hex(direct_bob))
    assert rep["total_earned_wei"] == str((ONE_GEN * 60) // 100)


def test_submit_deliverable_rejected(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = _deploy(direct_deploy, direct_vm)
    order_id = _create_order(contract, direct_vm, direct_alice)
    _claim_and_deliver(contract, direct_vm, direct_alice, direct_bob, order_id, REJECT)

    order = contract.get_order(order_id)
    assert order["status"] == "rejected"
    assert order["payout_percent"] == 0

    rep = contract.get_provider_reputation(to_hex(direct_bob))
    assert rep["completed"] == 0
    assert rep["rejected"] == 1
    assert rep["total_earned_wei"] == "0"


def test_only_claimed_provider_can_submit(
    direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie
):
    contract = _deploy(direct_deploy, direct_vm)
    order_id = _create_order(contract, direct_vm, direct_alice)

    direct_vm.sender = direct_bob
    contract.claim_order(order_id)

    mock_json_llm(direct_vm, r".*", ACCEPT_FULL)
    direct_vm.mock_web(r".*", {"status": 200, "body": "evidence"})

    direct_vm.sender = direct_charlie
    with direct_vm.expect_revert("Only the claimed provider"):
        contract.submit_deliverable(order_id, "https://example.com/report", "note")


def test_cannot_submit_before_claim(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = _deploy(direct_deploy, direct_vm)
    order_id = _create_order(contract, direct_vm, direct_alice)

    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("Only the claimed provider"):
        contract.submit_deliverable(order_id, "https://example.com/report", "note")


def test_cannot_submit_twice(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = _deploy(direct_deploy, direct_vm)
    order_id = _create_order(contract, direct_vm, direct_alice)
    _claim_and_deliver(contract, direct_vm, direct_alice, direct_bob, order_id, ACCEPT_FULL)

    direct_vm.clear_mocks()
    mock_json_llm(direct_vm, r".*", ACCEPT_FULL)
    direct_vm.mock_web(r".*", {"status": 200, "body": "evidence"})

    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("not awaiting delivery"):
        contract.submit_deliverable(order_id, "https://example.com/report", "note")


# ---------------------------------------------------------------------------
# expire_order — the "provider went silent" path
# ---------------------------------------------------------------------------


def test_expire_open_order_after_deadline(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = _deploy(direct_deploy, direct_vm)
    order_id = _create_order(contract, direct_vm, direct_alice, deadline_days=1)

    direct_vm.warp("2026-01-03T00:00:00+00:00")  # 2 days later
    direct_vm.sender = direct_bob  # permissionless — anyone can trigger it
    contract.expire_order(order_id)

    order = contract.get_order(order_id)
    assert order["status"] == "expired"


def test_expire_claimed_order_penalizes_provider_reputation(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    contract = _deploy(direct_deploy, direct_vm)
    order_id = _create_order(contract, direct_vm, direct_alice, deadline_days=1)

    direct_vm.sender = direct_bob
    contract.claim_order(order_id)

    direct_vm.warp("2026-01-03T00:00:00+00:00")
    contract.expire_order(order_id)

    order = contract.get_order(order_id)
    assert order["status"] == "expired"

    rep = contract.get_provider_reputation(to_hex(direct_bob))
    assert rep["rejected"] == 1


def test_cannot_expire_before_deadline(direct_vm, direct_deploy, direct_alice):
    contract = _deploy(direct_deploy, direct_vm)
    order_id = _create_order(contract, direct_vm, direct_alice, deadline_days=3)

    with direct_vm.expect_revert("not reached its deadline"):
        contract.expire_order(order_id)


def test_is_expired_view(direct_vm, direct_deploy, direct_alice):
    contract = _deploy(direct_deploy, direct_vm)
    order_id = _create_order(contract, direct_vm, direct_alice, deadline_days=1)

    assert contract.is_expired(order_id) is False
    direct_vm.warp("2026-01-03T00:00:00+00:00")
    assert contract.is_expired(order_id) is True


# ---------------------------------------------------------------------------
# appeal_delivery — exactly one re-adjudication, with reputation correction
# ---------------------------------------------------------------------------


def test_appeal_overturns_rejection_and_fixes_reputation(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    contract = _deploy(direct_deploy, direct_vm)
    order_id = _create_order(contract, direct_vm, direct_alice)
    _claim_and_deliver(contract, direct_vm, direct_alice, direct_bob, order_id, REJECT)

    assert contract.get_provider_reputation(to_hex(direct_bob))["rejected"] == 1

    direct_vm.clear_mocks()
    mock_json_llm(direct_vm, r".*", ACCEPT_FULL)
    direct_vm.mock_web(r".*", {"status": 200, "body": "the delivered report content, take two"})

    direct_vm.sender = direct_alice
    direct_vm.value = ONE_GEN  # appeal must fund its own re-settlement
    contract.appeal_delivery(order_id, "I re-checked manually, the deliverable is correct.")
    direct_vm.value = 0

    order = contract.get_order(order_id)
    assert order["status"] == "completed"
    assert order["appeal_used"] is True

    rep = contract.get_provider_reputation(to_hex(direct_bob))
    assert rep["completed"] == 1
    assert rep["rejected"] == 0
    assert rep["total_earned_wei"] == str(ONE_GEN)
    # The overturned verdict is erased, but the fact that it was contested is
    # not — `disputed` is what the frontend reads to show a provider's history.
    assert rep["disputed"] == 1


def test_appeal_only_once(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = _deploy(direct_deploy, direct_vm)
    order_id = _create_order(contract, direct_vm, direct_alice)
    _claim_and_deliver(contract, direct_vm, direct_alice, direct_bob, order_id, REJECT)

    direct_vm.clear_mocks()
    mock_json_llm(direct_vm, r".*", ACCEPT_FULL)
    direct_vm.mock_web(r".*", {"status": 200, "body": "evidence take two"})
    direct_vm.sender = direct_alice
    direct_vm.value = ONE_GEN
    contract.appeal_delivery(order_id, "more context")
    direct_vm.value = 0

    direct_vm.clear_mocks()
    mock_json_llm(direct_vm, r".*", REJECT)
    direct_vm.mock_web(r".*", {"status": 200, "body": "evidence take three"})
    with direct_vm.expect_revert("already been appealed"):
        contract.appeal_delivery(order_id, "even more context")


def test_appeal_requires_matching_deposit(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    contract = _deploy(direct_deploy, direct_vm)
    order_id = _create_order(contract, direct_vm, direct_alice)
    _claim_and_deliver(contract, direct_vm, direct_alice, direct_bob, order_id, REJECT)

    direct_vm.clear_mocks()
    mock_json_llm(direct_vm, r".*", ACCEPT_FULL)
    direct_vm.mock_web(r".*", {"status": 200, "body": "evidence take two"})
    direct_vm.sender = direct_alice

    direct_vm.value = 0
    with direct_vm.expect_revert("Appeal requires exactly"):
        contract.appeal_delivery(order_id, "no deposit attached")

    direct_vm.value = ONE_GEN // 2
    with direct_vm.expect_revert("Appeal requires exactly"):
        contract.appeal_delivery(order_id, "partial deposit attached")
    direct_vm.value = 0


def test_only_client_can_appeal(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = _deploy(direct_deploy, direct_vm)
    order_id = _create_order(contract, direct_vm, direct_alice)
    _claim_and_deliver(contract, direct_vm, direct_alice, direct_bob, order_id, REJECT)

    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("Only the client"):
        contract.appeal_delivery(order_id, "context")


def test_cannot_appeal_unresolved_order(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = _deploy(direct_deploy, direct_vm)
    order_id = _create_order(contract, direct_vm, direct_alice)

    direct_vm.sender = direct_bob
    contract.claim_order(order_id)

    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("not been adjudicated"):
        contract.appeal_delivery(order_id, "context")


# ---------------------------------------------------------------------------
# consensus — validators must independently re-derive the verdict
# ---------------------------------------------------------------------------


def test_validator_agrees_within_payout_tolerance(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    contract = _deploy(direct_deploy, direct_vm)
    order_id = _create_order(contract, direct_vm, direct_alice)

    direct_vm.sender = direct_bob
    contract.claim_order(order_id)

    mock_json_llm(direct_vm, r".*", ACCEPT_PARTIAL)  # leader sees payout_percent=60
    direct_vm.mock_web(r".*", {"status": 200, "body": "evidence"})

    direct_vm.sender = direct_bob
    contract.submit_deliverable(order_id, "https://example.com/report", "note")

    # A validator landing within PAYOUT_TOLERANCE (15 points) of the
    # leader's 60% must agree.
    close_call = dict(ACCEPT_PARTIAL, payout_percent=68)
    direct_vm.clear_mocks()
    mock_json_llm(direct_vm, r".*", close_call)
    direct_vm.mock_web(r".*", {"status": 200, "body": "evidence"})
    assert direct_vm.run_validator() is True


def test_validator_disagrees_outside_payout_tolerance(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    contract = _deploy(direct_deploy, direct_vm)
    order_id = _create_order(contract, direct_vm, direct_alice)

    direct_vm.sender = direct_bob
    contract.claim_order(order_id)

    mock_json_llm(direct_vm, r".*", ACCEPT_PARTIAL)  # leader: payout_percent=60
    direct_vm.mock_web(r".*", {"status": 200, "body": "evidence"})

    direct_vm.sender = direct_bob
    contract.submit_deliverable(order_id, "https://example.com/report", "note")

    # A validator scoring wildly differently (10%) is outside the 15-point
    # tolerance and must disagree, forcing a leader rotation.
    far_call = dict(ACCEPT_PARTIAL, payout_percent=10)
    direct_vm.clear_mocks()
    mock_json_llm(direct_vm, r".*", far_call)
    direct_vm.mock_web(r".*", {"status": 200, "body": "evidence"})
    assert direct_vm.run_validator() is False


def test_validator_disagrees_on_accepted_mismatch(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    contract = _deploy(direct_deploy, direct_vm)
    order_id = _create_order(contract, direct_vm, direct_alice)

    direct_vm.sender = direct_bob
    contract.claim_order(order_id)

    mock_json_llm(direct_vm, r".*", ACCEPT_FULL)  # leader: accepted=True
    direct_vm.mock_web(r".*", {"status": 200, "body": "evidence"})

    direct_vm.sender = direct_bob
    contract.submit_deliverable(order_id, "https://example.com/report", "note")

    # A validator that reaches the opposite accept/reject conclusion must
    # disagree, regardless of how close the payout percentages are.
    direct_vm.clear_mocks()
    mock_json_llm(direct_vm, r".*", REJECT)
    direct_vm.mock_web(r".*", {"status": 200, "body": "evidence"})
    assert direct_vm.run_validator() is False


# ---------------------------------------------------------------------------
# views
# ---------------------------------------------------------------------------


def test_get_open_orders_excludes_resolved(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    contract = _deploy(direct_deploy, direct_vm)
    open_id = _create_order(contract, direct_vm, direct_alice)
    resolved_id = _create_order(contract, direct_vm, direct_alice)
    _claim_and_deliver(contract, direct_vm, direct_alice, direct_bob, resolved_id, ACCEPT_FULL)

    open_orders = contract.get_open_orders()
    assert [o["id"] for o in open_orders] == [open_id]


def test_get_orders_by_client_and_provider(
    direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie
):
    contract = _deploy(direct_deploy, direct_vm)
    order_id = _create_order(contract, direct_vm, direct_alice)

    direct_vm.sender = direct_bob
    contract.claim_order(order_id)

    by_client = contract.get_orders_by_client(to_hex(direct_alice))
    by_provider = contract.get_orders_by_provider(to_hex(direct_bob))
    by_stranger = contract.get_orders_by_provider(to_hex(direct_charlie))

    assert [o["id"] for o in by_client] == [order_id]
    assert [o["id"] for o in by_provider] == [order_id]
    assert by_stranger == []


def test_get_order_missing_reverts(direct_vm, direct_deploy):
    contract = _deploy(direct_deploy, direct_vm)
    with direct_vm.expect_revert("does not exist"):
        contract.get_order(999)


def test_provider_reputation_defaults_to_zero(direct_vm, direct_deploy, direct_bob):
    contract = _deploy(direct_deploy, direct_vm)
    rep = contract.get_provider_reputation(to_hex(direct_bob))
    assert rep == {
        "completed": 0,
        "rejected": 0,
        "disputed": 0,
        "total_earned_wei": "0",
    }
