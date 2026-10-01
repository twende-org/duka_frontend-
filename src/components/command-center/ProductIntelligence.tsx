import React from "react";
import { useI18n } from "@/lib/i18n";
import { formatTZS } from "@/data/mockData";
import { Package, AlertTriangle, TrendingUp, Sparkles, Layers } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";

function ProductTable({ title, icon: Icon, rows, emptyLabel }: { title: string; icon: any; rows: any[]; emptyLabel: string }) {
  const { t } = useI18n();
  return (
    <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
      <div className="flex items-center gap-2 border-b bg-muted/30 px-4 py-3">
        <Icon className="h-4 w-4 text-orange-500" />
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left [&_th]:whitespace-nowrap [&_td]:whitespace-nowrap">
          <thead className="text-xs text-muted-foreground bg-muted/50 uppercase">
            <tr>
              <th className="px-4 py-3 font-medium min-w-[180px]">{t("cc.colProduct") || "Product"}</th>
              <th className="px-4 py-3 font-medium text-right">{t("cc.colQty") || "Qty"}</th>
              <th className="px-4 py-3 font-medium text-right">{t("cc.colStockValue") || "Stock Value"}</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-10 text-center text-muted-foreground">
                  <Package className="mx-auto h-8 w-8 mb-3 opacity-20" />
                  {emptyLabel}
                </td>
              </tr>
            ) : (
              rows.map((p: any, i: number) => (
                <motion.tr
                  key={p.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.28, delay: Math.min(i, 12) * 0.03, ease: [0.22, 1, 0.36, 1] }}
                  className="group relative transition-colors duration-200 hover:bg-primary/5"
                >
                  <td className="relative px-4 py-3 font-medium min-w-[180px]">
                    <span className="absolute left-0 top-1/2 h-0 w-[3px] -translate-y-1/2 rounded-r-full bg-primary transition-all duration-300 group-hover:h-3/5" />
                    <span className="inline-block max-w-[200px] truncate transition-transform duration-200 group-hover:translate-x-1" title={p.name}>
                      {p.name}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{p.qty}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatTZS((p.buyingPrice || 0) * (p.qty || 0))}</td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ProductIntelligence({ productInt }: { productInt: any }) {
  const { t } = useI18n();
  const kpis = [
    { title: t("cc.totalProducts") || "Total Products", value: productInt.totalProducts, sub: t("cc.inCatalog") || "In catalog", icon: Package, color: "text-blue-500" },
    { title: t("cc.totalInventoryValue") || "Inventory Value", value: formatTZS(productInt.inventoryValue), sub: t("cc.atCostPrice") || "At cost price", icon: Layers, color: "text-orange-500" },
    { title: t("cc.lowStockAlerts") || "Low Stock Alerts", value: productInt.lowStockAlerts, sub: t("cc.needRestocking") || "Need restocking", icon: AlertTriangle, color: "text-amber-500" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {kpis.map((k, i) => (
          <motion.div
            key={k.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
          >
            <Card className="shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{k.title}</CardTitle>
                <k.icon className={`h-4 w-4 ${k.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold truncate">{k.value}</div>
                <p className="text-xs text-muted-foreground truncate">{k.sub}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ProductTable title={t("cc.topProducts") || "Top Products (Value/Velocity)"} icon={TrendingUp} rows={productInt.bestSellers} emptyLabel={t("cc.noProductData") || "No product data available"} />
        <ProductTable title={t("cc.slowMovers") || "Slow Movers"} icon={Sparkles} rows={productInt.slowMovers} emptyLabel={t("cc.noProductData") || "No product data available"} />
      </div>
    </div>
  );
}
