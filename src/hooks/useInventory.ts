import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as inventoryApi from '@/lib/api/domains/inventory';

export const inventoryKeys = {
  all: ['inventory'] as const,
  list: (shopId: string, branchId?: string | null) => [...inventoryKeys.all, shopId, branchId] as const,
  movements: (shopId: string, productId: string) => [...inventoryKeys.all, 'movements', shopId, productId] as const,
};

export function useInventory(shopId: string | null, branchId?: string | null) {
  return useQuery({
    queryKey: inventoryKeys.list(shopId!, branchId),
    queryFn: () => inventoryApi.getInventory(shopId!, branchId || undefined),
    enabled: !!shopId,
  });
}

export function useStockMovements(shopId: string | null, productId: string | null) {
  return useQuery({
    queryKey: inventoryKeys.movements(shopId!, productId!),
    queryFn: () => inventoryApi.getStockMovements(shopId!, productId!),
    enabled: !!shopId && !!productId,
  });
}

export function useAdjustStock(shopId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      productId: string;
      productName: string;
      shopId: string;
      branchId: string;
      type: 'in' | 'out';
      quantity: number;
      reason: string;
      userId: string;
      userName: string;
    }) => inventoryApi.adjustStock(data),
    onSuccess: (_, variables) => {
      if (shopId) {
        queryClient.invalidateQueries({ queryKey: inventoryKeys.list(shopId) });
        queryClient.invalidateQueries({ queryKey: inventoryKeys.movements(shopId, variables.productId) });
      }
    },
  });
}

export function useUpdateMinStock(shopId: string | null, branchId?: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, minStock }: { productId: string; minStock: number }) => 
      inventoryApi.updateStockMinLevel(shopId!, productId, minStock, branchId || undefined),
    onSuccess: () => {
      if (shopId) {
        queryClient.invalidateQueries({ queryKey: inventoryKeys.list(shopId) });
      }
    },
  });
}
