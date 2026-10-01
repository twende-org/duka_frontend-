import { useEffect, useState } from "react";
import { AlertTriangle, Search, RefreshCw, Shield, Wifi, Key, Ghost, MessageSquare, Ban, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getAllErrorEvents, type ErrorEventData, type ErrorCategory } from "@/lib/errorLogger";
import { cn, toSafeDate } from "@/lib/utils";
import { Loader } from "@/components/common/Loader";

const categoryConfig: Record<ErrorCategory, { label: string; color: string; icon: any }> = {
  auth: { label: "Auth Failure", color: "bg-warning/10 text-warning border-warning/30", icon: Key },
  database: { label: "Database", color: "bg-destructive/10 text-destructive border-destructive/30", icon: Ban },
  crash: { label: "App Crash", color: "bg-red-600/10 text-red-500 border-red-500/30", icon: AlertCircle },
  "404": { label: "404 Not Found", color: "bg-muted text-muted-foreground border-border", icon: Ghost },
  manual: { label: "User Report", color: "bg-primary/10 text-primary border-primary/30", icon: MessageSquare },
  permission: { label: "Permission", color: "bg-orange-500/10 text-orange-500 border-orange-500/30", icon: Shield },
  network: { label: "Network", color: "bg-info/10 text-info border-info/30", icon: Wifi },
};

export default function AdminErrors() {
  const [events, setEvents] = useState<ErrorEventData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");

  async function loadData() {
    setLoading(true);
    const data = await getAllErrorEvents(300);
    setEvents(data);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  const filtered = events.filter((e) => {
    const matchCat = filterCat === "all" || e.category === filterCat;
    const matchSearch =
      search === "" ||
      (e.errorMessage || "").toLowerCase().includes(search.toLowerCase()) ||
      (e.userEmail || "").toLowerCase().includes(search.toLowerCase()) ||
      (e.action || "").toLowerCase().includes(search.toLowerCase()) ||
      (e.route || "").toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const formatTime = (ts: any) => {
    const date = toSafeDate(ts);
    return date ? date.toLocaleString() : "—";
  };

  // Stats by category
  const stats = Object.entries(categoryConfig).map(([cat, cfg]) => ({
    cat: cat as ErrorCategory, cfg,
    count: events.filter((e) => e.category === cat).length,
  }));

  const last24h = events.filter((e) => {
    const d = toSafeDate(e.createdAt);
    return d ? Date.now() - d.getTime() < 86400000 : false;
  }).length;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2">
          <AlertTriangle className="h-6 w-6 text-destructive" />
          Error Events Dashboard
        </h1>
        <p className="page-description">
          Real-time log of all user errors, app crashes, and failures across the platform
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <div className="stat-card text-center">
          <p className="text-3xl font-black text-foreground">{events.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Total Errors</p>
        </div>
        <div className="stat-card text-center">
          <p className="text-3xl font-black text-destructive">{last24h}</p>
          <p className="text-xs text-muted-foreground mt-1">Last 24 Hours</p>
        </div>
        <div className="stat-card text-center">
          <p className="text-3xl font-black text-warning">
            {events.filter((e) => e.category === "crash").length}
          </p>
          <p className="text-xs text-muted-foreground mt-1">App Crashes</p>
        </div>
        <div className="stat-card text-center">
          <p className="text-3xl font-black text-primary">
            {events.filter((e) => e.category === "auth").length}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Auth Failures</p>
        </div>
      </div>

      {/* Category filter pills */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilterCat("all")}
          className={cn("px-3 py-1.5 rounded-full text-xs font-semibold border transition-all", filterCat === "all" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50")}
        >
          All ({events.length})
        </button>
        {stats.filter((s) => s.count > 0).map(({ cat, cfg, count }) => {
          const Icon = cfg.icon;
          return (
            <button
              key={cat}
              onClick={() => setFilterCat(filterCat === cat ? "all" : cat)}
              className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all", filterCat === cat ? "bg-primary text-primary-foreground border-primary" : `${cfg.color} hover:opacity-80`)}
            >
              <Icon className="h-3 w-3" />
              {cfg.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Search + Refresh */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search user, error, action, route..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button variant="outline" onClick={loadData} disabled={loading} className="gap-2">
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          Refresh
        </Button>
        <span className="text-sm text-muted-foreground ml-auto font-medium">
          {filtered.length} events
        </span>
      </div>

      {/* Events table */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader size={14} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="stat-card text-center py-16">
          <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground font-medium">No error events found</p>
          <p className="text-xs text-muted-foreground mt-1">
            Errors will appear here automatically when users encounter problems
          </p>
        </div>
      ) : (
        <div className="stat-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground/70 text-[10px] uppercase font-black tracking-wider">
                <th className="pb-3 w-36">Time</th>
                <th className="pb-3">Category</th>
                <th className="pb-3">User</th>
                <th className="pb-3">Action</th>
                <th className="pb-3">Error Message</th>
                <th className="pb-3">Route</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e, i) => {
                const cfg = categoryConfig[e.category] || { label: e.category, color: "bg-muted text-muted-foreground border-border", icon: AlertTriangle };
                const Icon = cfg.icon;
                return (
                  <tr key={e.id || i} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="py-3 text-xs text-muted-foreground whitespace-nowrap pr-4">
                      {formatTime(e.createdAt)}
                    </td>
                    <td className="py-3 pr-4">
                      <span className={cn("inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wide", cfg.color)}>
                        <Icon className="h-3 w-3" />
                        {cfg.label}
                      </span>
                    </td>
                    <td className="py-3 pr-4 max-w-[150px]">
                      {e.userEmail ? (
                        <div>
                          <p className="font-semibold text-xs truncate">{e.userName}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{e.userEmail}</p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs italic">Anonymous</span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-xs font-mono text-muted-foreground max-w-[110px] truncate">{e.action || "—"}</td>
                    <td className="py-3 pr-4 text-xs text-destructive max-w-[220px] truncate" title={e.errorMessage}>
                      {e.errorMessage}
                    </td>
                    <td className="py-3 text-xs font-mono text-muted-foreground max-w-[120px] truncate">
                      {e.route || "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
