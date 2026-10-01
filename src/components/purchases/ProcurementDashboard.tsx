import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatTZS } from "@/data/mockData";
import { B2BPurchaseOrder } from "@/types";
import { PackageOpen, Clock, HandCoins, CheckCircle2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface ProcurementDashboardProps {
  orders: B2BPurchaseOrder[];
}

export function ProcurementDashboard({ orders }: ProcurementDashboardProps) {
  const { t } = useI18n();

  const metrics = useMemo(() => {
    let openCount = 0;
    let pendingCount = 0;
    let supplierCommitments = 0;
    let receivedValue = 0;

    orders.forEach(order => {
      // Open POs (not completed, cancelled, or closed_short)
      if (["draft", "submitted", "supplier_reviewing", "approved", "awaiting_shipment", "partially_received"].includes(order.status)) {
        openCount++;
        supplierCommitments += order.totalAmount;
      }

      // Pending Receiving (in-transit essentially)
      if (["awaiting_shipment", "partially_received"].includes(order.status)) {
        pendingCount++;
      }

      // Received Value
      order.items.forEach(item => {
        if (item.receivedQty && item.receivedQty > 0) {
          receivedValue += (item.receivedQty * item.buyingPrice);
        }
      });
    });

    return { openCount, pendingCount, supplierCommitments, receivedValue };
  }, [orders]);

  const cards = [
    {
      title: t("purchases.openOrders"),
      value: String(metrics.openCount),
      icon: PackageOpen,
      iconClass: "text-primary",
    },
    {
      title: t("purchases.pendingReceiving"),
      value: String(metrics.pendingCount),
      icon: Clock,
      iconClass: "text-amber-500",
    },
    {
      title: t("purchases.supplierCommitments"),
      value: formatTZS(metrics.supplierCommitments),
      icon: HandCoins,
      iconClass: "text-blue-500",
    },
    {
      title: t("purchases.receivedValue"),
      value: formatTZS(metrics.receivedValue),
      icon: CheckCircle2,
      iconClass: "text-emerald-500",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(({ title, value, icon: Icon, iconClass }) => (
        <Card key={title} className="shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground truncate">{title}</CardTitle>
            <Icon className={`h-4 w-4 shrink-0 ${iconClass}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight truncate">{value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
