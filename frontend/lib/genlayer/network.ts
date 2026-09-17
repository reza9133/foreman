import { studioDevnet } from "genlayer-js/chains";

// Studio Dev (Consensus v0.6) is the deployment target. `studioDevnet` is the
// SDK's own preset for it — chain id 61997, RPC https://studio-dev.genlayer.com/api
// — so the defaults below are read off the preset rather than hardcoded, and a
// future SDK bump moves the app with it instead of silently disagreeing.
//
// Note: studio-next.genlayer.com is the browser-facing Studio UI for this same
// chain, not an RPC endpoint. Pointing NEXT_PUBLIC_GENLAYER_RPC_URL at it will
// fail every read and write.
const DEFAULT_RPC_URL = studioDevnet.rpcUrls.default.http[0];
const DEFAULT_CHAIN_NAME = studioDevnet.name;

export interface GenLayerNetworkOverrides {
  chainId?: string;
  chainName?: string;
  rpcUrl?: string;
  symbol?: string;
}

function parseChainId(value: string | undefined): number {
  if (value === undefined || value.trim() === "") {
    return studioDevnet.id;
  }

  const chainId = Number(value);
  if (!Number.isSafeInteger(chainId) || chainId <= 0) {
    throw new Error(`NEXT_PUBLIC_GENLAYER_CHAIN_ID must be a positive integer; received ${value}`);
  }

  return chainId;
}

/**
 * Resolve one network definition shared by MetaMask, genlayer-js, and
 * Transaction Kit. Keeping these consumers on the same object prevents an RPC
 * endpoint override from producing transactions signed for a different chain.
 */
export function createGenLayerNetworkConfig(
  overrides: GenLayerNetworkOverrides = {},
) {
  const chainId = parseChainId(overrides.chainId);
  const chainName = overrides.chainName || DEFAULT_CHAIN_NAME;
  const rpcUrl = overrides.rpcUrl || DEFAULT_RPC_URL;
  const symbol = overrides.symbol || studioDevnet.nativeCurrency.symbol;

  const chain = {
    ...studioDevnet,
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
  } satisfies typeof studioDevnet;

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
