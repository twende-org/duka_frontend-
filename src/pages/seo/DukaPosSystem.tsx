import { Link } from "react-router-dom";
import { Store, ArrowRight, Package, BarChart3, CreditCard, Users, ShieldCheck, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEO from "@/components/SEO";
import Logo from "@/components/common/Logo";

const features = [
  { icon: Package, title: "Usimamizi wa Stoo", desc: "Fuatilia bidhaa zako, bei, vipimo, na tarehe za mwisho kwa urahisi mkubwa." },
  { icon: BarChart3, title: "Ripoti za Mauzo", desc: "Ripoti za kina za mauzo ya kila siku, wiki, na mwezi — jua faida yako halisi." },
  { icon: CreditCard, title: "Malipo ya M-Pesa", desc: "Pokea malipo kupitia M-Pesa, Tigo Pesa, Airtel Money, na benki." },
  { icon: Users, title: "Timu na Wafanyakazi", desc: "Ongeza wafanyakazi na uwape majukumu tofauti kwa usalama." },
  { icon: ShieldCheck, title: "Usalama wa Hali ya Juu", desc: "Data yako inalindwa na encryption na sheria za usalama zilizoimarishwa." },
  { icon: Smartphone, title: "Fanya Kazi Popote", desc: "Tumia simu yako, tablet au kompyuta — inafanya kazi kwenye kifaa chochote." },
];

export default function DukaPosSystem() {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Duka POS System - Mfumo Bora wa Point of Sale kwa Maduka Tanzania"
        description="Duka POS System ni mfumo wa kisasa wa point of sale uliojengwa kwa maduka ya Tanzania. Simamia mauzo, stoo, wafanyakazi na ripoti kwa urahisi. Bora kuliko POS za zamani."
        keywords="duka, duka pos, duka pos system, pos tanzania, pos system, point of sale, mfumo wa duka, pos ya duka, cash register, duka management"
        canonical="/duka-pos-system"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: "Duka POS System",
          description: "Best POS system for Tanzanian dukas and shops. Manage sales, inventory, expenses and staff.",
          url: "https://duka.twendedigital.tech/duka-pos-system",
          isPartOf: { "@type": "WebSite", name: "Twende Duka", url: "https://duka.twendedigital.tech" },
        }}
      />

      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <Logo size={22} className="text-primary" />
            </div>
            <span className="text-xl font-extrabold text-foreground">Twende Duka</span>
          </Link>
          <div className="hidden items-center gap-3 md:flex">
            <Link to="/"><Button variant="ghost" size="sm">Nyumbani</Button></Link>
            <Link to="/twendedigital"><Button variant="ghost" size="sm">TwendeDigital</Button></Link>
            <Link to="/twende-duka"><Button variant="ghost" size="sm">Twende Duka</Button></Link>
            <Link to="/register"><Button size="sm">Jisajili Bure</Button></Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden py-20 sm:py-32">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,hsl(36_90%_50%/0.12),transparent_70%)]" />
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="mx-auto max-w-4xl text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Duka POS System
            <span className="block text-primary">Mfumo Bora wa Point of Sale</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Duka POS System ni mfumo wa kisasa wa kusimamia mauzo kwenye duka lako. Badilisha daftari na kalamu na mfumo wa digital unaokusaidia kufuatilia kila shilingi.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link to="/register">
              <Button size="lg" className="gap-2 text-base px-8">
                Anza Kutumia POS Bure <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <Link to="/#pricing">
              <Button variant="outline" size="lg" className="text-base px-8">Angalia Bei</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* What is Duka POS */}
      <section className="border-t py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground sm:text-4xl">Duka POS System ni Nini?</h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-3xl mx-auto">
              Duka POS (Point of Sale) System ni mfumo wa digital unaokusaidia kurekodi mauzo, kufuatilia stoo, kusimamia wafanyakazi, na kupata ripoti za biashara yako — yote kwenye simu au kompyuta yako. Umejengwa maalum kwa maduka ya Tanzania.
            </p>
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

      {/* Why Choose */}
      <section className="border-t bg-muted/30 py-20">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h2 className="text-3xl font-bold text-foreground mb-8">Kwa Nini Uchague Duka POS System?</h2>
          <div className="grid gap-6 sm:grid-cols-2 text-left">
            <div className="stat-card">
              <h3 className="font-bold text-foreground mb-2">Rahisi Kutumia</h3>
              <p className="text-sm text-muted-foreground">Huhitaji mafunzo mengi. Mfanyakazi yeyote anaweza kuanza kutumia ndani ya dakika 5.</p>
            </div>
            <div className="stat-card">
              <h3 className="font-bold text-foreground mb-2">Bei Nafuu</h3>
              <p className="text-sm text-muted-foreground">Kuanzia TZS 9,900/mwezi tu. Nafuu kuliko POS machines za zamani.</p>
            </div>
            <div className="stat-card">
              <h3 className="font-bold text-foreground mb-2">Hakuna Vifaa Maalum</h3>
              <p className="text-sm text-muted-foreground">Tumia simu yako ya kawaida — huhitaji kununua mashine maalum.</p>
            </div>
            <div className="stat-card">
              <h3 className="font-bold text-foreground mb-2">Msaada wa Kiswahili</h3>
              <p className="text-sm text-muted-foreground">Mfumo wote uko kwa Kiswahili — lugha yako ya kila siku.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t py-20">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-3xl font-bold text-foreground mb-4">Tayari Kuanza?</h2>
          <p className="text-lg text-muted-foreground mb-8">
            Jiunge na maelfu ya wafanyabiashara wanaotumia Duka POS System kusimamia maduka yao kwa ufanisi.
          </p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link to="/register"><Button size="lg" className="gap-2 px-8">Jisajili Bure Sasa <ArrowRight className="h-5 w-5" /></Button></Link>
            <Link to="/"><Button variant="outline" size="lg" className="px-8">Rudi Nyumbani</Button></Link>
          </div>
          <p className="mt-6 text-sm text-muted-foreground">
            Tazama pia: <Link to="/twendedigital" className="text-primary hover:underline">TwendeDigital</Link> · <Link to="/twende-duka" className="text-primary hover:underline">Twende Duka</Link>
          </p>
        </div>
      </section>
    </div>
  );
}
