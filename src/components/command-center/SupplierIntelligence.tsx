import React from "react";
import { useI18n } from "@/lib/i18n";
import { formatTZS } from "@/data/mockData";
import { Truck, Landmark, BarChart2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";

export function SupplierIntelligence({ supplierInt }: { supplierInt: any }) {
  const { t } = useI18n();
  const kpis = [
    { title: t("cc.totalSuppliers") || "Total Suppliers (AP)", value: supplierInt.totalSuppliers, sub: t("cc.withAccountRecords") || "With account records", icon: Truck, color: "text-blue-500" },
    { title: t("cc.totalPurchaseVolume") || "Total Purchase Volume", value: formatTZS(supplierInt.purchaseVolume), sub: t("cc.lifetimePurchases") || "Lifetime purchases", icon: BarChart2, color: "text-orange-500" },
    { title: t("cc.outstandingPayments") || "Outstanding Payments", value: formatTZS(supplierInt.outstandingPayments), sub: t("cc.payableToSuppliers") || "Payable to suppliers", icon: Landmark, color: "text-amber-500" },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {kpis.map((k, i) => (
        <motion.div key={k.title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: i * 0.05 }}>
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
  );
}
