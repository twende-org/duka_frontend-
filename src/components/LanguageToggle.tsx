import { forwardRef } from "react";
import { Globe } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

interface LanguageToggleProps {
  variant?: "ghost" | "outline" | "default";
  className?: string;
}

const LanguageToggle = forwardRef<HTMLButtonElement, LanguageToggleProps>(
  ({ variant = "ghost", className = "" }, ref) => {
    const { lang, toggleLang } = useI18n();

    return (
      <button
        ref={ref}
        type="button"
        onClick={toggleLang}
        className={`flex items-center justify-center gap-1.5 transition-all duration-300 rounded-full hover:bg-primary/5 group ${
          variant === "ghost"
            ? "text-muted-foreground hover:text-primary bg-transparent"
            : "px-3 py-1.5 border border-border/50 bg-card text-muted-foreground hover:text-primary shadow-sm hover:border-primary/30"
        } ${className}`}
        title={lang === "sw" ? "Switch to English" : "Badilisha kwa Kiswahili"}
      >
        <Globe className="h-[18px] w-[18px] shrink-0 transition-transform group-hover:rotate-12" />
        <span className="text-[11px] font-black tracking-widest uppercase mt-[2px]">{lang}</span>
      </button>
    );
  }
);

LanguageToggle.displayName = "LanguageToggle";

export default LanguageToggle;
