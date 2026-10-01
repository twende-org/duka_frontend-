import React from "react";
import { Link } from "react-router-dom";
import { Star, ShoppingBag, Store } from "lucide-react";
import { ProfessionalImage } from "@/components/common/ProfessionalImage";
import { WishlistButton } from "@/components/common/WishlistButton";
import type { Product, Shop } from "@/types";

interface MarketplaceProductCardProps {
  product: Product;
  shop: Shop;
  stockQty?: number;
  onClick?: () => void;
  layout?: "grid" | "rail";
}

export function MarketplaceProductCard({
  product,
  shop,
  stockQty,
  onClick,
  layout = "grid",
}: MarketplaceProductCardProps) {
  const handleOrder = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onClick) return onClick();
    window.dispatchEvent(new CustomEvent("add-to-cart", { detail: { product } }));
  };

  const categoryLabel =
    (product as any).category ||
    (product.categories && product.categories.length > 0 ? product.categories[0] : "Product");
  const moq = (product as any).moq && (product as any).moq > 1 ? (product as any).moq : 1;
  const outOfStock = stockQty === 0;

  const content = (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border/60 bg-card transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg">
      {/* Image */}
      <div className={`relative w-full overflow-hidden bg-muted/30 ${layout === "rail" ? "aspect-[4/5]" : "aspect-square"}`}>
        <ProfessionalImage
          src={product.imageUrl}
          alt={product.name}
          aspectRatio="auto"
          className="h-full w-full"
          imageClassName="object-cover transition-transform duration-700 group-hover:scale-[1.06]"
        />

        <div className="absolute right-2 top-2 z-20 rounded-full bg-background/90 p-1.5 shadow-sm backdrop-blur">
          <WishlistButton product={product} shop={shop} className="h-5 w-5" iconClassName="h-4 w-4" />
        </div>

        {outOfStock && (
          <span className="absolute left-2 top-2 z-20 rounded-md bg-destructive px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-destructive-foreground">
            Out of stock
          </span>
        )}
        {!outOfStock && typeof stockQty === "number" && stockQty <= 5 && (
          <span className="absolute left-2 top-2 z-20 rounded-md bg-primary px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary-foreground">
            Only {stockQty} left
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          <Store className="h-3 w-3 shrink-0" />
          <span className="truncate">{shop.name}</span>
        </div>

        <h3 className="line-clamp-2 min-h-[2.25rem] text-sm font-bold leading-snug text-foreground transition-colors group-hover:text-primary">
          {product.name}
        </h3>

        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-0.5 font-semibold text-foreground">
            <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
            {(product as any).rating ? (product as any).rating.toFixed(1) : "New"}
          </span>
          <span className="truncate">{categoryLabel}</span>
        </div>

        <div className="mt-auto space-y-2 pt-2">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-base font-extrabold tracking-tight text-foreground">
              TZS {product.sellingPrice?.toLocaleString()}
            </span>
            <span className="text-[10px] font-semibold text-muted-foreground">MOQ {moq}</span>
          </div>

          <button
            onClick={handleOrder}
            disabled={outOfStock}
            className="flex h-9 w-full items-center justify-center gap-1.5 rounded-xl bg-primary text-xs font-bold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            {outOfStock ? "Unavailable" : "Order now"}
          </button>
        </div>
      </div>
    </div>
  );

  if (onClick) {
    return (
      <div className="block h-full cursor-pointer" onClick={onClick}>
        {content}
      </div>
    );
  }

  return (
    <Link to={`/shop/${shop.slug || shop.id}?productId=${product.id}`} className="block h-full">
      {content}
    </Link>
  );
}
