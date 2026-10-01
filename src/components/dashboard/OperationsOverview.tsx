import { useNavigate } from "react-router-dom";
import { 
  AlertTriangle, Clock, Truck, PackageX, CreditCard, ChevronRight, CheckCircle2 
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { THEME_COLORS } from "@/lib/theme";
import type { Order, Product, Stock } from "@/types";

interface OperationsOverviewProps {
  orders: Order[];
  products: Product[];
  inventory: Stock[];
}

export function OperationsOverview({ orders, products, inventory }: OperationsOverviewProps) {
  const navigate = useNavigate();
  const { t } = useI18n();

  const getStockQty = (prodId: string) => inventory.find((i) => i.productId === prodId)?.quantity ?? 0;
  const getMinStock = (prodId: string) => inventory.find((i) => i.productId === prodId)?.minStock ?? 5;

  const pendingOrders = orders.filter((o) => o.status === "pending");
  const outOfStockItems = products.filter((p) => getStockQty(p.id) === 0);
  const lowStockItems = products.filter((p) => {
    const q = getStockQty(p.id);
    return q > 0 && q <= getMinStock(p.id);
  });

  const unpaidOrders = orders.filter((o) => o.status === "pending" && o.totalAmount > 0);
  const totalCreditDue = unpaidOrders.reduce((sum, o) => sum + o.totalAmount, 0);

  const opsCards = [
    {
      id: "pending_orders",
      title: t("dashboard.ops.pendingOrders" as any) || "Pending Orders",
      count: pendingOrders.length,
      unit: t("dashboard.ops.ordersUnit" as any) || "orders needing action",
      icon: Clock,
      variant: pendingOrders.length > 0 ? "warning" as const : "muted" as const,
      path: "/dashboard/orders",
      actionLabel: t("dashboard.ops.processOrders" as any) || "Process Orders",
    },
    {
      id: "deliveries",
      title: t("dashboard.ops.fulfillment" as any) || "Fulfillment & Deliveries",
      count: pendingOrders.length,
      unit: t("dashboard.ops.readyToShip" as any) || "ready to ship",
      icon: Truck,
      variant: "info" as const,
      path: "/dashboard/orders",
      actionLabel: t("dashboard.ops.viewShipments" as any) || "View Shipments",
    },
    {
      id: "low_stock",
      title: t("dashboard.ops.lowStock" as any) || "Low Stock Alert",
      count: lowStockItems.length,
      unit: t("dashboard.ops.lowStockUnit" as any) || "products below min stock",
      icon: AlertTriangle,
      variant: lowStockItems.length > 0 ? "warning" as const : "muted" as const,
      path: "/dashboard/products",
      actionLabel: t("dashboard.ops.restockNow" as any) || "Restock Now",
    },
    {
      id: "out_of_stock",
      title: t("dashboard.ops.outOfStock" as any) || "Out of Stock",
      count: outOfStockItems.length,
      unit: t("dashboard.ops.emptyUnit" as any) || "products currently empty",
      icon: PackageX,
      variant: outOfStockItems.length > 0 ? "danger" as const : "muted" as const,
      path: "/dashboard/products",
      actionLabel: t("dashboard.ops.updateInventory" as any) || "Update Inventory",
    },
    {
      id: "customer_credit",
      title: t("dashboard.ops.customerCredit" as any) || "Customer Credit Due",
      count: unpaidOrders.length,
      unit: `${t("dashboard.ops.totalCredit" as any) || "Total TZS"} ${totalCreditDue.toLocaleString()}`,
      icon: CreditCard,
      variant: unpaidOrders.length > 0 ? "accent" as const : "muted" as const,
      path: "/dashboard/orders",
      actionLabel: t("dashboard.ops.reviewDebts" as any) || "Review Debts",
    },
  ];

  const totalActionNeeded = pendingOrders.length + lowStockItems.length + outOfStockItems.length;

  return (
    <div className="space-y-4 fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-extrabold text-foreground tracking-tight flex items-center gap-2">
            {t("dashboard.ops.title" as any) || "Today's Operations Overview"}
            {totalActionNeeded > 0 ? (
              <span className={`px-2 py-0.5 rounded-full text-xs font-black ${THEME_COLORS.danger.bg} ${THEME_COLORS.danger.text} ${THEME_COLORS.danger.border}`}>
                {totalActionNeeded} {t("dashboard.ops.attentionNeeded" as any) || "Attention Needed"}
              </span>
            ) : (
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${THEME_COLORS.success.bg} ${THEME_COLORS.success.text} ${THEME_COLORS.success.border} flex items-center gap-1`}>
                <CheckCircle2 className="h-3 w-3" /> {t("dashboard.ops.smooth" as any) || "Smooth Operations"}
              </span>
            )}
          </h2>
          <p className="text-xs text-muted-foreground">{t("dashboard.ops.subtitle" as any) || "Action items requiring operational attention right now"}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {opsCards.map((card) => {
          const colors = THEME_COLORS[card.variant];
          return (
            <div
              key={card.id}
              onClick={() => navigate(card.path)}
              className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-md flex flex-col justify-between group ${colors.bg} ${colors.border} active:scale-98 text-left`}
            >
              <div className="flex items-start justify-between mb-3 gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 truncate">
                    {card.title}
                  </p>
                  <p className="text-xl sm:text-2xl font-black text-foreground tracking-tight truncate">
                    {card.count}
                  </p>
                </div>
                <div className={`rounded-xl p-2.5 shrink-0 transition-transform group-hover:scale-105 ${colors.bg} ${colors.text}`}>
                  <card.icon className="h-5 w-5" />
                </div>
              </div>
              
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs font-medium text-muted-foreground truncate max-w-[70%]">
                  {card.unit}
                </span>
                <div className="flex items-center text-[11px] font-bold text-primary group-hover:underline">
                  <span>{card.actionLabel}</span>
                  <ChevronRight className="h-3.5 w-3.5 ml-0.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
