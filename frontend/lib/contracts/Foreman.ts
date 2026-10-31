import { createClient } from "genlayer-js";
import { GENLAYER_CHAIN } from "../genlayer/client";
import {
  EMPTY_REPUTATION,
  type Order,
  type OrdersPage,
  type ProtocolStats,
  type ProviderReputation,
  type TopProvider,
} from "./types";

/**
 * Foreman contract class for interacting with the GenLayer Foreman
 * work-order escrow contract. Read-only; all state-changing calls go
 * through <TransactionPanel /> so the person sees exactly what they are signing.
 */
class Foreman {
  private contractAddress: `0x${string}`;
  private client: any;

  constructor(contractAddress: string, address?: string | null) {
    this.contractAddress = contractAddress as `0x${string}`;

    const config: any = { chain: GENLAYER_CHAIN };
    if (address) {
      config.account = address as `0x${string}`;
    }
    this.client = createClient(config);
  }

  /**
   * Update the address used for transactions.
   */
  updateAccount(address: string): void {
    this.client = createClient({
      chain: GENLAYER_CHAIN,
      account: address as `0x${string}`,
    });
  }

  private async read<T>(functionName: string, args: any[] = []): Promise<T> {
    return this.client.readContract({
      address: this.contractAddress,
      functionName,
      args,
    });
  }

  async getOrder(orderId: number): Promise<Order> {
    return this.read<Order>("get_order", [orderId]);
  }

  async getOrderCount(): Promise<number> {
    const count = await this.read<number>("get_order_count");
    return Number(count) || 0;
  }

  async getAllOrders(): Promise<Order[]> {
    try {
      return await this.read<Order[]>("get_all_orders");
    } catch (error) {
      console.error("Error fetching orders:", error);
      throw new Error("Failed to fetch orders from contract");
    }
  }

  async getOpenOrders(): Promise<Order[]> {
    return this.read<Order[]>("get_open_orders");
  }

  async getOrdersByClient(address: string): Promise<Order[]> {
    if (!address) return [];
    return this.read<Order[]>("get_orders_by_client", [address]);
  }

  async getOrdersByProvider(address: string): Promise<Order[]> {
    if (!address) return [];
    return this.read<Order[]>("get_orders_by_provider", [address]);
  }

  async getProviderReputation(address: string | null): Promise<ProviderReputation> {
    if (!address) {
      return { ...EMPTY_REPUTATION };
    }
    return this.read<ProviderReputation>("get_provider_reputation", [address]);
  }

  /** Newest-first page of orders; `status` "" means every status. (v2) */
  async getOrdersPage(offset: number, limit: number, status = ""): Promise<OrdersPage> {
    return this.read<OrdersPage>("get_orders_page", [offset, limit, status]);
  }

  /** O(1) protocol counters. (v2) */
  async getStats(): Promise<ProtocolStats> {
    return this.read<ProtocolStats>("get_stats");
  }

  /** Providers ranked on-chain by completions then earnings. (v2) */
  async getTopProviders(limit = 25): Promise<TopProvider[]> {
    return this.read<TopProvider[]>("get_top_providers", [limit]);
  }

  async canAppeal(orderId: number): Promise<boolean> {
    return this.read<boolean>("can_appeal", [orderId]);
  }

  async isExpired(orderId: number): Promise<boolean> {
    return this.read<boolean>("is_expired", [orderId]);
  }
}

export default Foreman;
