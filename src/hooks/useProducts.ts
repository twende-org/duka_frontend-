import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getProducts,
  getProductsPaginated,
  addProduct,
  updateProduct,
  deleteProduct,
  bulkImportProducts,
} from '@/lib/api/domains/products';
import type { BulkImportRow } from '@/lib/api/domains/products';
import type { Product } from '@/types';
import { inventoryKeys } from './useInventory';

export const productsKeys = {
  all: ['products'] as const,
  lists: () => [...productsKeys.all, 'list'] as const,
  list: (shopId: string) => [...productsKeys.lists(), shopId] as const,
  infinite: (shopId: string) => [...productsKeys.all, 'infinite', shopId] as const,
};

export function useProducts(shopId: string | null) {
  return useQuery({
    queryKey: productsKeys.list(shopId!),
    queryFn: () => getProducts(shopId!),
    enabled: !!shopId,
  });
}

export function usePaginatedProducts(shopId: string | null, pageSize: number = 20) {
  return useInfiniteQuery({
    queryKey: productsKeys.infinite(shopId!),
    queryFn: async ({ pageParam = null }) => {
      return getProductsPaginated(shopId!, pageSize, pageParam);
    },
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.lastDoc : undefined,
    enabled: !!shopId,
    initialPageParam: null,
  });
}

export function useCreateProduct(shopId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Product, 'id'>) => addProduct(data),
    onSuccess: () => {
      if (shopId) {
        queryClient.invalidateQueries({ queryKey: productsKeys.list(shopId) });
        queryClient.invalidateQueries({ queryKey: productsKeys.infinite(shopId) });
      }
    },
  });
}

export function useEditProduct(shopId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Product> }) => updateProduct(id, data),
    onSuccess: () => {
      if (shopId) {
        queryClient.invalidateQueries({ queryKey: productsKeys.list(shopId) });
        queryClient.invalidateQueries({ queryKey: productsKeys.infinite(shopId) });
      }
    },
  });
}

export function useDeleteProduct(shopId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: () => {
      if (shopId) {
        queryClient.invalidateQueries({ queryKey: productsKeys.list(shopId) });
        queryClient.invalidateQueries({ queryKey: productsKeys.infinite(shopId) });
      }
    },
  });
}

export function useBulkImportProducts(shopId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { rows: BulkImportRow[]; branchId?: string | null }) =>
      bulkImportProducts(shopId!, input.rows, input.branchId),
    onSuccess: () => {
      if (shopId) {
        queryClient.invalidateQueries({ queryKey: productsKeys.list(shopId) });
        queryClient.invalidateQueries({ queryKey: productsKeys.infinite(shopId) });
        queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
      }
    },
  });
}
