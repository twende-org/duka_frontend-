import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarketplaceProductCard } from "./MarketplaceProductCard";
import type { Product, Shop } from "@/types";
import { useI18n } from "@/lib/i18n";

interface DiscoveryRailProps {
  title: string;
  subtitle: string;
  icon: any;
  items: Array<{
    product: Product;
    shop: Shop;
  }>;
  onExplore?: () => void;
  isMerchant?: boolean;
  onProductClick?: (item: { product: Product; shop: Shop }) => void;
}

export function DiscoveryRail({ title, subtitle, icon: Icon, items, onExplore, isMerchant = false, onProductClick }: DiscoveryRailProps) {
  const { t } = useI18n();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const isScrollingRef = useRef(false);

  // Triple items to ensure smooth infinite manual scrolling in both directions
  const duplicatedItems = [...items, ...items, ...items];

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || isPaused) return;

    let animationFrameId: number;
    
    const scroll = () => {
      if (el && !isScrollingRef.current) {
        el.scrollLeft += 0.5; // Auto-scroll speed
        
        // Infinite loop logic:
        const oneThird = el.scrollWidth / 3;
        if (el.scrollLeft >= oneThird * 2) {
          el.scrollLeft -= oneThird; // seamlessly jump back
        }
      }
      animationFrameId = requestAnimationFrame(scroll);
    };

    animationFrameId = requestAnimationFrame(scroll);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPaused]);

  return (
    <section className="py-8 sm:py-12 overflow-x-hidden">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 mb-5 sm:mb-8">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5 sm:space-y-1">
            <div className="flex items-center gap-2 text-primary font-bold text-[10px] sm:text-xs uppercase tracking-[0.2em]">
              <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> {subtitle}
            </div>
            <h2 className="text-xl sm:text-xl md:text-2xl font-bold tracking-tight">{title}</h2>
          </div>
          <button
            onClick={() => {
              if (scrollRef.current) {
                // Pause auto-scroll briefly so the browser's smooth scroll isn't interrupted
                isScrollingRef.current = true;
                scrollRef.current.scrollBy({ left: 260, behavior: "smooth" });
                setTimeout(() => {
                  isScrollingRef.current = false;
                }, 800);
              }
            }}
            className="group flex items-center gap-1.5 font-bold text-primary text-xs sm:text-sm transition-colors hover:text-primary/80"
          >
            <span className="relative">
              {t("directory.exploreMore" as any)}
              <span className="absolute -bottom-1 left-0 w-0 h-[2px] bg-primary transition-all duration-300 group-hover:w-full rounded-full opacity-70"></span>
            </span>
            <div className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full bg-primary/10 text-primary transition-all duration-300 group-hover:translate-x-1 group-hover:bg-primary group-hover:text-primary-foreground group-hover:shadow-md group-hover:shadow-primary/20">
              <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </div>
          </button>
        </div>
      </div>
      <div className="w-full max-w-7xl mx-auto pl-4 sm:pl-6">
        <div 
          ref={scrollRef}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}
          className="flex gap-4 sm:gap-5 overflow-x-auto pb-6 pt-2 pr-4 sm:pr-6 no-scrollbar"
        >
          {duplicatedItems.map((item, idx) => (
            <div
              key={`${item.product.id}-${idx}`}
              className="w-52 sm:w-60 md:w-72 shrink-0"
            >
              <MarketplaceProductCard 
                product={item.product}
                shop={item.shop}
                layout="rail"
                onClick={onProductClick ? () => onProductClick(item) : undefined}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
