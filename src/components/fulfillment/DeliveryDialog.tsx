import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Truck, CheckCircle } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { Order, FulfillmentDetails } from "@/types";

interface DeliveryDialogProps {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (data: Partial<FulfillmentDetails>) => void;
}

export default function DeliveryDialog({ order, open, onOpenChange, onConfirm }: DeliveryDialogProps) {
  const { lang } = useI18n();
  const sw = lang === "sw";
  
  const [deliveryMethod, setDeliveryMethod] = useState<FulfillmentDetails["deliveryMethod"]>("merchant");
  const [driverName, setDriverName] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  const [vehicleDetails, setVehicleDetails] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");

  const handleConfirm = () => {
    onConfirm({
      deliveryMethod,
      driverName,
      driverPhone,
      vehicleDetails,
      trackingNumber,
      deliveryNotes
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" />
            {sw ? "Taarifa za Usafirishaji" : "Dispatch Details"}
          </DialogTitle>
        </DialogHeader>

        {order && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{sw ? "Njia ya Usafiri" : "Delivery Method"}</Label>
              <Select value={deliveryMethod} onValueChange={(v: any) => setDeliveryMethod(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="merchant">{sw ? "Kupeleka (Merchant Delivery)" : "Merchant Delivery"}</SelectItem>
                  <SelectItem value="pickup">{sw ? "Kuchukua Dukani (Pickup)" : "Customer Pickup"}</SelectItem>
                  <SelectItem value="third_party">{sw ? "Msafirishaji Binafsi (3rd Party)" : "3rd Party Logistics"}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {deliveryMethod !== "pickup" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{sw ? "Jina la Dereva" : "Driver Name"}</Label>
                    <Input 
                      placeholder="Juma" 
                      value={driverName} 
                      onChange={(e) => setDriverName(e.target.value)} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{sw ? "Namba ya Dereva" : "Driver Phone"}</Label>
                    <Input 
                      placeholder="07..." 
                      value={driverPhone} 
                      onChange={(e) => setDriverPhone(e.target.value)} 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{sw ? "Gari / Usafiri (Reg #)" : "Vehicle Details"}</Label>
                  <Input 
                    placeholder="T 123 ABC" 
                    value={vehicleDetails} 
                    onChange={(e) => setVehicleDetails(e.target.value)} 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>{sw ? "Namba ya Kufuatilia" : "Tracking Number"}</Label>
                  <Input 
                    placeholder="TRK-..." 
                    value={trackingNumber} 
                    onChange={(e) => setTrackingNumber(e.target.value)} 
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label>{sw ? "Maelezo ya Ziada" : "Delivery Notes"}</Label>
              <Textarea 
                placeholder={sw ? "Maelekezo..." : "Instructions..."}
                value={deliveryNotes}
                onChange={(e) => setDeliveryNotes(e.target.value)}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {sw ? "Ghairi" : "Cancel"}
          </Button>
          <Button onClick={handleConfirm} className="gap-2">
            <CheckCircle className="h-4 w-4" />
            {sw ? "Tuma Mzigo (Dispatch)" : "Dispatch Order"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
