import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate, Outlet } from "react-router-dom";
import {
  LayoutDashboard, Users, CreditCard, Shield, LogOut, Menu, X, ArrowLeft,
  Store, Activity, User, AlertTriangle, Megaphone, MessageCircle, Briefcase,
} from "lucide-react";
import { cn, toSafeDate } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { logoutUser } from "@/store/authSlice";
import { isSystemAdmin, getAllSubscriptions, getAllUsers } from "@/lib/subscription";
import { getAllShopsAdmin } from "@/lib/api/domains/shops";
import { getAllErrorEvents } from "@/lib/errorLogger";
import { countOpenSupportTickets } from "@/lib/api/domains/support";
import { useI18n } from "@/lib/i18n";
import LanguageToggle from "@/components/LanguageToggle";
import { Loader } from "@/components/common/Loader";

function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const { t } = useI18n();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  // Pending counts for badges
  const [pendingPayments, setPendingPayments] = useState(0);
  const [pendingShops, setPendingShops] = useState(0);
  const [pendingWholesale, setPendingWholesale] = useState(0);
  const [recentErrors, setRecentErrors] = useState(0);
  const [openTickets, setOpenTickets] = useState(0);

  useEffect(() => {
    if (!user?.id) { setAuthorized(false); return; }
    isSystemAdmin(user.id)
      .then((ok) => {
        setAuthorized(ok);
        if (ok) loadBadgeCounts();
      })
      .catch(() => setAuthorized(false));
  }, [user?.id]);

  async function loadBadgeCounts() {
    try {
      const [subs, shops, errors, users] = await Promise.all([
        getAllSubscriptions().catch(() => []),
        getAllShopsAdmin().catch(() => []),
        getAllErrorEvents(300).catch(() => []),
        getAllUsers().catch(() => []),
      ]);
      setPendingPayments(subs.filter((s: any) => s.status === "pending").length);
      setPendingShops(shops.filter((s: any) => !s.isPublic).length);
      setPendingWholesale(users.filter((u: any) => u.businessProfile?.status === "PENDING").length);
      // Errors in last 24h
      const cutoff = Date.now() - 86400000;
      setRecentErrors(
        errors.filter((e: any) => {
          const d = toSafeDate(e.createdAt);
          return d ? d.getTime() > cutoff : false;
        }).length
      );
    } catch { /* silent */ }

    // Load open tickets separately (Django owns the queue now)
    try {
      setOpenTickets(await countOpenSupportTickets());
    } catch { /* silent */ }
  }

  if (authorized === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader size={14} />
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <Shield className="mx-auto h-16 w-16 text-destructive mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">{t("admin.unauthorized")}</h1>
          <p className="text-muted-foreground mb-6">{t("admin.unauthorizedDesc")}</p>
          <Link to="/app" className="text-primary hover:underline">{t("admin.backToApp")}</Link>
        </div>
      </div>
    );
  }

  interface NavItem {
    label: string;
    icon: any;
    path: string;
    badge?: number;
  }

  const navItems: NavItem[] = [
    { label: t("admin.dashboard"), icon: LayoutDashboard, path: "/admin" },
    { label: t("admin.users"), icon: Users, path: "/admin/users" },
    { label: "B2B Approvals", icon: Briefcase, path: "/admin/wholesale", badge: pendingWholesale },
    { label: t("admin.shops"), icon: Store, path: "/admin/shops", badge: pendingShops },
    { label: t("admin.payments"), icon: CreditCard, path: "/admin/payments", badge: pendingPayments },
    { label: t("admin.activity"), icon: Activity, path: "/admin/activity" },
    { label: "Makosa ya Mfumo", icon: AlertTriangle, path: "/admin/errors", badge: recentErrors },
    { label: "Matangazo", icon: Megaphone, path: "/admin/announcements" },
    { label: "Msaada", icon: MessageCircle, path: "/admin/support", badge: openTickets },
  ];

  const handleLogout = async () => {
    await dispatch(logoutUser());
    navigate("/login");
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-sidebar transition-transform duration-200 lg:static lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex h-16 items-center gap-3 px-5 border-b border-sidebar-border">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-destructive">
            <Shield className="h-5 w-5 text-destructive-foreground" />
          </div>
          <span className="text-lg font-bold text-sidebar-primary-foreground">Admin Panel</span>
          <button className="ml-auto lg:hidden text-sidebar-foreground" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {item.badge != null && item.badge > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-black px-1">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border p-3 space-y-2">
          <Link
            to="/app"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />{t("admin.backToApp")}
          </Link>
          <div className="flex items-center gap-3 rounded-lg px-3 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive text-sm font-bold text-destructive-foreground">
              {user?.displayName?.charAt(0)?.toUpperCase() || "A"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{user?.displayName || "Admin"}</p>
              <p className="text-xs text-sidebar-muted truncate">{user?.email}</p>
            </div>
            <button onClick={handleLogout} className="rounded-lg p-1.5 hover:bg-sidebar-accent transition-colors" title={t("auth.logout")}>
              <LogOut className="h-4 w-4 text-sidebar-muted" />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center gap-4 border-b px-4 lg:px-6">
          <button className="lg:hidden text-foreground" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-6 w-6" />
          </button>
          <span className="text-sm font-medium text-destructive bg-destructive/10 px-3 py-1 rounded-full">ADMIN</span>
          <div className="flex-1" />
          <LanguageToggle variant="ghost" />
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;
