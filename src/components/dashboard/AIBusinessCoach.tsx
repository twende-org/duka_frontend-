import { useEffect, useState } from "react";
import { 
  Sparkles, TrendingUp, AlertCircle, Info, RefreshCw, ChevronRight
} from "lucide-react";
import { fetchShopInsights, type InsightsSnapshot } from "@/lib/api/domains/insights";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { THEME_COLORS } from "@/lib/theme";
import { useNavigate } from "react-router-dom";
import { Loader } from "@/components/common/Loader";


interface Insight {
  type: "success" | "warning" | "info";
  text: string;
  actionText?: string;
  actionPath?: string;
}

interface AIBusinessCoachProps {
  shopId: string;
}

export function AIBusinessCoach({ shopId }: AIBusinessCoachProps) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<number>(0);
  const [progress, setProgress] = useState<string>("");
  const { t, lang } = useI18n();
  const navigate = useNavigate();

  const CACHE_KEY = `insights_${shopId}_${lang}_v3`;
  const CACHE_TIME = 1000 * 60 * 60; // 1 hour

  const getActionForInsight = (text: string): { actionText?: string; actionPath?: string } => {
    const lower = text.toLowerCase();
    if (lower.includes("stoo") || lower.includes("stock") || lower.includes("bidhaa") || lower.includes("product")) {
      return { actionText: "Ukaguzi wa Stoo", actionPath: "/dashboard/products" };
    }
    if (lower.includes("mauzo") || lower.includes("sales") || lower.includes("uza") || lower.includes("sell")) {
      return { actionText: "Rekodi Mauzo", actionPath: "/dashboard/sales" };
    }
    if (lower.includes("oda") || lower.includes("order")) {
      return { actionText: "Tazama Oda", actionPath: "/dashboard/orders" };
    }
    if (lower.includes("tangaza") || lower.includes("promo") || lower.includes("wateja")) {
      return { actionText: "Tangaza Bidhaa", actionPath: "/dashboard/marketing" };
    }
    if (lower.includes("matumizi") || lower.includes("expense") || lower.includes("gharama")) {
      return { actionText: "Rekodi Matumizi", actionPath: "/dashboard/expenses" };
    }
    return { actionText: "Tazama Zaidi", actionPath: "/dashboard/products" };
  };

  const welcomeInsights = (): Insight[] => [
    { type: "success", text: t("dashboard.insights.welcome" as any) || "Karibu kwenye duka lako jipya!", actionText: "Tengeneza Bidhaa", actionPath: "/dashboard/products" },
    { type: "info", text: t("dashboard.insights.addFirstSale" as any) || "Rekodi mauzo yako ya kwanza leo.", actionText: "Rekodi Mauzo", actionPath: "/dashboard/sales" }
  ];

  // Local tips for when the AI answer is unavailable; also what renders when
  // Django answers with an empty insights list.
  const generateFallbackInsights = (snap: InsightsSnapshot) => {
    const { todaySales, yesterdaySales, todayExpenses, lowStockItems } = snap;
    const fallbacks: Insight[] = [];
    if (todaySales > yesterdaySales && yesterdaySales > 0) {
      fallbacks.push({ type: "success", text: lang === "sw" ? "Mauzo yamepanda ukilinganisha na jana. Endelea vizuri!" : "Sales are up compared to yesterday. Keep it up!", actionText: lang === "sw" ? "Tazama Mauzo" : "View Sales", actionPath: "/dashboard/sales" });
    } else if (todaySales < yesterdaySales && todaySales > 0) {
      fallbacks.push({ type: "warning", text: lang === "sw" ? "Mauzo yameshuka kidogo ukilinganisha na jana." : "Sales are slightly down compared to yesterday.", actionText: lang === "sw" ? "Tazama Mauzo" : "View Sales", actionPath: "/dashboard/sales" });
    } else if (todaySales > 0) {
      fallbacks.push({ type: "success", text: lang === "sw" ? "Umefanya mauzo leo. Kazi nzuri!" : "You've made sales today. Good job!", actionText: lang === "sw" ? "Rekodi Mauzo" : "Record Sales", actionPath: "/dashboard/sales" });
    }

    if (lowStockItems.length > 0) {
      fallbacks.push({ type: "warning", text: lang === "sw" ? `Bidhaa ${lowStockItems.length} zimepungua stoo: ${lowStockItems.slice(0, 2).join(', ')}` : `${lowStockItems.length} items are low on stock: ${lowStockItems.slice(0, 2).join(', ')}`, actionText: lang === "sw" ? "Ukaguzi wa Stoo" : "Check Stock", actionPath: "/dashboard/products" });
    }

    if (todayExpenses > todaySales && todaySales > 0) {
      fallbacks.push({ type: "warning", text: lang === "sw" ? "Matumizi yamezidi mauzo. Jitahidi kudhibiti matumizi." : "Expenses are higher than sales. Try to control expenses.", actionText: lang === "sw" ? "Tazama Matumizi" : "View Expenses", actionPath: "/dashboard/expenses" });
    }

    if (fallbacks.length === 0) {
      fallbacks.push({ type: "info", text: lang === "sw" ? "Endelea kurekodi taarifa zako kila siku ili kupata ushauri zaidi." : "Keep recording your data daily to get more insights.", actionText: lang === "sw" ? "Rekodi Mauzo" : "Record Sales", actionPath: "/dashboard/sales" });
    }

    const items = fallbacks.slice(0, 3);
    setInsights(items);
    setLastFetched(Date.now());
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      timestamp: Date.now(),
      data: items
    }));
  };

  // The numbers and the AI tips both come from the server, which keeps the
  // OpenRouter key out of the browser bundle.
  const runApiInsights = async () => {
    try {
      const { insights: aiInsights, data } = await fetchShopInsights(shopId, lang);

      if (data.todaySales === 0 && data.yesterdaySales === 0 && data.todayExpenses === 0 && data.lowStockItems.length === 0) {
        setInsights(welcomeInsights());
        return;
      }

      if (aiInsights.length > 0) {
        const items: Insight[] = aiInsights.map((insight) => ({
          type: insight.type,
          text: insight.text,
          ...getActionForInsight(insight.text),
        }));
        setInsights(items);
        setLastFetched(Date.now());
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          timestamp: Date.now(),
          data: items
        }));
        return;
      }

      generateFallbackInsights(data);
    } catch (err) {
      console.error("AI Coach error:", err);
      setError(err instanceof Error ? err.message : t("error.unknown"));
    } finally {
      setLoading(false);
      setProgress("");
    }
  };

  const fetchInsights = async (force = false) => {
    if (!shopId) return;

    if (!force) {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        try {
          const { data, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < CACHE_TIME) {
            setInsights(data);
            setLastFetched(timestamp);
            return;
          }
        } catch (e) {
          localStorage.removeItem(CACHE_KEY);
        }
      }
    }

    setLoading(true);
    setError(null);
    setProgress(t("dashboard.insights.loading.data"));
    await runApiInsights();
  };

  useEffect(() => {
    fetchInsights();
  }, [shopId, lang]);

  if (!shopId) return null;

  return (
    <Card className="glass-card border-primary/20 overflow-hidden relative shadow-2xs rounded-2xl">
      <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-primary via-primary/70 to-primary/30" />

      <div className="p-5 sm:p-6">
        {/* Card Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl relative ${THEME_COLORS.primary.bg} ${THEME_COLORS.primary.text}`}>
              <Sparkles className="h-5 w-5 animate-pulse" />
              <div className="absolute -top-1 -right-1 bg-primary text-[8px] font-black text-primary-foreground px-1 rounded uppercase tracking-tighter">
                COACH
              </div>
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
                {t("dashboard.insights.title")}
              </h3>
              <p className="text-xs text-muted-foreground">AI Business Assistant & Proactive Recommendations</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-muted-foreground hover:text-primary rounded-xl"
              onClick={() => fetchInsights(true)}
              disabled={loading}
              title="Refresh AI insights"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="py-6 flex flex-col items-center justify-center gap-3">
            <div className="relative">
              <Loader size={40} />
              <Sparkles className="h-4 w-4 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
            </div>
            <p className="text-xs font-semibold text-primary animate-pulse">{progress}</p>
          </div>
        ) : error ? (
          <div className={`text-xs p-3.5 rounded-xl flex items-center gap-2 ${THEME_COLORS.danger.bg} ${THEME_COLORS.danger.text} ${THEME_COLORS.danger.border}`}>
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : (
          <div className="space-y-3">
            {insights.map((insight, idx) => {
              const variant = insight.type === "success" ? "success" : insight.type === "warning" ? "warning" : "info";
              const colors = THEME_COLORS[variant];
              return (
                <div 
                  key={idx} 
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border transition-all hover:shadow-2xs ${colors.bg} ${colors.border}`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`mt-0.5 p-1.5 rounded-lg shrink-0 ${colors.bg} ${colors.text}`}>
                      {insight.type === "success" ? <TrendingUp className="h-4 w-4" /> :
                       insight.type === "warning" ? <AlertCircle className="h-4 w-4" /> :
                       <Info className="h-4 w-4" />}
                    </div>
                    <p className="text-xs sm:text-sm font-medium leading-relaxed text-foreground">
                      "{insight.text}"
                    </p>
                  </div>

                  {insight.actionText && insight.actionPath && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(insight.actionPath!)}
                      className="shrink-0 text-xs font-bold h-8 rounded-lg shadow-2xs self-end sm:self-auto bg-background/90 text-foreground border-border hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
                    >
                      {insight.actionText}
                      <ChevronRight className="ml-1 h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/40 text-[10px] text-muted-foreground italic">
          <span>{t("dashboard.insights.disclaimer")}</span>
          {lastFetched > 0 && !loading && (
            <span>Updated: {new Date(lastFetched).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          )}
        </div>
      </div>
    </Card>
  );
}
