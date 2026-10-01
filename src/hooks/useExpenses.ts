import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as expensesApi from "@/lib/api/domains/expenses";
import type { Expense } from "@/types";

export function useExpenses(shopId: string | undefined, branchId?: string | null) {
  return useQuery({
    queryKey: ["expenses", shopId, branchId],
    queryFn: () => {
      if (!shopId) return [];
      return expensesApi.getExpenses(shopId, branchId || undefined);
    },
    enabled: !!shopId,
  });
}

export function usePaginatedExpenses(shopId: string | undefined, pageSize = 20, branchId?: string | null) {
  return useInfiniteQuery({
    queryKey: ["expenses", "paginated", shopId, pageSize, branchId],
    queryFn: async ({ pageParam = null }) => {
      if (!shopId) return { data: [], lastDoc: null, hasMore: false };
      return expensesApi.getExpensesPaginated(shopId, pageSize, pageParam, branchId || undefined);
    },
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.lastDoc : undefined),
    enabled: !!shopId,
    initialPageParam: null,
  });
}

export function useCreateExpense(shopId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<Expense, "id">) => {
      const id = await expensesApi.addExpense(data);
      return { ...data, id } as Expense;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses", shopId] });
      queryClient.invalidateQueries({ queryKey: ["expenses", "paginated", shopId] });
    },
  });
}

export function useEditExpense(shopId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Expense> }) => {
      await expensesApi.updateExpense(id, data);
      return { id, data };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses", shopId] });
      queryClient.invalidateQueries({ queryKey: ["expenses", "paginated", shopId] });
    },
  });
}

export function useDeleteExpense(shopId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await expensesApi.deleteExpense(id);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses", shopId] });
      queryClient.invalidateQueries({ queryKey: ["expenses", "paginated", shopId] });
    },
  });
}
