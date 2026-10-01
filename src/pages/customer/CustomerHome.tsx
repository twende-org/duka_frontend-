import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAppSelector } from "@/store/hooks";
import { ShoppingBag, Heart, MapPin, Receipt, ArrowRight, User, Gift, Building, TrendingUp, Zap, Store, ChevronRight } from "lucide-react";
import SEO from "@/components/SEO";
import { getAddresses } from "@/lib/api/domains/addresses";
import { getCustomerOrders, getCustomerReceipts } from "@/lib/api/domains/portal";
import { getWishlistItems } from "@/lib/services/wishlistService";
import { motion } from "framer-motion";
import { useI18n } from "@/lib/i18n";

const fadeUp = (i: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.38, ease: "easeOut" as const } },
});

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-muted/60 ${className ?? ""}`} />;
}

export default function CustomerHome() {
  const user = useAppSelector((s) => s.auth.user);
  const { lang } = useI18n();
  const [counts, setCounts] = useState({ orders: 0, receipts: 0, wishlist: 0, addresses: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }
    let cancelled = false;
    const countRows = (source: Promise<unknown[]>) =>
      source.then((rows) => rows.length).catch(() => 0);
    const load = async () => {
      const [orders, receipts, wishlist, addresses] = await Promise.all([
        countRows(getCustomerOrders(user.id)),
        countRows(getCustomerReceipts(user.id)),
        countRows(getWishlistItems()),
        countRows(getAddresses(user.id)),
      ]);
      if (cancelled) return;
      setCounts({ orders, receipts, wishlist, addresses });
      setLoading(false);
    };
    void load();
    return () => { cancelled = true; };
  }, [user?.id]);

  const sw = lang === "sw";
  const isWholesale = user?.businessProfile?.status === "APPROVED";
  const firstName = user?.displayName?.split(" ")[0] || (sw ? "Mteja" : "Customer");

  const stats = [
    { label: sw ? "Oda Zangu" : "Orders",    sub: sw ? "Maombi ya ununuzi"     : "Purchase history",     val: counts.orders,    icon: ShoppingBag, path: "/customer/orders",    from: "hsl(var(--primary))", to: "hsl(var(--primary))", iconBg: "bg-primary/10", iconTxt: "text-primary" },
    { label: sw ? "Risiti"    : "Receipts",  sub: sw ? "Manunuzi yaliyolipwa" : "Paid purchases",       val: counts.receipts,  icon: Receipt,     path: "/customer/receipts",  from: "hsl(var(--primary))", to: "hsl(var(--primary))", iconBg: "bg-primary/10", iconTxt: "text-primary" },
    { label: "Wishlist",                     sub: sw ? "Zilizohifadhiwa"       : "Saved items",          val: counts.wishlist,  icon: Heart,       path: "/customer/wishlist",  from: "hsl(var(--primary))", to: "hsl(var(--primary))", iconBg: "bg-primary/10", iconTxt: "text-primary" },
    { label: sw ? "Anwani"    : "Addresses", sub: sw ? "Maeneo ya uwasilishaji": "Delivery locations",   val: counts.addresses, icon: MapPin,      path: "/customer/addresses", from: "hsl(var(--primary))", to: "hsl(var(--primary))", iconBg: "bg-primary/10", iconTxt: "text-primary" },
  ];

  return (
    <div className="space-y-4">
      <SEO title={sw ? "Dashibodi — Twende Duka" : "Dashboard — Twende Duka"} description="" />

      {/* ── HERO ─────────────────────────────────── */}
      <motion.div {...fadeUp(0)}>
        <div className="relative overflow-hidden rounded-3xl">
          {/* Brand primary gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-primary/80" />
          {/* Dot pattern */}
          <div className="absolute inset-0 opacity-[0.08]"
            style={{ backgroundImage: "radial-gradient(circle at 2px 2px, white 1.5px, transparent 0)", backgroundSize: "20px 20px" }} />
          {/* Decorative blob */}
          <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -left-8 bottom-0 h-32 w-32 rounded-full bg-black/10 blur-2xl" />
          {/* Big icon watermark */}
          <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-[0.06]">
            <ShoppingBag className="h-32 w-32 text-white" />
          </div>

          <div className="relative px-5 py-6 sm:px-8 sm:py-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-white text-[11px] font-bold mb-3">
              <span className="h-1.5 w-1.5 rounded-full bg-green-300 animate-pulse" />
              {isWholesale ? (sw ? "Akaunti ya Jumla" : "Wholesale Account") : (sw ? "Lango la Mteja" : "Customer Portal")}
            </div>

            {/* Greeting */}
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight tracking-tight">
              {sw ? `Karibu, ${firstName}! 👋` : `Hi, ${firstName}! 👋`}
            </h1>
            <p className="text-sm text-white/70 mt-1">
              {isWholesale
                ? user?.businessProfile?.companyName
                : (sw ? "Hapa ni lango lako la manunuzi" : "Your personal shopping portal")}
            </p>

            {/* CTA button */}
            <Link to="/explore" className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 rounded-2xl bg-white text-primary font-bold text-sm shadow-lg hover:bg-white/90 active:scale-95 transition-all">
              <Store className="h-4 w-4" />
              {sw ? "Vinjari Maduka" : "Browse Shops"}
              <ChevronRight className="h-4 w-4" />
            </Link>

            {/* Wholesale credit strip */}
            {isWholesale && user?.businessProfile && (
              <div className="flex gap-6 mt-5 pt-4 border-t border-white/20">
                <div>
                  <p className="text-[10px] font-bold text-white/60 uppercase tracking-wider">{sw ? "Ukomo wa Mkopo" : "Credit Limit"}</p>
                  <p className="text-lg font-black text-white">{(user.businessProfile.creditLimit ?? 0).toLocaleString()} <span className="text-xs font-normal opacity-60">TZS</span></p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-white/60 uppercase tracking-wider">{sw ? "Salio" : "Balance"}</p>
                  <p className="text-lg font-black text-green-300">{(user.businessProfile.creditBalance ?? 0).toLocaleString()} <span className="text-xs font-normal opacity-60">TZS</span></p>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* ── STAT CARDS ──────────────────────────── */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[110px]" />)
          : stats.map((s, i) => {
              const Icon = s.icon;
              return (
                <motion.div key={s.path} {...fadeUp(i + 1)}>
                  <Link to={s.path} className="block group active:scale-[0.97] transition-transform">
                    <div className="relative bg-card rounded-2xl border border-border/50 p-3.5 sm:p-4 h-full overflow-hidden hover:border-primary/20 hover:shadow-md transition-all">
                      {/* Top color stripe */}
                      <div className="absolute top-0 inset-x-0 h-[3px] rounded-t-2xl" style={{ background: `linear-gradient(90deg, ${s.from}, ${s.to})` }} />

                      <div className="flex items-start justify-between mt-1 mb-2.5">
                        <div className={`h-9 w-9 sm:h-10 sm:w-10 rounded-xl flex items-center justify-center shrink-0 ${s.iconBg} group-hover:scale-105 transition-transform`}>
                          <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${s.iconTxt}`} />
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                      </div>
                      <p className="text-2xl sm:text-3xl font-black text-foreground leading-none">{s.val}</p>
                      <p className="text-[11px] sm:text-xs font-bold text-foreground mt-1 leading-tight">{s.label}</p>
                      <p className="text-[10px] text-muted-foreground leading-tight mt-0.5 hidden sm:block">{s.sub}</p>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
      </div>

      {/* ── QUICK LINKS ROW ─────────────────────── */}
      <motion.div {...fadeUp(5)} className="grid grid-cols-2 gap-2.5">
        <Link to="/explore"
          className="group flex items-center gap-3 p-3.5 rounded-2xl bg-card border border-border/50 hover:border-primary/20 hover:bg-primary/5 transition-all active:scale-[0.98]">
          <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 group-hover:scale-105 transition-transform">
            <Store className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-foreground">{sw ? "Vinjari Maduka" : "Browse Shops"}</p>
            <p className="text-[10px] text-muted-foreground">{sw ? "Tafuta bidhaa" : "Find products"}</p>
          </div>
        </Link>

        <Link to="/customer/profile"
          className="group flex items-center gap-3 p-3.5 rounded-2xl bg-card border border-border/50 hover:border-primary/20 transition-all active:scale-[0.98]">
          <div className="h-9 w-9 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 group-hover:scale-105 transition-transform">
            <User className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-foreground">{sw ? "Wasifu Wangu" : "My Profile"}</p>
            <p className="text-[10px] text-muted-foreground">{sw ? "Taarifa za akaunti" : "Account details"}</p>
          </div>
        </Link>
      </motion.div>

      {/* ── REWARDS PROMO ───────────────────────── */}
      <motion.div {...fadeUp(6)}>
        <div className="relative overflow-hidden rounded-2xl border border-primary/20">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-primary/10" />
          <div className="absolute right-0 top-0 h-full w-32 opacity-10">
            <Gift className="h-full w-full text-primary p-4" />
          </div>
          <div className="relative flex items-center gap-4 p-4">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-white shadow-md shadow-primary/30 shrink-0">
              <Gift className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground leading-tight">
                {sw ? "Zawadi & Ofa Maalum" : "Rewards & Special Offers"}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {sw ? "Hivi karibuni — Pata pointi kwa kila ununuzi!" : "Coming soon — Earn points on every purchase!"}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <div className="flex-1 h-1.5 rounded-full bg-primary/20">
                  <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-primary/80 to-primary" />
                </div>
                <span className="text-[10px] font-black text-primary">33%</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── WHOLESALE CTA ───────────────────────── */}
      {user && !user.businessProfile && (
        <motion.div {...fadeUp(7)}>
          <div className="flex items-center gap-3 p-4 rounded-2xl border border-dashed border-primary/30 bg-primary/[0.03]">
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-white shrink-0 shadow-md shadow-primary/20">
              <Building className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground">{sw ? "Fungua Akaunti ya Jumla" : "Open Wholesale Account"}</p>
              <p className="text-[11px] text-muted-foreground">{sw ? "Pata bei ya jumla na mkopo wa biashara" : "Get wholesale prices & business credit"}</p>
            </div>
            <Link to="/customer/profile"
              className="shrink-0 flex items-center gap-1 px-3 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 active:scale-95 transition-all shadow-md shadow-primary/20">
              <TrendingUp className="h-3.5 w-3.5" />
              {sw ? "Omba" : "Apply"}
            </Link>
          </div>
        </motion.div>
      )}
    </div>
  );
}
