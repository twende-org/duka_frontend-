import React from "react";
import { useI18n } from "@/lib/i18n";
import StatCard from "@/components/common/StatCard";
import { formatTZS } from "@/data/mockData";
import { TrendingUp, Calendar, CreditCard, Landmark, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";

export function ExecutiveSummary({ sales, finance }: { sales: any; finance: any }) {
  const { t } = useI18n();
  const kpis = [
    { title: t("cc.todaysRevenue") || "Today's Revenue", value: formatTZS(sales.today), sub: t("cc.salesRecordedToday") || "Sales recorded today", icon: DollarSign, color: "text-orange-500" },
    { title: t("cc.thisWeek") || "This Week", value: formatTZS(sales.week), sub: t("cc.weekToDate") || "Week to date", icon: Calendar, color: "text-blue-500" },
    { title: t("cc.thisMonth") || "This Month", value: formatTZS(sales.month), sub: t("cc.monthToDate") || "Month to date", icon: TrendingUp, color: "text-emerald-500" },
    {
      title: t("cc.netRevenue30d") || "30D Net Revenue",
      value: formatTZS(sales.revenue - sales.expenses),
      sub: `${formatTZS(sales.expenses)} ${t("cc.expensesSuffix") || "expenses"}`,
      icon: Landmark,
      color: "text-amber-500",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k, i) => (
          <motion.div
            key={k.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          title={t("cc.customerDebt") || "Customer Debt"}
          value={formatTZS(finance.customerDebt)}
          icon={CreditCard}
          iconBgColor="bg-muted"
          iconColor="text-muted-foreground"
        />
        <StatCard
          title={t("cc.supplierDebt") || "Supplier Debt"}
          value={formatTZS(finance.supplierDebt)}
          icon={Landmark}
          iconBgColor="bg-muted"
          iconColor="text-muted-foreground"
        />
      </div>
    </div>
  );
}
