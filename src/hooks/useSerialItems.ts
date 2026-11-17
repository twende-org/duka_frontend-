import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addProductSerials, getProductSerials } from "@/lib/api/domains/catalog";
import type { ProductSerialStatus } from "@/types";
import { inventoryKeys } from "./useInventory";
import { productsKeys } from "./useProducts";

export const serialKeys = {
  all: ["product-serials"] as const,
  product: (productId: string, unitStatus?: ProductSerialStatus) =>
    [...serialKeys.all, productId, unitStatus ?? "all"] as const,
  /** Prefix covering every status filter for one product. */
  forProduct: (productId: string) => [...serialKeys.all, productId] as const,
};

/**
 * The devices on one product's shelf. Defaults to what is still sellable; pass
 * a status to audit sold or damaged units.
 */
export function useProductSerials(
  productId: string | null,
  unitStatus?: ProductSerialStatus,
  options: { enabled?: boolean } = {}
) {
  return useQuery({
    queryKey: serialKeys.product(productId!, unitStatus),
    queryFn: ({ signal }) => getProductSerials(productId!, { unitStatus, signal }),
    enabled: (options.enabled ?? true) && !!productId,
    staleTime: 15_000,
  });
}

/**
 * Registers scanned units when new stock arrives. Stock moves with them, so the
 * inventory and product reads are refreshed alongside the unit list.
 */
export function useAddProductSerials(shopId: string | null, productId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      imeiNumbers: string[];
      branchId?: string | null;
      addToStock?: boolean;
    }) => addProductSerials(productId!, input),
    onSuccess: () => {
      if (!productId) return;
      queryClient.invalidateQueries({ queryKey: serialKeys.forProduct(productId) });
      if (shopId) {
        queryClient.invalidateQueries({ queryKey: productsKeys.list(shopId) });
        queryClient.invalidateQueries({ queryKey: productsKeys.infinite(shopId) });
      }
      queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
    },
  });
}
