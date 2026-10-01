import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { useI18n } from "@/lib/i18n";
import { Ghost, Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logErrorEvent } from "@/lib/errorLogger";
import SEO from "@/components/SEO";

const NotFound = () => {
  const location = useLocation();
  const { t } = useI18n();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
    logErrorEvent({
      action: "page_not_found",
      category: "404",
      errorMessage: `404: ${location.pathname} not found`,
      route: location.pathname,
    });
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted p-6">
      <SEO
        title="Ukurasa Haupo | Page Not Found"
        description="Samahani, ukurasa unaotafuta haupo au umeondolewa."
        noindex={true}
      />
      <div className="text-center max-w-md fade-in-up">
        <div className="relative mb-12 flex justify-center">
           <div className="absolute inset-0 bg-primary/10 blur-[100px] rounded-full scale-150" />
           <div className="relative h-40 w-40 rounded-[3rem] bg-glass flex items-center justify-center border border-white/20 shadow-2xl animate-bounce">
              <Ghost className="h-20 w-20 text-primary opacity-80" />
           </div>
           <div className="absolute -top-4 -right-4 h-12 w-12 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center rotate-12 shadow-lg">
              <span className="text-destructive font-black">404</span>
           </div>
        </div>

        <h1 className="text-4xl font-black text-foreground uppercase tracking-tighter mb-4 italic">
          Lost in Space?
        </h1>
        <p className="text-muted-foreground font-medium mb-10 leading-relaxed">
          {t("notFound.title") || "The page you are looking for has drifted away or never existed in this dimension."}
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild className="rounded-[1.5rem] h-14 px-8 font-black uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-primary/20 transition-all hover:scale-105 active:scale-95 group">
            <Link to="/">
              <Home className="h-4 w-4 mr-2 group-hover:rotate-12 transition-transform" />
              {t("notFound.back") || "Return to Terminal"}
            </Link>
          </Button>
          <Button variant="ghost" onClick={() => window.history.back()} className="rounded-[1.5rem] h-14 px-8 font-black uppercase text-[10px] tracking-[0.2em] text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;