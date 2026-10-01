import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as b2b from "@/lib/api/domains/b2b";
import type { B2BPurchaseOrder, B2BShipment, GRN } from "@/types";
import { useAppSelector } from "@/store/hooks";

export function useBuyerB2BOrders(buyerShopId: string | undefined) {
  return useQuery({
    queryKey: ["b2b_orders_buyer", buyerShopId],
    queryFn: () => {
      if (!buyerShopId) return [];
      return b2b.getBuyerB2BOrders(buyerShopId);
    },
    enabled: !!buyerShopId,
  });
}

export function useSupplierB2BOrders(supplierShopId: string | undefined) {
  return useQuery({
    queryKey: ["b2b_orders_supplier", supplierShopId],
    queryFn: () => {
      if (!supplierShopId) return [];
      return b2b.getSupplierB2BOrders(supplierShopId);
    },
    enabled: !!supplierShopId,
  });
}

export function useUpdateB2BOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ poId, status, notes }: { poId: string, status: B2BPurchaseOrder["status"], notes?: string }) => {
      await b2b.updateB2BOrderStatus(poId, status, notes);
      return { poId, status };
    },
    onSuccess: () => {
      // Invalidate both buyer and supplier queries to ensure freshness
      queryClient.invalidateQueries({ queryKey: ["b2b_orders_buyer"] });
      queryClient.invalidateQueries({ queryKey: ["b2b_orders_supplier"] });
    },
  });
}

export function useShipmentsForPO(poId: string | undefined) {
  return useQuery({
    queryKey: ["b2b_shipments", poId],
    queryFn: () => {
      if (!poId) return [];
      return b2b.getShipmentsForPO(poId);
    },
    enabled: !!poId,
  });
}

export function useGRNsForPO(poId: string | undefined) {
  return useQuery({
    queryKey: ["b2b_grns", poId],
    queryFn: () => {
      if (!poId) return [];
      return b2b.getGRNsForPO(poId);
    },
    enabled: !!poId,
  });
}

export function useCreateB2BShipment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<B2BShipment, "id" | "createdAt" | "updatedAt">) => {
      const id = await b2b.createB2BShipment(data);
      return id;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["b2b_shipments", variables.poId] });
      queryClient.invalidateQueries({ queryKey: ["b2b_orders_supplier"] });
    },
  });
}

export function useUpdateB2BShipmentStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ shipmentId, status, notes }: { shipmentId: string, status: B2BShipment["status"], notes?: string, poId: string }) => {
      await b2b.updateB2BShipmentStatus(shipmentId, status, notes);
      return { shipmentId, status };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["b2b_shipments", variables.poId] });
      queryClient.invalidateQueries({ queryKey: ["b2b_orders_buyer"] });
      queryClient.invalidateQueries({ queryKey: ["b2b_orders_supplier"] });
    },
  });
}

export function useProcessGRN() {
  const queryClient = useQueryClient();
  const user = useAppSelector(s => s.auth.user);

  return useMutation({
    mutationFn: async (grnData: Omit<GRN, "id" | "createdAt" | "completedAt">) => {
      if (!user?.id) throw new Error("Must be logged in to process GRN");
      // The DRF endpoint derives the actor from the JWT and the supplier from the PO.
      const id = await b2b.processGRNTransaction(grnData);
      return id;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["b2b_orders_buyer"] });
      queryClient.invalidateQueries({ queryKey: ["b2b_shipments", variables.poId] });
      queryClient.invalidateQueries({ queryKey: ["inventory", variables.shopId] });
      queryClient.invalidateQueries({ queryKey: ["products", variables.shopId] });
    },
  });
}

export function useCreateB2BOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<B2BPurchaseOrder, "id" | "createdAt" | "updatedAt">) => {
      return await b2b.createB2BPurchaseOrder(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["b2b_orders_buyer"] });
      queryClient.invalidateQueries({ queryKey: ["b2b_orders_supplier"] });
    },
  });
}
