import { useState } from "react";
import { Package, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useShipmentsForPO } from "@/hooks/useB2BOrders";
import { GRNWizard } from "./GRNWizard";
import { useI18n } from "@/lib/i18n";
import type { B2BPurchaseOrder, B2BShipment } from "@/types";

interface Props {
  order: B2BPurchaseOrder;
  currentShopId: string;
}

export function BuyerShipmentsList({ order, currentShopId }: Props) {
  const { t } = useI18n();
  const { data: shipments = [], isLoading } = useShipmentsForPO(order.id);
  const [selectedShipment, setSelectedShipment] = useState<B2BShipment | null>(null);
  const [isGrnOpen, setIsGrnOpen] = useState(false);

  if (isLoading) return <div className="text-sm text-muted-foreground p-4">{t("purchases.loadingShipments")}</div>;
  if (shipments.length === 0) return null;

  const openGrn = (s: B2BShipment) => {
    setSelectedShipment(s);
    setIsGrnOpen(true);
  };

  return (
    <div className="mt-4 pt-4 border-t border-border/50">
      <h4 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
        <Package className="w-4 h-4" /> {t("purchases.shipments")}
      </h4>
      <div className="space-y-3">
        {shipments.map(s => (
          <div key={s.id} className="flex flex-col sm:flex-row gap-3 justify-between sm:items-center bg-muted/20 p-3 rounded-lg border">
            <div>
              <p className="font-medium text-sm flex items-center gap-2">
                <Truck className="w-4 h-4 text-primary" />
                {s.carrier || t("purchases.delivery")} - {t("purchases.tracking")}: {s.trackingNumber || "N/A"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {t("purchases.status")}: <span className="font-bold uppercase">{s.status.replace("_", " ")}</span> | {t("purchases.items")}: {s.items.length}
              </p>
            </div>
            <div>
              {["preparing", "dispatched", "in_transit"].includes(s.status) && (
                <Button size="sm" onClick={() => openGrn(s)} className="bg-green-600 hover:bg-green-700 text-white">
                  {t("purchases.receiveGoods")}
                </Button>
              )}
              {s.status === "delivered" && (
                <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded-full">{t("purchases.receivedBadge")}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <GRNWizard
        po={order}
        shipment={selectedShipment}
        isOpen={isGrnOpen}
        onClose={() => setIsGrnOpen(false)}
        currentShopId={currentShopId}
      />
    </div>
  );
}
