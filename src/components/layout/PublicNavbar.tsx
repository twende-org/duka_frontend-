import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Menu, X, Compass, Zap, Heart, Store } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useI18n } from "@/lib/i18n";
import { useAppSelector } from "@/store/hooks";
import { Button } from "@/components/ui/button";
import LanguageToggle from "@/components/LanguageToggle";
import Logo from "@/components/common/Logo";
import { getWishlistItems } from "@/lib/services/wishlistService";
import { ThemeToggle } from "@/components/theme-toggle";
import { IntelligentSearchBar } from "@/components/public/IntelligentSearchBar";

export function PublicNavbar() {
  const { t } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [wishlistCount, setWishlistCount] = useState(0);

  const user = useAppSelector((s) => s.auth.user);
  const roles = useAppSelector((s) => s.auth.roles);

  useEffect(() => {
    const updateCount = async () => {
      const items = await getWishlistItems();
      setWishlistCount(items.length);
    };
    updateCount();
    window.addEventListener("wishlist_updated", updateCount);
    return () => window.removeEventListener("wishlist_updated", updateCount);
  }, [user]);
  const isMerchant = user && (roles.some((r) => r.role === "owner" || r.role === "manager" || r.role === "attendant"));
  const accountDest = isMerchant ? "/dashboard" : "/customer/profile";

  const isMarketplace = location.pathname === "/" || location.pathname.includes("/marketplace");
  const isVision = location.pathname.includes("/explore") || location.pathname.includes("/vision");
  const isWholesale = location.pathname.includes("/wholesale");

  const handleGlobalSearch = (query: string, isAiMode: boolean, isSubmit?: boolean) => {
    const base = isWholesale ? "/wholesale" : "/";
    const q = query.trim();
    const urlParams = new URLSearchParams();
    if (q) {
      urlParams.set("q", q);
      if (isAiMode) urlParams.set("ai", "true");
    }
    const url = urlParams.toString() ? `${base}?${urlParams.toString()}` : base;
    // Keystrokes replace the entry so Back isn't flooded; explicit submits push.
    navigate(url, { replace: !isSubmit });
  };


  const NavItem = ({ label, href, active }: { label: string; href: string; active: boolean }) => (
    <Link to={href} className={`relative px-3 lg:px-4 py-2 group overflow-hidden rounded-full transition-all duration-300 ${active ? "bg-primary/5" : "hover:bg-muted/50"}`}>
       <span className={`relative z-10 text-sm font-bold tracking-wide transition-colors duration-300 whitespace-nowrap ${active ? "text-primary" : "text-foreground/80 group-hover:text-foreground"}`}>{label}</span>
       {active && (
         <motion.div layoutId="navIndicator" className="absolute bottom-0 inset-x-3 lg:inset-x-4 h-[3px] bg-primary rounded-t-md" transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }} />
       )}
    </Link>
  );

  return (
    <>
      <nav className="fixed top-0 inset-x-0 z-[100] bg-background/80 backdrop-blur-xl h-16 md:h-20 flex items-center transition-all">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-full gap-4">
          <Link to="/" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 md:gap-4 shrink-0 group">
            <div className="flex h-9 w-9 md:h-11 md:w-11 items-center justify-center rounded-xl bg-primary/10 shadow-lg shadow-primary/5 transition-transform group-hover:scale-105">
              <Logo size={20} className="text-primary md:w-6 md:h-6" />
            </div>
            <div className="hidden lg:flex flex-col text-left">
              <span className="text-xl font-bold tracking-tighter text-foreground leading-none">{t("app.name")}</span>
            </div>
          </Link>

          {/* Desktop Nav Items */}
          <div className="hidden lg:flex items-center gap-1 shrink-0">
             <NavItem label={t("nav.home")} href="/" active={isMarketplace} />
             <NavItem label={t("nav.wholesale" as any)} href="/wholesale" active={isWholesale} />
             <NavItem label={t("directory.platformVision")} href="/explore" active={isVision} />
          </div>

          {/* Global Search Bar (Desktop) */}
          <div className="hidden lg:block flex-1 min-w-[16rem] w-full max-w-2xl xl:max-w-3xl mx-2 xl:mx-4">
            <IntelligentSearchBar 
              initialQuery={initialQuery}
              onSearch={handleGlobalSearch}
              compact={true}
              context={isWholesale ? "wholesale" : "marketplace"}
            />
          </div>


          {/* Actions */}
          <div className="hidden lg:flex items-center gap-2 shrink-0">
             <div className="w-px h-8 bg-border/40 mx-2 xl:mx-4" />
             <Link to="/customer/wishlist" className="relative h-10 w-10 flex items-center justify-center rounded-full text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors">
               <Heart className="h-5 w-5" />
               {wishlistCount > 0 && (
                 <span className="absolute top-1 right-1 h-4 w-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full shadow-md">
                   {wishlistCount}
                 </span>
               )}
             </Link>
             <LanguageToggle variant="ghost" className="h-9 sm:h-10 px-2 sm:px-3 rounded-full font-medium" />
             <ThemeToggle />
             <div className="flex items-center gap-3 ml-2">
                {user ? (
                  <Link to={accountDest}>
                    <Button className="font-medium text-sm h-10 px-6 rounded-full shadow-md bg-primary text-white hover:bg-primary/90">
                      {isMerchant ? "Dashboard" : "Akaunti Yangu"}
                    </Button>
                  </Link>
                ) : (
                    <Link to="/login">
                      <Button className="font-medium text-sm h-10 px-6 rounded-full shadow-md bg-primary text-white hover:bg-primary/90 transition-all">
                        {t("auth.login")} | {t("auth.registerFree")}
                      </Button>
                    </Link>
                )}
             </div>
          </div>

          {/* Mobile Menu Toggle */}
          <div className="lg:hidden flex items-center gap-2">
             <div className="lg:hidden">
               <IntelligentSearchBar
                 initialQuery={initialQuery}
                 onSearch={handleGlobalSearch}
                 compact
                 mobileTrigger
                 context={isWholesale ? "wholesale" : "marketplace"}
               />
             </div>
             <Link to="/customer/wishlist" className="relative h-10 w-10 flex items-center justify-center rounded-full text-muted-foreground hover:text-primary transition-colors">
               <Heart className="h-5 w-5" />

               {wishlistCount > 0 && (
                 <span className="absolute top-1 right-1 h-4 w-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full shadow-md">
                   {wishlistCount}
                 </span>
               )}
             </Link>
             <LanguageToggle variant="ghost" className="h-9 sm:h-10 px-2 rounded-full font-medium" />
             <ThemeToggle />
             <button 
               className="h-10 w-10 flex items-center justify-center rounded-full bg-muted/50 hover:bg-muted text-foreground transition-colors"
               onClick={() => setIsMobileMenuOpen(true)}
             >
                <Menu className="h-6 w-6" />
             </button>
          </div>
        </div>
      </nav>

      {/* Professional Mobile Menu Overlay */}
      <AnimatePresence>
         {isMobileMenuOpen && (
           <motion.div 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             className="fixed inset-0 z-[200] bg-background/80 backdrop-blur-2xl lg:hidden"
           >
              <motion.div 
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="absolute right-0 inset-y-0 w-full max-w-sm bg-white dark:bg-card shadow-2xl p-8 flex flex-col"
              >
                 <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                       <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center shadow-lg"><Logo size={22} className="text-primary" /></div>
                       <span className="font-semibold text-xl tracking-tighter">Menu</span>
                    </div>
                    <button onClick={() => setIsMobileMenuOpen(false)} className="h-12 w-12 rounded-full bg-muted flex items-center justify-center"><X className="h-6 w-6" /></button>
                 </div>

                 <div className="mb-8">
                   <IntelligentSearchBar 
                     initialQuery={initialQuery}
                     context={isWholesale ? "wholesale" : "marketplace"}
                     onSearch={(q, ai, sub) => {
                       handleGlobalSearch(q, ai, sub);
                       if (sub || q.length === 0) setIsMobileMenuOpen(false);
                     }}
                   />
                 </div>

                 <div className="flex flex-col gap-4">
                    <Link 
                      to="/"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`h-16 px-6 rounded-2xl flex items-center gap-4 transition-all ${isMarketplace ? 'bg-primary text-white shadow-xl' : 'hover:bg-muted font-bold'}`}
                    >
                       <Compass className={`h-6 w-6 ${isMarketplace ? 'text-white' : 'text-primary'}`} />
                       <span className="text-lg font-semibold">{t("nav.home")}</span>
                    </Link>
                    <Link 
                      to="/wholesale"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`h-16 px-6 rounded-2xl flex items-center gap-4 transition-all ${isWholesale ? 'bg-primary text-white shadow-xl' : 'hover:bg-muted font-bold'}`}
                    >
                       <Store className={`h-6 w-6 ${isWholesale ? 'text-white' : 'text-primary'}`} />
                       <span className="text-lg font-semibold">{t("nav.wholesaleB2B" as any)}</span>
                    </Link>
                    <Link 
                      to="/explore"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`h-16 px-6 rounded-2xl flex items-center gap-4 transition-all ${isVision ? 'bg-primary text-white shadow-xl' : 'hover:bg-muted font-bold'}`}
                    >
                       <Zap className={`h-6 w-6 ${isVision ? 'text-white' : 'text-primary'}`} />
                       <span className="text-lg font-semibold">{t("directory.platformVision")}</span>
                    </Link>
                    
                    <div className="h-px bg-border/40 my-4" />
                    
                    {user ? (
                      <Link to={accountDest} onClick={() => setIsMobileMenuOpen(false)}>
                        <Button className="w-full h-14 rounded-2xl font-bold text-lg bg-primary text-white shadow-lg shadow-primary/20">
                           {isMerchant ? "Dashibodi / Dashboard" : "Akaunti / Account"}
                        </Button>
                      </Link>
                    ) : (
                      <div className="mt-auto">
                        <Link to="/login" onClick={() => setIsMobileMenuOpen(false)}>
                           <Button className="w-full h-14 rounded-2xl font-bold shadow-lg shadow-primary/20 bg-primary text-white text-lg">
                             {t("auth.login")} | {t("auth.registerFree")}
                           </Button>
                        </Link>
                      </div>
                    )}
                 </div>
              </motion.div>
           </motion.div>
         )}
      </AnimatePresence>
    </>
  );
}
