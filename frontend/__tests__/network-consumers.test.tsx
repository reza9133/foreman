import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  GENLAYER_CHAIN,
  GENLAYER_CHAIN_ID_HEX,
  GENLAYER_NETWORK,
} from "../lib/genlayer/network";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(() => ({ readContract: vi.fn() })),
}));

vi.mock("genlayer-js", () => ({
  createClient: mocks.createClient,
}));

import Foreman from "../lib/contracts/Foreman";
import {
  addGenLayerNetwork,
  switchToGenLayerNetwork,
} from "../lib/genlayer/client";

const account = "0x1234567890123456789012345678901234567890";
const providerRequest = vi.fn();

describe("network consumers", () => {
  beforeEach(() => {
    mocks.createClient.mockClear();
    providerRequest.mockReset();
    Object.defineProperty(window, "ethereum", {
      configurable: true,
      value: {
        request: providerRequest,
        on: vi.fn(),
        removeListener: vi.fn(),
      },
    });
  });

  it("uses the shared chain for contract clients", () => {
    const contract = new Foreman(account, account);

    expect(mocks.createClient).toHaveBeenLastCalledWith({
      account,
      chain: GENLAYER_CHAIN,
    });

    contract.updateAccount("0x0000000000000000000000000000000000000001");
    expect(mocks.createClient).toHaveBeenLastCalledWith({
      account: "0x0000000000000000000000000000000000000001",
      chain: GENLAYER_CHAIN,
    });
  });

  it("uses the shared wallet network for add and switch requests", async () => {
    await switchToGenLayerNetwork();
    expect(providerRequest).toHaveBeenCalledWith({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: GENLAYER_CHAIN_ID_HEX }],
    });

    await addGenLayerNetwork();
    expect(providerRequest).toHaveBeenCalledWith({
      method: "wallet_addEthereumChain",
      params: [GENLAYER_NETWORK],
    });
  });
});
