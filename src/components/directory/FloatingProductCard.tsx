import { motion } from "framer-motion";
import { ProfessionalImage } from "@/components/common/ProfessionalImage";

interface FloatingProductCardProps {
  name: string;
  price: string;
  imageUrl: string;
  shopName: string;
  delay?: number;
  className?: string;
  depth?: "front" | "mid" | "back";
}

export function FloatingProductCard({ 
  name, 
  price, 
  imageUrl, 
  shopName, 
  delay = 0, 
  className = "",
  depth = "mid"
}: FloatingProductCardProps) {
  // Depth-based scaling and blur
  const scale = depth === "front" ? 1.1 : depth === "back" ? 0.8 : 1;
  const blur = depth === "back" ? "blur(2px)" : "none";
  const opacity = depth === "back" ? 0.6 : 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, rotate: -5, scale: scale * 0.8 }}
      animate={{ 
        opacity: opacity, 
        y: [0, -20, 0],
        rotate: [0, 3, 0],
        scale: scale 
      }}
      transition={{
        y: { duration: 7 + delay, repeat: Infinity, ease: "easeInOut", delay },
        rotate: { duration: 9 + delay, repeat: Infinity, ease: "easeInOut", delay },
        opacity: { duration: 1, delay: delay * 0.2 },
        scale: { duration: 1, delay: delay * 0.2 }
      }}
      style={{ filter: blur }}
      className={`absolute hidden md:block z-20 ${className}`}
    >
      <div className="group relative overflow-hidden rounded-[2.5rem] border border-white/30 bg-white/10 p-2 shadow-2xl backdrop-blur-2xl transition-all hover:bg-white/20 hover:scale-105 duration-500 ring-1 ring-white/20">
        
        {/* Luxury Glass Reflection Effect */}
        <motion.div 
          animate={{ x: ["-150%", "150%"] }}
          transition={{ duration: 3, repeat: Infinity, repeatDelay: 4, ease: "easeInOut" }}
          className="absolute inset-0 z-10 pointer-events-none bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"
        />

        <div className="h-40 w-40 overflow-hidden rounded-[2rem] bg-muted shadow-inner">
          <ProfessionalImage 
            src={imageUrl} 
            alt={name} 
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-125" 
          />
        </div>
        
        <div className="mt-3 px-2 pb-2">
          <div className="flex items-center gap-1.5 mb-1">
             <div className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.5)]" />
             <p className="text-[9px] font-black uppercase tracking-[0.15em] text-primary/80">{shopName}</p>
          </div>
          <p className="max-w-[140px] truncate text-sm font-bold text-foreground tracking-tight">{name}</p>
          <p className="text-sm font-black text-foreground/90 mt-0.5">{Number(price)?.toLocaleString()}</p>
        </div>
        
        {/* Soft Shadow Base (Atmospheric) */}
        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-[80%] h-4 bg-black/10 blur-xl rounded-full" />
      </div>
    </motion.div>
  );
}
