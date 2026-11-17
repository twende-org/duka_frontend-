import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { searchMasterCatalog, tapToAddProducts } from "@/lib/api/domains/catalog";
import type { TapToAddLine } from "@/lib/api/domains/catalog";
import { inventoryKeys } from "./useInventory";
import { productsKeys } from "./useProducts";

export const catalogKeys = {
  all: ["master-catalog"] as const,
  lists: () => [...catalogKeys.all, "search"] as const,
};

export interface CatalogFilter {
  shopId: string | null;
  q: string;
  category: string;
  brand: string;
  /** The shop's own product-category picks, resolved to catalog lanes. */
  productCategories?: string[] | null;
}

/**
 * Shop product-category ids (the setup wizard's controlled vocabulary) →
 * catalog lanes (MasterProduct.niche). Lanes join the day their data is
 * seeded; until then the backend's empty-lane fallback keeps showing all.
 */
const LANES_BY_CATEGORY_ID: Record<string, string[]> = {
  electronics: ["electronics"],
  phones: ["electronics"],
};

export function catalogLanesForShop(productCategories?: string[] | null): string[] {
  const lanes = new Set<string>();
  for (const id of productCategories || []) {
    for (const lane of LANES_BY_CATEGORY_ID[id] || []) lanes.add(lane);
  }
  return [...lanes];
}

/**
 * One infinite feed of catalog rows for the picker. The whole filter set lives
 * in the key, so a new search or pill swap starts from page one instead of
 * appending to a stale result.
 */
export function useMasterCatalog(
  filter: CatalogFilter,
  options: { pageSize?: number } = {}
) {
  const niches = catalogLanesForShop(filter.productCategories);
  return useInfiniteQuery({
    queryKey: [
      ...catalogKeys.lists(),
      filter.shopId,
      filter.q.trim().toLowerCase(),
      filter.category,
      filter.brand,
      niches,
    ],
    queryFn: ({ pageParam, signal }) =>
      searchMasterCatalog({
        shopId: filter.shopId!,
        q: filter.q,
        category: filter.category || undefined,
        brand: filter.brand || undefined,
        niches: niches.length ? niches : undefined,
        page: pageParam as number,
        pageSize: options.pageSize,
        signal,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.nextPage ?? undefined,
    enabled: !!filter.shopId,
    staleTime: 60_000,
  });
}

/**
 * Adds the staged selection in one request. A tap can create products and move
 * stock, so the product list, the paginated list and every inventory read are
 * all refreshed; the catalog feed too, because `alreadyAdded` just changed.
 */
export function useTapToAdd(shopId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { items: TapToAddLine[]; branchId?: string | null }) =>
      tapToAddProducts({ shopId: shopId!, branchId: input.branchId, items: input.items }),
    onSuccess: () => {
      if (!shopId) return;
      queryClient.invalidateQueries({ queryKey: productsKeys.list(shopId) });
      queryClient.invalidateQueries({ queryKey: productsKeys.infinite(shopId) });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
      queryClient.invalidateQueries({ queryKey: catalogKeys.all });
    },
  });
}
