import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCreateB2BShipment, useUpdateB2BOrderStatus } from "@/hooks/useB2BOrders";
import { toast } from "sonner";
import type { B2BPurchaseOrder } from "@/types";

interface Props {
  order: B2BPurchaseOrder | null;
  isOpen: boolean;
  onClose: () => void;
  currentShopId: string;
}

export function CreateShipmentDialog({ order, isOpen, onClose, currentShopId }: Props) {
  const createShipment = useCreateB2BShipment();
  const updateStatus = useUpdateB2BOrderStatus();

  const [carrier, setCarrier] = useState("");
  const [driverName, setDriverName] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [items, setItems] = useState<Record<string, number>>({});

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setCarrier("");
      setDriverName("");
      setVehicleNumber("");
      setTrackingNumber("");
      setItems({});
      onClose();
    }
  };

  const handleQtyChange = (productId: string, val: string, max: number) => {
    let num = parseInt(val);
    if (isNaN(num)) num = 0;
    if (num < 0) num = 0;
    if (num > max) num = max;
    setItems(prev => ({ ...prev, [productId]: num }));
  };

  const handleSubmit = async () => {
    if (!order) return;
    
    // Build shipment items
    const shipmentItems = order.items.map(item => {
      const remaining = item.expectedQty - (item.receivedQty || 0);
      const toShip = items[item.productId] !== undefined ? items[item.productId] : remaining;
      
      const shipmentItem: any = {
        productId: item.productId,
        productName: item.productName,
        shippedQty: toShip
      };
      
      if (item.sourceProductId !== undefined) {
        shipmentItem.sourceProductId = item.sourceProductId;
      }
      
      return shipmentItem;
    }).filter(i => i.shippedQty > 0);

    if (shipmentItems.length === 0) {
      toast.error("You must ship at least one item.");
      return;
    }

    try {
      await createShipment.mutateAsync({
        poId: order.id,
        supplierShopId: currentShopId,
        buyerShopId: order.buyerShopId,
        status: "dispatched", // Shipped immediately upon creation
        carrier,
        driverName,
        vehicleNumber,
        trackingNumber,
        items: shipmentItems,
      });

      // Update PO status
      await updateStatus.mutateAsync({
        poId: order.id,
        status: "awaiting_shipment"
      });

      toast.success("Shipment created successfully.");
      handleOpenChange(false);
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || "Failed to create shipment");
    }
  };

  if (!order) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Shipment for PO-{order.id.slice(0,6).toUpperCase()}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1 block">Carrier (Optional)</label>
              <Input placeholder="e.g. DHL, Local Delivery" value={carrier} onChange={e => setCarrier(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1 block">Tracking # (Optional)</label>
              <Input placeholder="Tracking Number" value={trackingNumber} onChange={e => setTrackingNumber(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1 block">Driver Name (Optional)</label>
              <Input placeholder="Driver Name" value={driverName} onChange={e => setDriverName(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1 block">Vehicle # (Optional)</label>
              <Input placeholder="License Plate" value={vehicleNumber} onChange={e => setVehicleNumber(e.target.value)} />
            </div>
          </div>

          <div>
             <h4 className="font-semibold mb-3">Items to Ship</h4>
             <div className="space-y-3">
               {order.items.map(item => {
                 const remaining = item.expectedQty - (item.receivedQty || 0);
                 if (remaining <= 0) return null;
                 const toShip = items[item.productId] !== undefined ? items[item.productId] : remaining;
                 
                 return (
                   <div key={item.productId} className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
                      <div>
                         <p className="font-medium">{item.productName}</p>
                         <p className="text-xs text-muted-foreground">Remaining: {remaining}</p>
                      </div>
                      <div className="flex items-center gap-2">
                         <label className="text-xs text-muted-foreground">Ship Qty:</label>
                         <Input 
                           type="number" 
                           className="w-20"
                           min={0}
                           max={remaining}
                           value={toShip}
                           onChange={e => handleQtyChange(item.productId, e.target.value, remaining)}
                         />
                      </div>
                   </div>
                 );
               })}
             </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={createShipment.isPending || updateStatus.isPending}>
            Create Shipment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
