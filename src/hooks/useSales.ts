import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as salesApi from "@/lib/api/domains/sales";
import type { Sale } from "@/types";
import { commerceEngine } from "@/services/CommerceEngine";

export function useSalesByDate(shopId: string | undefined, date: string, branchId?: string | null) {
  return useQuery({
    queryKey: ["sales", shopId, date, branchId],
    queryFn: () => {
      if (!shopId) return [];
      return salesApi.getSalesByDate(shopId, date, branchId || undefined);
    },
    enabled: !!shopId && !!date,
  });
}

export function useSalesRange(shopId: string | undefined, startDate: string, endDate: string, branchId?: string | null) {
  return useQuery({
    queryKey: ["sales", "range", shopId, startDate, endDate, branchId],
    queryFn: () => {
      if (!shopId) return [];
      return salesApi.getSalesForRange(shopId, startDate, endDate, branchId || undefined);
    },
    enabled: !!shopId && !!startDate && !!endDate,
  });
}

export function useTodaySummary(shopId: string | undefined) {
  const dateStr = new Date().toISOString().split("T")[0];
  return useQuery({
    queryKey: ["sales", "summary", shopId, dateStr],
    queryFn: () => {
      if (!shopId) return null;
      return salesApi.getDailySummary(shopId, dateStr);
    },
    enabled: !!shopId,
  });
}

export function useCreateSale(shopId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<Sale, "id"> & { profit?: number }) => {
      if (!shopId) throw new Error("No shop ID");
      const profit = data.profit ?? (data.buyingPrice
        ? (data.totalPrice - data.buyingPrice * data.quantity)
        : Math.round(data.totalPrice * 0.3));
      const { profit: _p, ...saleData } = data;
      return commerceEngine.executeSaleCheckout(shopId, saleData, profit);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["sales", shopId] });
      queryClient.invalidateQueries({ queryKey: ["sales", "summary", shopId] });
      // Invalidate inventory since stock changed
      queryClient.invalidateQueries({ queryKey: ["inventory", shopId] });
      queryClient.invalidateQueries({ queryKey: ["products", shopId] });
    },
  });
}

export function useCreateDraftSale(shopId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<Sale, "id">) => {
      if (!shopId) throw new Error("No shop ID");
      return commerceEngine.executeDraftCheckout(shopId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales", shopId] });
    },
  });
}

export function useConfirmDraftSale(shopId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sale: Sale) => {
      if (!shopId) throw new Error("No shop ID");
      const profit = sale.buyingPrice
        ? (sale.totalPrice - sale.buyingPrice * sale.quantity)
        : Math.round(sale.totalPrice * 0.3);
      await salesApi.confirmDraftSale(shopId, sale.date, sale.id, profit);
      return { ...sale, status: "completed" as const };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales", shopId] });
      queryClient.invalidateQueries({ queryKey: ["sales", "summary", shopId] });
      queryClient.invalidateQueries({ queryKey: ["inventory", shopId] });
      queryClient.invalidateQueries({ queryKey: ["products", shopId] });
    },
  });
}

export function useDeleteDraftSale(shopId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ date, saleId }: { date: string; saleId: string }) => {
      if (!shopId) throw new Error("No shop ID");
      await salesApi.deleteDraftSale(shopId, date, saleId);
      return saleId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales", shopId] });
    },
  });
}

export function useSummariesRange(shopId: string | undefined, startDate: string, endDate: string) {
  return useQuery({
    queryKey: ["sales", "summaries", "range", shopId, startDate, endDate],
    queryFn: () => {
      if (!shopId) return [];
      return salesApi.getSummariesForRange(shopId, startDate, endDate);
    },
    enabled: !!shopId && !!startDate && !!endDate,
  });
}
