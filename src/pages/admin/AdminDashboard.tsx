import { useEffect, useState, useMemo } from "react";
import {
  Users, CreditCard, Store, TrendingUp, AlertTriangle, ArrowRight, Clock, Search, Compass
} from "lucide-react";
import { BsWhatsapp } from "react-icons/bs";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { getAllUsers, getAllSubscriptions, PLAN_LIMITS, type Subscription } from "@/lib/subscription";
import { getAllShopsAdmin as getAllShops } from "@/lib/api/domains/shops";
import { getGlobalAnalytics, type GlobalAnalytics } from "@/lib/analytics";
import { formatTZS } from "@/data/mockData";
import { useI18n } from "@/lib/i18n";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn, toSafeDate } from "@/lib/utils";
import { Loader } from "@/components/common/Loader";

const PLAN_COLORS: Record<string, string> = {
  free: "#94a3b8",
  basic: "#6366f1",
  business: "#22c55e",
  enterprise: "#3b82f6",
};

function AdminDashboard() {
  const { t } = useI18n();
  const [users, setUsers] = useState<any[]>([]);
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [shops, setShops] = useState<any[]>([]);
  const [globalAnalytics, setGlobalAnalytics] = useState<GlobalAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getAllUsers().catch(() => []),
      getAllSubscriptions().catch(() => []),
      getAllShops().catch(() => []),
      getGlobalAnalytics(7).catch(() => null),
    ])
      .then(([u, s, sh, ga]) => {
        setUsers(u);
        setSubs(s);
        setShops(sh);
        setGlobalAnalytics(ga);
      })
      .finally(() => setLoading(false));
  }, []);

  const activeCount = subs.filter((s) => s.status === "active").length;
  const pendingCount = subs.filter((s) => s.status === "pending").length;
  const pendingShops = shops.filter((s) => !s.isPublic).length;
  const totalRevenue = subs.filter((s) => s.status === "active").reduce((sum, s) => sum + s.amount, 0);

  const stats = [
    { label: t("admin.totalUsers"), value: users.length, icon: Users, color: "bg-primary/10 text-primary", link: "/admin/users" },
    { label: t("admin.activeSubscriptions"), value: activeCount, icon: CreditCard, color: "bg-success/10 text-success", link: "/admin/payments" },
    { label: t("admin.pendingPayments"), value: pendingCount, icon: Clock, color: "bg-warning/10 text-warning", link: "/admin/payments", urgent: pendingCount > 0 },
    { label: t("admin.totalShops"), value: shops.length, icon: Store, color: "bg-info/10 text-info", link: "/admin/shops" },
  ];

  // Monthly revenue chart — last 6 months
  const monthlyRevenue = useMemo(() => {
    const months: Record<string, number> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = d.toLocaleString("default", { month: "short", year: "2-digit" });
      months[key] = 0;
    }
    subs.forEach((s) => {
      if (!s.startDate) return;
      const d = new Date(s.startDate);
      const key = d.toLocaleString("default", { month: "short", year: "2-digit" });
      if (months[key] !== undefined && s.status !== "expired") {
        months[key] += s.amount;
      }
    });
    return Object.entries(months).map(([month, revenue]) => ({ month, revenue }));
  }, [subs]);

  // Plan distribution donut
  const planDistribution = useMemo(() => {
    const counts: Record<string, number> = { free: 0, basic: 0, business: 0, enterprise: 0 };
    users.forEach((u) => {
      const sub = subs.find((s) => s.userId === u.id && s.status === "active");
      const plan = sub?.plan || "free";
      if (counts[plan] !== undefined) counts[plan]++;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .filter((e) => e.value > 0);
  }, [users, subs]);

  // Stuck users: registered > 7 days ago, no shop
  const shopOwnerIds = new Set(shops.map((s) => s.ownerId));
  const stuckUsers = useMemo(() => {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return users.filter((u) => {
      if (shopOwnerIds.has(u.id)) return false;
      const created = toSafeDate(u.createdAt);
      return created ? created.getTime() < cutoff : false;
    });
  }, [users, shopOwnerIds]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader size={14} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="page-title">{t("admin.dashboardTitle")}</h1>
        <p className="page-description">{t("admin.dashboardDesc")}</p>
      </div>

      {/* Pending Actions Alert */}
      {(pendingCount > 0 || pendingShops > 0) && (
        <div className="rounded-xl border border-warning/30 bg-warning/5 p-4 flex items-center gap-4 flex-wrap">
          <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-sm text-foreground">Vitendo Vinavyosubiri Idhini Yako</p>
            <div className="flex gap-4 mt-1 flex-wrap">
              {pendingCount > 0 && (
                <p className="text-xs text-muted-foreground">
                  💳 <strong>{pendingCount}</strong> malipo yanasubiri uthibitisho
                </p>
              )}
              {pendingShops > 0 && (
                <p className="text-xs text-muted-foreground">
                  🏪 <strong>{pendingShops}</strong> maduka yanasubiri idhini
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {pendingCount > 0 && (
              <Button size="sm" asChild>
                <Link to="/admin/payments">Thibitisha Malipo <ArrowRight className="h-3 w-3 ml-1" /></Link>
              </Button>
            )}
            {pendingShops > 0 && (
              <Button size="sm" variant="outline" asChild>
                <Link to="/admin/shops">Idhini Maduka <ArrowRight className="h-3 w-3 ml-1" /></Link>
              </Button>
            )}
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-2">
        {stats.map((stat) => (
          <Link to={stat.link} key={stat.label} className={cn("stat-card hover:border-primary/30 transition-all hover:scale-[1.02] cursor-pointer", stat.urgent && "border-warning/40 bg-warning/5")}>
            <div className="flex items-center justify-between mb-3">
              <div className={`rounded-lg p-2 ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
              {stat.urgent && <span className="flex h-2 w-2 rounded-full bg-warning animate-pulse" />}
            </div>
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
          </Link>
        ))}
      </div>

      {/* Global Traffic Insights */}
      {globalAnalytics && (
        <div className="grid gap-4 sm:grid-cols-3 mb-6">
          <div className="stat-card glass-card flex items-center justify-between border-l-4 border-l-purple-500/60 hover:scale-[1.02] transition-transform cursor-default">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Total Searches (7d)</p>
              <p className="text-2xl font-black text-foreground">{globalAnalytics.totalSearches.toLocaleString()}</p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-500 shadow-inner">
              <Search className="h-5 w-5" />
            </div>
          </div>
          <div className="stat-card glass-card flex items-center justify-between border-l-4 border-l-green-500/60 hover:scale-[1.02] transition-transform cursor-default">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Platform WhatsApp Clicks</p>
              <p className="text-2xl font-black text-foreground">{globalAnalytics.totalWhatsAppClicks.toLocaleString()}</p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-500 shadow-inner">
              <BsWhatsapp className="h-5 w-5" />
            </div>
          </div>
          <div className="stat-card glass-card flex flex-col justify-center border-l-4 border-l-orange-500/60 hover:scale-[1.02] transition-transform cursor-default p-4">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-1"><Compass className="w-3 h-3 text-orange-500"/> Top Searches</p>
            <div className="flex flex-wrap gap-1.5">
              {globalAnalytics.topSearches.length > 0 ? (
                globalAnalytics.topSearches.map(ts => (
                  <span key={ts.query} className="text-[9px] font-bold bg-orange-500/10 text-orange-600 px-2 py-0.5 rounded border border-orange-500/20">{ts.query}</span>
                ))
              ) : (
                <span className="text-[10px] text-muted-foreground italic">No searches yet</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Charts row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Revenue chart */}
        <div className="stat-card lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold">Mapato ya Kila Mwezi</h2>
              <p className="text-xs text-muted-foreground">Miezi 6 iliyopita</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-success">{formatTZS(totalRevenue)}</p>
              <p className="text-xs text-muted-foreground">/mwezi huu</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyRevenue} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} className="text-muted-foreground" />
              <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(value: number) => [formatTZS(value), "Mapato"]}
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
              />
              <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Plan distribution donut */}
        <div className="stat-card">
          <h2 className="text-base font-semibold mb-4">Usambazaji wa Mipango</h2>
          {planDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={planDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {planDistribution.map((entry, i) => (
                    <Cell key={i} fill={PLAN_COLORS[entry.name] || "#6366f1"} />
                  ))}
                </Pie>
                <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs capitalize">{v}</span>} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[200px]">
              <p className="text-sm text-muted-foreground">Hakuna data bado</p>
            </div>
          )}
        </div>
      </div>

      {/* Stuck Users */}
      {stuckUsers.length > 0 && (
        <div className="stat-card">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Watumiaji Waliokwama</h2>
              <p className="text-xs text-muted-foreground">
                Walisajili zaidi ya siku 7 lakini hawajafungua duka — wanahitaji msaada
              </p>
            </div>
            <span className="ml-auto text-lg font-black text-destructive">{stuckUsers.length}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground text-xs">
                  <th className="pb-2 font-medium">Jina</th>
                  <th className="pb-2 font-medium">Email</th>
                  <th className="pb-2 font-medium">Alijisajili</th>
                </tr>
              </thead>
              <tbody>
                {stuckUsers.slice(0, 10).map((u) => {
                  const created = toSafeDate(u.createdAt);
                  const createdStr = created ? created.toLocaleDateString() : "—";
                  return (
                    <tr key={u.id} className="border-b last:border-0">
                      <td className="py-2 font-medium">{u.displayName}</td>
                      <td className="py-2 text-muted-foreground">{u.email}</td>
                      <td className="py-2 text-muted-foreground text-xs">{createdStr}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {stuckUsers.length > 10 && (
              <p className="text-xs text-center text-muted-foreground mt-3">+{stuckUsers.length - 10} zaidi</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
