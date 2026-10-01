import { useState } from "react";
import { Package, Image as ImageIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface ProfessionalImageProps {
  src?: string;
  alt?: string;
  className?: string;
  imageClassName?: string;
  aspectRatio?: "square" | "video" | "auto";
  showZoom?: boolean;
}

/**
 * Professional Image Component
 * Features: Skeleton loading, smooth transitions, fallback handling, and aspect-ratio consistency.
 */
export function ProfessionalImage({
  src,
  alt = "",
  className,
  imageClassName,
  aspectRatio = "square",
  showZoom = false,
}: ProfessionalImageProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const ratioClass = {
    square: "aspect-square",
    video: "aspect-video",
    auto: "",
  }[aspectRatio];

  return (
    <div className={cn(
      "relative overflow-hidden bg-muted/30 select-none", 
      ratioClass, 
      className
    )}>
      {/* Skeleton Loader */}
      <AnimatePresence>
        {loading && !error && src && (
          <motion.div
            key="skeleton"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-10 bg-muted flex items-center justify-center overflow-hidden"
          >
             <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
             <ImageIcon className="h-1/3 w-1/3 text-muted-foreground/10" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fallback for Errors or Missing Src */}
      {(error || !src) ? (
        <div className="flex h-full w-full items-center justify-center bg-muted/50">
          <Package className="h-1/3 w-1/3 text-muted-foreground/20" />
        </div>
      ) : (
        <motion.img
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ 
            opacity: loading ? 0 : 1, 
            scale: loading ? 1.05 : 1 
          }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          src={src}
          alt={alt}
          loading="lazy"
          onLoad={() => setLoading(false)}
          onError={() => { setLoading(false); setError(true); }}
          className={cn(
            "h-full w-full object-cover transition-transform duration-700 ease-in-out",
            showZoom && "hover:scale-110 cursor-pointer",
            imageClassName
          )}
        />
      )}

      {/* Subtle Overlay Border for depth */}
      <div className="absolute inset-0 pointer-events-none border border-black/5 rounded-[inherit]" />
    </div>
  );
}
