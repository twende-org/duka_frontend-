import { DollarSign, ShoppingCart, TrendingUp, Briefcase } from "lucide-react";
import { formatTZS } from "@/data/mockData";
import { useI18n } from "@/lib/i18n";

interface Props {
  data: {
    sales: { today: number; thisWeek: number; thisMonth: number };
    orders: { pending: number; processing: number; completed: number };
    finance: { customerDebt: number; supplierDebt: number; revenue: number; expenses: number };
  };
}

export function ExecutiveSummary({ data }: Props) {
  const { t } = useI18n();
  const netProfit = data.finance.revenue - data.finance.expenses;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Revenue */}
      <div className="bg-card rounded-xl p-5 border border-border shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{t("dashboard.revenueToday") || "Today's Revenue"}</p>
            <h3 className="text-2xl font-bold mt-1">{formatTZS(data.sales.today)}</h3>
          </div>
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <DollarSign className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <span>Month: {formatTZS(data.sales.thisMonth)}</span>
        </div>
      </div>

      {/* Orders */}
      <div className="bg-card rounded-xl p-5 border border-border shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{t("dashboard.pendingOrders") || "Pending Orders"}</p>
            <h3 className="text-2xl font-bold mt-1">{data.orders.pending}</h3>
          </div>
          <div className="h-10 w-10 rounded-full bg-warning/10 flex items-center justify-center text-warning">
            <ShoppingCart className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <span>Completed: {data.orders.completed}</span>
        </div>
      </div>

      {/* Debt */}
      <div className="bg-card rounded-xl p-5 border border-border shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{t("dashboard.customerDebt") || "Customer Debt"}</p>
            <h3 className="text-2xl font-bold mt-1 text-destructive">{formatTZS(data.finance.customerDebt)}</h3>
          </div>
          <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <span>Supplier Debt: {formatTZS(data.finance.supplierDebt)}</span>
        </div>
      </div>

      {/* Net Profit */}
      <div className="bg-card rounded-xl p-5 border border-border shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{t("dashboard.netProfit") || "Monthly Net Profit"}</p>
            <h3 className="text-2xl font-bold mt-1 text-accent">{formatTZS(netProfit)}</h3>
          </div>
          <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center text-accent">
            <Briefcase className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <span>Expenses: {formatTZS(data.finance.expenses)}</span>
        </div>
      </div>
    </div>
  );
}
