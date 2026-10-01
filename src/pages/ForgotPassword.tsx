import { Link } from "react-router-dom";
import { Store, ArrowLeft, MessageSquare, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import LanguageToggle from "@/components/LanguageToggle";
import SEO from "@/components/SEO";
import Logo from "@/components/common/Logo";

export default function ForgotPassword() {
  const { t } = useI18n();

  const supportNumber = "255757270903"; // Placeholder or from config
  const whatsappUrl = `https://wa.me/${supportNumber}?text=Habari, nimesahau nywila yangu ya Twende Duka. Tafadhali nisaidie kuirejesha.`;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <SEO 
        title={t("auth.forgotTitle")} 
        description={t("auth.forgotSubtitleManual")} 
        noindex={true} 
      />
      <div className="absolute top-4 right-4">
        <LanguageToggle variant="outline" />
      </div>
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-3 mb-8">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
            <Logo size={24} className="text-primary" />
          </div>
          <span className="text-2xl font-bold text-foreground">Twende Duka</span>
        </Link>

        <div className="stat-card">
          <h1 className="text-xl font-bold text-foreground mb-1">{t("auth.forgotTitle")}</h1>
          <p className="text-sm text-muted-foreground mb-8">
            {t("auth.forgotSubtitleManual") || "Tafadhali wasiliana na msimamizi (Admin) ili kubadilisha nywila yako. Unaweza kupiga simu au kutuma ujumbe WhatsApp."}
          </p>

          <div className="space-y-4">
            <Button asChild className="w-full h-12 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white border-none">
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                <MessageSquare className="h-5 w-5" />
                <span>WhatsApp Support</span>
              </a>
            </Button>
            
            <Button asChild variant="outline" className="w-full h-12 flex items-center justify-center gap-2">
              <a href={`tel:+${supportNumber}`}>
                <Phone className="h-5 w-5" />
                <span>{t("directory.pigaSimu") || "Piga Simu"}</span>
              </a>
            </Button>
          </div>

          <div className="mt-8 pt-6 border-t border-border/50 text-center">
            <Link to="/login" className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              {t("auth.backToLogin")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
