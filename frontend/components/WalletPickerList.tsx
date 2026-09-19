"use client";

import type { EIP6963ProviderDetail } from "@/lib/genlayer/eip6963";
import { Button } from "./ui/button";

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
}: {
  wallets: EIP6963ProviderDetail[];
  onSelect: (wallet: EIP6963ProviderDetail) => void;
  onFallbackConnect: () => void;
  disabled?: boolean;
}) {
  if (wallets.length === 0) {
    return (
      <Button onClick={onFallbackConnect} variant="gradient" className="w-full h-14 text-lg" disabled={disabled}>
        Connect Wallet
      </Button>
    );
  }

  return (
    <div className="space-y-2">
      {wallets.map((wallet) => (
        <Button
          key={wallet.info.uuid}
          onClick={() => onSelect(wallet)}
          variant="outline"
          className="w-full h-14 text-lg justify-start gap-3"
          disabled={disabled}
        >
          {wallet.info.icon && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={wallet.info.icon} alt="" className="w-6 h-6 rounded" />
          )}
          {wallet.info.name}
        </Button>
      ))}
    </div>
  );
}
