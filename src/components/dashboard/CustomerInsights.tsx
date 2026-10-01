import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Users, CreditCard, ChevronRight, Award } from "lucide-react";
import { formatTZS } from "@/data/mockData";
import { useI18n } from "@/lib/i18n";
import { THEME_COLORS } from "@/lib/theme";
import { getCustomers } from "@/lib/api/domains/customers";
import type { Customer, Order } from "@/types";

interface CustomerInsightsProps {
  shopId: string;
  orders: Order[];
}

export function CustomerInsights({ shopId, orders }: CustomerInsightsProps) {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [customers, setCustomers] = useState<Customer[]>([]);

  useEffect(() => {
    if (!shopId) return;
    getCustomers(shopId)
      .then(setCustomers)
      .catch(console.warn);
  }, [shopId]);

  const customerLeaderboard = useMemo(() => {
    return [...customers]
      .sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0))
      .slice(0, 4);
  }, [customers]);

  const unpaidOrders = orders.filter((o) => o.status === "pending");
  const totalOutstandingCredit = unpaidOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  return (
    <div className="bg-card/60 backdrop-blur-md rounded-2xl p-5 sm:p-6 border border-border shadow-xs fade-in-up space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${THEME_COLORS.accent.bg} ${THEME_COLORS.accent.text}`}>
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-foreground">
              {t("dashboard.ci.title" as any) || "Customer Relationships & Credit Overview"}
            </h3>
            <p className="text-xs text-muted-foreground">{t("dashboard.ci.subtitle" as any) || "Top buyers, active relationships, and outstanding credit balances"}</p>
          </div>
        </div>

        <button
          onClick={() => navigate("/dashboard/customers" as any)}
          className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
        >
          {t("dashboard.ci.viewAll" as any) || "View All"} ({customers.length})
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl border border-border/50 bg-muted/20">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-muted-foreground uppercase">{t("dashboard.ci.totalRegistered" as any) || "Total Registered"}</span>
            <Users className={`h-4 w-4 ${THEME_COLORS.accent.text}`} />
          </div>
          <p className="text-xl font-black text-foreground">{customers.length}</p>
        </div>

        <div className="p-3.5 rounded-xl border border-border/50 bg-muted/20">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-muted-foreground uppercase">{t("dashboard.ci.topBuyers" as any) || "Top Buyers"}</span>
            <Award className={`h-4 w-4 ${THEME_COLORS.warning.text}`} />
          </div>
          <p className="text-xl font-black text-foreground">{customerLeaderboard.length}</p>
        </div>

        <div className={`col-span-2 md:col-span-1 p-3.5 rounded-xl border ${THEME_COLORS.accent.bg} ${THEME_COLORS.accent.border}`}>
          <div className="flex items-center justify-between mb-1.5">
            <span className={`text-xs font-bold uppercase ${THEME_COLORS.accent.text}`}>{t("dashboard.ci.pendingCredit" as any) || "Pending Credit Due"}</span>
            <CreditCard className={`h-4 w-4 ${THEME_COLORS.accent.text}`} />
          </div>
          <p className={`text-xl font-black tracking-tight ${THEME_COLORS.accent.text}`}>
            {formatTZS(totalOutstandingCredit)}
          </p>
        </div>
      </div>

      {/* Top Customer List */}
      <div>
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2.5">
          {t("dashboard.ci.leaderboard" as any) || "Top Customer Leaderboard"}
        </p>

        {customerLeaderboard.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6 bg-muted/10 rounded-xl">
            {t("dashboard.ci.noCustomers" as any) || "No customer purchases logged yet."}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {customerLeaderboard.map((cust, idx) => (
              <div
                key={cust.id}
                className="p-3 rounded-xl border border-border/60 bg-card flex items-center justify-between"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`h-8 w-8 rounded-full ${THEME_COLORS.accent.bg} ${THEME_COLORS.accent.text} font-extrabold text-xs flex items-center justify-center shrink-0`}>
                    #{idx + 1}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">{cust.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{cust.phone || t("dashboard.ci.noPhone" as any) || "No phone"}</p>
                  </div>
                </div>
                <div className="text-right ml-2 shrink-0">
                  <p className="text-xs font-black text-success">{formatTZS(cust.totalSpent || 0)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
