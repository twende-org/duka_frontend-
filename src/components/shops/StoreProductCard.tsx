import { Share2, Plus, Star } from "lucide-react";
import { BsWhatsapp } from "react-icons/bs";
import { motion } from "framer-motion";
import { ProfessionalImage } from "@/components/common/ProfessionalImage";
import { WishlistButton } from "@/components/common/WishlistButton";
import { Button } from "@/components/ui/button";
import { normalizeCategories, getCategoryName } from "@/lib/categories";
import type { Product, Shop } from "@/types";

interface StoreProductCardProps {
  product: Product & { stock?: number; moq?: number; rating?: number; reviewCount?: number };
  shop: Shop;
  price: number;
  onAdd: () => void;
  onWhatsApp: () => void;
  onShare: () => void;
  onImport?: () => void;
}

export default function StoreProductCard({
  product,
  shop,
  price,
  onAdd,
  onWhatsApp,
  onShare,
  onImport,
}: StoreProductCardProps) {
  const cats = normalizeCategories(product).map(getCategoryName).join(" • ");
  const outOfStock = product.stock === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.35, ease: [0.21, 0.45, 0.32, 0.9] }}
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_20px_45px_-25px_hsl(var(--primary)/0.55)]"
    >
      <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-muted/50 to-muted/10">
        <ProfessionalImage
          src={product.imageUrl}
          alt={product.name}
          className="h-full w-full"
          imageClassName="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.07]"
        />

        <div className="absolute right-1.5 top-1.5 z-20 rounded-full bg-background/85 p-1.5 shadow-sm backdrop-blur sm:right-2 sm:top-2">
          <WishlistButton product={product} shop={shop} className="h-4 w-4 sm:h-5 sm:w-5" iconClassName="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </div>

        {outOfStock ? (
          <span className="absolute left-1.5 top-1.5 z-20 rounded-md bg-destructive px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-destructive-foreground sm:left-2 sm:top-2 sm:text-[9px]">
            Out of stock
          </span>
        ) : typeof product.stock === "number" && product.stock <= 5 ? (
          <span className="absolute left-1.5 top-1.5 z-20 rounded-md bg-primary px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-primary-foreground sm:left-2 sm:top-2 sm:text-[9px]">
            Only {product.stock} left
          </span>
        ) : null}

        {/* Desktop hover quick actions */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 hidden translate-y-3 bg-gradient-to-t from-black/60 to-transparent p-2.5 opacity-0 transition-all duration-300 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 md:block">
          <div className="flex items-center gap-1.5">
            <button
              onClick={onWhatsApp}
              title="Chat on WhatsApp"
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-background/90 text-foreground shadow-md backdrop-blur transition-colors hover:bg-primary hover:text-primary-foreground"
            >
              <BsWhatsapp className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={onShare}
              title="Share"
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-background/90 text-foreground shadow-md backdrop-blur transition-colors hover:bg-primary hover:text-primary-foreground"
            >
              <Share2 className="h-3.5 w-3.5" />
            </button>
            {onImport && (
              <button
                onClick={onImport}
                className="ml-auto rounded-lg bg-background/90 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-primary shadow-md backdrop-blur"
              >
                Import
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-2.5 sm:p-3.5">
        <p className="line-clamp-1 text-[9px] font-bold uppercase tracking-[0.16em] text-primary/80 sm:text-[10px]">
          {cats || "General"}
        </p>

        <h4 className="line-clamp-2 min-h-[2.1rem] text-[13px] font-bold leading-snug text-foreground transition-colors group-hover:text-primary sm:min-h-[2.4rem] sm:text-sm">
          {product.name}
        </h4>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground sm:text-[11px]">
          <span className="inline-flex items-center gap-1">
            <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
            <span className="font-semibold text-foreground">{product.rating ? product.rating.toFixed(1) : "New"}</span>
            {typeof product.reviewCount === "number" && product.reviewCount > 0 && <span>({product.reviewCount})</span>}
          </span>
          <span className="hidden h-3 w-px bg-border sm:block" />
          <span className="whitespace-nowrap">MOQ {product.moq && product.moq > 1 ? product.moq : 1}</span>
        </div>

        <div className="mt-auto space-y-2 pt-2">
          <span className="block text-[15px] font-extrabold tracking-tight text-foreground sm:text-base">
            TZS {price.toLocaleString()}
          </span>

          <Button
            size="sm"
            onClick={onAdd}
            disabled={outOfStock}
            className="h-9 w-full rounded-xl text-[11px] font-bold tracking-wide sm:text-xs"
          >
            <Plus className="mr-1 h-3.5 w-3.5" /> {outOfStock ? "Unavailable" : "Add to order"}
          </Button>

          {/* Mobile quick actions */}
          <div className="flex items-center gap-1.5 md:hidden">
            <button
              onClick={onWhatsApp}
              title="Chat on WhatsApp"
              className="flex h-7 flex-1 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors active:bg-primary/10 active:text-primary"
            >
              <BsWhatsapp className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={onShare}
              title="Share"
              className="flex h-7 flex-1 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors active:bg-primary/10 active:text-primary"
            >
              <Share2 className="h-3.5 w-3.5" />
            </button>
            {onImport && (
              <button
                onClick={onImport}
                className="h-7 flex-1 rounded-lg bg-primary/10 text-[10px] font-bold uppercase tracking-wider text-primary"
              >
                Import
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
