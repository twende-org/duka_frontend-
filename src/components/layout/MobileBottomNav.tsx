import { Link, useLocation } from "react-router-dom";
import { Home, Search, ShoppingBag, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { useAppSelector } from "@/store/hooks";

export default function MobileBottomNav() {
  const location = useLocation();
  const { lang } = useI18n();
  const user = useAppSelector((state) => state.auth.user);

  // Do not show on protected merchant dashboard, admin, or auth pages
  const hiddenPaths = ["/dashboard", "/admin", "/login", "/register", "/onboarding", "/setup-business", "/shop-setup"];
  if (hiddenPaths.some(path => location.pathname.startsWith(path))) {
    return null;
  }

  const navItems = [
    {
      label: lang === "sw" ? "Gundua" : "Explore",
      icon: Home,
      path: "/",
      isActive: location.pathname === "/" || location.pathname === "/explore" || location.pathname === "/marketplace",
    },
    {
      label: lang === "sw" ? "Tafuta" : "Search",
      icon: Search,
      path: "/?search=focus", 
      isActive: false,
    },
    {
      label: lang === "sw" ? "Oda" : "Orders",
      icon: ShoppingBag,
      path: "/customer/orders",
      isActive: location.pathname.startsWith("/customer/orders"),
    },
    {
      label: lang === "sw" ? "Akaunti" : "Account",
      icon: User,
      path: user ? "/customer/profile" : "/login",
      isActive: location.pathname.startsWith("/customer/profile"),
    },
  ];

  return (
    <div className="sm:hidden fixed bottom-0 left-0 right-0 z-[100] bg-background/95 backdrop-blur-xl border-t border-border/50 pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors relative",
                item.isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5 transition-transform", item.isActive && "scale-110")} />
              <span className="text-[10px] font-bold tracking-wide">{item.label}</span>
              {item.isActive && (
                <div className="absolute top-0 w-8 h-1 bg-primary rounded-b-full animate-in fade-in slide-in-from-top-1" />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
