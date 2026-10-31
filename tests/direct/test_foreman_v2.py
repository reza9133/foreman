"""Direct-mode tests for the Foreman v2 features: enforced deadlines, appeal
window, abandon/extend, evidence checks, checklist verdicts, timeline,
pagination, leaderboard and protocol stats."""

import pytest

from tests.direct.conftest import mock_json_llm, to_hex
from tests.direct.test_foreman import (
    ACCEPT_FULL,
    ACCEPT_PARTIAL,
    BASE_TIME,
    ONE_GEN,
    REJECT,
    _claim_and_deliver,
    _create_order,
    _deploy,
)

DAY = 86400


def _warp_days(vm, days):
    from datetime import datetime, timedelta, timezone

    base = datetime.fromisoformat(BASE_TIME)
    vm.warp((base + timedelta(days=days)).astimezone(timezone.utc).isoformat())


def _mock_evidence(vm, verdict, body="the delivered report content", status=200):
    vm.clear_mocks()
    mock_json_llm(vm, r".*", verdict)
    vm.mock_web(r".*", {"status": status, "body": body})


# --------------------------------------------------------------------------
# version / stats / timeline
# --------------------------------------------------------------------------


def test_version_view(direct_vm, direct_deploy):
    contract = _deploy(direct_deploy, direct_vm)
    assert contract.version() == "2.0.0"


def test_stats_track_full_lifecycle(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = _deploy(direct_deploy, direct_vm)
    oid = _create_order(contract, direct_vm, direct_alice, escrow=ONE_GEN)
    stats = contract.get_stats()
    assert stats["order_count"] == 1
    assert stats["total_escrowed_wei"] == str(ONE_GEN)
    assert stats["settled_count"] == 0

    _claim_and_deliver(contract, direct_vm, direct_alice, direct_bob, oid, ACCEPT_PARTIAL)
    stats = contract.get_stats()
    assert stats["settled_count"] == 1
    assert stats["total_paid_to_providers_wei"] == str(ONE_GEN * 60 // 100)
    assert stats["total_refunded_wei"] == str(ONE_GEN - ONE_GEN * 60 // 100)
    paid = int(stats["total_paid_to_providers_wei"]) + int(stats["total_refunded_wei"])
    assert paid == ONE_GEN


def test_stats_count_cancel_and_expiry_refunds(direct_vm, direct_deploy, direct_alice):
    contract = _deploy(direct_deploy, direct_vm)
    a = _create_order(contract, direct_vm, direct_alice, escrow=ONE_GEN)
    b = _create_order(contract, direct_vm, direct_alice, escrow=2 * ONE_GEN, deadline_days=1)
    direct_vm.sender = direct_alice
    contract.cancel_order(a)
    _warp_days(direct_vm, 2)
    contract.expire_order(b)
    assert contract.get_stats()["total_refunded_wei"] == str(3 * ONE_GEN)


def test_timeline_records_each_transition(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = _deploy(direct_deploy, direct_vm)
    oid = _create_order(contract, direct_vm, direct_alice)
    _claim_and_deliver(contract, direct_vm, direct_alice, direct_bob, oid, ACCEPT_FULL)
    events = [e["event"] for e in contract.get_order(oid)["timeline"]]
    assert events == ["created", "claimed", "delivered", "settled"]
    settled = contract.get_order(oid)["timeline"][-1]
    assert settled["actor"] == "consensus"
    assert "100%" in settled["detail"]


# --------------------------------------------------------------------------
# verdict richness
# --------------------------------------------------------------------------


def test_checklist_and_fingerprint_are_stored(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = _deploy(direct_deploy, direct_vm)
    oid = _create_order(contract, direct_vm, direct_alice)
    verdict = dict(
        ACCEPT_PARTIAL,
        criteria_results=[
            {"criterion": "valid JSON", "met": True},
            {"criterion": "at least 10 items", "met": False},
        ],
    )
    _claim_and_deliver(contract, direct_vm, direct_alice, direct_bob, oid, verdict)
    order = contract.get_order(oid)
    assert order["criteria_results"] == verdict["criteria_results"]
    assert len(order["evidence_fingerprint"]) == 16
    assert order["evidence_chars"] == len("the delivered report content")
    assert order["evidence_truncated"] is False
    assert order["appeal_deadline"] == order["resolved_at"] + 7 * DAY


def test_oversized_evidence_is_flagged_truncated(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = _deploy(direct_deploy, direct_vm)
    oid = _create_order(contract, direct_vm, direct_alice)
    direct_vm.sender = direct_bob
    contract.claim_order(oid)
    _mock_evidence(direct_vm, ACCEPT_FULL, body="x" * 40000)
    contract.submit_deliverable(oid, "https://example.com/big", "n")
    order = contract.get_order(oid)
    assert order["evidence_truncated"] is True
    assert order["evidence_chars"] == 15000


# --------------------------------------------------------------------------
# deadline enforcement
# --------------------------------------------------------------------------


def test_cannot_submit_after_deadline(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = _deploy(direct_deploy, direct_vm)
    oid = _create_order(contract, direct_vm, direct_alice, deadline_days=2)
    direct_vm.sender = direct_bob
    contract.claim_order(oid)
    _warp_days(direct_vm, 3)
    _mock_evidence(direct_vm, ACCEPT_FULL)
    with direct_vm.expect_revert("passed its deadline"):
        contract.submit_deliverable(oid, "https://example.com/late", "late")
    # the client can still recover the escrow
    contract.expire_order(oid)
    assert contract.get_order(oid)["status"] == "expired"


def test_submit_exactly_before_deadline_succeeds(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = _deploy(direct_deploy, direct_vm)
    oid = _create_order(contract, direct_vm, direct_alice, deadline_days=2)
    direct_vm.sender = direct_bob
    contract.claim_order(oid)
    _warp_days(direct_vm, 1.99)
    _mock_evidence(direct_vm, ACCEPT_FULL)
    contract.submit_deliverable(oid, "https://example.com/ok", "n")
    assert contract.get_order(oid)["status"] == "completed"


# --------------------------------------------------------------------------
# abandon_claim
# --------------------------------------------------------------------------


def test_abandon_claim_reopens_order_and_records_it(direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie):
    contract = _deploy(direct_deploy, direct_vm)
    oid = _create_order(contract, direct_vm, direct_alice)
    deadline = contract.get_order(oid)["deadline"]
    direct_vm.sender = direct_bob
    contract.claim_order(oid)
    contract.abandon_claim(oid)

    order = contract.get_order(oid)
    assert order["status"] == "open"
    assert order["provider"] == ""
    assert order["claimed_at"] == 0
    assert order["deadline"] == deadline
    assert contract.get_provider_reputation(to_hex(direct_bob))["abandoned"] == 1
    assert [o["id"] for o in contract.get_open_orders()] == [oid]

    # someone else can now take it
    direct_vm.sender = direct_charlie
    contract.claim_order(oid)
    assert contract.get_order(oid)["provider"] == to_hex(direct_charlie)


def test_abandon_requires_claimed_provider(direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie):
    contract = _deploy(direct_deploy, direct_vm)
    oid = _create_order(contract, direct_vm, direct_alice)
    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("not claimed"):
        contract.abandon_claim(oid)
    contract.claim_order(oid)
    direct_vm.sender = direct_charlie
    with direct_vm.expect_revert("Only the claimed provider"):
        contract.abandon_claim(oid)


def test_abandon_after_deadline_is_refused(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = _deploy(direct_deploy, direct_vm)
    oid = _create_order(contract, direct_vm, direct_alice, deadline_days=1)
    direct_vm.sender = direct_bob
    contract.claim_order(oid)
    _warp_days(direct_vm, 2)
    with direct_vm.expect_revert("passed its deadline"):
        contract.abandon_claim(oid)


# --------------------------------------------------------------------------
# extend_deadline
# --------------------------------------------------------------------------


def test_extend_deadline_adds_time_and_logs(direct_vm, direct_deploy, direct_alice):
    contract = _deploy(direct_deploy, direct_vm)
    oid = _create_order(contract, direct_vm, direct_alice, deadline_days=3)
    before = contract.get_order(oid)["deadline"]
    direct_vm.sender = direct_alice
    contract.extend_deadline(oid, 5)
    order = contract.get_order(oid)
    assert order["deadline"] == before + 5 * DAY
    assert order["extensions"] == 1
    assert order["timeline"][-1]["event"] == "extended"


def test_extend_rules(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = _deploy(direct_deploy, direct_vm)
    oid = _create_order(contract, direct_vm, direct_alice, deadline_days=3)

    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("Only the client"):
        contract.extend_deadline(oid, 1)

    direct_vm.sender = direct_alice
    for bad in (0, -1, 31):
        with direct_vm.expect_revert("extra_days"):
            contract.extend_deadline(oid, bad)

    _warp_days(direct_vm, 4)
    with direct_vm.expect_revert("already passed"):
        contract.extend_deadline(oid, 1)


def test_extend_cannot_exceed_max_lifetime(direct_vm, direct_deploy, direct_alice):
    contract = _deploy(direct_deploy, direct_vm)
    oid = _create_order(contract, direct_vm, direct_alice, deadline_days=360)
    direct_vm.sender = direct_alice
    contract.extend_deadline(oid, 5)  # exactly 365d
    with direct_vm.expect_revert("maximum order lifetime"):
        contract.extend_deadline(oid, 1)


def test_cannot_extend_settled_order(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = _deploy(direct_deploy, direct_vm)
    oid = _create_order(contract, direct_vm, direct_alice)
    _claim_and_deliver(contract, direct_vm, direct_alice, direct_bob, oid, ACCEPT_FULL)
    direct_vm.sender = direct_alice
    with direct_vm.expect_revert("no longer be extended"):
        contract.extend_deadline(oid, 1)


# --------------------------------------------------------------------------
# appeal window
# --------------------------------------------------------------------------


def _settled_rejected(contract, vm, alice, bob):
    oid = _create_order(contract, vm, alice)
    _claim_and_deliver(contract, vm, alice, bob, oid, REJECT)
    return oid


def test_appeal_inside_window_works_and_can_appeal_view(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = _deploy(direct_deploy, direct_vm)
    oid = _settled_rejected(contract, direct_vm, direct_alice, direct_bob)
    assert contract.can_appeal(oid) is True
    _warp_days(direct_vm, 6)
    _mock_evidence(direct_vm, ACCEPT_FULL)
    direct_vm.sender = direct_alice
    direct_vm.value = ONE_GEN
    contract.appeal_delivery(oid, "please re-read section 2")
    direct_vm.value = 0
    order = contract.get_order(oid)
    assert order["status"] == "completed"
    assert order["appeal_used"] is True
    assert contract.can_appeal(oid) is False
    assert contract.get_stats()["appeal_count"] == 1


def test_appeal_after_window_is_refused(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = _deploy(direct_deploy, direct_vm)
    oid = _settled_rejected(contract, direct_vm, direct_alice, direct_bob)
    _warp_days(direct_vm, 8)
    assert contract.can_appeal(oid) is False
    _mock_evidence(direct_vm, ACCEPT_FULL)
    direct_vm.sender = direct_alice
    direct_vm.value = ONE_GEN
    with direct_vm.expect_revert("appeal window"):
        contract.appeal_delivery(oid, "too late")


# --------------------------------------------------------------------------
# evidence handling
# --------------------------------------------------------------------------


@pytest.mark.parametrize("status", [301, 400, 403, 404, 500, 503])
def test_non_2xx_evidence_reverts_and_provider_can_retry(
    direct_vm, direct_deploy, direct_alice, direct_bob, status
):
    contract = _deploy(direct_deploy, direct_vm)
    oid = _create_order(contract, direct_vm, direct_alice)
    direct_vm.sender = direct_bob
    contract.claim_order(oid)
    _mock_evidence(direct_vm, ACCEPT_FULL, status=status, body="error page")
    with direct_vm.expect_revert("expected 2xx"):
        contract.submit_deliverable(oid, "https://example.com/r", "n")
    assert contract.get_order(oid)["status"] == "claimed"

    _mock_evidence(direct_vm, ACCEPT_FULL)
    contract.submit_deliverable(oid, "https://example.com/r", "n")
    assert contract.get_order(oid)["status"] == "completed"


@pytest.mark.parametrize("body", ["", "   \n\t  "])
def test_empty_evidence_reverts(direct_vm, direct_deploy, direct_alice, direct_bob, body):
    contract = _deploy(direct_deploy, direct_vm)
    oid = _create_order(contract, direct_vm, direct_alice)
    direct_vm.sender = direct_bob
    contract.claim_order(oid)
    _mock_evidence(direct_vm, ACCEPT_FULL, body=body)
    with direct_vm.expect_revert("empty body"):
        contract.submit_deliverable(oid, "https://example.com/r", "n")


# --------------------------------------------------------------------------
# input limits
# --------------------------------------------------------------------------


def test_minimum_escrow_enforced(direct_vm, direct_deploy, direct_alice):
    contract = _deploy(direct_deploy, direct_vm)
    direct_vm.sender = direct_alice
    direct_vm.value = 10**15 - 1
    with direct_vm.expect_revert("at least"):
        contract.create_order("T", "S", "C", 1)
    direct_vm.value = 10**15
    assert contract.create_order("T", "S", "C", 1) == 0


@pytest.mark.parametrize(
    "args,msg",
    [
        (("T" * 121, "S", "C", 1), "Title must be at most 120"),
        (("T", "S" * 4001, "C", 1), "Spec must be at most 4000"),
        (("T", "S", "C" * 2001, 1), "Acceptance criteria must be at most 2000"),
        (("T", "S", "C", 366), "deadline_days"),
    ],
)
def test_length_caps(direct_vm, direct_deploy, direct_alice, args, msg):
    contract = _deploy(direct_deploy, direct_vm)
    direct_vm.sender = direct_alice
    direct_vm.value = ONE_GEN
    with direct_vm.expect_revert(msg):
        contract.create_order(*args)


def test_length_caps_accept_boundary(direct_vm, direct_deploy, direct_alice):
    contract = _deploy(direct_deploy, direct_vm)
    direct_vm.sender = direct_alice
    direct_vm.value = ONE_GEN
    assert contract.create_order("T" * 120, "S" * 4000, "C" * 2000, 365) == 0


def test_delivery_note_cap(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = _deploy(direct_deploy, direct_vm)
    oid = _create_order(contract, direct_vm, direct_alice)
    direct_vm.sender = direct_bob
    contract.claim_order(oid)
    _mock_evidence(direct_vm, ACCEPT_FULL)
    with direct_vm.expect_revert("Delivery note must be at most 1000"):
        contract.submit_deliverable(oid, "https://example.com/r", "n" * 1001)


# --------------------------------------------------------------------------
# pagination / leaderboard
# --------------------------------------------------------------------------


def _many_orders(contract, vm, alice, bob, n):
    ids = [_create_order(contract, vm, alice, title=f"Order {i}") for i in range(n)]
    return ids


def test_pagination_newest_first_and_offsets(direct_vm, direct_deploy, direct_alice):
    contract = _deploy(direct_deploy, direct_vm)
    for i in range(7):
        _create_order(contract, direct_vm, direct_alice, title=f"Order {i}")
    page = contract.get_orders_page(0, 3, "")
    assert [o["id"] for o in page["orders"]] == [6, 5, 4]
    assert page["total"] == 7 and page["total_matching"] == 7
    page = contract.get_orders_page(3, 3, "")
    assert [o["id"] for o in page["orders"]] == [3, 2, 1]
    page = contract.get_orders_page(6, 3, "")
    assert [o["id"] for o in page["orders"]] == [0]
    assert contract.get_orders_page(50, 3, "")["orders"] == []


def test_pagination_status_filter(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = _deploy(direct_deploy, direct_vm)
    ids = _many_orders(contract, direct_vm, direct_alice, direct_bob, 5)
    direct_vm.sender = direct_alice
    contract.cancel_order(ids[1])
    contract.cancel_order(ids[3])
    cancelled = contract.get_orders_page(0, 10, "cancelled")
    assert [o["id"] for o in cancelled["orders"]] == [3, 1]
    assert cancelled["total_matching"] == 2
    open_ = contract.get_orders_page(0, 2, "OPEN")  # case-insensitive
    assert [o["id"] for o in open_["orders"]] == [4, 2]
    assert open_["total_matching"] == 3


def test_pagination_clamps_hostile_arguments(direct_vm, direct_deploy, direct_alice):
    contract = _deploy(direct_deploy, direct_vm)
    for i in range(60):
        _create_order(contract, direct_vm, direct_alice, title=f"o{i}")
    assert len(contract.get_orders_page(0, 10**9, "")["orders"]) == 50
    assert len(contract.get_orders_page(-5, 0, "")["orders"]) == 1
    assert contract.get_orders_page(-5, 2, "")["orders"][0]["id"] == 59


def test_leaderboard_ordering(direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie):
    contract = _deploy(direct_deploy, direct_vm)
    # bob: 2 completed. charlie: 1 completed + 1 rejected.
    for _ in range(2):
        oid = _create_order(contract, direct_vm, direct_alice)
        _claim_and_deliver(contract, direct_vm, direct_alice, direct_bob, oid, ACCEPT_FULL)
        direct_vm.clear_mocks()
    oid = _create_order(contract, direct_vm, direct_alice)
    _claim_and_deliver(contract, direct_vm, direct_alice, direct_charlie, oid, ACCEPT_FULL)
    direct_vm.clear_mocks()
    oid = _create_order(contract, direct_vm, direct_alice)
    _claim_and_deliver(contract, direct_vm, direct_alice, direct_charlie, oid, REJECT)

    top = contract.get_top_providers(10)
    assert [p["address"] for p in top] == [to_hex(direct_bob), to_hex(direct_charlie)]
    assert top[0]["reliability_bps"] == 10000
    assert top[1]["reliability_bps"] == 5000
    assert len(contract.get_top_providers(1)) == 1


def test_leaderboard_empty(direct_vm, direct_deploy):
    contract = _deploy(direct_deploy, direct_vm)
    assert contract.get_top_providers(5) == []


def test_reliability_counts_abandonment(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = _deploy(direct_deploy, direct_vm)
    oid = _create_order(contract, direct_vm, direct_alice)
    _claim_and_deliver(contract, direct_vm, direct_alice, direct_bob, oid, ACCEPT_FULL)
    oid2 = _create_order(contract, direct_vm, direct_alice)
    direct_vm.sender = direct_bob
    contract.claim_order(oid2)
    contract.abandon_claim(oid2)
    rep = contract.get_provider_reputation(to_hex(direct_bob))
    assert rep["completed"] == 1 and rep["abandoned"] == 1
    assert rep["reliability_bps"] == 5000
