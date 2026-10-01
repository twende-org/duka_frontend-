import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getBuyerSupplierBalances,
  getBuyerInvoices,
  getBuyerPayments,
  createB2BSupplierInvoice,
  updateB2BSupplierInvoiceStatus,
  processSupplierPayment,
} from "@/lib/api/domains/b2b";
import type { B2BSupplierInvoice, B2BSupplierPayment } from "@/types";

export function useBuyerSupplierBalances(buyerShopId: string | null) {
  return useQuery({
    queryKey: ["b2b_supplier_balances", buyerShopId],
    queryFn: async () => {
      if (!buyerShopId) return [];
      return await getBuyerSupplierBalances(buyerShopId);
    },
    enabled: !!buyerShopId,
  });
}

export function useBuyerInvoices(buyerShopId: string | null) {
  return useQuery({
    queryKey: ["b2b_supplier_invoices", buyerShopId],
    queryFn: async () => {
      if (!buyerShopId) return [];
      return await getBuyerInvoices(buyerShopId);
    },
    enabled: !!buyerShopId,
  });
}

export function useBuyerPayments(buyerShopId: string | null) {
  return useQuery({
    queryKey: ["b2b_supplier_payments", buyerShopId],
    queryFn: async () => {
      if (!buyerShopId) return [];
      return await getBuyerPayments(buyerShopId);
    },
    enabled: !!buyerShopId,
  });
}

export function useCreateSupplierInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<B2BSupplierInvoice, "id" | "createdAt" | "updatedAt">) => {
      return await createB2BSupplierInvoice(data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["b2b_supplier_invoices", variables.buyerShopId] });
    }
  });
}

export function useUpdateInvoiceStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ invoiceId, status }: { invoiceId: string, status: B2BSupplierInvoice["status"], buyerShopId: string }) => {
      await updateB2BSupplierInvoiceStatus(invoiceId, status);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["b2b_supplier_invoices", variables.buyerShopId] });
    }
  });
}

export function useProcessSupplierPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ paymentData, allowOverpayment }: { paymentData: Omit<B2BSupplierPayment, "id" | "createdAt">, allowOverpayment?: boolean }) => {
      return await processSupplierPayment(paymentData, allowOverpayment);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["b2b_supplier_payments", variables.paymentData.buyerShopId] });
      queryClient.invalidateQueries({ queryKey: ["b2b_supplier_balances", variables.paymentData.buyerShopId] });
      // Invalidate invoices in case status changed
      queryClient.invalidateQueries({ queryKey: ["b2b_supplier_invoices", variables.paymentData.buyerShopId] });
    }
  });
}
