import { Activity, ShoppingCart, Package, DollarSign } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toSafeDate } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { THEME_COLORS } from "@/lib/theme";
import type { ActivityLog } from "@/lib/activityLog";

import { useUserRole } from "@/hooks/useUserRole";

interface RecentActivityProps {
  activityLogs: ActivityLog[];
  logsLoading: boolean;
}

export function RecentActivity({ activityLogs, logsLoading }: RecentActivityProps) {
  const { t, lang } = useI18n();
  const { permissions } = useUserRole();

  if (!permissions.canViewRecentActivity) return null;

  return (
    <div className="bg-card/60 backdrop-blur-md rounded-2xl p-5 sm:p-6 border border-border shadow-xs fade-in-up space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-foreground flex items-center gap-2">
          <Activity className="h-4 w-4 text-muted-foreground" />
          {t("dashboard.recentActivity")}
        </h2>
        <span className="text-xs text-muted-foreground font-medium">{t("dashboard.recentActivity.subtitle" as any) || "Owner Audit Trail"}</span>
      </div>

      {logsLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3">
              <Skeleton className="h-9 w-9 rounded-xl" />
              <div className="flex-1 space-y-2 mt-0.5">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/4" />
              </div>
            </div>
          ))}
        </div>
      ) : activityLogs.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-8 bg-muted/10 rounded-xl">
          {t("dashboard.noActivity")}
        </p>
      ) : (
        <div className="space-y-3">
          {activityLogs.slice(0, 5).map((log) => {
            const variant = log.category === "sale" ? "success" : log.category === "product" ? "primary" : log.category === "expense" ? "danger" : "info";
            const colors = THEME_COLORS[variant];

            return (
              <div key={log.id} className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-muted/30 transition-colors">
                <div
                  className={`mt-0.5 rounded-xl p-2 shrink-0 ${colors.bg} ${colors.text}`}
                >
                  {log.category === "sale" ? (
                    <ShoppingCart className="h-4 w-4" />
                  ) : log.category === "product" ? (
                    <Package className="h-4 w-4" />
                  ) : log.category === "expense" ? (
                    <DollarSign className="h-4 w-4" />
                  ) : (
                    <Activity className="h-4 w-4" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-semibold text-foreground leading-snug">
                    {log.details}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-bold text-muted-foreground">
                      {log.userName}
                    </span>
                    <span className="text-[10px] text-muted-foreground/60">•</span>
                    <span className="text-[10px] text-muted-foreground/80">
                      {toSafeDate(log.createdAt)?.toLocaleString(lang === "sw" ? "sw-TZ" : "en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                        day: "numeric",
                        month: "short",
                      }) || "—"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
