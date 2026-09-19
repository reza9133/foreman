"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import {
  isMetaMaskInstalled,
  connectMetaMask,
  switchAccount,
  getAccounts,
  getCurrentChainId,
  isOnGenLayerNetwork,
  getEthereumProvider,
  setSelectedProvider,
  revokePermissions,
  GENLAYER_CHAIN_ID,
} from "./client";
import { discoverWallets, subscribeToWallets, type EIP6963ProviderDetail } from "./eip6963";
import { error, userRejected, warning } from "../utils/toast";

// localStorage key for tracking user's disconnect intent
const DISCONNECT_FLAG = "wallet_disconnected";
// localStorage key remembering which wallet (by EIP-6963 rdns) to
// auto-reconnect to on the next visit. Cleared on disconnect so a fresh
// connect always re-offers the full picker instead of assuming the same
// wallet as last time.
const SELECTED_WALLET_KEY = "wallet_selected_rdns";

export interface WalletState {
  address: string | null;
  chainId: string | null;
  isConnected: boolean;
  isLoading: boolean;
  isMetaMaskInstalled: boolean;
  isOnCorrectNetwork: boolean;
  /** Every wallet extension currently announcing itself via EIP-6963. */
  availableWallets: EIP6963ProviderDetail[];
  /** rdns of the wallet currently in use, if any was explicitly selected. */
  selectedWalletRdns: string | null;
}

interface WalletContextValue extends WalletState {
  /** Pass a specific wallet from `availableWallets` to connect to it
   *  directly (used by the wallet picker). Omit to use whichever wallet
   *  is already active — preserves the old single-wallet call sites. */
  connectWallet: (walletDetail?: EIP6963ProviderDetail) => Promise<string>;
  disconnectWallet: () => Promise<void>;
  switchWalletAccount: () => Promise<string>;
}

// Create context with undefined default (will error if used outside Provider)
const WalletContext = createContext<WalletContextValue | undefined>(undefined);

function applySelection(detail: EIP6963ProviderDetail | null) {
  setSelectedProvider(detail?.provider ?? null);
  if (typeof window === "undefined") return;
  if (detail) {
    localStorage.setItem(SELECTED_WALLET_KEY, detail.info.rdns);
  } else {
    localStorage.removeItem(SELECTED_WALLET_KEY);
  }
}

/**
 * WalletProvider component that manages wallet state and provides it to all children
 * This ensures all components share the same wallet state and react to changes
 */
export function WalletProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WalletState>({
    address: null,
    chainId: null,
    isConnected: false,
    isLoading: true,
    isMetaMaskInstalled: false,
    isOnCorrectNetwork: false,
    availableWallets: [],
    selectedWalletRdns: null,
  });

  // Discover every installed wallet up front (EIP-6963), and keep
  // listening in case one announces itself late.
  useEffect(() => {
    let cancelled = false;

    discoverWallets().then((wallets) => {
      if (!cancelled) {
        setState((prev) => ({ ...prev, availableWallets: wallets }));
      }
    });

    const unsubscribe = subscribeToWallets((wallets) => {
      if (!cancelled) {
        setState((prev) => ({ ...prev, availableWallets: wallets }));
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  // Check wallet installation and load account on mount
  useEffect(() => {
    const initWallet = async () => {
      // Check if user intentionally disconnected.
      // If they did, don't auto-reconnect even if a wallet has permissions —
      // they'll pick a wallet fresh next time via the picker.
      if (typeof window !== "undefined") {
        const wasDisconnected = localStorage.getItem(DISCONNECT_FLAG) === "true";

        if (wasDisconnected) {
          setState((prev) => ({
            ...prev,
            address: null,
            chainId: null,
            isConnected: false,
            isLoading: false,
            isMetaMaskInstalled: isMetaMaskInstalled(),
            isOnCorrectNetwork: false,
            selectedWalletRdns: null,
          }));
          return;
        }
      }

      // Re-select whichever wallet was used last time, if it's still
      // installed. Falls back to window.ethereum (legacy behavior) if
      // nothing was ever explicitly selected — e.g. a MetaMask-only
      // setup from before this picker existed.
      let selectedRdns: string | null = null;
      if (typeof window !== "undefined") {
        selectedRdns = localStorage.getItem(SELECTED_WALLET_KEY);
        if (selectedRdns) {
          const wallets = await discoverWallets();
          const match = wallets.find((w) => w.info.rdns === selectedRdns);
          if (match) {
            setSelectedProvider(match.provider);
          } else {
            // The previously-selected wallet is no longer installed —
            // forget it and fall back to window.ethereum.
            selectedRdns = null;
            localStorage.removeItem(SELECTED_WALLET_KEY);
          }
        }
      }

      const installed = isMetaMaskInstalled() || !!getEthereumProvider();

      if (!installed) {
        setState((prev) => ({
          ...prev,
          address: null,
          chainId: null,
          isConnected: false,
          isLoading: false,
          isMetaMaskInstalled: false,
          isOnCorrectNetwork: false,
          selectedWalletRdns: selectedRdns,
        }));
        return;
      }

      try {
        // Get current accounts (without requesting)
        // This will auto-reconnect if the wallet has existing permissions
        // and user didn't explicitly disconnect
        const accounts = await getAccounts();
        const chainId = await getCurrentChainId();
        const correctNetwork = await isOnGenLayerNetwork();

        setState((prev) => ({
          ...prev,
          address: accounts[0] || null,
          chainId,
          isConnected: accounts.length > 0,
          isLoading: false,
          isMetaMaskInstalled: true,
          isOnCorrectNetwork: correctNetwork,
          selectedWalletRdns: selectedRdns,
        }));
      } catch (err) {
        console.error("Error initializing wallet:", err);
        setState((prev) => ({
          ...prev,
          address: null,
          chainId: null,
          isConnected: false,
          isLoading: false,
          isMetaMaskInstalled: true,
          isOnCorrectNetwork: false,
          selectedWalletRdns: selectedRdns,
        }));
      }
    };

    initWallet();
    // Re-run once discovery settles, so a persisted selection can resolve
    // against the discovered list on first load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.availableWallets.length]);

  // Set up wallet event listeners. Re-subscribes whenever the active
  // wallet changes (picking a different wallet mid-session, or resolving
  // the persisted selection on mount) so listeners always point at the
  // provider actually in use, not whichever one was active at mount time.
  useEffect(() => {
    const provider = getEthereumProvider();

    if (!provider) {
      return;
    }

    const handleAccountsChanged = async (accounts: string[]) => {
      const chainId = await getCurrentChainId();
      const correctNetwork = await isOnGenLayerNetwork();

      // If user connected via the wallet's own UI, clear the disconnect flag
      // This allows future auto-reconnects
      if (accounts.length > 0 && typeof window !== "undefined") {
        localStorage.removeItem(DISCONNECT_FLAG);
      }

      setState((prev) => ({
        ...prev,
        address: accounts[0] || null,
        chainId,
        isConnected: accounts.length > 0,
        isOnCorrectNetwork: correctNetwork,
      }));
    };

    const handleChainChanged = async (chainId: string) => {
      // MetaMask recommends reloading the page on chain change
      // but we'll update state instead for better UX
      const correctNetwork = parseInt(chainId, 16) === GENLAYER_CHAIN_ID;
      const accounts = await getAccounts();

      setState((prev) => ({
        ...prev,
        chainId,
        address: accounts[0] || null,
        isConnected: accounts.length > 0,
        isOnCorrectNetwork: correctNetwork,
      }));
    };

    const handleDisconnect = () => {
      setState((prev) => ({
        ...prev,
        address: null,
        isConnected: false,
      }));
    };

    // Add event listeners
    provider.on("accountsChanged", handleAccountsChanged);
    provider.on("chainChanged", handleChainChanged);
    provider.on("disconnect", handleDisconnect);

    // Cleanup
    return () => {
      provider.removeListener("accountsChanged", handleAccountsChanged);
      provider.removeListener("chainChanged", handleChainChanged);
      provider.removeListener("disconnect", handleDisconnect);
    };
  }, [state.selectedWalletRdns]);

  /**
   * Connect to a wallet. Pass a specific entry from `availableWallets` to
   * connect to that one (the picker's job); omit it to use whichever
   * provider is already active (window.ethereum, or a previously-selected
   * wallet) — keeps existing single-wallet call sites working unchanged.
   */
  const connectWallet = useCallback(async (walletDetail?: EIP6963ProviderDetail) => {
    try {
      setState((prev) => ({ ...prev, isLoading: true }));

      if (walletDetail) {
        applySelection(walletDetail);
      }

      const address = await connectMetaMask();
      const chainId = await getCurrentChainId();
      const correctNetwork = await isOnGenLayerNetwork();

      // User is connecting, clear the disconnect flag
      // This allows auto-reconnect on future page loads
      if (typeof window !== "undefined") {
        localStorage.removeItem(DISCONNECT_FLAG);
      }

      setState((prev) => ({
        ...prev,
        address,
        chainId,
        isConnected: true,
        isLoading: false,
        isMetaMaskInstalled: true,
        isOnCorrectNetwork: correctNetwork,
        selectedWalletRdns: walletDetail?.info.rdns ?? prev.selectedWalletRdns,
      }));

      return address;
    } catch (err: any) {
      console.error("Error connecting wallet:", err);
      setState((prev) => ({ ...prev, isLoading: false }));

      // Handle specific error types with appropriate toasts
      if (err.message?.includes("rejected")) {
        userRejected("Connection cancelled");
      } else if (err.message?.includes("not installed") || err.message?.includes("not available")) {
        error("No wallet found", {
          description: "Please install a wallet extension (e.g. MetaMask) to connect.",
          action: {
            label: "Install MetaMask",
            onClick: () => window.open("https://metamask.io/download/", "_blank")
          }
        });
      } else {
        error("Failed to connect wallet", {
          description: err.message || "Please check your wallet and try again."
        });
      }

      throw err;
    }
  }, []);

  /**
   * Disconnect wallet: revoke this site's permission grant on the wallet
   * itself where supported (so the next connect shows a real consent
   * prompt instead of silently re-approving), forget which wallet was
   * selected, and persist the disconnect intent to skip auto-reconnect on
   * the next page load.
   */
  const disconnectWallet = useCallback(async () => {
    try {
      await revokePermissions();
    } catch {
      // Best-effort — local disconnect still proceeds below regardless.
    }

    applySelection(null);

    if (typeof window !== "undefined") {
      localStorage.setItem(DISCONNECT_FLAG, "true");
    }

    setState((prev) => ({
      ...prev,
      address: null,
      isConnected: false,
      selectedWalletRdns: null,
    }));
  }, []);

  /**
   * Request user to switch to a different account within the active wallet.
   * Shows that wallet's account picker even if already connected.
   */
  const switchWalletAccount = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true }));

      // Request account switch via the wallet's picker
      const newAddress = await switchAccount();

      // Get updated state
      const chainId = await getCurrentChainId();
      const correctNetwork = await isOnGenLayerNetwork();

      // Clear disconnect flag - user is actively connecting
      if (typeof window !== "undefined") {
        localStorage.removeItem(DISCONNECT_FLAG);
      }

      // Update state immediately for better UX
      // accountsChanged event will also fire, but that's okay
      setState((prev) => ({
        ...prev,
        address: newAddress,
        chainId,
        isConnected: true,
        isLoading: false,
        isMetaMaskInstalled: true,
        isOnCorrectNetwork: correctNetwork,
      }));

      return newAddress;
    } catch (err: any) {
      console.error("Error switching account:", err);
      setState((prev) => ({ ...prev, isLoading: false }));

      // Handle specific error types
      if (err.message?.includes("rejected")) {
        userRejected("Account switch cancelled");
      } else {
        error("Failed to switch account", {
          description: err.message || "Please try again."
        });
      }

      throw err;
    }
  }, []);

  const value: WalletContextValue = {
    ...state,
    connectWallet,
    disconnectWallet,
    switchWalletAccount,
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

/**
 * Custom hook to use wallet context
 * Must be used within a WalletProvider
 */
export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
}
