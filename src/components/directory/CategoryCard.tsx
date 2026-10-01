import { motion } from "framer-motion";
import { ProfessionalImage } from "@/components/common/ProfessionalImage";
import { Package } from "lucide-react";

interface CategoryCardProps {
  name: string;
  imageUrls: string[];
  count: number;
  onClick?: () => void;
  isActive?: boolean;
}

export function CategoryCard({ name, imageUrls, count, onClick, isActive }: CategoryCardProps) {
  // Take up to 4 images for a 2x2 grid
  const previewImages = imageUrls.slice(0, 4);
  
  return (
    <motion.button
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`group relative flex flex-col gap-3 rounded-3xl border p-3 transition-all duration-300 ${
        isActive 
          ? "border-primary bg-primary/5 ring-1 ring-primary" 
          : "border-border bg-card hover:border-primary/50 hover:shadow-xl"
      }`}
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-muted">
        {previewImages.length > 0 ? (
          <div className="grid h-full grid-cols-2 grid-rows-2 gap-1 p-1">
            {previewImages.map((url, i) => (
              <div key={i} className="relative h-full w-full overflow-hidden rounded-lg bg-background">
                <ProfessionalImage 
                  src={url} 
                  alt={`${name} ${i}`} 
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" 
                />
              </div>
            ))}
            {/* Fill empty slots with placeholder if less than 4 */}
            {previewImages.length < 4 && Array.from({ length: 4 - previewImages.length }).map((_, i) => (
              <div key={`empty-${i}`} className="flex h-full w-full items-center justify-center rounded-lg bg-muted/30">
                <Package className="h-4 w-4 text-muted-foreground/20" />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Package className="h-8 w-8 text-muted-foreground/20" />
          </div>
        )}
        
        {/* Count Badge */}
        <div className="absolute bottom-2 right-2 rounded-full bg-background/80 backdrop-blur-md px-2 py-0.5 text-[10px] font-bold text-foreground border shadow-sm">
          {count}
        </div>
      </div>
      
      <div className="px-1 text-center">
        <span className="text-sm font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
          {name}
        </span>
      </div>
    </motion.button>
  );
}
