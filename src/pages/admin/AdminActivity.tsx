import { useEffect, useState } from "react";
import { Activity, Search, Clock, User, Store, Shield, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getAllActivityLogs, type ActivityLog } from "@/lib/activityLog";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";
import { cn, toSafeDate } from "@/lib/utils";
import { Loader } from "@/components/common/Loader";

const categoryColors: Record<ActivityLog["category"], string> = {
  sale: "bg-success/10 text-success",
  product: "bg-primary/10 text-primary",
  expense: "bg-destructive/10 text-destructive",
  supplier: "bg-info/10 text-info",
  shop: "bg-warning/10 text-warning",
  user: "bg-purple-500/10 text-purple-500",
  auth: "bg-slate-500/10 text-slate-500",
};

const categoryIcons: Record<ActivityLog["category"], any> = {
  sale: Clock,
  product: Store,
  expense: AlertCircle,
  supplier: User,
  shop: Shield,
  user: User,
  auth: Shield,
};

export default function AdminActivity() {
  const { t } = useI18n();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  async function loadData() {
    setLoading(true);
    try {
      const allLogs = await getAllActivityLogs(100);
      setLogs(allLogs);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load activity logs");
    }
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  const filtered = logs.filter(log => 
    log.action.toLowerCase().includes(search.toLowerCase()) || 
    log.userEmail.toLowerCase().includes(search.toLowerCase()) ||
    log.userName.toLowerCase().includes(search.toLowerCase()) ||
    log.details.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="page-title">{t("admin.activityTitle") || "Global Activity Log"}</h1>
        <p className="page-description">{t("admin.activityDesc") || "Monitor all system-wide actions and events"}</p>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder={t("admin.searchLogs") || "Search actions, users, or details..."} 
            className="pl-10" 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
          />
        </div>
        <Button variant="outline" onClick={loadData} disabled={loading}>
          {loading ? "..." : t("common.refresh") || "Refresh"}
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader size={14} />
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.length === 0 ? (
            <div className="stat-card text-center py-12">
              <Activity className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">No activity logs found</p>
            </div>
          ) : (
            filtered.map((log) => {
              const Icon = categoryIcons[log.category] || Activity;
              return (
                <div key={log.id} className="stat-card flex gap-4 hover:border-primary/20 transition-colors group p-4">
                  <div className={cn("h-10 w-10 rounded-full flex items-center justify-center shrink-0", categoryColors[log.category])}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-foreground leading-none mb-1">{log.action}</p>
                        <p className="text-sm text-muted-foreground line-clamp-1">{log.details}</p>
                      </div>
                      <time className="text-xs text-muted-foreground whitespace-nowrap bg-muted px-2 py-0.5 rounded">
                        {toSafeDate(log.createdAt)?.toLocaleString() ?? 'Recent'}
                      </time>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 pt-3 border-t border-muted/50">
                      <div className="flex items-center gap-1.5 text-xs">
                        <User className="h-3 w-3 text-muted-foreground" />
                        <span className="font-medium text-foreground">{log.userName}</span>
                        <span className="text-muted-foreground">({log.userEmail})</span>
                      </div>
                      {log.shopId && log.shopId !== "system" && (
                        <div className="flex items-center gap-1.5 text-xs">
                          <Store className="h-3 w-3 text-muted-foreground" />
                          <span className="text-muted-foreground">Shop ID:</span>
                          <span className="font-mono bg-muted/50 px-1 rounded">{log.shopId}</span>
                        </div>
                      )}
                      <div className={cn("text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded ml-auto", categoryColors[log.category])}>
                        {log.category}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
