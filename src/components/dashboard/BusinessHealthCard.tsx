import { useMemo } from "react";
import { 
  TrendingUp, ShoppingCart, Package, DollarSign, Clock, ArrowUpRight, ArrowDownRight, Activity
} from "lucide-react";
import { formatTZS } from "@/data/mockData";
import { useI18n } from "@/lib/i18n";
import { THEME_COLORS } from "@/lib/theme";
import type { UserRolePermissions } from "@/hooks/useUserRole";

import StatCard from "@/components/common/StatCard";

interface BusinessHealthCardProps {
  userName?: string;
  shopName?: string;
  todayRevenue: number;
  todayNetProfit: number;
  todayExpenses: number;
  yesterdayRevenue: number;
  yesterdayNetProfit: number;
  pendingOrdersCount: number;
  lowStockCount: number;
  permissions: UserRolePermissions;
}

export function BusinessHealthCard({
  userName,
  shopName,
  todayRevenue,
  todayNetProfit,
  yesterdayRevenue,
  yesterdayNetProfit,
  pendingOrdersCount,
  lowStockCount,
  permissions,
}: BusinessHealthCardProps) {
  const { t } = useI18n();

  const hour = new Date().getHours();
  let greetingKey = "dashboard.greeting.morning";
  if (hour >= 12 && hour < 17) greetingKey = "dashboard.greeting.afternoon";
  else if (hour >= 17) greetingKey = "dashboard.greeting.evening";

  const getTrend = (current: number, past: number) => {
    if (past === 0) return { percent: current > 0 ? 100 : 0, up: current >= 0 };
    const diff = current - past;
    const percent = Math.round((diff / past) * 100);
    return { percent: Math.abs(percent), up: diff >= 0 };
  };

  const revenueTrend = useMemo(() => getTrend(todayRevenue, yesterdayRevenue), [todayRevenue, yesterdayRevenue]);
  const profitTrend = useMemo(() => getTrend(todayNetProfit, yesterdayNetProfit), [todayNetProfit, yesterdayNetProfit]);

  const firstName = userName ? userName.split(" ")[0] : t("layout.user");

  return (
    <div className="space-y-4 fade-in-up">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card/60 backdrop-blur-md p-5 rounded-2xl border border-border shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${THEME_COLORS.success.bg} ${THEME_COLORS.success.text} ${THEME_COLORS.success.border}`}>
              <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
              {shopName ? `${shopName} • ${t("dashboard.ok")}` : t("common.status")}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            {t(greetingKey as any)}, {firstName} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t("dashboard.hereIsYourBusiness" as any)}
          </p>
        </div>
      </div>

      {/* Primary 4 Metric Cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {/* 1. Today's Sales */}
        <StatCard
          title={t("dashboard.todaySales")}
          value={formatTZS(todayRevenue)}
          icon={ShoppingCart}
          iconBgColor={THEME_COLORS.info.bg}
          iconColor={THEME_COLORS.info.text}
          trend={{
            value: `${revenueTrend.up ? "+" : "-"}${revenueTrend.percent}%`,
            isPositive: revenueTrend.up,
            label: t("dashboard.vsYesterday" as any),
          }}
          className="hover:border-primary/40"
        />

        {/* 2. Today's Net Profit */}
        {permissions.canViewDashboardProfit ? (
          <StatCard
            title={t("dashboard.netProfit")}
            value={formatTZS(Math.round(todayNetProfit))}
            icon={TrendingUp}
            iconBgColor={THEME_COLORS.success.bg}
            iconColor={THEME_COLORS.success.text}
            trend={{
              value: `${profitTrend.up ? "+" : "-"}${profitTrend.percent}%`,
              isPositive: profitTrend.up,
              label: t("dashboard.vsYesterday" as any),
            }}
            className="hover:border-success/40"
          />
        ) : (
          <div className="bg-card/50 rounded-2xl p-4 sm:p-5 border border-border/60 shadow-2xs flex flex-col justify-between opacity-70">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  {t("dashboard.netProfit")}
                </p>
                <p className="text-lg font-bold text-muted-foreground">••••••</p>
              </div>
              <div className="rounded-xl p-2.5 bg-muted text-muted-foreground">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground italic">Restricted Access</p>
          </div>
        )}

        {/* 3. Pending Orders */}
        <StatCard
          title={t("dashboard.viewOrders")}
          value={pendingOrdersCount}
          icon={Clock}
          iconBgColor={THEME_COLORS.warning.bg}
          iconColor={THEME_COLORS.warning.text}
          trend={{
            value: pendingOrdersCount > 0 ? `${pendingOrdersCount} Pending` : "Clear",
            isPositive: pendingOrdersCount === 0,
            label: "",
          }}
          className="hover:border-warning/40"
        />

        {/* 4. Low Stock Products */}
        {permissions.canViewDashboardStock ? (
          <StatCard
            title={t("dashboard.lowStock")}
            value={lowStockCount}
            icon={Package}
            iconBgColor={THEME_COLORS.danger.bg}
            iconColor={THEME_COLORS.danger.text}
            trend={{
              value: lowStockCount > 0 ? `${lowStockCount} Alert` : t("dashboard.ok"),
              isPositive: lowStockCount === 0,
              label: "",
            }}
            className="hover:border-destructive/40"
          />
        ) : (
          <div className="bg-card/50 rounded-2xl p-4 sm:p-5 border border-border/60 shadow-2xs flex flex-col justify-between opacity-70">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  {t("dashboard.lowStock")}
                </p>
                <p className="text-lg font-bold text-muted-foreground">••••••</p>
              </div>
              <div className="rounded-xl p-2.5 bg-muted text-muted-foreground">
                <Activity className="h-5 w-5" />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground italic">Restricted Access</p>
          </div>
        )}
      </div>
    </div>
  );
}
