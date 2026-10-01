import { Link } from "react-router-dom";
import { Store, ArrowRight, Globe, Code, Lightbulb, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEO from "@/components/SEO";
import Logo from "@/components/common/Logo";

export default function TwendeDigital() {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="TwendeDigital - Teknolojia ya Biashara kwa Afrika Mashariki"
        description="TwendeDigital ni kampuni ya teknolojia inayotengeneza mifumo ya kisasa ya biashara kama Twende Duka POS System. Suluhisho za digital kwa wafanyabiashara wa Tanzania."
        keywords="twendedigital, twende digital, twende digital tanzania, software company tanzania, tech company dar es salaam, duka software, business software africa"
        canonical="/twendedigital"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "Twende Digital",
          url: "https://twendedigital.tech",
          description: "Twende Digital builds modern business software for Tanzanian and East African entrepreneurs.",
          foundingDate: "2024",
          knowsAbout: ["POS Systems", "Business Software", "Shop Management", "E-commerce"],
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
            <Link to="/twende-duka"><Button variant="ghost" size="sm">Twende Duka</Button></Link>
            <Link to="/register"><Button size="sm">Jisajili Bure</Button></Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden py-20 sm:py-32">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,hsl(210_80%_50%/0.1),transparent_70%)]" />
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="mx-auto max-w-4xl text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            TwendeDigital
            <span className="block text-primary">Teknolojia ya Biashara ya Kisasa</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Twende Digital ni kampuni ya teknolojia inayotengeneza suluhisho za digital kwa wafanyabiashara wa Tanzania na Afrika Mashariki. Bidhaa yetu kuu ni Twende Duka — mfumo bora wa kusimamia duka.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link to="/register">
              <Button size="lg" className="gap-2 text-base px-8">
                Jaribu Twende Duka Bure <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="border-t py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground sm:text-4xl">Dhamira Yetu</h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-3xl mx-auto">
              TwendeDigital inaamini kuwa kila mfanyabiashara anastahili zana za kisasa za kusimamia biashara yake. Tunajenga teknolojia rahisi, nafuu, na yenye nguvu kwa watu wa kawaida.
            </p>
          </div>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Globe, title: "Kwa Afrika", desc: "Mifumo iliyojengwa kwa mazingira ya Afrika Mashariki." },
              { icon: Code, title: "Teknolojia ya Kisasa", desc: "Tunatumia teknolojia za hali ya juu — cloud, AI, na mobile-first." },
              { icon: Lightbulb, title: "Suluhisho Rahisi", desc: "Mfumo unaoeleweka bila mafunzo mengi." },
              { icon: Rocket, title: "Ukuaji wa Haraka", desc: "Tunakua pamoja na biashara yako — kuanzia duka 1 hadi 100." },
            ].map((item) => (
              <div key={item.title} className="stat-card text-center">
                <item.icon className="h-8 w-8 text-primary mx-auto mb-3" />
                <h3 className="font-bold text-foreground">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Products */}
      <section className="border-t bg-muted/30 py-20">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h2 className="text-3xl font-bold text-foreground mb-8">Bidhaa Zetu</h2>
          <div className="stat-card text-left">
            <h3 className="text-xl font-bold text-foreground mb-2">Twende Duka — Smart Shop Management</h3>
            <p className="text-muted-foreground mb-4">
              Mfumo kamili wa kusimamia duka lako — bidhaa, mauzo, matumizi, wafanyakazi, wasambazaji, na ripoti. Unapatikana kwenye simu, tablet, na kompyuta.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/duka-pos-system"><Button variant="outline" size="sm">Duka POS System</Button></Link>
              <Link to="/twende-duka"><Button variant="outline" size="sm">Twende Duka Details</Button></Link>
              <Link to="/register"><Button size="sm">Jisajili Bure</Button></Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t py-20">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-3xl font-bold text-foreground mb-4">Wasiliana na TwendeDigital</h2>
          <p className="text-lg text-muted-foreground mb-4">Email: twendegital3@gmail.com | Simu: +255 692 671 206</p>
          <p className="text-muted-foreground mb-8">Tuko tayari kukusaidia kukuza biashara yako kwa teknolojia.</p>
          <Link to="/register"><Button size="lg" className="gap-2 px-8">Anza na Twende Duka <ArrowRight className="h-5 w-5" /></Button></Link>
          <p className="mt-6 text-sm text-muted-foreground">
            <Link to="/" className="text-primary hover:underline">Nyumbani</Link> · <Link to="/duka-pos-system" className="text-primary hover:underline">Duka POS</Link> · <Link to="/twende-duka" className="text-primary hover:underline">Twende Duka</Link>
          </p>
        </div>
      </section>
    </div>
  );
}
