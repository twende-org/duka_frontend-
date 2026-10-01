import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { MapPin, Package, Star, ArrowRight, Navigation, ShieldCheck } from "lucide-react";
import { ProfessionalImage } from "@/components/common/ProfessionalImage";
import { Badge } from "@/components/ui/badge";
import type { Shop, Product } from "@/types";

interface BrandStoryCardProps {
  shop: Shop;
  products: Product[];
  idx: number;
}

export function BrandStoryCard({ shop, products, idx }: BrandStoryCardProps) {
  const topProducts = products.slice(0, 3);
  
  const dest = shop.lat && shop.lon
    ? `${shop.lat},${shop.lon}`
    : shop.location + (shop.name ? " " + shop.name : "");
  const directionsLink = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}&travelmode=driving&dir_action=navigate`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: (idx % 3) * 0.1, duration: 0.6 }}
      whileHover={{ y: -12 }}
      className="group relative flex flex-col overflow-hidden rounded-[3rem] border border-white/10 transition-all duration-700 hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.4)] hover:border-primary/40 hover:bg-card/90"
    >
      {/* 1. Cinematic Hero Cover (Hidden by default to show background) */}
      <Link 
        to={`/maduka/${shop.id}`} 
        className="relative h-64 overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-700"
      >
        <ProfessionalImage 
          src={shop.imageUrl || "/placeholder-shop.jpg"} 
          alt={shop.name}
          className="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-110"
        />
        
        {/* Layered Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-40 transition-opacity duration-700" />
        
        {/* Floating Verified Badge */}
        <div className="absolute top-6 right-6">
           <div className="flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-white shadow-2xl">
              <ShieldCheck className="h-4 w-4 text-primary" /> Verified
           </div>
        </div>

        {/* Floating Stats */}
        <div className="absolute top-6 left-6 flex gap-2">
           <Badge className="bg-primary/90 text-primary-foreground border-0 font-black text-[9px] uppercase tracking-widest px-4 py-1.5 rounded-full shadow-2xl">
              Elite Shop
           </Badge>
        </div>
      </Link>

      {/* 2. Luxury Logo Presentation (Always visible but floats better on hover) */}
      <div className="relative px-8">
        <div className="absolute -top-12 left-8 h-24 w-24 rounded-full border-[6px] border-card bg-card p-1 shadow-2xl overflow-hidden transition-all duration-700 group-hover:scale-110 group-hover:-translate-y-2 group-hover:opacity-100 opacity-80">
          {shop.imageUrl ? (
            <img src={shop.imageUrl} alt={shop.name} className="h-full w-full object-cover rounded-full" />
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-primary/10 rounded-full">
              <span className="text-2xl font-black text-primary">{shop.name.charAt(0)}</span>
            </div>
          )}
        </div>
        
        {/* Directions Action (Fade in on hover) */}
        <a 
          href={directionsLink}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute -top-8 right-8 h-16 w-16 flex items-center justify-center rounded-[2rem] bg-primary text-white shadow-[0_20px_40px_-10px_rgba(var(--primary),0.4)] hover:scale-110 transition-all active:scale-95 group-hover:rotate-6 opacity-0 group-hover:opacity-100"
        >
          <Navigation className="h-6 w-6" />
        </a>
      </div>

      {/* 3. Shop Info & Story (Text is always visible for navigation) */}
      <div className="flex flex-col gap-1 p-8 pt-16">
        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-black tracking-tight text-foreground transition-colors group-hover:text-primary">
            {shop.name}
          </h3>
          <div className="flex items-center gap-1 bg-amber-500/10 px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
            <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
            <span className="text-xs font-black text-amber-600">4.9</span>
          </div>
        </div>
        
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-bold tracking-tight">
          <MapPin className="h-4 w-4 text-primary/60" />
          <span>{shop.location || "Tanzania"}</span>
        </div>
        
        {/* Description fades in on hover */}
        <p className="mt-4 line-clamp-2 text-sm text-muted-foreground leading-relaxed font-medium opacity-0 group-hover:opacity-100 transition-all duration-500 transform group-hover:translate-y-0 translate-y-2">
          {shop.description || `Experience premium quality and curated collections at ${shop.name}. Your trusted destination for excellence.`}
        </p>

        {/* 4. Luxury Animated Product Previews (Hidden until hover) */}
        <div className="mt-8 border-t border-white/5 pt-8 opacity-0 group-hover:opacity-100 transition-all duration-700">
          <div className="flex items-center justify-between mb-4">
             <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Featured Collection</span>
             <Link to={`/maduka/${shop.id}`} className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline">View All</Link>
          </div>
          <div className="flex gap-3">
            {topProducts.map((p, i) => (
              <div key={p.id} className="relative h-20 flex-1 rounded-2xl overflow-hidden bg-white/5 group/item border border-white/5">
                <ProfessionalImage 
                  src={p.imageUrl || "/placeholder-product.jpg"} 
                  alt={p.name} 
                  className="h-full w-full object-cover transition-transform duration-500 group-hover/item:scale-110" 
                />
                <div className="absolute inset-0 bg-black/10 group-hover/item:bg-black/0 transition-colors" />
                
                {/* Price Reveal */}
                <div className="absolute bottom-1 right-1 translate-y-4 opacity-0 transition-all duration-300 group-hover/item:translate-y-0 group-hover/item:opacity-100">
                   <div className="bg-white/90 backdrop-blur-md px-1.5 py-0.5 rounded-lg text-[8px] font-black shadow-lg">
                      KSh {p.sellingPrice.toLocaleString()}
                   </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 5. Luxury CTA (Fades in on hover) */}
        <Link 
          to={`/maduka/${shop.id}`} 
          className="mt-8 flex h-14 w-full items-center justify-center gap-3 rounded-[2rem] bg-primary text-white font-black text-sm shadow-xl shadow-primary/20 transition-all hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 duration-500"
        >
          <span>Tembelea Duka</span>
          <ArrowRight className="h-5 w-5" />
        </Link>
      </div>

      {/* Glass Backing for Text Readability (Subtle) */}
      <div className="absolute inset-0 z-[-1] bg-background/5 backdrop-blur-[2px] group-hover:bg-background/80 transition-all duration-700" />
    </motion.div>
  );
}
