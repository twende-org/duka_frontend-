import { Link } from "react-router-dom";
import { Store, ArrowRight, Check, Package, BarChart3, CreditCard, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEO from "@/components/SEO";
import Logo from "@/components/common/Logo";

export default function TwendeDuka() {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Twende Duka - Smart Shop Management System Tanzania"
        description="Twende Duka ni mfumo wa smart shop management kwa maduka ya Tanzania. Simamia bidhaa, mauzo, matumizi, wafanyakazi na ripoti kwa urahisi. Anza bure leo."
        keywords="twende duka, twendeduka, duka smart, smart shop management, shop management system, duka management, inventory system tanzania, mfumo wa duka, biashara software"
        canonical="/twende-duka"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: "Twende Duka - Smart Shop Management",
          description: "Twende Duka is the smartest way to manage your shop in Tanzania. Track sales, inventory, expenses and staff.",
          url: "https://duka.twendedigital.tech/twende-duka",
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
            <Link to="/duka-pos-system"><Button variant="ghost" size="sm">Duka POS</Button></Link>
            <Link to="/twendedigital"><Button variant="ghost" size="sm">TwendeDigital</Button></Link>
            <Link to="/register"><Button size="sm">Jisajili Bure</Button></Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden py-20 sm:py-32">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,hsl(142_60%_40%/0.1),transparent_70%)]" />
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="mx-auto max-w-4xl text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Twende Duka
            <span className="block text-primary">Smart Shop Management System</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Twende Duka ni mfumo wa smart shop management unaokusaidia kusimamia duka lako kwa njia ya kisasa na ya kitaalamu.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link to="/register">
              <Button size="lg" className="gap-2 text-base px-8">
                Anza Bure Leo <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <Link to="/#pricing">
              <Button variant="outline" size="lg" className="text-base px-8">Angalia Mipango</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="border-t py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-foreground text-center mb-16 sm:text-4xl">Twende Duka Inakusaidia Nini?</h2>
          <div className="grid gap-8 sm:grid-cols-2">
            {[
              { icon: Package, title: "Usimamizi wa Bidhaa na Stoo", desc: "Ongeza bidhaa, weka bei, fuatilia stoo, na upate tahadhari stoo inapopungua. SKU, uzito, tarehe ya mwisho — yote yameshughulikiwa." },
              { icon: BarChart3, title: "Mauzo na Ripoti za Kina", desc: "Rekodi mauzo haraka na upate ripoti za faida ya kila siku, wiki, na mwezi. Jua bidhaa gani zinauza zaidi." },
              { icon: CreditCard, title: "Matumizi na Gharama", desc: "Fuatilia kila matumizi ya biashara — kodi, umeme, mishahara, usafiri. Jua faida yako halisi." },
              { icon: Users, title: "Maduka Mengi na Timu", desc: "Simamia maduka mengi kutoka sehemu moja. Ongeza wafanyakazi na uwape ruhusa tofauti." },
            ].map((f) => (
              <div key={f.title} className="stat-card">
                <f.icon className="h-8 w-8 text-primary mb-3" />
                <h3 className="text-lg font-bold text-foreground">{f.title}</h3>
                <p className="mt-2 text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="border-t bg-muted/30 py-20">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h2 className="text-3xl font-bold text-foreground mb-4">Bei za Twende Duka</h2>
          <p className="text-lg text-muted-foreground mb-12">Chagua mpango unaokufaa biashara yako</p>
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              { name: "Ndogo", price: "9,900", features: ["Duka 1", "Bidhaa 50", "Ripoti za msingi"] },
              { name: "Biashara", price: "29,900", features: ["Maduka 5", "Bidhaa zisizopungua", "Wafanyakazi 10", "Ripoti za kina"], highlight: true },
              { name: "Kampuni", price: "79,900", features: ["Maduka yasiyopungua", "API access", "Msaada 24/7"] },
            ].map((p) => (
              <div key={p.name} className={`stat-card ${p.highlight ? "ring-2 ring-primary" : ""}`}>
                <h3 className="text-lg font-bold text-foreground">{p.name}</h3>
                <div className="my-4">
                  <span className="text-3xl font-extrabold text-foreground">TZS {p.price}</span>
                  <span className="text-muted-foreground">/mwezi</span>
                </div>
                <ul className="space-y-2 text-sm text-left">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-muted-foreground"><Check className="h-4 w-4 text-primary" />{f}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t py-20">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-3xl font-bold text-foreground mb-4">Anza Kusimamia Duka Lako kwa Twende Duka</h2>
          <p className="text-lg text-muted-foreground mb-8">
            Jiunge na wafanyabiashara wanaotumia Twende Duka kusimamia maduka yao kwa ufanisi. Jisajili bure leo.
          </p>
          <Link to="/register"><Button size="lg" className="gap-2 px-8">Jisajili Bure <ArrowRight className="h-5 w-5" /></Button></Link>
          <p className="mt-6 text-sm text-muted-foreground">
            Soma zaidi: <Link to="/duka-pos-system" className="text-primary hover:underline">Duka POS System</Link> · <Link to="/twendedigital" className="text-primary hover:underline">TwendeDigital</Link> · <Link to="/" className="text-primary hover:underline">Nyumbani</Link>
          </p>
        </div>
      </section>
    </div>
  );
}
