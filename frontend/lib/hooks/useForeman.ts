"use client";

import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import Foreman from "../contracts/Foreman";
import { getContractAddress } from "../genlayer/client";
import { useWallet } from "../genlayer/wallet";
import { configError } from "../utils/toast";
import {
  EMPTY_REPUTATION,
  EMPTY_STATS,
  type Order,
  type OrdersPage,
  type ProtocolStats,
  type ProviderReputation,
  type TopProvider,
} from "../contracts/types";

/**
 * Hook to get the Foreman contract instance. Returns null if the contract
 * address isn't configured yet — reads simply return empty results in
 * that case, so the app never crashes on a missing .env.
 */
export function useForemanContract(): Foreman | null {
  const { address } = useWallet();
  const contractAddress = getContractAddress();

  return useMemo(() => {
    if (!contractAddress) {
      configError(
        "Setup Required",
        "Contract address not configured. Please set NEXT_PUBLIC_CONTRACT_ADDRESS in your .env file."
      );
      return null;
    }
    return new Foreman(contractAddress, address);
  }, [contractAddress, address]);
}

export function useAllOrders() {
  const contract = useForemanContract();

  return useQuery<Order[], Error>({
    queryKey: ["orders"],
    queryFn: () => (contract ? contract.getAllOrders() : Promise.resolve([])),
    refetchOnWindowFocus: true,
    staleTime: 2000,
    enabled: !!contract,
  });
}

export function useOpenOrders() {
  const contract = useForemanContract();

  return useQuery<Order[], Error>({
    queryKey: ["orders", "open"],
    queryFn: () => (contract ? contract.getOpenOrders() : Promise.resolve([])),
    refetchOnWindowFocus: true,
    staleTime: 2000,
    enabled: !!contract,
  });
}

export function useOrder(orderId: number | null) {
  const contract = useForemanContract();

  return useQuery<Order | null, Error>({
    queryKey: ["orders", orderId],
    queryFn: () =>
      contract && orderId !== null ? contract.getOrder(orderId) : Promise.resolve(null),
    refetchOnWindowFocus: true,
    staleTime: 2000,
    enabled: !!contract && orderId !== null,
  });
}

export function useOrdersByClient(address: string | null) {
  const contract = useForemanContract();

  return useQuery<Order[], Error>({
    queryKey: ["orders", "client", address],
    queryFn: () =>
      contract && address ? contract.getOrdersByClient(address) : Promise.resolve([]),
    enabled: !!contract && !!address,
    staleTime: 2000,
  });
}

export function useOrdersByProvider(address: string | null) {
  const contract = useForemanContract();

  return useQuery<Order[], Error>({
    queryKey: ["orders", "provider", address],
    queryFn: () =>
      contract && address ? contract.getOrdersByProvider(address) : Promise.resolve([]),
    enabled: !!contract && !!address,
    staleTime: 2000,
  });
}

export function useProviderReputation(address: string | null) {
  const contract = useForemanContract();

  return useQuery<ProviderReputation, Error>({
    queryKey: ["reputation", address],
    queryFn: () =>
      contract
        ? contract.getProviderReputation(address)
        : Promise.resolve({ ...EMPTY_REPUTATION }),
    enabled: !!contract,
    staleTime: 2000,
  });
}

/**
 * Paginated, newest-first orders with an optional status filter. The contract
 * does the slicing, so a page costs the same however large the order book
 * grows; `keepPreviousData` keeps the old page on screen while the next one
 * loads instead of flashing a spinner.
 */
export function useOrdersPage(page: number, pageSize: number, status = "") {
  const contract = useForemanContract();

  return useQuery<OrdersPage, Error>({
    queryKey: ["orders", "page", status, page, pageSize],
    queryFn: () =>
      contract
        ? contract.getOrdersPage(page * pageSize, pageSize, status)
        : Promise.resolve({ orders: [], total_matching: 0, total: 0 }),
    placeholderData: keepPreviousData,
    staleTime: 4000,
    enabled: !!contract,
  });
}

/** Protocol-wide counters (O(1) on-chain), shared by navbar, home and dashboard. */
export function useProtocolStats() {
  const contract = useForemanContract();

  return useQuery<ProtocolStats, Error>({
    queryKey: ["stats"],
    queryFn: () => (contract ? contract.getStats() : Promise.resolve(EMPTY_STATS)),
    staleTime: 8000,
    refetchInterval: (query) =>
      typeof document !== "undefined" && document.visibilityState === "visible" ? 20000 : false,
    enabled: !!contract,
    // a v1 deployment has no get_stats — degrade to zeros rather than erroring the whole UI
    retry: false,
  });
}

export function useTopProviders(limit = 25) {
  const contract = useForemanContract();

  return useQuery<TopProvider[], Error>({
    queryKey: ["providers", "top", limit],
    queryFn: () => (contract ? contract.getTopProviders(limit) : Promise.resolve([])),
    staleTime: 8000,
    enabled: !!contract,
    retry: false,
  });
}

export function useInvalidateOrdersData() {
  const queryClient = useQueryClient();

  return useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["orders"] });
    queryClient.invalidateQueries({ queryKey: ["reputation"] });
    queryClient.invalidateQueries({ queryKey: ["stats"] });
    queryClient.invalidateQueries({ queryKey: ["providers"] });
  }, [queryClient]);
}
