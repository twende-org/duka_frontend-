import { useEffect, useState, type ReactNode } from "react";
import { ArrowLeft, MapPin, ShieldCheck, ShoppingBag, Store } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import LanguageToggle from "@/components/LanguageToggle";
import Logo from "@/components/common/Logo";
import { useI18n } from "@/lib/i18n";

interface AuthShowcaseShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

export default function AuthShowcaseShell({ title, subtitle, children }: AuthShowcaseShellProps) {
  const { lang } = useI18n();
  const sw = lang === "sw";
  const [region, setRegion] = useState<string | null>(null);
  const [country, setCountry] = useState<string | null>(null);

  useEffect(() => {
    const fetchLocation = async () => {
      try {
        // Use IP-based location which sometimes has better city-level accuracy for ISPs than the browser's default
        const res = await fetch("https://ipapi.co/json/");
        if (!res.ok) return;
        const data = await res.json();
        
        const countryName = data.country_name;
        let regionName = data.city || data.region;
        
        // Prevent duplicates
        if (regionName && countryName && regionName.toLowerCase().includes(countryName.toLowerCase())) {
            regionName = null;
        }
        if (countryName && regionName && countryName.toLowerCase().includes(regionName.toLowerCase())) {
            regionName = null;
        }

        if (countryName) setCountry(countryName);
        if (regionName) setRegion(regionName);
      } catch (e) {
        console.error("IP Geolocation failed", e);
      }
    };

    fetchLocation();
  }, []);

  return (
    <main className="min-h-screen bg-muted/40 p-3 sm:p-5 lg:p-8 flex items-center justify-center">
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="grid w-full max-w-5xl overflow-hidden rounded-sm border border-border bg-card shadow-2xl lg:grid-cols-12"
      >
        <aside className="relative hidden overflow-hidden bg-primary p-8 text-primary-foreground lg:col-span-6 lg:flex lg:flex-col lg:justify-between xl:p-12">
          <div className="absolute -left-16 -top-24 select-none text-[24rem] font-black leading-none text-primary-foreground/10" aria-hidden="true">TD</div>
          <div className="relative z-10">
            <div className="mb-10 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-foreground shadow-xl">
              <Logo size={36} className="text-primary" />
            </div>
            <h2 className="max-w-xl text-4xl font-light leading-[0.95] xl:text-5xl">
              Biashara<br /><span className="font-semibold italic">Irahisishwe.</span>
            </h2>
          </div>

          <div className="absolute bottom-[16%] right-[-12%] h-[48%] w-[62%] rotate-6 rounded-3xl bg-foreground p-6 shadow-2xl transition-transform duration-700 hover:rotate-3">
            <div className="flex h-full flex-col rounded-2xl border border-primary-foreground/10 bg-primary/20 p-5">
              <div className="flex items-center justify-between text-primary-foreground/70">
                <ShoppingBag className="h-6 w-6" />
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div className="mt-auto space-y-3">
                <div className="h-16 rounded-xl bg-primary-foreground/10" />
                <div className="h-2 w-2/3 rounded-full bg-primary-foreground/30" />
                <div className="h-2 w-1/2 rounded-full bg-primary-foreground/15" />
              </div>
            </div>
          </div>

          <div className="relative z-10 max-w-sm space-y-4 text-xs leading-relaxed text-primary-foreground/80 font-medium">
            <p>[ {sw ? "Mfumo salama wa biashara, ununuzi na ukuaji wa Tanzania." : "Tanzania's secure platform for business, shopping, and growth."} ]</p>
            <div className="flex items-center gap-5 uppercase">
              <span className="flex items-center gap-2">
                <MapPin className="h-4 w-4" /> {country || "Tanzania"}{region ? `, ${region}` : ""}
              </span>
            </div>
          </div>
        </aside>

        <div className="flex flex-col p-6 sm:p-8 lg:col-span-6 lg:p-10">
          <header className="mb-10 flex items-center justify-between">
            <Link to="/" aria-label="Back to marketplace">
              <Button variant="outline" size="icon" className="rounded-full">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="flex items-center gap-3 lg:hidden">
              <Logo size={34} />
              <span className="text-lg font-bold">Twende Duka</span>
            </div>
            <LanguageToggle variant="outline" />
          </header>

          <div className="my-auto">
            <div className="mb-10">
              <div className="mb-5 hidden h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary sm:flex lg:hidden"><Store className="h-6 w-6" /></div>
              <h1 className="text-4xl font-bold text-foreground tracking-tight">{title}</h1>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
            </div>
            {children}
          </div>

          <p className="mt-10 text-center text-xs leading-relaxed text-muted-foreground">
            {sw ? (
              <>
                Kwa kuendelea, unakubali{" "}
                <Link to="/terms" className="font-medium text-primary hover:underline">
                  masharti
                </Link>{" "}
                na{" "}
                <Link to="/privacy" className="font-medium text-primary hover:underline">
                  sera ya faragha
                </Link>{" "}
                ya Twende Duka.
              </>
            ) : (
              <>
                By continuing, you agree to Twende Duka's{" "}
                <Link to="/terms" className="font-medium text-primary hover:underline">
                  terms
                </Link>{" "}
                and{" "}
                <Link to="/privacy" className="font-medium text-primary hover:underline">
                  privacy policy
                </Link>
                .
              </>
            )}
          </p>
        </div>
      </motion.section>
    </main>
  );
}