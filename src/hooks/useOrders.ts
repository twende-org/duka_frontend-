import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as ordersApi from "@/lib/api/domains/orders";
import type { Order } from "@/types";

export function useOrders(shopId: string | undefined, branchId?: string | null) {
  return useQuery({
    queryKey: ["orders", shopId, branchId],
    queryFn: () => {
      if (!shopId) return [];
      return ordersApi.getOrders(shopId, branchId || undefined);
    },
    enabled: !!shopId,
  });
}

export function useCreateOrder(shopId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Order, "id"> & { idempotencyKey?: string }) => {
      if (!shopId) throw new Error("No shop ID");
      // The Django service is the atomic, idempotency-key guarded port of the
      // createOrder Cloud Function this hook used to call.
      return ordersApi.createOrder(shopId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders", shopId] });
      queryClient.invalidateQueries({ queryKey: ["inventory", shopId] });
    },
  });
}

export function usePayOrder(shopId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderId, paymentMethod, shiftId }: { orderId: string; paymentMethod: string; shiftId?: string }) => {
      if (!shopId) throw new Error("No shop ID");
      await ordersApi.payOrder(shopId, orderId, paymentMethod, shiftId);
      return { orderId, paymentMethod };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders", shopId] });
      // Settling an order moves the day summary and the customer's lifetime
      // stats; inventory stays put, exactly like the legacy payOrder.
      queryClient.invalidateQueries({ queryKey: ["sales", shopId] });
      queryClient.invalidateQueries({ queryKey: ["sales", "summary", shopId] });
    },
  });
}

export function useCancelOrder(shopId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (orderId: string) => {
      if (!shopId) throw new Error("No shop ID");
      await ordersApi.cancelOrder(shopId, orderId);
      return orderId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders", shopId] });
      // Cancelling restocks the branch server-side and reverses a credit
      // receivable, so inventory and the AR ledgers must refresh too.
      queryClient.invalidateQueries({ queryKey: ["inventory", shopId] });
      queryClient.invalidateQueries({ queryKey: ["products", shopId] });
      queryClient.invalidateQueries({ queryKey: ["customerBalances", shopId] });
      queryClient.invalidateQueries({ queryKey: ["customerInvoices", shopId] });
    },
  });
}

export function useDeleteOrder(shopId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (orderId: string) => {
      if (!shopId) throw new Error("No shop ID");
      await ordersApi.deleteOrder(shopId, orderId);
      return orderId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders", shopId] });
    },
  });
}

export function useUpdateFulfillmentStatus(shopId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      orderId,
      status,
      fulfillmentData,
      items,
    }: {
      orderId: string;
      status: import("@/types").Order["status"];
      fulfillmentData?: Partial<import("@/types").FulfillmentDetails>;
      items?: import("@/types").OrderItem[];
    }) => {
      if (!shopId) throw new Error("No shop ID");
      await ordersApi.updateOrderFulfillmentStatus(shopId, orderId, status, fulfillmentData, items);
      return { orderId, status };
    },
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ["orders", shopId] });
      queryClient.invalidateQueries({ queryKey: ["inventory", shopId] });
      queryClient.invalidateQueries({ queryKey: ["products", shopId] });
      // ``cancelled`` puts the stock back server-side and reverses a credit
      // receivable, so the AR ledgers follow that transition too.
      if (variables.status === "cancelled") {
        queryClient.invalidateQueries({ queryKey: ["customerBalances", shopId] });
        queryClient.invalidateQueries({ queryKey: ["customerInvoices", shopId] });
      }
    },
  });
}
