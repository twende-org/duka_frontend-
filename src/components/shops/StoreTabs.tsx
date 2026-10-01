import { motion } from "framer-motion";

export interface StoreTabItem {
  id: string;
  label: string;
  count?: number;
}

interface StoreTabsProps {
  tabs: StoreTabItem[];
  active: string;
  onChange: (id: string) => void;
}

export default function StoreTabs({ tabs, active, onChange }: StoreTabsProps) {
  return (
    <div className="relative border-b border-border/60">
      {/* edge fades for mobile scroll */}
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-background to-transparent sm:hidden" />
      <div className="flex gap-1 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => {
          const isActive = tab.id === active;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`relative shrink-0 whitespace-nowrap px-3 py-3 text-[13px] font-semibold transition-colors sm:px-4 sm:text-sm ${
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="flex items-center gap-1.5 sm:gap-2">
                {tab.label}
                {typeof tab.count === "number" && (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold transition-colors ${
                      isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </span>
              {isActive && (
                <motion.span
                  layoutId="store-tab-underline"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary"
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
