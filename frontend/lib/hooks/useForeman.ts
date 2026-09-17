"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import Foreman from "../contracts/Foreman";
import { getContractAddress } from "../genlayer/client";
import { useWallet } from "../genlayer/wallet";
import { configError } from "../utils/toast";
import type { Order, ProviderReputation } from "../contracts/types";

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
        : Promise.resolve({ completed: 0, rejected: 0, disputed: 0, total_earned_wei: "0" }),
    enabled: !!contract,
    staleTime: 2000,
  });
}

export function useInvalidateOrdersData() {
  const queryClient = useQueryClient();

  return useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["orders"] });
    queryClient.invalidateQueries({ queryKey: ["reputation"] });
  }, [queryClient]);
}
