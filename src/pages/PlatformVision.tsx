import { Link, useNavigate } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import SEO from "@/components/SEO";
import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { PublicFooter } from "@/components/layout/PublicFooter";
import {
  Store,
  X,
  Check,
  Users,
  ArrowRight,
  ChevronDown,
  Sparkles,
  Globe,
  Smartphone,
  Package,
  Flame,
  BarChart3,
  Search,
  Compass,
  ShoppingBag,
  MapPin,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";

export default function PlatformVision() {
  const { t } = useI18n();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen text-foreground selection:bg-primary/30 relative bg-background">
      <SEO 
        title={`${t("directory.platformVision")} | Twende Duka`} 
        description="Twende Duka is a complete commerce ecosystem connecting customers and businesses through our digital marketplace, business management tools, and online selling capabilities." 
        canonical="/" 
      />

      <PublicNavbar />

      <main className="pt-16 md:pt-20">
        <div className="bg-background min-h-screen pb-20">
          {/* 1. Hero Section */}
          <section className="relative overflow-hidden py-24 bg-gradient-to-br from-primary/10 via-background to-primary/5 px-6 border-b border-border/40">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-primary/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3" />
              <div className="absolute bottom-0 left-0 w-[40rem] h-[40rem] bg-blue-500/10 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/3" />
            </div>
            <div className="mx-auto max-w-4xl text-center relative z-10">
              <Badge className="mb-8 bg-primary/10 text-primary hover:bg-primary/20 border-primary/20 rounded-full px-4 py-1.5 shadow-sm text-xs font-bold uppercase tracking-widest">
                {t("directory.vision.0")}
              </Badge>
              <h2 className="text-4xl md:text-6xl font-semibold tracking-tight mb-8 leading-[1.1]">
                {t("directory.vision.1")} <span className="text-primary">{t("directory.vision.2")}</span>
              </h2>
              <p className="text-lg md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-12 font-medium leading-relaxed">
                {t("directory.vision.subText")}
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                 <Button variant="outline" className="w-full sm:w-auto rounded-full h-14 px-10 font-medium text-[15px] shadow-sm transition-all hover:scale-105 active:scale-95 border-primary text-primary hover:bg-primary hover:text-white" onClick={() => navigate("/")}>
                   {t("directory.vision.3")}
                 </Button>
                 <Link to="/register" className="w-full sm:w-auto">
                   <Button className="w-full rounded-full h-14 px-10 font-medium text-[15px] shadow-lg shadow-primary/20 bg-primary text-white hover:bg-primary/90 transition-all hover:scale-105 active:scale-95">
                     {t("directory.vision.4")}
                   </Button>
                 </Link>
              </div>
            </div>
          </section>

          {/* 2. The Problem We Solve */}
          <section className="py-24 px-4 sm:px-8">
            <div className="mx-auto max-w-7xl">
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl font-semibold mb-6">{t("directory.vision.5")}</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="p-10 rounded-3xl bg-muted/30 border border-border/50 hover:border-border transition-colors">
                   <h3 className="text-2xl font-semibold mb-6 flex items-center gap-3"><Store className="h-6 w-6 text-primary" /> {t("directory.vision.6")}</h3>
                   <ul className="space-y-4">
                     <li className="flex items-start gap-3"><X className="h-5 w-5 text-destructive shrink-0 mt-0.5" /> <span className="text-muted-foreground font-medium">{t("directory.vision.7")}</span></li>
                     <li className="flex items-start gap-3"><X className="h-5 w-5 text-destructive shrink-0 mt-0.5" /> <span className="text-muted-foreground font-medium">{t("directory.vision.8")}</span></li>
                   </ul>
                   <div className="mt-8 pt-8 border-t border-border/50">
                     <p className="font-semibold text-primary flex items-start gap-3"><Check className="h-5 w-5 shrink-0 mt-0.5" /> {t("directory.vision.9")}</p>
                   </div>
                </div>
                <div className="p-10 rounded-3xl bg-muted/30 border border-border/50 hover:border-border transition-colors">
                   <h3 className="text-2xl font-semibold mb-6 flex items-center gap-3"><Users className="h-6 w-6 text-primary" /> {t("directory.vision.10")}</h3>
                   <ul className="space-y-4">
                     <li className="flex items-start gap-3"><X className="h-5 w-5 text-destructive shrink-0 mt-0.5" /> <span className="text-muted-foreground font-medium">{t("directory.vision.11")}</span></li>
                     <li className="flex items-start gap-3"><X className="h-5 w-5 text-destructive shrink-0 mt-0.5" /> <span className="text-muted-foreground font-medium">{t("directory.vision.12")}</span></li>
                   </ul>
                   <div className="mt-8 pt-8 border-t border-border/50">
                     <p className="font-semibold text-primary flex items-start gap-3"><Check className="h-5 w-5 shrink-0 mt-0.5" /> {t("directory.vision.13")}</p>
                   </div>
                </div>
              </div>
            </div>
          </section>

          {/* 3. Twende Duka Ecosystem */}
          <section className="py-24 bg-card px-4 sm:px-8 border-y border-border/50">
            <div className="mx-auto max-w-5xl text-center">
              <h2 className="text-3xl md:text-4xl font-semibold mb-16">{t("directory.vision.14")}</h2>
              <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-4">
                 <div className="flex flex-col items-center text-center max-w-[200px]">
                   <div className="h-20 w-20 rounded-full bg-secondary flex items-center justify-center mb-6 shadow-sm"><Users className="h-8 w-8 text-secondary-foreground" /></div>
                   <h3 className="font-semibold text-xl mb-2">{t("directory.vision.15")}</h3>
                   <p className="text-sm text-muted-foreground font-medium">{t("directory.vision.16")}</p>
                 </div>
                 
                 <div className="hidden md:flex flex-col items-center px-4 text-muted-foreground">
                   <ArrowRight className="h-8 w-8 mb-2" />
                 </div>
                 <div className="md:hidden flex flex-col items-center py-4 text-muted-foreground">
                   <ChevronDown className="h-8 w-8" />
                 </div>

                 <div className="flex flex-col items-center text-center max-w-[250px] relative z-10">
                   <div className="h-24 w-24 rounded-full bg-primary flex items-center justify-center mb-6 shadow-xl shadow-primary/30 ring-8 ring-primary/10"><Sparkles className="h-10 w-10 text-white" /></div>
                   <h3 className="font-semibold text-2xl mb-2 text-primary">Twende Duka</h3>
                   <p className="text-sm text-muted-foreground font-medium">{t("directory.vision.17")}</p>
                 </div>

                 <div className="hidden md:flex flex-col items-center px-4 text-muted-foreground">
                   <ArrowRight className="h-8 w-8 mb-2" />
                 </div>
                 <div className="md:hidden flex flex-col items-center py-4 text-muted-foreground">
                   <ChevronDown className="h-8 w-8" />
                 </div>

                 <div className="flex flex-col items-center text-center max-w-[200px]">
                   <div className="h-20 w-20 rounded-full bg-secondary flex items-center justify-center mb-6 shadow-sm"><Store className="h-8 w-8 text-secondary-foreground" /></div>
                   <h3 className="font-semibold text-xl mb-2">{t("directory.vision.18")}</h3>
                   <p className="text-sm text-muted-foreground font-medium">{t("directory.vision.19")}</p>
                 </div>
              </div>
            </div>
          </section>

          {/* 4. Business Growth Features */}
          <section className="py-24 px-4 sm:px-8">
            <div className="mx-auto max-w-7xl">
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl font-semibold mb-6">{t("directory.vision.20")}</h2>
                <p className="text-muted-foreground font-medium max-w-2xl mx-auto text-lg">{t("directory.vision.21")}</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  { icon: Globe, title: "Digital Store", desc: "A beautiful, customizable online storefront to showcase your brand." },
                  { icon: Smartphone, title: "POS & Sales", desc: "Process in-store and online sales seamlessly from any device." },
                  { icon: Package, title: "Inventory Management", desc: "Track stock levels, get low-stock alerts, and manage variations." },
                  { icon: Users, title: "Customer Management", desc: "Build relationships with a built-in CRM and customer history." },
                  { icon: Flame, title: "Marketing & Social", desc: "Promote products directly to the marketplace feed and social channels." },
                  { icon: BarChart3, title: "AI Business Intelligence", desc: "Smart reports, sales forecasting, and actionable insights." }
                ].map((f, i) => (
                  <div key={i} className="p-8 rounded-3xl bg-card border border-border/50 hover:shadow-lg transition-all duration-300 group">
                    <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-6 group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all duration-300"><f.icon className="h-6 w-6" /></div>
                    <h3 className="text-xl font-semibold mb-3">{f.title}</h3>
                    <p className="text-muted-foreground font-medium leading-relaxed">{f.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* 5. Customer Experience Section */}
          <section className="py-24 bg-muted/20 px-6 mx-4 sm:mx-8 rounded-3xl">
            <div className="mx-auto max-w-7xl">
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl font-semibold mb-6">{t("directory.vision.22")}</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                 {[
                   { icon: Search, title: "Discover", desc: "Find exactly what you need with smart search." },
                   { icon: Compass, title: "Explore", desc: "Browse trusted shops and verified reviews." },
                   { icon: ShoppingBag, title: "Order", desc: "Place orders securely and seamlessly." },
                   { icon: MapPin, title: "Track", desc: "Follow your purchase from store to door." }
                 ].map((s, i) => (
                   <div key={i} className="relative text-center">
                     <div className="h-20 w-20 mx-auto rounded-full bg-card border shadow-sm flex items-center justify-center text-primary mb-6 relative z-10"><s.icon className="h-8 w-8" /></div>
                     {i < 3 && <div className="hidden md:block absolute top-10 left-1/2 w-full h-[2px] bg-border -z-0" />}
                     <h3 className="text-xl font-semibold mb-2">{s.title}</h3>
                     <p className="text-muted-foreground font-medium">{s.desc}</p>
                   </div>
                 ))}
              </div>
            </div>
          </section>

          {/* 6. Supported Business Types */}
          <section className="py-24 px-4 sm:px-8">
            <div className="mx-auto max-w-5xl text-center">
              <h2 className="text-3xl md:text-4xl font-semibold mb-12">{t("directory.vision.23")}</h2>
              <div className="flex flex-wrap justify-center gap-4">
                 {["Retail Stores", "Wholesalers", "Resellers", "Distributors", "Corporate Buyers", "Independent Creators", "Supermarkets", "Fashion Boutiques"].map((type, i) => (
                   <div key={i} className="px-6 py-3 rounded-full bg-secondary text-secondary-foreground font-semibold shadow-sm border hover:border-primary transition-colors cursor-default">
                     {type}
                   </div>
                 ))}
              </div>
              <p className="mt-8 text-muted-foreground font-medium max-w-2xl mx-auto">
                {t("directory.vision.24")}
              </p>
            </div>
          </section>

          {/* 7. How It Works */}
          <section className="py-24 bg-card px-4 sm:px-8 border-y border-border/50">
            <div className="mx-auto max-w-6xl">
              <h2 className="text-3xl md:text-4xl font-semibold mb-16 text-center">{t("directory.vision.25")}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
                 {/* Merchant Flow */}
                 <div>
                   <h3 className="text-2xl font-bold mb-8 flex items-center gap-3 text-primary"><Store className="h-6 w-6" /> {t("directory.vision.26")}</h3>
                   <div className="space-y-8">
                     {[
                       { step: "1", title: "Register", desc: "Create your free business account." },
                       { step: "2", title: "Create Shop", desc: "Set up your digital storefront and branding." },
                       { step: "3", title: "Add Products", desc: "Upload your inventory with prices and details." },
                       { step: "4", title: "Sell & Grow", desc: "Process orders, manage customers, and view analytics." }
                     ].map((item, i) => (
                       <div key={i} className="flex gap-6 relative group">
                         <div className="h-10 w-10 shrink-0 rounded-full bg-primary text-white flex items-center justify-center font-bold relative z-10">{item.step}</div>
                         {i < 3 && <div className="absolute top-10 left-5 bottom-[-2rem] w-[2px] bg-border group-hover:bg-primary/20 transition-colors" />}
                         <div>
                           <h4 className="text-lg font-semibold mb-1">{item.title}</h4>
                           <p className="text-muted-foreground font-medium">{item.desc}</p>
                         </div>
                       </div>
                     ))}
                   </div>
                 </div>
                 {/* Customer Flow */}
                 <div>
                   <h3 className="text-2xl font-bold mb-8 flex items-center gap-3 text-primary"><Users className="h-6 w-6" /> {t("directory.vision.27")}</h3>
                   <div className="space-y-8">
                     {[
                       { step: "1", title: "Discover", desc: "Browse the marketplace for products or specific shops." },
                       { step: "2", title: "Shop", desc: "Add items to your cart or save them to your wishlist." },
                       { step: "3", title: "Order", desc: "Checkout securely and communicate with the seller." },
                       { step: "4", title: "Receive", desc: "Get your products and leave verified reviews." }
                     ].map((item, i) => (
                       <div key={i} className="flex gap-6 relative group">
                         <div className="h-10 w-10 shrink-0 rounded-full bg-secondary text-secondary-foreground border flex items-center justify-center font-bold relative z-10">{item.step}</div>
                         {i < 3 && <div className="absolute top-10 left-5 bottom-[-2rem] w-[2px] bg-border group-hover:bg-secondary/50 transition-colors" />}
                         <div>
                           <h4 className="text-lg font-semibold mb-1">{item.title}</h4>
                           <p className="text-muted-foreground font-medium">{item.desc}</p>
                         </div>
                       </div>
                     ))}
                   </div>
                 </div>
              </div>
            </div>
          </section>

          {/* 8. Trust / Why Twende Duka */}
          <section className="py-24 px-4 sm:px-8">
            <div className="mx-auto max-w-7xl">
               <h2 className="text-3xl md:text-4xl font-semibold mb-12 text-center">{t("directory.vision.28")}</h2>
               <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                 {[
                   { icon: ShieldCheck, title: "Trusted Network", desc: "Verified businesses and secure transactions." },
                   { icon: Smartphone, title: "Mobile First", desc: "Optimized for the devices you use every day." },
                   { icon: Globe, title: "Modern Design", desc: "Built specifically for modern African businesses." },
                   { icon: TrendingUp, title: "Data Driven", desc: "Grow your business using actionable analytics." }
                 ].map((t, i) => (
                   <div key={i} className="p-6 rounded-2xl bg-card border text-center hover:border-primary/50 transition-colors">
                     <div className="h-12 w-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4"><t.icon className="h-6 w-6" /></div>
                     <h3 className="font-semibold mb-2">{t.title}</h3>
                     <p className="text-sm text-muted-foreground font-medium">{t.desc}</p>
                   </div>
                 ))}
               </div>
            </div>
          </section>

          {/* 9. Final Call To Action */}
          <section className="py-32 bg-primary px-6 mx-4 sm:mx-8 rounded-3xl text-white relative overflow-hidden shadow-2xl shadow-primary/20">
            <div className="absolute top-0 right-0 h-64 w-64 bg-white/10 blur-[80px] rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none" />
            <div className="absolute bottom-0 left-0 h-96 w-96 bg-black/10 blur-[100px] rounded-full -translate-x-1/3 translate-y-1/3 pointer-events-none" />
            <div className="mx-auto max-w-4xl text-center relative z-10">
              <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-8 leading-tight">
                {t("directory.vision.29")}
              </h2>
              <p className="text-lg md:text-2xl text-white/90 max-w-2xl mx-auto mb-12 font-medium">
                {t("directory.vision.ctaDesc")}
              </p>
              <div className="flex flex-wrap justify-center gap-6">
                 <Link to="/register" className="w-full sm:w-auto">
                   <Button className="w-full rounded-full h-16 px-12 font-bold text-lg shadow-2xl bg-white text-primary hover:bg-white/90 transition-all hover:scale-105 active:scale-95">
                     {t("directory.vision.30")}
                   </Button>
                 </Link>
                 <Button variant="outline" className="w-full sm:w-auto rounded-full h-16 px-12 font-bold text-lg shadow-md border-2 border-white/40 bg-transparent text-white hover:bg-white hover:text-primary transition-all hover:scale-105 active:scale-95" onClick={() => navigate("/")}>
                   {t("directory.vision.31")}
                 </Button>
              </div>
            </div>
          </section>
        </div>
      </main>
      
      <PublicFooter />
    </div>
  );
}
