import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as transfersApi from "@/lib/api/domains/b2bTransfers";
import type { B2BTransferInput } from "@/types";

export const b2bTransferKeys = {
  all: ["b2bTransfers"] as const,
  list: (shopId: string, direction?: string) =>
    [...b2bTransferKeys.all, shopId, direction ?? "all"] as const,
};

export function useB2BTransfers(
  shopId: string | null,
  options: { direction?: "incoming" | "outgoing"; status?: string } = {}
) {
  return useQuery({
    queryKey: [...b2bTransferKeys.list(shopId!, options.direction), options.status ?? null],
    queryFn: () => transfersApi.getTransfers(shopId!, options),
    enabled: !!shopId,
    // Incoming dispatches arrive while the retailer works elsewhere; a slow
    // poll keeps the dashboard cards fresh without hammering the API.
    refetchInterval: 30_000,
  });
}

export function useCreateStockTransfer(shopId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: B2BTransferInput) => transfersApi.createStockTransfer(input),
    onSuccess: () => {
      if (shopId) {
        queryClient.invalidateQueries({ queryKey: b2bTransferKeys.all });
        // Dispatch reserves the stock out of the sender's live counts.
        queryClient.invalidateQueries({ queryKey: ["inventory", shopId] });
      }
    },
  });
}

export function useCompleteStockTransfer(shopId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (transferId: string) => transfersApi.completeStockTransfer(transferId),
    onSuccess: () => {
      if (shopId) {
        queryClient.invalidateQueries({ queryKey: b2bTransferKeys.all });
        // Quarantined lines become live inventory rows here.
        queryClient.invalidateQueries({ queryKey: ["inventory", shopId] });
        queryClient.invalidateQueries({ queryKey: ["products", shopId] });
      }
    },
  });
}

export function useAcceptStockTransfer(shopId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (transferId: string) => transfersApi.acceptStockTransfer(transferId),
    onSuccess: () => {
      if (shopId) {
        queryClient.invalidateQueries({ queryKey: b2bTransferKeys.all });
        // Accepted lines land as live inventory rows; new products may be created.
        queryClient.invalidateQueries({ queryKey: ["inventory", shopId] });
        queryClient.invalidateQueries({ queryKey: ["products", shopId] });
      }
    },
  });
}

export function useMapTransferItems(shopId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      transferId,
      mappings,
    }: {
      transferId: string;
      mappings: Array<{ itemId: string; productId: string | null }>;
    }) => transfersApi.mapTransferItems(transferId, mappings),
    onSuccess: () => {
      if (shopId) queryClient.invalidateQueries({ queryKey: b2bTransferKeys.all });
    },
  });
}

export function useCancelStockTransfer(shopId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (transferId: string) => transfersApi.cancelStockTransfer(transferId),
    onSuccess: () => {
      if (shopId) {
        queryClient.invalidateQueries({ queryKey: b2bTransferKeys.all });
        // The sender's reserved stock returns; refresh both directions.
        queryClient.invalidateQueries({ queryKey: ["inventory", shopId] });
      }
    },
  });
}
