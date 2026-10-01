import { useState, useEffect, useMemo, useRef } from "react";
import { Link, useLocation, useNavigate, Outlet, Navigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Store, ChevronDown, ChevronRight, ShieldAlert, Shield, LogOut, Menu, X,
  Loader2, MessageCircle, TestTube2, HelpCircle, Compass, GitBranch, Search, ShoppingBag
} from "lucide-react";

import NotificationBell from "@/components/NotificationBell";
import { cn } from "@/lib/utils";
import Logo from "@/components/common/Logo";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchShops, setCurrentShop } from "@/store/shopsSlice";
import { fetchBranches, setCurrentBranch } from "@/store/branchesSlice";
import { logoutUser } from "@/store/authSlice";
import { useUserRole } from "@/hooks/useUserRole";
import { useI18n } from "@/lib/i18n";
import LanguageToggle from "@/components/LanguageToggle";
import { type AppRole, hasMerchantCapability, hasStaffCapability } from "@/types";
import { ThemeToggle } from "@/components/theme-toggle";
import { isSystemAdmin } from "@/lib/subscription";
import InvitationAlert from "@/components/InvitationAlert";
import AnnouncementBanner from "@/components/AnnouncementBanner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AIAssistantWidget } from "@/components/dashboard/AIAssistantWidget";
import { useQuery } from "@tanstack/react-query";
import { updateMeOnApi } from "@/lib/api/domains/auth";
import { countPendingOrders } from "@/lib/api/domains/orders";
import { submitSupportTicket } from "@/lib/api/domains/support";

// Navigation config
import { navigationGroups } from "@/config/navigation";
import { PageLoader } from "@/components/common/Loader";


interface AppLayoutProps {
  children?: React.ReactNode;
}

function NavGroup({
  stepNumber,
  title,
  icon: Icon,
  items,
  location,
  setSidebarOpen,
  isExpanded,
  onToggleExpand
}: {
  stepNumber: string,
  title: string,
  icon: any,
  items: any[],
  location: any,
  setSidebarOpen: (v: boolean) => void,
  isExpanded: boolean,
  onToggleExpand: () => void
}) {
  if (items.length === 0) return null;

  const hasActiveChild = items.some((item) =>
    item.path === "/dashboard"
      ? location.pathname === "/dashboard"
      : location.pathname.startsWith(item.path)
  );

  return (
    <div className="mb-5">
      {/* Plain section header (dribbble layout: quiet label, no boxed pill) */}
      <button
        onClick={onToggleExpand}
        className={cn(
          "flex w-full items-center justify-between px-2 pb-2 text-left group",
          hasActiveChild ? "text-sidebar-foreground" : "text-sidebar-foreground/60 hover:text-sidebar-foreground"
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          {Icon && <Icon className={cn("h-3.5 w-3.5 shrink-0 transition-colors", hasActiveChild && "text-primary")} />}
          <span className="text-[11px] font-black uppercase tracking-wider truncate">{title}</span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          {items.some(i => i.badge) && (
            <span className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" />
          )}
          <motion.span animate={{ rotate: isExpanded ? 0 : -90 }} transition={{ duration: 0.2, ease: "easeOut" }}>
            <ChevronDown className="h-3.5 w-3.5 opacity-50 group-hover:opacity-100 transition-opacity" />
          </motion.span>
        </div>
      </button>

      {/* Animated accordion + left rail */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            key="items"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="relative pl-3 ml-2 border-l border-sidebar-border/70">
              {items.map((item, i) => {
                const isActive = item.path === "/dashboard"
                  ? location.pathname === "/dashboard"
                  : location.pathname.startsWith(item.path);

                return (
                  <motion.div
                    key={item.path}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03, duration: 0.2 }}
                  >
                    <Link
                      to={item.path}
                      onClick={() => setSidebarOpen(false)}
                      className={cn(
                        "group relative flex items-center justify-between rounded pl-3 pr-2.5 py-2 text-[13px] font-semibold transition-colors duration-200",
                        isActive
                          ? "text-primary bg-primary/10"
                          : "text-sidebar-foreground/75 hover:text-sidebar-foreground hover:bg-sidebar-accent/60"
                      )}
                    >
                      {/* Sliding active rail marker */}
                      {isActive && (
                        <motion.span
                          layoutId="sidebar-active-rail"
                          transition={{ type: "spring", stiffness: 500, damping: 40 }}
                          className="absolute -left-3 top-1 bottom-1 w-0.5 rounded bg-primary"
                        />
                      )}
                      <div className="flex items-center gap-2.5 min-w-0">
                        <item.icon className={cn(
                          "h-4 w-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5",
                          isActive ? "text-primary" : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground"
                        )} />
                        <span className="truncate">{item.label}</span>
                      </div>

                      {item.badge !== undefined && (
                        <span className={cn(
                          "text-[10px] font-black px-1.5 py-0.5 rounded shrink-0 ml-1.5",
                          isActive ? "bg-primary text-primary-foreground" : "bg-destructive text-destructive-foreground"
                        )}>
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


export default function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const roles = useAppSelector((s) => s.auth.roles);
  const { shops, currentShopId, initialized: shopsInitialized } = useAppSelector((s) => s.shops);
  const { branches, currentBranchId } = useAppSelector((s) => s.branches);
  const currentShop = shops.find((s) => s.id === currentShopId);
  const { role, permissions, roleRecord } = useUserRole();
  const { t, lang } = useI18n();

  const shopNeedsSetup = Boolean(currentShop && currentShop.setupStatus !== "completed");

  useEffect(() => {
    if (shopNeedsSetup) {
      navigate("/setup-business");
    }
  }, [shopNeedsSetup, navigate]);

  const visibleBranches = useMemo(() => {
    if (role === "owner") return branches;
    if (roleRecord?.assignedBranches && roleRecord.assignedBranches.length > 0) {
      return branches.filter(b => roleRecord.assignedBranches?.includes(b.id));
    }
    return branches; // fallback if no branches assigned (legacy)
  }, [branches, role, roleRecord]);



  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [shopDropdownOpen, setShopDropdownOpen] = useState(false);
  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);
  const [supportDialogOpen, setSupportDialogOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [testMode, setTestMode] = useState<{ shopId: string; shopName: string } | null>(null);
  const [navQuery, setNavQuery] = useState("");


  // Accordion open groups state
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  // Support Dialog State
  const [supportOpen, setSupportOpen] = useState(false);
  const [supportSubmitting, setSupportSubmitting] = useState(false);
  const [supportForm, setSupportForm] = useState({ category: "Bug", message: "" });

  useEffect(() => {
    if (user?.id) {
      isSystemAdmin(user.id)
        .then((ok) => {
          setIsAdmin(ok);
          setCheckingAdmin(false);
        })
        .catch(() => {
          setCheckingAdmin(false);
        });
    } else {
      setCheckingAdmin(false);
    }
    
    const testModeData = localStorage.getItem("admin_test_mode");
    if (testModeData) {
      try {
        const parsed = JSON.parse(testModeData);
        if (parsed && parsed.shopId) {
          setTestMode(parsed);
          dispatch(setCurrentShop(parsed.shopId));
        }
      } catch { /* */ }
    }
  }, [user?.id, dispatch]);

  // Badge count: polls the Django orders endpoint in place of the old live
  // subscription. The toast fires only when the count grows from a
  // non-zero baseline, so the first fetch does not announce old orders.
  const pendingOrdersQuery = useQuery({
    queryKey: ["orders", currentShopId, "pending-count"],
    queryFn: () => countPendingOrders(currentShopId as string),
    enabled: !!currentShopId,
    refetchInterval: 30000,
  });
  const pendingOrdersCount = pendingOrdersQuery.data ?? 0;
  const prevPendingOrdersRef = useRef<number | null>(null);

  useEffect(() => {
    const count = pendingOrdersQuery.data;
    if (count === undefined) return;
    const prev = prevPendingOrdersRef.current;
    prevPendingOrdersRef.current = count;
    if (prev !== null && prev !== 0 && count > prev) {
      toast.success(t("orders.newOnlineOrder"), { duration: 5000 });
    }
  }, [pendingOrdersQuery.data, t]);

  const handleExitTestMode = () => {
    localStorage.removeItem("admin_test_mode");
    setTestMode(null);
    navigate("/admin/shops");
  };

  const handleSupportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportForm.message) return;
    setSupportSubmitting(true);
    try {
      await submitSupportTicket({
        message: supportForm.message,
        category: supportForm.category,
        shopId: currentShopId || undefined,
        route: location.pathname,
      });
      toast.success("Asante! Ujumbe wako umetumwa kikamilifu.");
      setSupportOpen(false);
      setSupportForm({ category: "Bug", message: "" });
    } catch {
      toast.error("Imeshindwa kutuma ujumbe. Tafadhali jaribu tena.");
    }
    setSupportSubmitting(false);
  };

  const groupedNavItems = useMemo(() => {
    const hasShop = shops.length > 0 || testMode !== null;
    const isAuthorized = user && (hasMerchantCapability(user) || hasStaffCapability(user, roles) || isAdmin);

    if (!isAuthorized) return [];

    return navigationGroups.map((group, idx) => {
      const filteredItems = group.items.filter((item) => {
        if (item.requiredPermission && !permissions[item.requiredPermission]) return false;
        if (!role && item.path !== "/dashboard" && item.path !== "/dashboard/shops") return false;
        if (item.requiresShop && !hasShop) return false;
        return true;
      }).map((item) => {
        const translatedLabel = t(item.labelKey as any);
        const label = translatedLabel !== item.labelKey ? translatedLabel : item.defaultLabel;
        const badge = item.badgeKey === "pendingOrdersCount" && pendingOrdersCount > 0 ? pendingOrdersCount : undefined;

        return {
          ...item,
          label,
          badge,
        };
      });

      const translatedTitle = t(group.titleKey as any);
      const title = translatedTitle !== group.titleKey ? translatedTitle : group.defaultTitle;
      const stepNumber = `0${idx + 1}`;

      return {
        id: group.id,
        stepNumber,
        title,
        icon: group.icon,
        items: filteredItems,
      };
    });
  }, [role, shops.length, pendingOrdersCount, t, isAdmin, testMode]);

  // Auto-expand group containing current active route
  useEffect(() => {
    const currentPath = location.pathname;
    const activeGroup = groupedNavItems.find(g => 
      g.items.some(i => i.path === "/dashboard" ? currentPath === "/dashboard" : currentPath.startsWith(i.path))
    );
    if (activeGroup) {
      setOpenGroups(prev => ({ ...prev, [activeGroup.id]: true }));
    }
  }, [location.pathname, groupedNavItems]);

  const toggleGroupExpand = (groupId: string) => {
    setOpenGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  // Quick search filtering of nav items
  const filteredNavGroups = useMemo(() => {
    const q = navQuery.trim().toLowerCase();
    if (!q) return groupedNavItems;
    return groupedNavItems
      .map((g) => ({ ...g, items: g.items.filter((i) => i.label.toLowerCase().includes(q)) }))
      .filter((g) => g.items.length > 0);
  }, [groupedNavItems, navQuery]);



  // Find active workflow title for status banner
  const activeWorkflow = useMemo(() => {
    const currentPath = location.pathname;
    const activeGroup = groupedNavItems.find(g => 
      g.items.some(i => i.path === "/dashboard" ? currentPath === "/dashboard" : currentPath.startsWith(i.path))
    );
    return activeGroup ? `${activeGroup.stepNumber}. ${activeGroup.title}` : "1. Muhtasari";
  }, [location.pathname, groupedNavItems]);

  const roleLabels: Record<AppRole, string> = {
    owner: t("role.owner"),
    manager: t("role.manager"),
    attendant: t("role.attendant"),
  };

  useEffect(() => {
    if (user?.id) dispatch(fetchShops(user.id));
  }, [user?.id, dispatch]);

  useEffect(() => {
    if (currentShopId) dispatch(fetchBranches(currentShopId));
  }, [currentShopId, dispatch]);

  const handleLogout = async () => {
    await dispatch(logoutUser());
    navigate("/login");
  };

  // Redirect customers away from merchant panel
  const isMerchantOrStaff = user && (hasMerchantCapability(user) || hasStaffCapability(user, roles));
  if (user && !isMerchantOrStaff) {
    if (checkingAdmin) {
      return (
        <div className="flex h-screen items-center justify-center bg-background">
          <PageLoader />
        </div>
      );
    }
    if (!isAdmin) {
      return <Navigate to="/explore" replace />;
    }
  }

  // Hold the panel back until the first shops fetch settles and while the
  // current shop still owes the setup wizard: painting either first made the
  // dashboard flash before landing on /setup-business.
  if (user && (!shopsInitialized || shopNeedsSetup)) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <PageLoader />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-sidebar transition-transform duration-200 lg:static lg:translate-x-0 border-r border-sidebar-border",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex h-16 items-center gap-3 px-5 border-b border-sidebar-border">
          <div className="flex h-9 w-9 items-center justify-center rounded bg-primary/15 shadow-sm shadow-primary/5">
            <Logo size={22} className="text-primary" />
          </div>
          <span className="text-lg font-bold text-sidebar-primary-foreground">Twende Duka</span>
          <button className="ml-auto lg:hidden text-sidebar-foreground" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Shop Switcher */}
        <div className="px-3 pt-3 pb-2 space-y-2">
          <div className="relative">
            <button 
              onClick={() => shops.length > 1 && setShopDropdownOpen(!shopDropdownOpen)} 
              className={cn("flex w-full items-center gap-2 rounded bg-sidebar-accent px-3 py-2 text-sm text-sidebar-accent-foreground transition-colors", shops.length > 1 ? "hover:bg-sidebar-accent/80 cursor-pointer" : "cursor-default")}
            >
              <Store className="h-4 w-4 text-sidebar-muted" />
              <span className="flex-1 text-left truncate font-bold">{currentShop?.name || t("layout.selectShop")}</span>
              {shops.length > 1 && <ChevronDown className="h-4 w-4 text-sidebar-muted" />}
            </button>
            {shopDropdownOpen && shops.length > 1 && (
              <div className="absolute left-0 right-0 top-full mt-1 rounded border border-sidebar-border bg-sidebar shadow-lg z-10">
                {shops.map((shop) => (
                  <button key={shop.id} onClick={() => { dispatch(setCurrentShop(shop.id)); setShopDropdownOpen(false); }}
                    className={cn("flex w-full items-center gap-2 px-3 py-2.5 text-sm font-medium transition-colors first:rounded-t last:rounded-b",
                      shop.id === currentShopId ? "bg-sidebar-primary/20 text-sidebar-primary font-bold" : "text-sidebar-foreground hover:bg-sidebar-accent"
                    )}>
                    <Store className="h-4 w-4" />{shop.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Branch Switcher */}
          {visibleBranches.length > 1 && (
            <div className="relative mt-2">
              <button onClick={() => setBranchDropdownOpen(!branchDropdownOpen)} className="flex w-full items-center gap-2 rounded bg-sidebar-accent/50 px-3 py-2 text-xs text-sidebar-accent-foreground hover:bg-sidebar-accent/80 transition-colors">
                <GitBranch className="h-3.5 w-3.5 text-sidebar-muted" />
                <span className="flex-1 text-left truncate font-bold">{visibleBranches.find(b => b.id === currentBranchId)?.name || t("branches.selectBranch")}</span>
                <ChevronDown className="h-3.5 w-3.5 text-sidebar-muted" />
              </button>
              {branchDropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-1 rounded border border-sidebar-border bg-sidebar shadow-lg z-20">
                  {visibleBranches.map((branch) => (
                    <button key={branch.id} onClick={() => { dispatch(setCurrentBranch(branch.id)); setBranchDropdownOpen(false); }}
                      className={cn("flex w-full items-center gap-2 px-3 py-2 text-xs font-medium transition-colors first:rounded-t last:rounded-b",
                        branch.id === currentBranchId ? "bg-sidebar-primary/20 text-sidebar-primary font-bold" : "text-sidebar-foreground hover:bg-sidebar-accent"
                      )}>
                      <GitBranch className="h-3 w-3" />{branch.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Active Business Stage Guidance Badge */}
          <div className="px-2.5 py-1.5 rounded bg-primary/10 border border-primary/20 flex items-center justify-between text-[11px] font-bold text-primary">
            <div className="flex items-center gap-1.5 truncate">
              <Compass className="h-3.5 w-3.5 shrink-0 animate-spin-slow" />
              <span className="truncate">{activeWorkflow}</span>
            </div>
          </div>

          {/* Quick Search (dribbble layout) */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-sidebar-muted" />
            <input
              value={navQuery}
              onChange={(e) => setNavQuery(e.target.value)}
              placeholder="Tafuta menyu..."
              className="w-full rounded bg-sidebar-accent/60 border border-sidebar-border/60 pl-9 pr-3 py-2 text-xs font-semibold text-sidebar-foreground placeholder:text-sidebar-muted outline-none transition-all focus:bg-sidebar-accent focus:border-primary/40"
            />
          </div>
        </div>

        {/* Accordion Business Flow Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 custom-scrollbar">
          {filteredNavGroups.map((group) => {
            return (
              <NavGroup 

                key={group.id} 
                stepNumber={group.stepNumber}
                title={group.title!} 
                icon={group.icon!} 
                items={group.items} 
                location={location} 
                setSidebarOpen={setSidebarOpen} 
                isExpanded={!!openGroups[group.id] || !!navQuery.trim()}
                onToggleExpand={() => toggleGroupExpand(group.id)}
              />
            );
          })}
        </nav>

        {isAdmin && (
          <div className="px-3 mb-2">
            <Link to="/admin" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive bg-destructive/10 hover:bg-destructive/20 transition-colors">
              <Shield className="h-5 w-5" />Admin Panel
            </Link>
          </div>
        )}

        {/* Switch Workspace Button */}
        <div className="px-3 mb-2">
          <button 
            onClick={async () => {
              if (user?.id) {
                try {
                  await updateMeOnApi({ defaultWorkspace: "customer" });
                } catch (error) {
                  console.warn("Failed to save workspace preference", error);
                }
                navigate("/customer/home");
              }
            }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-amber-600 bg-amber-500/10 hover:bg-amber-500/20 transition-colors"
          >
            <ShoppingBag className="h-5 w-5" /> {lang === "sw" ? "Nenda Manunuzi" : "Switch to Shopping"}
          </button>
        </div>

        {/* Support Button */}
        <div className="px-3 mb-2">
          <Dialog open={supportOpen} onOpenChange={setSupportOpen}>
            <DialogTrigger asChild>
              <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-warning bg-warning/10 hover:bg-warning/20 transition-colors">
                <HelpCircle className="h-5 w-5" /> Msaada / Report
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-primary" /> Ripoti Tatizo au Omba Msaada
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSupportSubmit} className="space-y-4 mt-2">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Aina ya Tatizo</label>
                  <Select value={supportForm.category} onValueChange={(v) => setSupportForm({ ...supportForm, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Bug">Kuna kitu kimeharibika (Bug)</SelectItem>
                      <SelectItem value="Confusion">Sielewi jinsi ya kutumia</SelectItem>
                      <SelectItem value="Feature Request">Ombi la Kipengele Kipya</SelectItem>
                      <SelectItem value="Other">Mengineyo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Elezea Tatizo (kwa kina)</label>
                  <Textarea value={supportForm.message} onChange={(e) => setSupportForm({ ...supportForm, message: e.target.value })} placeholder="Andika maelezo hapa..." rows={4} required className="resize-none" />
                </div>
                <Button type="submit" className="w-full" disabled={supportSubmitting}>
                  {supportSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <MessageCircle className="h-4 w-4 mr-2" />}
                  {supportSubmitting ? "Inatuma..." : "Tuma Ujumbe"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="border-t border-sidebar-border p-3">
          {role && (
            <div className="flex items-center gap-2 px-3 py-1.5 mb-1">
              <ShieldAlert className="h-3.5 w-3.5 text-sidebar-muted" />
              <span className="text-xs font-medium text-sidebar-muted">{roleLabels[role]}</span>
            </div>
          )}
          <div 
            className="flex items-center gap-3 rounded px-3 py-2 hover:bg-sidebar-accent cursor-pointer transition-colors"
            onClick={() => navigate("/dashboard/profile")}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded bg-sidebar-primary text-sm font-bold text-sidebar-primary-foreground">
              {user?.displayName?.charAt(0)?.toUpperCase() || "?"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{user?.displayName || t("layout.user")}</p>
              <p className="text-xs text-sidebar-muted truncate">{user?.email}</p>
            </div>
            <button 
              onClick={(e) => { e.stopPropagation(); handleLogout(); }} 
              className="rounded p-1.5 hover:bg-destructive/10 hover:text-destructive transition-colors" 
              title={t("auth.logout")}
            >
              <LogOut className="h-4 w-4 text-sidebar-muted" />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden relative">
        {testMode && (
          <div className="bg-primary text-primary-foreground font-black tracking-wide text-xs px-4 py-2 flex items-center justify-center gap-4 z-50">
            <span className="flex items-center gap-2"><TestTube2 className="h-4 w-4 animate-pulse" /> ADMIN TEST MODE - PREVIEWING "{testMode.shopName}"</span>
            <Button size="sm" variant="destructive" className="h-6 text-[10px] px-2" onClick={handleExitTestMode}>EXIT TESTING</Button>
          </div>
        )}
        <header className="flex h-16 items-center gap-4 border-b border-border/60 bg-background/95 backdrop-blur-md shadow-sm px-4 lg:px-6 sticky top-0 z-30">
          <button className="lg:hidden text-foreground hover:text-primary transition-colors rounded-lg p-1.5 hover:bg-muted" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-6 w-6" />
          </button>
          
          <div className="flex-1" />
          
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LanguageToggle variant="ghost" />
            <NotificationBell />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-10 pt-6 pb-24">
          <div className="mx-auto max-w-7xl">
            <AnnouncementBanner />
            <InvitationAlert />
            {children ?? <Outlet />}
          </div>
        </main>
        
        {/* Floating AI Assistant Widget */}
        <AIAssistantWidget />
      </div>
    </div>
  );
}
