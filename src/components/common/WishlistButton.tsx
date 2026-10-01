import React, { useState, useEffect } from "react";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Product, Shop } from "@/types";
import { isProductWishlisted, toggleWishlistItem } from "@/lib/services/wishlistService";

interface WishlistButtonProps {
  product: Product;
  shop: Shop;
  className?: string;
  iconClassName?: string;
}

export function WishlistButton({ product, shop, className, iconClassName }: WishlistButtonProps) {
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkWishlistStatus = async () => {
      try {
        const status = await isProductWishlisted(product.id);
        setIsWishlisted(status);
      } catch (e) {
        console.error("Error checking wishlist status:", e);
      } finally {
        setLoading(false);
      }
    };

    checkWishlistStatus();

    // Listen for custom event in case another button toggles this same product
    const handleUpdate = () => checkWishlistStatus();
    window.addEventListener("wishlist_updated", handleUpdate);
    return () => window.removeEventListener("wishlist_updated", handleUpdate);
  }, [product.id]);

  const toggleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const wasWishlisted = isWishlisted;
    
    // Optimistic update
    setIsWishlisted(!wasWishlisted);

    try {
      const nowWishlisted = await toggleWishlistItem(product, shop);
      
      // Ensure sync with actual result
      setIsWishlisted(nowWishlisted);

      if (nowWishlisted) {
        toast.success(`❤️ Saved ${product.name} to wishlist!`);
      } else {
        toast.info(`Removed ${product.name} from wishlist.`);
      }
    } catch (e) {
      console.error("Error toggling wishlist:", e);
      // Revert optimistic update
      setIsWishlisted(wasWishlisted);
      toast.error("Imeshindwa kusasisha wishlist.");
    }
  };

  if (loading) return <div className={cn("w-8 h-8", className)} />;

  return (
    <button
      onClick={toggleWishlist}
      className={cn(
        "flex items-center justify-center transition-all active:scale-95",
        className
      )}
      title="Toggle Wishlist"
    >
      <Heart
        className={cn(
          "transition-colors",
          isWishlisted ? "fill-red-500 text-red-500" : "text-muted-foreground hover:text-red-400",
          iconClassName
        )}
      />
    </button>
  );
}
