import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, Truck, Clock, Award, CheckCircle2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function TrustSystem({ compact = false }: { compact?: boolean }) {
  const { t } = useI18n();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Only auto-scroll on mobile where we have horizontal overflow
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;

    const interval = setInterval(() => {
      // If we are at the end, scroll back to start, else scroll right
      if (scrollContainer.scrollLeft + scrollContainer.clientWidth >= scrollContainer.scrollWidth - 10) {
        scrollContainer.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        scrollContainer.scrollBy({ left: 260, behavior: 'smooth' });
      }
    }, 3000); // Scroll every 3 seconds

    return () => clearInterval(interval);
  }, []);

  const trustItems = [
    {
      icon: ShieldCheck,
      title: t("trust.verified" as any),
      desc: t("trust.quality" as any),
      color: "text-blue-500"
    },
    {
      icon: Award,
      title: t("trust.secure" as any),
      desc: t("trust.protection" as any),
      color: "text-amber-500"
    },
    {
      icon: Truck,
      title: t("trust.global" as any),
      desc: t("trust.excellence" as any),
      color: "text-emerald-500"
    },
    {
      icon: Clock,
      title: t("trust.support" as any),
      desc: t("trust.expert" as any),
      color: "text-primary"
    }
  ];

  return (
    <div className="mx-auto max-w-[1600px] px-0 lg:px-10 py-8 lg:py-10">
      <motion.div 
        ref={scrollRef}
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className={compact 
          ? "grid grid-cols-1 sm:grid-cols-2 gap-4 py-4" 
          : "flex lg:grid lg:grid-cols-4 gap-4 lg:gap-8 overflow-x-auto lg:overflow-visible pb-6 lg:pb-0 px-6 lg:px-0 lg:border-y lg:border-border/50 lg:py-10 no-scrollbar snap-x snap-mandatory"}
      >
        {trustItems.map((item, idx) => (
          <div key={idx} className="shrink-0 w-[240px] lg:w-auto flex flex-col lg:flex-row items-center lg:items-start text-center lg:text-left p-6 lg:p-0 rounded-2xl lg:rounded-none bg-card lg:bg-transparent border border-border/50 lg:border-none shadow-sm lg:shadow-none snap-center gap-4 group cursor-default">
            <div className={`flex h-12 w-12 lg:h-14 lg:w-14 shrink-0 items-center justify-center rounded-2xl bg-muted/20 transition-all duration-300 lg:group-hover:bg-background lg:group-hover:shadow-xl lg:group-hover:scale-110`}>
              <item.icon className={`h-6 w-6 lg:h-7 lg:w-7 ${item.color}`} />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-center lg:justify-start gap-1.5 mb-1.5 lg:mb-0">
                <h4 className="text-sm font-bold tracking-tight text-foreground">{item.title}</h4>
                <CheckCircle2 className="hidden lg:block h-3 w-3 text-success opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-[10px] lg:text-xs font-semibold text-muted-foreground uppercase tracking-widest leading-relaxed lg:mt-0.5">{item.desc}</p>
            </div>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
