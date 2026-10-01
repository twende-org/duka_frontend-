import React from "react";
import { useI18n } from "@/lib/i18n";
import { formatTZS } from "@/data/mockData";
import { Users, CreditCard, Award, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

export function CustomerIntelligence({ customerInt }: { customerInt: any }) {
  const { t } = useI18n();
  const navigate = useNavigate();

  const kpis = [
    { title: t("cc.totalCustomers") || "Total Customers (AR)", value: customerInt.totalCustomers, sub: t("cc.withAccountRecords") || "With account records", icon: Users, color: "text-blue-500" },
    { title: t("cc.outstandingDebt") || "Outstanding Debt", value: formatTZS(customerInt.outstandingBalances), sub: t("cc.receivableFromCustomers") || "Receivable from customers", icon: CreditCard, color: "text-amber-500" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

      <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
        <div className="flex items-center justify-between gap-2 border-b bg-muted/30 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-orange-500" />
            <h3 className="text-sm font-semibold">{t("cc.topCustomers") || "Top Customers (LTV)"}</h3>
          </div>
          <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => navigate("/dashboard/customers")}>
            View All <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left [&_th]:whitespace-nowrap [&_td]:whitespace-nowrap">
            <thead className="text-xs text-muted-foreground bg-muted/50 uppercase">
              <tr>
                <th className="px-4 py-3 font-medium min-w-[180px]">{t("cc.colCustomer") || "Customer"}</th>
                <th className="px-4 py-3 font-medium text-right">{t("cc.colDebt") || "Debt"}</th>
                <th className="px-4 py-3 font-medium text-right">{t("cc.colLTV") || "Lifetime Value"}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {customerInt.topCustomers.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-10 text-center text-muted-foreground">
                    <Users className="mx-auto h-8 w-8 mb-3 opacity-20" />
                    {t("cc.noCustomerData") || "No customer data available"}
                  </td>
                </tr>
              ) : (
                customerInt.topCustomers.map((c: any, i: number) => (
                  <motion.tr
                    key={c.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.28, delay: Math.min(i, 12) * 0.03, ease: [0.22, 1, 0.36, 1] }}
                    onClick={() => navigate("/dashboard/customers")}
                    className="group relative cursor-pointer transition-colors duration-200 hover:bg-primary/5"
                  >
                    <td className="relative px-4 py-3 font-medium min-w-[180px]">
                      <span className="absolute left-0 top-1/2 h-0 w-[3px] -translate-y-1/2 rounded-r-full bg-primary transition-all duration-300 group-hover:h-3/5" />
                      <span className="inline-block max-w-[220px] truncate transition-transform duration-200 group-hover:translate-x-1" title={c.customerName || c.customerId}>
                        {c.customerName || c.customerId}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-amber-600">{formatTZS(c.outstandingBalance)}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatTZS(c.totalPurchases)}</td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
