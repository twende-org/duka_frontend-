import React, { useState } from "react";
import { Link, useLocation, useNavigate, Outlet } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { logoutUser } from "@/store/authSlice";
import { Home, ShoppingBag, Receipt, Heart, MapPin, User, LogOut, Building, Briefcase, Users, X, Globe, Store } from "lucide-react";
import { cn } from "@/lib/utils";
import Logo from "@/components/common/Logo";
import { updateMeOnApi } from "@/lib/api/domains/auth";
import InvitationAlert from "@/components/InvitationAlert";
import { motion, AnimatePresence } from "framer-motion";
import { useI18n } from "@/lib/i18n";
import { ThemeToggle } from "@/components/theme-toggle";

interface CustomerLayoutProps { children?: React.ReactNode; }

export default function CustomerLayout({ children }: CustomerLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const { shops } = useAppSelector((s) => s.shops);
  const { t, lang, toggleLang } = useI18n();

  const hasShop = shops && shops.length > 0;

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // The corporate flag rides on the Django profile in Redux, which is the
  // source of truth.
  const hasCorporate = (user as any)?.corporateProfile != null;

  const navItems = [
    { label: lang === "sw" ? "Nyumbani" : "Home",     path: "/customer",           icon: Home,       exact: true },
    { label: lang === "sw" ? "Oda"      : "Orders",   path: "/customer/orders",    icon: ShoppingBag },
    { label: lang === "sw" ? "Risiti"   : "Receipts", path: "/customer/receipts",  icon: Receipt },
    { label: "Wishlist",                               path: "/customer/wishlist",  icon: Heart },
    { label: lang === "sw" ? "Anwani"   : "Addresses",path: "/customer/addresses", icon: MapPin },
    ...(hasCorporate ? [
      { label: "B2B",                                  path: "/customer/corporate", icon: Building },
    ] : []),
  ];

  const bottomTabs = [
    { label: lang === "sw" ? "Nyumbani"  : "Home",     path: "/customer",          icon: Home,       exact: true },
    { label: lang === "sw" ? "Oda"       : "Orders",   path: "/customer/orders",   icon: ShoppingBag },
    { label: lang === "sw" ? "Risiti"    : "Receipts", path: "/customer/receipts", icon: Receipt },
    { label: "Wishlist",                                path: "/customer/wishlist", icon: Heart },
    { label: lang === "sw" ? "Zaidi"     : "More",     path: "__menu__",           icon: User },
  ];

  const handleLogout = async () => { await dispatch(logoutUser()); navigate("/explore"); };

  const isActive = (path: string, exact = false) => {
    if (exact) return location.pathname === path || location.pathname === "/customer/home";
    return location.pathname.startsWith(path) && path !== "/customer";
  };

  const initials = user?.displayName?.split(" ").slice(0,2).map(w => w[0]?.toUpperCase()).join("") || "C";

  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* ══ TOP HEADER ══════════════════════════════════════════ */}
      <header className="sticky top-0 z-[100] w-full bg-background/95 backdrop-blur-xl border-b border-border/30">
        <div className="px-4 h-14 flex items-center justify-between gap-3 max-w-7xl mx-auto">

          {/* Brand */}
          <Link to="/explore" className="flex items-center gap-2 shrink-0 group">
            <div className="h-8 w-8 rounded-xl bg-primary flex items-center justify-center shadow-md shadow-primary/30 group-hover:scale-105 transition-transform">
              <Logo size={16} className="text-white" />
            </div>
            <span className="text-sm font-black text-foreground hidden sm:block tracking-tight">Twende Duka</span>
          </Link>

          {/* Desktop nav — center */}
          <nav className="hidden lg:flex items-center gap-0.5 flex-1 justify-center">
            {navItems.map((item) => {
              const active = isActive(item.path, (item as any).exact);
              const Icon = item.icon;
              return (
                <Link key={item.path} to={item.path}
                  className={cn("flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all duration-200 whitespace-nowrap",
                    active ? "bg-primary text-white shadow-md shadow-primary/25" : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  )}>
                  <Icon className="h-3.5 w-3.5" />{item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right cluster */}
          <div className="flex items-center gap-1.5 shrink-0">
            <ThemeToggle />
            {/* Lang toggle */}
            <button onClick={toggleLang}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-border/50 text-[11px] font-bold text-muted-foreground hover:text-primary hover:border-primary/40 transition-all bg-card">
              <Globe className="h-3 w-3" />
              {lang === "sw" ? "EN" : "SW"}
            </button>

            {/* Avatar pill (desktop) */}
            {user && (
              <Link to="/customer/profile" className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border/50 hover:border-primary/30 hover:bg-muted/40 transition-all">
                <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center text-white font-black text-[10px]">{initials}</div>
                <span className="text-xs font-bold text-foreground">{user.displayName?.split(" ")[0] || "Me"}</span>
              </Link>
            )}

            {/* Switch to Selling / Open Shop (desktop) */}
            {user && (
              <button 
                onClick={async () => {
                  try {
                    await updateMeOnApi({ defaultWorkspace: "merchant" });
                  } catch (error) {
                    console.warn("Failed to save workspace preference", error);
                  }
                  navigate(hasShop ? "/dashboard" : "/onboarding");
                }}
                className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 transition-all border border-amber-500/20"
              >
                <Store className="h-3.5 w-3.5" />
                {hasShop 
                  ? (t("nav.sell" as any) || "Sell")
                  : (t("nav.openShop" as any) || "Open Shop")}
              </button>
            )}

            {/* Logout (desktop only) */}
            {user && (
              <button onClick={handleLogout}
                className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all">
                <LogOut className="h-3.5 w-3.5" />
              </button>
            )}

            {/* Hamburger (mobile/tablet, shown when not using bottom tabs) */}
            <button onClick={() => setMobileMenuOpen(o => !o)}
              className="lg:hidden flex items-center justify-center h-8 w-8 rounded-xl hover:bg-muted transition-all">
              {mobileMenuOpen
                ? <X className="h-4 w-4 text-foreground" />
                : <div className="space-y-1">
                    <span className="block h-0.5 w-4 bg-foreground rounded-full" />
                    <span className="block h-0.5 w-3 bg-muted-foreground rounded-full ml-auto" />
                    <span className="block h-0.5 w-4 bg-foreground rounded-full" />
                  </div>
              }
            </button>
          </div>
        </div>

        {/* ── Mobile slide-down menu ─────────── */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}
              className="lg:hidden overflow-hidden border-t border-border/30 bg-background/98 backdrop-blur-xl"
            >
              <div className="px-4 py-4 space-y-3 max-w-lg mx-auto">
                {/* User card */}
                {user && (
                  <Link to="/customer/profile" onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-r from-primary/8 to-orange-50 dark:to-orange-950/20 border border-primary/15">
                    <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-white font-black text-base shrink-0">{initials}</div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">{user.displayName || "Customer"}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                    <div className="ml-auto text-primary shrink-0">
                      <User className="h-4 w-4" />
                    </div>
                  </Link>
                )}

                {/* Nav grid */}
                <div className="grid grid-cols-3 gap-2">
                  {navItems.map((item) => {
                    const active = isActive(item.path, (item as any).exact);
                    const Icon = item.icon;
                    return (
                      <Link key={item.path} to={item.path} onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          "flex flex-col items-center gap-2 py-3 px-2 rounded-2xl text-[11px] font-bold transition-all border",
                          active
                            ? "bg-primary text-white border-primary shadow-lg shadow-primary/25"
                            : "bg-card text-muted-foreground border-border/40 hover:bg-muted hover:text-foreground"
                        )}>
                        <Icon className="h-5 w-5" />
                        {item.label}
                      </Link>
                    );
                  })}
                  <Link to="/explore" onClick={() => setMobileMenuOpen(false)}
                    className="flex flex-col items-center gap-2 py-3 px-2 rounded-2xl text-[11px] font-bold transition-all border bg-orange-50 dark:bg-orange-950/20 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800/40 hover:bg-orange-100">
                    <Store className="h-5 w-5" />
                    {lang === "sw" ? "Vinjari" : "Browse"}
                  </Link>
                </div>

                {/* Bottom row actions */}
                <div className="flex gap-2">
                  {user && (
                    <button 
                      onClick={async () => {
                        setMobileMenuOpen(false);
                        try {
                          await updateMeOnApi({ defaultWorkspace: "merchant" });
                        } catch (error) {
                          console.warn("Failed to save workspace preference", error);
                        }
                        navigate(hasShop ? "/dashboard" : "/onboarding");
                      }}
                      className="flex-1 flex items-center justify-center gap-2 h-11 rounded-2xl border border-amber-500/20 bg-amber-500/5 text-xs font-bold text-amber-600 hover:bg-amber-500 hover:text-white transition-all"
                    >
                      <Store className="h-4 w-4" />
                      {hasShop 
                        ? (t("nav.switchSelling" as any) || "Switch to Selling")
                        : (t("nav.openShop" as any) || "Open Shop")}
                    </button>
                  )}
                  {user && (
                    <button onClick={() => { setMobileMenuOpen(false); handleLogout(); }}
                      className="flex-1 flex items-center justify-center gap-2 h-11 rounded-2xl border border-destructive/20 bg-destructive/5 text-xs font-bold text-destructive hover:bg-destructive hover:text-white transition-all">
                      <LogOut className="h-4 w-4" />
                      {lang === "sw" ? "Ondoka" : "Logout"}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ══ MAIN CONTENT ════════════════════════════════════════ */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-5 lg:px-8 pt-4 pb-24 lg:pb-8">
        <InvitationAlert />
        {children ?? <Outlet />}
      </main>

      {/* ══ MOBILE BOTTOM TAB BAR ═══════════════════════════════ */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-[100] bg-background/96 backdrop-blur-2xl border-t border-border/20"
        style={{ boxShadow: "0 -4px 40px rgba(0,0,0,0.08)" }}>
        <div className="safe-area-bottom flex h-[60px] px-1">
          {bottomTabs.map((tab) => {
            const isMenuTab = tab.path === "__menu__";
            const active = isMenuTab
              ? mobileMenuOpen || location.pathname === "/customer/profile" || location.pathname === "/customer/addresses"
              : (tab.exact
                  ? location.pathname === tab.path || location.pathname === "/customer/home"
                  : location.pathname.startsWith(tab.path) && tab.path !== "/customer");
            const Icon = tab.icon;

            const handleTabClick = () => {
              if (isMenuTab) { setMobileMenuOpen(o => !o); return; }
              setMobileMenuOpen(false);
            };

            return isMenuTab ? (
              <button key="menu" onClick={handleTabClick} className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95">
                <div className={cn("h-9 w-9 rounded-2xl flex items-center justify-center transition-all duration-200",
                  active ? "bg-primary text-white shadow-lg shadow-primary/30 scale-110" : "text-muted-foreground")}>
                  <Icon className="h-4 w-4" />
                </div>
                <span className={cn("text-[9px] font-black tracking-wide transition-colors", active ? "text-primary" : "text-muted-foreground")}>{tab.label}</span>
              </button>
            ) : (
              <Link key={tab.path} to={tab.path} onClick={handleTabClick}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95">
                <div className={cn("h-9 w-9 rounded-2xl flex items-center justify-center transition-all duration-200",
                  active ? "bg-primary text-white shadow-lg shadow-primary/30 scale-110" : "text-muted-foreground")}>
                  <Icon className="h-4 w-4" />
                </div>
                <span className={cn("text-[9px] font-black tracking-wide transition-colors", active ? "text-primary" : "text-muted-foreground")}>{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
