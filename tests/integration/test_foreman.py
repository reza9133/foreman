"""Integration tests — deploy Foreman to a real GenLayer network and drive
the full order lifecycle through consensus.

Run with:
    gltest tests/integration/ -v -s                          # studio_devnet (the default)
    gltest tests/integration/ -v -s --network localnet        # against a local Studio
"""

from gltest import get_contract_factory, get_accounts
from gltest.assertions import tx_execution_succeeded

ONE_GEN = 10**18


def test_full_order_lifecycle_accepts_and_pays_out():
    client, provider = get_accounts()[:2]

    factory = get_contract_factory("foreman")
    contract = factory.deploy(account=client)

    create_tx = contract.create_order(
        args=[
            "Fetch the current GEN token price",
            "Return the current USD price of GEN from a public, live source.",
            "The response must contain a numeric USD price for GEN.",
            7,
        ],
        account=client,
    ).transact(value=ONE_GEN)
    assert tx_execution_succeeded(create_tx)

    order_id = contract.get_order_count(args=[]).call() - 1

    claim_tx = contract.claim_order(args=[order_id], account=provider).transact()
    assert tx_execution_succeeded(claim_tx)

    order = contract.get_order(args=[order_id]).call()
    assert order["status"] == "claimed"
    assert order["provider"].lower() == provider.address.lower()

    deliver_tx = contract.submit_deliverable(
        args=[
            order_id,
            "https://api.coingecko.com/api/v3/simple/price?ids=genlayer&vs_currencies=usd",
            "Live price pulled from CoinGecko's public API.",
        ],
        account=provider,
    ).transact(consensus_max_rotations=3)
    assert tx_execution_succeeded(deliver_tx)

    order = contract.get_order(args=[order_id]).call()
    assert order["status"] in ("completed", "rejected")
    assert order["deliverable_url"].startswith("https://api.coingecko.com")

    reputation = contract.get_provider_reputation(args=[provider.address]).call()
    assert reputation["completed"] + reputation["rejected"] == 1


def test_cancel_before_claim_refunds_client():
    client = get_accounts()[0]

    factory = get_contract_factory("foreman")
    contract = factory.deploy(account=client)

    create_tx = contract.create_order(
        args=["Placeholder task", "Placeholder spec", "Placeholder criteria", 1],
        account=client,
    ).transact(value=ONE_GEN)
    assert tx_execution_succeeded(create_tx)

    order_id = contract.get_order_count(args=[]).call() - 1

    cancel_tx = contract.cancel_order(args=[order_id], account=client).transact()
    assert tx_execution_succeeded(cancel_tx)

    order = contract.get_order(args=[order_id]).call()
    assert order["status"] == "cancelled"
