"use client";

/**
 * EIP-6963 ("Multi Injected Provider Discovery") lets every installed
 * wallet extension announce itself instead of all of them fighting over
 * a single `window.ethereum` global. Without this, a dapp can only ever
 * talk to whichever extension happens to own `window.ethereum` — usually
 * whichever one loaded last — with no way for the person to choose, and
 * no way to remember "connect with OKX, not MetaMask" across sessions.
 *
 * Every major wallet (MetaMask, OKX Wallet, Coinbase Wallet, Rabby, …)
 * has supported this standard since ~2023, so this is the correct way to
 * offer a real wallet picker rather than hardcoding MetaMask.
 */

export interface EIP6963ProviderInfo {
  uuid: string;
  name: string;
  icon: string;
  rdns: string;
}

export interface EIP1193Provider {
  isMetaMask?: boolean;
  request: (args: { method: string; params?: any[] }) => Promise<any>;
  on: (event: string, handler: (...args: any[]) => void) => void;
  removeListener: (event: string, handler: (...args: any[]) => void) => void;
}

export interface EIP6963ProviderDetail {
  info: EIP6963ProviderInfo;
  provider: EIP1193Provider;
}

interface EIP6963AnnounceProviderEvent extends CustomEvent {
  detail: EIP6963ProviderDetail;
}

/**
 * Discover every wallet currently announcing itself. Dispatches the
 * request event, then listens for `eip6963:announceProvider` for a short
 * window — announcements are synchronous-ish but not guaranteed to all
 * arrive on the same tick, so this batches them.
 */
export function discoverWallets(timeoutMs = 250): Promise<EIP6963ProviderDetail[]> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve([]);
      return;
    }

    const found = new Map<string, EIP6963ProviderDetail>();

    const onAnnounce = (event: Event) => {
      const detail = (event as EIP6963AnnounceProviderEvent).detail;
      if (detail?.info?.uuid) {
        found.set(detail.info.uuid, detail);
      }
    };

    window.addEventListener("eip6963:announceProvider", onAnnounce);
    window.dispatchEvent(new Event("eip6963:requestProvider"));

    setTimeout(() => {
      window.removeEventListener("eip6963:announceProvider", onAnnounce);
      resolve(Array.from(found.values()));
    }, timeoutMs);
  });
}

/**
 * Subscribe to live wallet announcements (covers extensions that load or
 * announce themselves after initial discovery). Returns an unsubscribe
 * function.
 */
export function subscribeToWallets(
  onUpdate: (wallets: EIP6963ProviderDetail[]) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const found = new Map<string, EIP6963ProviderDetail>();

  const onAnnounce = (event: Event) => {
    const detail = (event as EIP6963AnnounceProviderEvent).detail;
    if (detail?.info?.uuid) {
      found.set(detail.info.uuid, detail);
      onUpdate(Array.from(found.values()));
    }
  };

  window.addEventListener("eip6963:announceProvider", onAnnounce);
  window.dispatchEvent(new Event("eip6963:requestProvider"));

  return () => window.removeEventListener("eip6963:announceProvider", onAnnounce);
}
