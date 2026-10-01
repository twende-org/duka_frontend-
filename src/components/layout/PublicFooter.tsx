import { Link } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import Logo from "@/components/common/Logo";

export function PublicFooter() {
  const { t, lang, toggleLang } = useI18n();

  return (
    <footer className="bg-sidebar py-10 sm:py-12 text-white overflow-hidden relative mt-12 sm:mt-20 pb-28 lg:pb-12">
      <div className="absolute top-0 right-0 h-[300px] w-[300px] sm:h-[500px] sm:w-[500px] bg-primary/10 blur-[100px] sm:blur-[150px] rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 relative z-10 space-y-8 sm:space-y-12">
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-8 sm:gap-12 items-start">
            <div className="space-y-4 sm:space-y-6">
               <div className="flex items-center gap-3 sm:gap-4">
                  <div className="h-10 w-10 sm:h-12 sm:w-12 flex items-center justify-center rounded-xl sm:rounded-2xl bg-primary/15 ring-1 ring-primary/20 shadow-xl shrink-0">
                    <Logo size={22} className="text-primary" />
                  </div>
                  <span className="text-xl sm:text-2xl font-semibold tracking-tighter">Twende Duka</span>
               </div>
               <p className="text-sm sm:text-base text-white/90 max-w-md font-medium leading-relaxed">{t("footer.tagline")}</p>
            </div>
            <div className="grid grid-cols-2 gap-6 sm:gap-8">
               <div className="space-y-3 sm:space-y-4">
                  <div className="relative inline-block pb-2">
                     <h4 className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white">{t("footer.platform")}</h4>
                     <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary rounded-t-md" />
                  </div>
                  <ul className="space-y-2 sm:space-y-3 font-normal text-white text-xs sm:text-sm">
                     <li><Link to="/" className="hover:text-primary transition-colors">{t("footer.marketplace")}</Link></li>
                     <li><Link to="/explore" className="hover:text-primary transition-colors">{t("nav.about")}</Link></li>
                  </ul>
               </div>
               <div className="space-y-3 sm:space-y-4">
                  <div className="relative inline-block pb-2">
                     <h4 className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white">{t("footer.business")}</h4>
                     <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary rounded-t-md" />
                  </div>
                  <ul className="space-y-2 sm:space-y-3 font-normal text-white text-xs sm:text-sm">
                     <li><Link to="/login" className="hover:text-primary transition-colors">{t("footer.login")}</Link></li>
                     <li><Link to="/register" className="hover:text-primary transition-colors">{t("footer.register")}</Link></li>
                  </ul>
               </div>
            </div>
         </div>
         <div className="pt-6 sm:pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-[10px] uppercase tracking-[0.3em] opacity-40 font-semibold">© {new Date().getFullYear()} Twende Digital Ltd.</p>
            <button onClick={toggleLang} className="text-[10px] font-semibold uppercase tracking-[0.3em] hover:text-primary transition-colors opacity-60 hover:opacity-100">
              {lang === 'sw' ? 'English' : 'Kiswahili'}
            </button>
         </div>
      </div>
    </footer>
  );
}
