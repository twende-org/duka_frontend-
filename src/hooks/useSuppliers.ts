import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as fs from "@/lib/api/domains/suppliers";
import { getShopBySlugOrId } from "@/lib/api/domains/storefront";
import type { Shop, Supplier } from "@/types";

/**
 * Resolve the platform shops behind linked suppliers so their details can be
 * displayed even when the supplier record itself was saved with empty fields.
 */
export function useLinkedSupplierShops(platformShopIds: string[]) {
  const key = Array.from(new Set(platformShopIds.filter(Boolean))).sort();
  return useQuery({
    queryKey: ["linked-supplier-shops", key],
    queryFn: async () => {
      const entries = await Promise.all(
        key.map(async (id) => {
          const shop = await getShopBySlugOrId(id).catch(() => null);
          return [id, shop] as const;
        })
      );
      const map: Record<string, Shop> = {};
      entries.forEach(([id, shop]) => {
        if (shop) map[id] = shop;
      });
      return map;
    },
    enabled: key.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}


export function useSuppliers(shopId: string | undefined) {
  return useQuery({
    queryKey: ["suppliers", shopId],
    queryFn: () => {
      if (!shopId) return [];
      return fs.getSuppliers(shopId);
    },
    enabled: !!shopId,
  });
}

export function usePaginatedSuppliers(shopId: string | undefined, pageSize = 20) {
  return useInfiniteQuery({
    queryKey: ["suppliers", "paginated", shopId, pageSize],
    queryFn: async ({ pageParam = null }) => {
      if (!shopId) return { data: [], lastDoc: null, hasMore: false };
      return fs.getSuppliersPaginated(shopId, pageSize, pageParam);
    },
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.lastDoc : undefined),
    enabled: !!shopId,
    initialPageParam: null,
  });
}

export function useCreateSupplier(shopId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<Supplier, "id">) => {
      const id = await fs.addSupplier(data);
      return { ...data, id } as Supplier;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers", shopId] });
      queryClient.invalidateQueries({ queryKey: ["suppliers", "paginated", shopId] });
    },
  });
}

export function useEditSupplier(shopId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Supplier> }) => {
      await fs.updateSupplier(id, data);
      return { id, data };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers", shopId] });
      queryClient.invalidateQueries({ queryKey: ["suppliers", "paginated", shopId] });
    },
  });
}

export function useDeleteSupplier(shopId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await fs.deleteSupplier(id);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers", shopId] });
      queryClient.invalidateQueries({ queryKey: ["suppliers", "paginated", shopId] });
    },
  });
}
