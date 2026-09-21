"use client";

import type { EIP6963ProviderDetail } from "@/lib/genlayer/eip6963";
import { Button } from "./ui/button";
import { SpinnerIcon } from "./ui/spinner";

/**
 * Lists every wallet extension discovered via EIP-6963 as its own button,
 * so connecting is an explicit choice — including after a disconnect,
 * where the previous selection has been forgotten on purpose (see
 * WalletProvider's disconnectWallet). Falls back to a single generic
 * "Connect Wallet" button when nothing has announced itself yet (e.g.
 * an older wallet extension without EIP-6963 support) or discovery is
 * still in flight, using window.ethereum directly.
 */
export function WalletPickerList({
  wallets,
  onSelect,
  onFallbackConnect,
  disabled = false,
  /** uuid of the wallet currently being connected ("fallback" for the
   *  no-EIP-6963 button), so only the one the person actually clicked
   *  shows a spinner instead of every button going silently disabled. */
  connectingId = null,
}: {
  wallets: EIP6963ProviderDetail[];
  onSelect: (wallet: EIP6963ProviderDetail) => void;
  onFallbackConnect: () => void;
  disabled?: boolean;
  connectingId?: string | null;
}) {
  if (wallets.length === 0) {
    const isConnecting = connectingId === "fallback";
    return (
      <Button onClick={onFallbackConnect} variant="gradient" className="w-full h-14 text-lg" disabled={disabled}>
        {isConnecting ? (
          <>
            <SpinnerIcon size="sm" /> Connecting…
          </>
        ) : (
          "Connect Wallet"
        )}
      </Button>
    );
  }

  return (
    <div className="space-y-2">
      {wallets.map((wallet) => {
        const isConnecting = connectingId === wallet.info.uuid;
        return (
          <Button
            key={wallet.info.uuid}
            onClick={() => onSelect(wallet)}
            variant="outline"
            className="w-full h-14 text-lg justify-start gap-3"
            disabled={disabled}
          >
            {isConnecting ? (
              <SpinnerIcon size="sm" />
            ) : (
              wallet.info.icon && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={wallet.info.icon} alt="" className="w-6 h-6 rounded" />
              )
            )}
            {isConnecting ? "Connecting…" : wallet.info.name}
          </Button>
        );
      })}
    </div>
  );
}
