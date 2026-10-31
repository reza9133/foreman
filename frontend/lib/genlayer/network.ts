import { studionet } from "genlayer-js/chains";

// Studionet (the stable GenLayer Studio) is this project's deployment target:
// chain id 61999, RPC https://studio.genlayer.com/api. The SDK ships a
// first-class `studionet` preset, so the defaults below come straight from it
// and every override stays optional.
const DEFAULT_RPC_URL = studionet.rpcUrls.default.http[0];
const DEFAULT_CHAIN_NAME = studionet.name;

export interface GenLayerNetworkOverrides {
  chainId?: string;
  chainName?: string;
  rpcUrl?: string;
  symbol?: string;
}

function parseChainId(value: string | undefined): number {
  if (value === undefined || value.trim() === "") {
    return studionet.id;
  }

  const chainId = Number(value);
  if (!Number.isSafeInteger(chainId) || chainId <= 0) {
    throw new Error(`NEXT_PUBLIC_GENLAYER_CHAIN_ID must be a positive integer; received ${value}`);
  }

  return chainId;
}

/**
 * Resolve one network definition shared by MetaMask and genlayer-js.
 * Keeping these consumers on the same object prevents an RPC
 * endpoint override from producing transactions signed for a different chain.
 */
export function createGenLayerNetworkConfig(
  overrides: GenLayerNetworkOverrides = {},
) {
  const chainId = parseChainId(overrides.chainId);
  const chainName = overrides.chainName || DEFAULT_CHAIN_NAME;
  const rpcUrl = overrides.rpcUrl || DEFAULT_RPC_URL;
  const symbol = overrides.symbol || studionet.nativeCurrency.symbol;

  const chain = {
    ...studionet,
    id: chainId,
    name: chainName,
    nativeCurrency: {
      name: symbol,
      symbol,
      decimals: 18,
    },
    rpcUrls: {
      default: {
        http: [rpcUrl],
      },
    },
  } satisfies typeof studionet;

  return {
    chain,
    wallet: {
      chainId: `0x${chainId.toString(16).toUpperCase()}`,
      chainName,
      nativeCurrency: chain.nativeCurrency,
      rpcUrls: [rpcUrl],
      blockExplorerUrls: [],
    },
  };
}

const networkConfig = createGenLayerNetworkConfig({
  chainId: process.env.NEXT_PUBLIC_GENLAYER_CHAIN_ID,
  chainName: process.env.NEXT_PUBLIC_GENLAYER_CHAIN_NAME,
  rpcUrl: process.env.NEXT_PUBLIC_GENLAYER_RPC_URL,
  symbol: process.env.NEXT_PUBLIC_GENLAYER_SYMBOL,
});

export const GENLAYER_CHAIN = networkConfig.chain;
export const GENLAYER_NETWORK = networkConfig.wallet;
export const GENLAYER_CHAIN_ID = GENLAYER_CHAIN.id;
export const GENLAYER_CHAIN_ID_HEX = GENLAYER_NETWORK.chainId;
