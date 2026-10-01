import { useProducts } from "@/hooks/useProducts";
import { useState, useEffect, useMemo, useRef } from "react";
import { Bell, AlertTriangle, FileText, CreditCard, Package, X, Check } from "lucide-react";
import { useAppSelector } from "@/store/hooks";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export interface AppNotification {
  id: string;
  type: "low_stock" | "draft_pending" | "subscription_expiry";
  title: string;
  message: string;
  icon: typeof AlertTriangle;
  color: string;
  read: boolean;
  timestamp: Date;
}

export default function NotificationBell() {
  const { t } = useI18n();
  const currentShopId = useAppSelector((s) => s.shops.currentShopId);
  const { data: products = [] } = useProducts(currentShopId);
  const inventory = useAppSelector((s) => s.inventory.inventory);
  const draftSales = useAppSelector((s) => s.sales.draftSales);
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const notifications = useMemo<AppNotification[]>(() => {
    const items: AppNotification[] = [];
    const getStock = (id: string) => inventory.find(i => i.productId === id);

    // Low stock alerts
    const lowStock = products
      .map(p => ({ ...p, stock: getStock(p.id)?.quantity ?? 0, minStock: getStock(p.id)?.minStock ?? 5 }))
      .filter((p) => p.stock <= p.minStock && p.stock >= 0);
    
    if (lowStock.length > 0) {
      items.push({
        id: "low_stock",
        type: "low_stock",
        title: t("notif.lowStockTitle"),
        message: t("notif.lowStockMsg").replace("{count}", String(lowStock.length)),
        icon: AlertTriangle,
        color: "text-destructive bg-destructive/10",
        read: false,
        timestamp: new Date(),
      });
    }

    // Out of stock
    const outOfStock = products
      .map(p => ({ ...p, stock: getStock(p.id)?.quantity ?? 0 }))
      .filter((p) => p.stock === 0);
    
    if (outOfStock.length > 0) {
      items.push({
        id: "out_of_stock",
        type: "low_stock",
        title: t("notif.outOfStockTitle"),
        message: t("notif.outOfStockMsg").replace("{count}", String(outOfStock.length)),
        icon: Package,
        color: "text-destructive bg-destructive/10",
        read: false,
        timestamp: new Date(),
      });
    }

    // Pending drafts
    if (draftSales.length > 0) {
      items.push({
        id: "drafts_pending",
        type: "draft_pending",
        title: t("notif.draftsTitle"),
        message: t("notif.draftsMsg").replace("{count}", String(draftSales.length)),
        icon: FileText,
        color: "text-primary bg-primary/10",
        read: false,
        timestamp: new Date(),
      });
    }

    return items.filter((n) => !dismissed.has(n.id));
  }, [products, inventory, draftSales, t, dismissed]);

  const unreadCount = notifications.length;

  const dismiss = (id: string) => {
    setDismissed((prev) => new Set(prev).add(id));
  };

  const dismissAll = () => {
    setDismissed(new Set(notifications.map((n) => n.id)));
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative rounded-lg p-2 hover:bg-muted transition-colors"
        aria-label={t("notif.title")}
      >
        <Bell className="h-5 w-5 text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-border bg-popover shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">{t("notif.title")}</h3>
            {unreadCount > 0 && (
              <button
                onClick={dismissAll}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                <Check className="h-3 w-3" />
                {t("notif.markAllRead")}
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-muted-foreground">
                <Bell className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-sm">{t("notif.empty")}</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className="flex items-start gap-3 px-4 py-3 border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors"
                >
                  <div className={cn("mt-0.5 rounded-lg p-2", notif.color)}>
                    <notif.icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{notif.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{notif.message}</p>
                  </div>
                  <button
                    onClick={() => dismiss(notif.id)}
                    className="mt-0.5 rounded p-1 hover:bg-muted transition-colors"
                  >
                    <X className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
