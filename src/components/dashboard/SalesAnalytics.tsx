import { useMemo, useState } from "react";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from "recharts";
import { TrendingUp, DollarSign, Calendar, ArrowUpRight } from "lucide-react";
import { formatTZS } from "@/data/mockData";
import { useI18n } from "@/lib/i18n";
import type { DailySalesSummary } from "@/types";
import type { UserRolePermissions } from "@/hooks/useUserRole";

interface SalesAnalyticsProps {
  rangeSummaries: DailySalesSummary[];
  timeRange: 7 | 30 | 90;
  setTimeRange: (range: 7 | 30 | 90) => void;
  permissions: UserRolePermissions;
}

export function SalesAnalytics({
  rangeSummaries,
  timeRange,
  setTimeRange,
  permissions,
}: SalesAnalyticsProps) {
  const { t } = useI18n();

  const dayKeys = [
    "day.sunday", "day.monday", "day.tuesday", "day.wednesday",
    "day.thursday", "day.friday", "day.saturday",
  ] as const;

  const chartData = useMemo(() => {
    const now = new Date();
    const data: { day: string; amount: number; net: number }[] = [];
    for (let i = timeRange - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const curDateStr = d.toISOString().split("T")[0];
      const summary = rangeSummaries.find((s) => s.date === curDateStr);

      let dayLabel = "";
      if (timeRange === 7) {
        dayLabel = t(dayKeys[d.getDay()]);
      } else {
        dayLabel = `${d.getDate()}/${d.getMonth() + 1}`;
      }

      data.push({
        day: dayLabel,
        amount: summary?.totalSales || 0,
        net: (summary?.netProfit ?? summary?.profit) || 0,
      });
    }
    return data;
  }, [rangeSummaries, t, timeRange]);

  // Aggregate totals
  const totalRevenue = useMemo(() => chartData.reduce((sum, d) => sum + d.amount, 0), [chartData]);
  const totalProfit = useMemo(() => chartData.reduce((sum, d) => sum + d.net, 0), [chartData]);
  const profitMarginPercent = totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 100) : 0;

  return (
    <div className="bg-card/60 backdrop-blur-md rounded-2xl p-5 sm:p-6 border border-border shadow-sm fade-in-up space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-extrabold text-foreground flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            {t("dashboard.weeklySales")} & Financial Performance
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("dashboard.sales.desc" as any) || "Revenue trends, profit margins, and growth statistics"}
          </p>
        </div>

        {/* Time Range Selector */}
        <div className="flex items-center p-1 bg-muted/40 rounded-xl border border-border/50 self-start sm:self-auto">
          <button
            onClick={() => setTimeRange(7)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              timeRange === 7
                ? "bg-background text-foreground shadow-xs border border-border/50"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("dashboard.time.7days" as any)}
          </button>
          <button
            onClick={() => setTimeRange(30)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              timeRange === 30
                ? "bg-background text-foreground shadow-xs border border-border/50"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("dashboard.time.30days" as any)}
          </button>
          <button
            onClick={() => setTimeRange(90)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              timeRange === 90
                ? "bg-background text-foreground shadow-xs border border-border/50"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("dashboard.time.90days" as any) || "90 Days"}
          </button>
        </div>
      </div>

      {/* Aggregated Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 bg-muted/20 p-4 rounded-xl border border-border/40">
        <div>
          <p className="text-[11px] font-semibold text-muted-foreground uppercase">
            {t("dashboard.sales.periodTotal" as any) || "Period Total Sales"}
          </p>
          <p className="text-lg font-black text-foreground tracking-tight">
            {formatTZS(totalRevenue)}
          </p>
        </div>
        {permissions.canViewDashboardProfit && (
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase">
              {t("dashboard.sales.periodNet" as any) || "Period Net Profit"}
            </p>
            <p className="text-lg font-black text-success tracking-tight">
              {formatTZS(totalProfit)}
            </p>
          </div>
        )}
        {permissions.canViewDashboardProfit && (
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase">
              {t("dashboard.sales.margin" as any) || "Net Profit Margin"}
            </p>
            <p className="text-lg font-black text-info tracking-tight flex items-center gap-1">
              {profitMarginPercent}%
              <ArrowUpRight className="h-4 w-4 text-success" />
            </p>
          </div>
        )}
      </div>

      {/* Recharts Area Chart */}
      <div className="h-[280px] sm:h-[320px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.2} />
                <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`)}
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              dx={-10}
            />
            <Tooltip
              cursor={{ stroke: "hsl(var(--muted-foreground))", strokeWidth: 1, strokeDasharray: "3 3" }}
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                borderColor: "hsl(var(--border))",
                borderRadius: "0.75rem",
                boxShadow: "0 10px 25px -5px rgb(0 0 0 / 0.1)",
                padding: "12px",
              }}
              itemStyle={{ fontWeight: "600", fontSize: "13px" }}
              labelStyle={{
                color: "hsl(var(--muted-foreground))",
                marginBottom: "6px",
                fontSize: "11px",
                fontWeight: "600",
                textTransform: "uppercase",
              }}
              formatter={(value: number, name: string) => [
                formatTZS(value),
                name === "amount" ? t("nav.sales") : t("dashboard.netProfit"),
              ]}
            />
            <Area
              type="monotone"
              dataKey="amount"
              name="amount"
              stroke="hsl(var(--primary))"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorSales)"
              animationDuration={1200}
            />
            {permissions.canViewDashboardProfit && (
              <Area
                type="monotone"
                dataKey="net"
                name="net"
                stroke="hsl(var(--success))"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorProfit)"
                animationDuration={1200}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
