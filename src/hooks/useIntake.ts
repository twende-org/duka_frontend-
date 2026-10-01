import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as intakeApi from "@/lib/api/domains/intake";
import { productsKeys } from "@/hooks/useProducts";
import type { IntakeDraft } from "@/types";

export const intakeKeys = {
  all: ["intake"] as const,
  batches: (shopId: string) => [...intakeKeys.all, shopId] as const,
  batch: (batchId: string) => [...intakeKeys.all, "batch", batchId] as const,
};

/** A batch still being parsed keeps the review workspace on its spinner. */
function hasBatchInFlight(batches: Array<{ status: string }>) {
  return batches.some((batch) => batch.status === "pending" || batch.status === "processing");
}

export function useIntakeBatches(shopId: string | null) {
  return useQuery({
    queryKey: intakeKeys.batches(shopId!),
    queryFn: () => intakeApi.getIntakeBatches(shopId!),
    enabled: !!shopId,
    // Poll quickly while a batch parses, then settle back to a slow refresh.
    refetchInterval: (query) => {
      const batches = query.state.data;
      if (batches && hasBatchInFlight(batches)) return 2000;
      return 60_000;
    },
  });
}

/** Single-batch poller: fast while parsing, stops once terminal. */
export function useIntakeBatch(batchId: string | null) {
  return useQuery({
    queryKey: intakeKeys.batch(batchId!),
    queryFn: () => intakeApi.getIntakeBatch(batchId!),
    enabled: !!batchId,
    refetchInterval: (query) => {
      const batch = query.state.data;
      if (batch && (batch.status === "pending" || batch.status === "processing")) return 2000;
      return false;
    },
  });
}

export function useCreateIntakeBatch(shopId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Omit<intakeApi.CreateIntakeBatchInput, "shopId">) =>
      intakeApi.createIntakeBatch({ ...input, shopId: shopId! }),
    onSuccess: () => {
      if (shopId) queryClient.invalidateQueries({ queryKey: intakeKeys.batches(shopId) });
    },
  });
}

export function useUpdateIntakeDraft(shopId: string | null, batchId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ draftId, patch }: { draftId: string; patch: Partial<IntakeDraft> }) =>
      intakeApi.updateIntakeDraft(draftId, patch),
    onSuccess: () => {
      if (shopId) queryClient.invalidateQueries({ queryKey: intakeKeys.batches(shopId) });
      if (batchId) queryClient.invalidateQueries({ queryKey: intakeKeys.batch(batchId) });
    },
  });
}

export function useDeleteIntakeDraft(shopId: string | null, batchId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (draftId: string) => intakeApi.deleteIntakeDraft(draftId),
    onSuccess: () => {
      if (shopId) queryClient.invalidateQueries({ queryKey: intakeKeys.batches(shopId) });
      if (batchId) queryClient.invalidateQueries({ queryKey: intakeKeys.batch(batchId) });
    },
  });
}

export function useApplyIntakeBatch(shopId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (batchId: string) => intakeApi.applyIntakeBatch(batchId),
    onSuccess: () => {
      if (shopId) {
        queryClient.invalidateQueries({ queryKey: intakeKeys.batches(shopId) });
        // Applied drafts now live in the product + inventory tables.
        queryClient.invalidateQueries({ queryKey: productsKeys.all });
        queryClient.invalidateQueries({ queryKey: ["inventory", shopId] });
      }
    },
  });
}
