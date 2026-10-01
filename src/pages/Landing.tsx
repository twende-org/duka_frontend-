import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Store, Menu, X, BarChart3, Smartphone, Users, Package, ArrowRight, Check, ChevronDown, ChevronUp, Globe, Search, Eye, Flame, Sparkles } from "lucide-react";
import { Mail, Phone } from "lucide-react";
import { BsShop } from "react-icons/bs";

import { Button } from "@/components/ui/button";
import SEO from "@/components/SEO";
import LanguageToggle from "@/components/LanguageToggle";
import { useI18n } from "@/lib/i18n";
import Logo from "@/components/common/Logo";
import { useAppSelector } from "@/store/hooks";

import { getAllShops, getProductsByShop } from "@/lib/api/domains/storefront";
import type { Shop, Product } from "@/types";
import { DiscoveryRail } from "@/components/directory/DiscoveryRail";
import { normalizeCategories } from "@/lib/categories";

interface ShopWithProducts extends Shop {
  products: Product[];
  productCount: number;
}

export default function Landing() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const { t, lang, toggleLang } = useI18n();
  
  const user = useAppSelector((s) => s.auth.user);
  const roles = useAppSelector((s) => s.auth.roles);
  const isMerchant = !!(user && (
    user.capabilities?.canManageBusiness || 
    user.roles?.includes("merchant") || 
    user.roles?.includes("staff") || 
    roles.some((r) => r.role === "owner" || r.role === "manager" || r.role === "attendant")
  ));

  const [shops, setShops] = useState<ShopWithProducts[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const allShops = await getAllShops();
        const enriched: ShopWithProducts[] = await Promise.all(
          allShops.map(async (shop) => {
            const products = await getProductsByShop(shop.id);

            const activeProducts = (products || [])
              .filter((p) => {
                const stockQty = p.stock ?? 0;
                return (
                  p.status === "active" && 
                  p.name?.trim() !== "" && 
                  (p.sellingPrice || 0) > 0 &&
                  stockQty > 0
                );
              })
              .map((p) => ({ ...p, _stockQty: p.stock ?? 0 }));

            return { ...shop, products: activeProducts, productCount: activeProducts.length };
          })
        );
        setShops(enriched.filter(s => s.isPublic === true && s.productCount > 0));
      } catch (err) {
        console.error("Failed to load shops:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const allProductPairs = useMemo(() => shops.flatMap(shop => (shop.products || []).map(product => ({ product, shop, stockQty: (product as any)._stockQty }))), [shops]);
  const trendingItems = useMemo(() => [...allProductPairs].sort((a, b) => (b.product.sellingPrice || 0) - (a.product.sellingPrice || 0)).slice(0, 12), [allProductPairs]);
  const newArrivalItems = useMemo(() => [...allProductPairs].reverse().slice(0, 12), [allProductPairs]);

  const navLinks = [
    { label: t("nav.home"), href: "#home" },
    { label: t("nav.shops"), href: "/", isRoute: true },
    { label: t("nav.about"), href: "#about" },
    { label: t("nav.pricing"), href: "#pricing" },
    { label: t("nav.howItWorks"), href: "#how-it-works" },
    { label: t("nav.privacy"), href: "#privacy" },
  ];

  const features = [
    { icon: Package, title: t("feature.manageProducts"), desc: t("feature.manageProductsDesc") },
    { icon: Globe, title: t("feature.advertiseShop"), desc: t("feature.advertiseShopDesc") },
    { icon: BarChart3, title: t("feature.salesReports"), desc: t("feature.salesReportsDesc") },
    { icon: Search, title: t("feature.searchShops"), desc: t("feature.searchShopsDesc") },
    { icon: Users, title: t("feature.teamRoles"), desc: t("feature.teamRolesDesc") },
    { icon: Smartphone, title: t("feature.workAnywhere"), desc: t("feature.workAnywhereDesc") },
  ];

  const steps = [
    { step: "01", title: t("step.1.title"), desc: t("step.1.desc") },
    { step: "02", title: t("step.2.title"), desc: t("step.2.desc") },
    { step: "03", title: t("step.3.title"), desc: t("step.3.desc") },
    { step: "04", title: t("step.4.title"), desc: t("step.4.desc") },
  ];

  const plans = [
    {
      name: t("plan.free"), price: "0", period: "", desc: t("plan.freeDesc"),
      features: [t("plan.freeShop"), t("plan.freeProducts"), t("plan.freeOnline")],
      cta: t("plan.startFree"), highlight: false,
    },
    {
      name: t("plan.small"), price: "9,900", period: "/mwezi", desc: t("plan.smallDesc"),
      features: [t("plan.shop1"), t("plan.products50"), t("plan.onlineShop"), t("plan.basicReports")],
      cta: t("plan.startSmall"), highlight: false,
    },
    {
      name: t("plan.business"), price: "29,900", period: "/mwezi", desc: t("plan.businessDesc"),
      features: [t("plan.shops5"), t("plan.unlimitedProducts"), t("plan.staff10"), t("plan.shopsOnline"), t("plan.detailedReports"), t("plan.prioritySupport")],
      cta: t("plan.startNow"), highlight: true,
    },
    {
      name: t("plan.enterprise"), price: "79,900", period: "/mwezi", desc: t("plan.enterpriseDesc"),
      features: [t("plan.unlimitedShops"), t("plan.unlimitedProducts"), t("plan.unlimitedStaff"), "API access", t("plan.support247")],
      cta: t("plan.contactUs"), highlight: false,
    },
  ];

  const faqs = [
    { q: t("faq.1.q"), a: t("faq.1.a") },
    { q: t("faq.2.q"), a: t("faq.2.a") },
    { q: t("faq.3.q"), a: t("faq.3.a") },
    { q: t("faq.4.q"), a: t("faq.4.a") },
    { q: t("faq.5.q"), a: t("faq.5.a") },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Simamia & Tangaza Biashara Yako Mtandaoni — Twende Duka"
        description="Twende Duka ni mfumo kamili wa kusimamia duka lako na kulitangaza mtandaoni. Simamia bidhaa, mauzo, stoo na wafanyakazi — huku wateja wakikupata na kupata bidhaa zako moja kwa moja."
        keywords="duka, twende duka, twendeduka, duka smart, twendedigital, duka pos system, pos tanzania, shop management, mfumo wa duka, biashara software, inventory management, mauzo, stoo, tangaza duka, tafuta bidhaa, maduka mtandaoni"
        canonical="/nyumbani"
      />
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <Logo size={22} className="text-primary" />
            </div>
            <span className="text-xl font-extrabold text-foreground">Twende Duka</span>
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            {navLinks.map((l) =>
              l.isRoute ? (
                <Link key={l.href} to={l.href} className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">{l.label}</Link>
              ) : (
                <a key={l.href} href={l.href} className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">{l.label}</a>
              )
            )}
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <LanguageToggle variant="ghost" />
            <Link to="/login"><Button variant="ghost" size="sm">{t("auth.login")}</Button></Link>
            <Link to="/register"><Button size="sm">{t("auth.registerFree")}</Button></Link>
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <LanguageToggle variant="ghost" />
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="border-t bg-background px-4 py-4 md:hidden">
            {navLinks.map((l) =>
              l.isRoute ? (
                <Link key={l.href} to={l.href} onClick={() => setMobileMenuOpen(false)} className="block rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">{l.label}</Link>
              ) : (
                <a key={l.href} href={l.href} onClick={() => setMobileMenuOpen(false)} className="block rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">{l.label}</a>
              )
            )}
            <div className="mt-4 flex flex-col gap-2">
              <Link to="/login"><Button variant="outline" className="w-full">{t("auth.login")}</Button></Link>
              <Link to="/register"><Button className="w-full">{t("auth.registerFree")}</Button></Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section id="home" className="relative overflow-hidden py-20 sm:py-32">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,hsl(36_90%_50%/0.12),transparent_70%)]" />
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 rounded-full border bg-card px-4 py-1.5 text-sm text-muted-foreground mb-6">
            <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
            {t("landing.heroTag")}
          </div>
          <h1 className="mx-auto max-w-4xl text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            {t("landing.heroTitle1")}
            <span className="block text-primary"> {t("landing.heroTitle2")}</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">{t("landing.heroDesc")}</p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link to="/register">
              <Button size="lg" className="gap-2 text-base px-8">{t("landing.startFree")} <ArrowRight className="h-5 w-5" /></Button>
            </Link>
            <Link to="/">
              <Button variant="outline" size="lg" className="gap-2 text-base px-8"><Eye className="h-5 w-5" /> {t("landing.viewShops")}</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Marketplace Feeds */}
      <section className="border-t bg-muted/10 py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-16">
          {loading ? (
             <div className="space-y-4">
               <div className="h-8 w-48 bg-muted/60 animate-pulse rounded-lg mb-8"></div>
               <div className="flex gap-4 sm:gap-5 overflow-hidden">
                 {Array.from({ length: 5 }).map((_, i) => (
                   <div key={i} className="w-52 sm:w-60 md:w-72 shrink-0">
                     <div className="h-[320px] w-full rounded-2xl bg-card border border-border flex flex-col p-3 animate-pulse">
                       <div className="h-44 w-full bg-muted/60 rounded-xl mb-4"></div>
                       <div className="h-4 bg-muted/60 rounded-md w-3/4 mb-3"></div>
                       <div className="h-3 bg-muted/60 rounded-md w-1/2 mb-4"></div>
                       <div className="mt-auto flex justify-between items-center">
                          <div className="h-5 bg-muted/60 rounded-md w-1/3"></div>
                          <div className="h-8 w-8 bg-muted/60 rounded-full"></div>
                       </div>
                     </div>
                   </div>
                 ))}
               </div>
             </div>
          ) : (
            <>
              {trendingItems.length > 0 && (
                <DiscoveryRail 
                  title={t("directory.trendingNow") || "Trending Products"} 
                  subtitle={t("directory.popularPicks") || "Most popular items right now"} 
                  icon={Flame} 
                  items={trendingItems} 
                  isMerchant={isMerchant} 
                />
              )}
              {newArrivalItems.length > 0 && (
                <DiscoveryRail 
                  title={t("directory.vision.43") || "New Arrivals"} 
                  subtitle={t("directory.vision.44") || "Fresh products on the market"} 
                  icon={Sparkles} 
                  items={newArrivalItems} 
                  isMerchant={isMerchant} 
                />
              )}
            </>
          )}
        </div>
      </section>

      {/* Features */}
      <section id="about" className="border-t py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground sm:text-4xl">{t("landing.featuresTitle")}</h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">{t("landing.featuresDesc")}</p>
          </div>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="stat-card group">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-foreground">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="border-t bg-muted/30 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground sm:text-4xl">{t("landing.howItWorksTitle")}</h2>
            <p className="mt-4 text-lg text-muted-foreground">{t("landing.howItWorksDesc")}</p>
          </div>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s) => (
              <div key={s.step} className="relative text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground text-2xl font-extrabold">{s.step}</div>
                <h3 className="text-lg font-bold text-foreground">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground sm:text-4xl">{t("landing.pricingTitle")}</h2>
            <p className="mt-4 text-lg text-muted-foreground">{t("landing.pricingDesc")}</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 max-w-6xl mx-auto">
            {plans.map((p) => (
              <div key={p.name} className={`stat-card flex flex-col ${p.highlight ? "ring-2 ring-primary relative" : ""}`}>
                {p.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-bold text-primary-foreground">{t("landing.popular")}</div>
                )}
                <h3 className="text-xl font-bold text-foreground">{p.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{p.desc}</p>
                <div className="mt-6">
                  <span className="text-4xl font-extrabold text-foreground">TZS {p.price}</span>
                  <span className="text-muted-foreground">{p.period}</span>
                </div>
                <ul className="mt-6 flex-1 space-y-3">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground"><Check className="h-4 w-4 text-accent" /> {f}</li>
                  ))}
                </ul>
                <Link to="/register" className="mt-8">
                  <Button className="w-full" variant={p.highlight ? "default" : "outline"}>{p.cta}</Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t bg-muted/30 py-20">
        <div className="mx-auto max-w-3xl px-4">
          <h2 className="text-3xl font-bold text-foreground text-center mb-12">{t("landing.faqTitle")}</h2>
          <div className="space-y-3">
            {faqs.map((f, i) => (
              <div key={i} className="stat-card">
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="flex w-full items-center justify-between text-left">
                  <span className="font-semibold text-foreground">{f.q}</span>
                  {openFaq === i ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
                </button>
                {openFaq === i && <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{f.a}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Privacy */}
      <section id="privacy" className="border-t py-20 sm:py-28">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="text-3xl font-bold text-foreground mb-8">{t("privacy.title")}</h2>
          <div className="prose prose-sm text-muted-foreground space-y-6">
            {[1, 2, 3, 4, 5].map((n) => (
              <div key={n}>
                <h3 className="text-lg font-semibold text-foreground">{t(`privacy.section${n}.title` as any)}</h3>
                <p>{t(`privacy.section${n}.desc` as any)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Luxury Global Footer */}
      <footer className="bg-sidebar py-16 text-white overflow-hidden relative mt-20 border-t border-white/5">
        <div className="absolute top-0 right-0 h-[500px] w-[500px] bg-primary/10 blur-[150px] rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        <div className="mx-auto max-w-[1600px] px-6 lg:px-10 relative z-10 space-y-12">
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
              <div className="space-y-6 text-center lg:text-left">
                 <div className="flex items-center justify-center lg:justify-start gap-4">
                    <div className="h-12 w-12 flex items-center justify-center rounded-2xl bg-primary/15 ring-1 ring-primary/20 shadow-xl"><Logo size={26} className="text-primary" /></div>
                    <span className="text-2xl font-black tracking-tighter">Twende Duka</span>
                  </div>
                  <p className="text-base text-sidebar-muted max-w-md font-medium leading-relaxed mx-auto lg:mx-0">{t("footer.tagline")}</p>
              </div>
              <div className="grid grid-cols-2 gap-8 text-center lg:text-left">
                 <div className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">{t("footer.platform")}</h4>
                    <ul className="space-y-3 font-bold text-sidebar-muted text-sm">
                       <li><Link to="/" className="hover:text-white transition-colors">{t("footer.marketplace")}</Link></li>
                       <li><a href="#about" className="hover:text-white transition-colors">{t("nav.about")}</a></li>
                    </ul>
                 </div>
                 <div className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">{t("footer.business")}</h4>
                    <ul className="space-y-3 font-bold text-sidebar-muted text-sm">
                       <li><Link to="/login" className="hover:text-white transition-colors">{t("footer.login")}</Link></li>
                       <li><Link to="/register" className="hover:text-white transition-colors">{t("footer.register")}</Link></li>
                    </ul>
                 </div>
              </div>
           </div>
           <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
              <p className="text-[10px] uppercase tracking-[0.3em] opacity-40 font-black">© {new Date().getFullYear()} Twende Digital Ltd.</p>
              <div className="flex gap-8">
                 <button onClick={() => toggleLang()} className="text-[10px] font-black uppercase tracking-[0.3em] hover:text-primary transition-colors">{lang === 'sw' ? 'English' : 'Kiswahili'}</button>
              </div>
           </div>
        </div>
      </footer>
    </div>
  );
}
