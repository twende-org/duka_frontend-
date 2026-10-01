import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Package, AlertTriangle, PackageX, TrendingUp, Sparkles, ChevronRight } from "lucide-react";
import { formatTZS } from "@/data/mockData";
import { useI18n } from "@/lib/i18n";
import { THEME_COLORS } from "@/lib/theme";
import type { Product, Stock, Sale } from "@/types";

interface ProductInsightsProps {
  products: Product[];
  inventory: Stock[];
  recentSales: Sale[];
}

export function ProductInsights({ products, inventory, recentSales }: ProductInsightsProps) {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<"best" | "low" | "out" | "slow">("low");

  const getStockQty = (id: string) => inventory.find((i) => i.productId === id)?.quantity ?? 0;
  const getMinStock = (id: string) => inventory.find((i) => i.productId === id)?.minStock ?? 5;

  const productStats = useMemo(() => {
    const salesCountMap: Record<string, number> = {};
    recentSales.forEach((s) => {
      salesCountMap[s.productId] = (salesCountMap[s.productId] || 0) + (s.quantity || 1);
    });

    const enriched = products.map((p) => ({
      ...p,
      stock: getStockQty(p.id),
      minStock: getMinStock(p.id),
      salesQty: salesCountMap[p.id] || 0,
    }));

    const best = [...enriched].sort((a, b) => b.salesQty - a.salesQty).filter((p) => p.salesQty > 0);
    const low = enriched.filter((p) => p.stock > 0 && p.stock <= p.minStock);
    const out = enriched.filter((p) => p.stock === 0);
    const slow = enriched.filter((p) => p.salesQty === 0 && p.stock > 0);

    return { best, low, out, slow };
  }, [products, inventory, recentSales]);

  const tabs = [
    { id: "low", label: t("dashboard.pi.lowStock" as any) || "Low Stock", count: productStats.low.length, icon: AlertTriangle, variant: "warning" as const },
    { id: "out", label: t("dashboard.pi.outOfStock" as any) || "Out of Stock", count: productStats.out.length, icon: PackageX, variant: "danger" as const },
    { id: "best", label: t("dashboard.pi.bestSellers" as any) || "Best Sellers", count: productStats.best.length, icon: TrendingUp, variant: "success" as const },
    { id: "slow", label: t("dashboard.pi.slowMoving" as any) || "Slow Moving", count: productStats.slow.length, icon: Sparkles, variant: "accent" as const },
  ] as const;

  const currentList = productStats[activeTab].slice(0, 5);

  return (
    <div className="bg-card/60 backdrop-blur-md rounded-2xl p-5 sm:p-6 border border-border shadow-xs fade-in-up space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base sm:text-lg font-extrabold text-foreground flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            {t("dashboard.pi.title" as any) || "Product Intelligence & Inventory Stock"}
          </h3>
          <p className="text-xs text-muted-foreground">{t("dashboard.pi.subtitle" as any) || "Categorized product Insights for inventory reordering and sales optimization"}</p>
        </div>

        <button
          onClick={() => navigate("/dashboard/products")}
          className="text-xs font-bold text-primary hover:underline flex items-center gap-1 self-start sm:self-auto"
        >
          {t("dashboard.pi.viewAll" as any) || "View All Products"} ({products.length})
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
        {tabs.map((tab) => {
          const colors = THEME_COLORS[tab.variant];
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                isActive
                  ? `${colors.bg} ${colors.text} ${colors.border} shadow-2xs`
                  : "bg-muted/30 text-muted-foreground border-border/60 hover:bg-muted/60 hover:text-foreground"
              }`}
            >
              <tab.icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
              <span className={`ml-1 px-1.5 py-0.2 rounded-md text-[10px] ${isActive ? "bg-background/50 font-extrabold" : "bg-muted text-muted-foreground"}`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tab Content List */}
      <div className="space-y-2.5">
        {currentList.length === 0 ? (
          <div className="text-center py-8 opacity-60 bg-muted/10 rounded-xl border border-dashed border-border/50">
            <Package className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-xs font-semibold">{t("dashboard.pi.empty" as any) || "No products in this category"}</p>
          </div>
        ) : (
          currentList.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between p-3 rounded-xl border border-border/60 bg-card hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-xl bg-muted/60 flex items-center justify-center shrink-0 border border-border/40 font-bold text-xs text-muted-foreground">
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover rounded-xl" />
                  ) : (
                    p.name.charAt(0).toUpperCase()
                  )}
                </div>

                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-bold text-foreground truncate">{p.name}</p>
                  <p className="text-[10px] text-muted-foreground flex items-center gap-2 mt-0.5">
                    <span>{t("dashboard.pi.selling" as any) || "Selling:"} <strong className="text-foreground/80">{formatTZS(p.sellingPrice)}</strong></span>
                    <span>•</span>
                    <span>{t("dashboard.pi.category" as any) || "Category:"} <strong className="capitalize">{p.category || "General"}</strong></span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 ml-3">
                <div className="text-right">
                  <p className={`text-sm font-black ${p.stock === 0 ? "text-destructive" : p.stock <= p.minStock ? "text-warning" : "text-success"}`}>
                    {t("dashboard.pi.qty" as any) || "Qty:"} {p.stock}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{t("dashboard.pi.min" as any) || "Min:"} {p.minStock}</p>
                </div>

                <button
                  onClick={() => navigate("/dashboard/products")}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold border border-border bg-background hover:bg-muted hover:text-foreground transition-colors shadow-2xs"
                >
                  {t("dashboard.pi.action" as any) || "Action"}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
