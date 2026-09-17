"""Python-side network configuration.

The old version of this module read `RPCPROTOCOL` / `RPCHOST` / `RPCPORT` with
`os.environ[...]`. Nothing in the repository ever set those three variables and
nothing imported this module, so calling `get_config()` raised `KeyError` — and
the values it described did not match the network the rest of the project
targets. This version is aligned with `gltest.config.yaml` and the frontend:
Studio Dev (Consensus v0.6), chain id 61997.

`gltest` reads `gltest.config.yaml` directly and does not use this module, so
this is only for scripts and notebooks that want the same endpoint without
duplicating the literal.
"""

import os

from dotenv import load_dotenv

load_dotenv()

# Canonical Studio Dev RPC. studio-next.genlayer.com is the browser Studio UI
# for the same chain, not an RPC endpoint.
STUDIO_DEVNET_RPC_URL = "https://studio-dev.genlayer.com/api"
STUDIO_DEVNET_CHAIN_ID = 61997


def get_config() -> dict:
    """Return the RPC endpoint and chain id, allowing env overrides.

    Set `GENLAYER_RPC_URL` and `GENLAYER_CHAIN_ID` together when pointing at a
    different deployment; overriding only one signs for the wrong chain.
    """
    return {
        "rpc_url": os.environ.get("GENLAYER_RPC_URL", STUDIO_DEVNET_RPC_URL),
        "chain_id": int(os.environ.get("GENLAYER_CHAIN_ID", STUDIO_DEVNET_CHAIN_ID)),
    }
