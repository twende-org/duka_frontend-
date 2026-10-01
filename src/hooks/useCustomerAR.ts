import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as fs from "@/lib/api/domains/customers";
import type { CustomerPayment } from "@/types";

export function useCustomerBalances(shopId: string | undefined) {
  return useQuery({
    queryKey: ["customerBalances", shopId],
    queryFn: () => {
      if (!shopId) return [];
      return fs.getCustomerBalances(shopId);
    },
    enabled: !!shopId,
  });
}

export function useCustomerInvoices(shopId: string | undefined) {
  return useQuery({
    queryKey: ["customerInvoices", shopId],
    queryFn: () => {
      if (!shopId) return [];
      return fs.getCustomerInvoices(shopId);
    },
    enabled: !!shopId,
  });
}

export function useCustomerPayments(shopId: string | undefined) {
  return useQuery({
    queryKey: ["customerPayments", shopId],
    queryFn: () => {
      if (!shopId) return [];
      return fs.getCustomerPayments(shopId);
    },
    enabled: !!shopId,
  });
}

export function useCreateCustomerInvoice(shopId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { customerId: string; orderId: string; invoiceData: Omit<import("@/types").CustomerInvoice, "id" | "shopId" | "customerId" | "orderId" | "status" | "createdAt" | "updatedAt"> }) => {
      if (!shopId) throw new Error("No shop ID");
      const id = await fs.createCustomerInvoice(shopId, params.customerId, params.orderId, params.invoiceData);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customerInvoices", shopId] });
      queryClient.invalidateQueries({ queryKey: ["customerBalances", shopId] });
      queryClient.invalidateQueries({ queryKey: ["orders", shopId] });
    },
  });
}

export function useProcessCustomerPayment(shopId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<CustomerPayment, "id" | "createdAt" | "shopId">) => {
      if (!shopId) throw new Error("No shop ID");
      const { customerId, ...rest } = data;
      const id = await fs.processCustomerPayment(shopId, customerId, rest);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customerPayments", shopId] });
      queryClient.invalidateQueries({ queryKey: ["customerInvoices", shopId] });
      queryClient.invalidateQueries({ queryKey: ["customerBalances", shopId] });
    },
  });
}
