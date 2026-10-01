import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useProcessGRN } from "@/hooks/useB2BOrders";
import { toast } from "sonner";
import { AlertCircle, CheckCircle, Package } from "lucide-react";
import type { B2BPurchaseOrder, B2BShipment, GRNItem } from "@/types";

interface Props {
  po: B2BPurchaseOrder | null;
  shipment: B2BShipment | null;
  isOpen: boolean;
  onClose: () => void;
  currentShopId: string;
}

export function GRNWizard({ po, shipment, isOpen, onClose, currentShopId }: Props) {
  const processGRN = useProcessGRN();
  const [step, setStep] = useState(1);
  const [acceptedItems, setAcceptedItems] = useState<Record<string, number>>({});
  const [damagedItems, setDamagedItems] = useState<Record<string, number>>({});

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setStep(1);
      setAcceptedItems({});
      setDamagedItems({});
      onClose();
    }
  };

  const handleQtyChange = (productId: string, field: "accepted" | "damaged", val: string, max: number) => {
    let num = parseInt(val);
    if (isNaN(num)) num = 0;
    if (num < 0) num = 0;
    
    if (field === "accepted") {
       setAcceptedItems(prev => ({ ...prev, [productId]: Math.min(num, max) }));
    } else {
       setDamagedItems(prev => ({ ...prev, [productId]: Math.min(num, max) }));
    }
  };

  const handleSubmit = async () => {
    if (!po || !shipment) return;
    
    const grnItems: GRNItem[] = shipment.items.map(sItem => {
      const accepted = acceptedItems[sItem.productId] !== undefined ? acceptedItems[sItem.productId] : sItem.shippedQty;
      const damaged = damagedItems[sItem.productId] || 0;
      
      const poItem = po.items?.find(i => i.productId === sItem.productId);
      
      return {
        productId: sItem.productId,
        productName: sItem.productName,
        expectedQty: sItem.shippedQty,
        receivedQty: accepted + damaged,
        acceptedQty: accepted,
        rejectedQty: damaged,
        unitCost: poItem ? poItem.buyingPrice : 0, // Fallback to 0 if not found
      };
    });

    try {
      await processGRN.mutateAsync({
        poId: po.id,
        shipmentId: shipment.id,
        shopId: currentShopId,
        supplierId: po.supplierShopId,
        supplierName: po.supplierName || "Supplier",
        items: grnItems,
        status: "completed"
      });
      toast.success("Goods Received successfully. Inventory updated.");
      handleOpenChange(false);
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || "Failed to process GRN");
    }
  };

  if (!po || !shipment) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Package className="w-6 h-6 text-primary" />
            Goods Receiving Note (GRN)
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Receiving items for PO-{po.id.slice(0,6).toUpperCase()} (Shipment: {shipment.id.slice(0,6).toUpperCase()})
          </p>
        </DialogHeader>

        <div className="py-4">
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
               <h3 className="text-lg font-semibold border-b pb-2">Step 1: Verify Delivery Details</h3>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted/30 p-4 rounded-xl border">
                  <div><span className="text-muted-foreground text-xs uppercase">Carrier:</span> <p className="font-medium">{shipment.carrier || "Not specified"}</p></div>
                  <div><span className="text-muted-foreground text-xs uppercase">Tracking:</span> <p className="font-medium">{shipment.trackingNumber || "Not specified"}</p></div>
                  <div><span className="text-muted-foreground text-xs uppercase">Driver:</span> <p className="font-medium">{shipment.driverName || "Not specified"}</p></div>
                  <div><span className="text-muted-foreground text-xs uppercase">Vehicle:</span> <p className="font-medium">{shipment.vehicleNumber || "Not specified"}</p></div>
               </div>
               
               <div className="flex justify-end pt-4">
                  <Button onClick={() => setStep(2)}>Continue to Items Verification</Button>
               </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
               <h3 className="text-lg font-semibold border-b pb-2">Step 2: Inspect Received Goods</h3>
               <div className="bg-blue-50 text-blue-800 p-3 rounded-lg text-sm flex gap-2">
                 <AlertCircle className="w-5 h-5 shrink-0" />
                 <p>Inventory will only increase by the <strong>Accepted Qty</strong>. Damaged or missing items will not be added to your stock.</p>
               </div>

               <div className="space-y-3 mt-4">
                 <div className="hidden sm:grid sm:grid-cols-12 gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground px-2">
                    <div className="sm:col-span-4">Item</div>
                    <div className="sm:col-span-2 text-center">Shipped</div>
                    <div className="sm:col-span-3 text-center">Accepted</div>
                    <div className="sm:col-span-3 text-center">Damaged</div>
                 </div>
                 {shipment.items.map(item => {
                   const max = item.shippedQty;
                   const accepted = acceptedItems[item.productId] !== undefined ? acceptedItems[item.productId] : max;
                   const damaged = damagedItems[item.productId] || 0;
                   const missing = max - (accepted + damaged);
                   
                   return (
                     <div key={item.productId} className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:items-center p-3 rounded-lg border bg-card">
                        <div className="sm:col-span-4 font-medium text-sm truncate"><span className="sm:hidden text-xs text-muted-foreground uppercase font-bold mr-2">Item:</span>{item.productName}</div>
                        <div className="sm:col-span-2 text-left sm:text-center font-bold bg-muted/50 rounded py-1 px-2 sm:px-0"><span className="sm:hidden text-xs text-muted-foreground uppercase font-bold mr-2">Shipped:</span>{max}</div>
                        <div className="sm:col-span-3 flex items-center sm:block">
                           <span className="sm:hidden text-xs text-muted-foreground uppercase font-bold mr-2 w-20">Accepted:</span>
                           <Input 
                            type="number" 
                            min={0} 
                            max={max}
                            value={accepted}
                            onChange={(e) => handleQtyChange(item.productId, 'accepted', e.target.value, max)}
                            className={`h-9 text-center font-semibold flex-1 sm:flex-none ${accepted < max ? 'border-yellow-400 bg-yellow-50' : 'border-green-400 bg-green-50'}`}
                           />
                        </div>
                        <div className="sm:col-span-3 flex items-center sm:block">
                           <span className="sm:hidden text-xs text-muted-foreground uppercase font-bold mr-2 w-20">Damaged:</span>
                           <Input 
                            type="number" 
                            min={0} 
                            max={max - accepted}
                            value={damaged}
                            onChange={(e) => handleQtyChange(item.productId, 'damaged', e.target.value, max - accepted)}
                            className={`h-9 text-center font-semibold flex-1 sm:flex-none ${damaged > 0 ? 'border-red-400 bg-red-50' : ''}`}
                           />
                        </div>
                        {accepted + damaged > max && (
                          <div className="sm:col-span-12 text-xs text-red-500 text-right pr-2">
                             * {missing} item(s) missing from shipment
                          </div>
                        )}
                     </div>
                   );
                 })}
               </div>

               <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                  <Button onClick={() => setStep(3)}>Review & Confirm</Button>
               </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
               <div className="text-center py-6">
                 <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                 <h3 className="text-2xl font-bold">Ready to Receive Goods</h3>
                 <p className="text-muted-foreground mt-2">By confirming, your inventory will be updated immediately.</p>
               </div>
               
               <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={() => setStep(2)}>Back to Items</Button>
                  <Button onClick={handleSubmit} disabled={processGRN.isPending} className="bg-green-600 hover:bg-green-700 text-white font-bold px-8">
                    {processGRN.isPending ? "Processing..." : "Confirm & Update Inventory"}
                  </Button>
               </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
