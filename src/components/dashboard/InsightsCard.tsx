import { useEffect, useState } from "react";
import { Sparkles, TrendingUp, AlertCircle, Info, RefreshCw } from "lucide-react";
import { fetchShopInsights } from "@/lib/api/domains/insights";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { Loader } from "@/components/common/Loader";


interface Insight {
  type: "success" | "warning" | "info";
  text: string;
}

interface InsightsCardProps {
  shopId: string;
}

export function InsightsCard({ shopId }: InsightsCardProps) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<number>(0);
  const [progress, setProgress] = useState<string>("");
  const { t, lang } = useI18n();

  const CACHE_KEY = `insights_${shopId}_${lang}_v2`;
  const CACHE_TIME = 1000 * 60 * 60; // 1 hour

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

    try {
      const { insights: aiInsights } = await fetchShopInsights(shopId, lang);
      const items: Insight[] = aiInsights.length > 0
        ? aiInsights
        : [{ type: "info", text: t("dashboard.insights.fallback") }];
      setInsights(items);
      setLastFetched(Date.now());
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        timestamp: Date.now(),
        data: items
      }));
    } catch (err) {
      console.error("Insights error:", err);
      setError(err instanceof Error ? err.message : t("error.unknown"));
    } finally {
      setLoading(false);
      setProgress("");
    }
  };

  useEffect(() => {
    fetchInsights();
  }, [shopId, lang]); // Re-fetch if language changes

  if (!shopId) return null;

  return (
    <Card className="glass-card border-primary/20 overflow-hidden relative group">
      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-primary to-primary/40"></div>
      
      <div className="p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-lg relative">
              <Sparkles className="h-5 w-5 text-primary animate-pulse" />
              <div className="absolute -top-1 -right-1 bg-primary text-[8px] font-bold text-primary-foreground px-1 rounded uppercase tracking-tighter">AI</div>
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">{t("dashboard.insights.title")}</h3>
              <p className="text-xs text-muted-foreground">{t("dashboard.insights.subtitle")}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-block text-[10px] font-bold text-muted-foreground uppercase opacity-40 px-2 py-0.5 border border-muted-foreground/20 rounded-full">
              {t("dashboard.insights.poweredBy")}
            </span>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-muted-foreground hover:text-primary"
              onClick={() => fetchInsights(true)}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4 py-4">
            <div className="flex flex-col items-center justify-center gap-3 py-6">
              <div className="relative">
                <Loader size={48} />
                <Sparkles className="h-5 w-5 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
              </div>
              <p className="text-sm font-medium text-primary animate-pulse">{progress}</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-destructive/5 text-destructive text-sm p-4 rounded-xl border border-destructive/10 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        ) : insights.length === 0 ? (
          <div className="text-center py-6 opacity-50">
            <p className="text-sm">{t("dashboard.insights.noData")}</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {insights.map((insight, idx) => (
              <div 
                key={idx} 
                className={`flex items-start gap-4 p-4 rounded-xl border transition-all hover:shadow-sm ${
                  insight.type === "success" ? "bg-success/5 border-success/10" :
                  insight.type === "warning" ? "bg-warning/5 border-warning/10" :
                  "bg-info/5 border-info/10"
                }`}
              >
                <div className={`mt-0.5 ${
                  insight.type === "success" ? "text-success" :
                  insight.type === "warning" ? "text-warning" :
                  "text-info"
                }`}>
                  {insight.type === "success" ? <TrendingUp className="h-5 w-5" /> :
                   insight.type === "warning" ? <AlertCircle className="h-5 w-5" /> :
                   <Info className="h-5 w-5" />}
                </div>
                <p className="text-sm font-medium leading-relaxed text-foreground italic">
                  "{insight.text}"
                </p>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between mt-6 pt-4 border-t border-muted/50">
          <p className="text-[10px] text-muted-foreground italic flex items-center gap-1">
            <Info className="h-3 w-3 opacity-50" />
            {t("dashboard.insights.disclaimer")}
          </p>
          {lastFetched > 0 && !loading && (
            <p className="text-[10px] text-muted-foreground italic">
              {t("reports.generatedOn")}: {new Date(lastFetched).toLocaleTimeString(lang === 'sw' ? 'sw-TZ' : 'en-US')}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
