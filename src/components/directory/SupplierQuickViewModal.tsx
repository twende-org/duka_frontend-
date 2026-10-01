import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Store, MapPin, ShieldCheck, Star, ArrowRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import type { Shop, Product } from "@/types";
import { useI18n } from "@/lib/i18n";
import { getProductsByShop } from "@/lib/api/domains/storefront";
import { useAuth } from "@/components/AuthProvider";

interface SupplierQuickViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  shop: Shop | null;
}

export function SupplierQuickViewModal({
  isOpen,
  onClose,
  shop,
}: SupplierQuickViewModalProps) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  useEffect(() => {
    if (isOpen && shop?.id) {
      const loadProducts = async () => {
        setLoadingProducts(true);
        try {
          const fetched = await getProductsByShop(shop.id);
          // Just get top 4 products for preview
          setProducts(fetched.slice(0, 4));
        } catch (error) {
          console.error("Failed to load shop products", error);
        } finally {
          setLoadingProducts(false);
        }
      };
      loadProducts();
    } else {
      setProducts([]);
    }
  }, [isOpen, shop?.id]);

  if (!isOpen || !shop) return null;

  const handleVisitStore = () => {
    onClose();
    if (user) {
      navigate(`/shop/${shop.slug || shop.id}`);
    } else {
      navigate(`/login?returnTo=/shop/${shop.slug || shop.id}`);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden p-2 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-foreground/40 backdrop-blur-md"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="relative z-10 m-auto flex h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-border/60 bg-card shadow-2xl md:h-[80vh]"
          >
            <button
              onClick={onClose}
              className="absolute right-3 top-3 z-30 flex h-9 w-9 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm backdrop-blur transition-all duration-300 hover:bg-destructive/10 hover:text-destructive group"
            >
              <X className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
            </button>

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
              {/* ── Visual Section ─────────────────────────── */}
              <div className="flex w-full shrink-0 flex-col bg-muted/20 md:w-5/12 h-48 md:h-auto min-h-0 relative">
                <div className="absolute inset-0 z-0">
                   {shop.coverImage ? (
                     <img src={shop.coverImage} alt="Cover" className="w-full h-full object-cover opacity-80" />
                   ) : (
                     <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5" />
                   )}
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent md:bg-gradient-to-r md:from-transparent md:to-background z-0" />
                
                <div className="relative z-10 flex flex-col items-center justify-center h-full p-6 text-center">
                  {shop.imageUrl ? (
                    <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl overflow-hidden shadow-xl border-4 border-background bg-white mb-4">
                      <img src={shop.imageUrl} alt={shop.name} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-xl border-4 border-background mb-4">
                      <Store className="h-10 w-10 md:h-12 md:w-12" />
                    </div>
                  )}
                  
                  <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground line-clamp-2">
                    {shop.name}
                  </h2>
                  {shop.isPublic && (
                    <div className="flex items-center gap-1.5 mt-2 text-green-600 bg-green-500/10 px-3 py-1 rounded-full text-xs font-bold border border-green-500/20">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Verified Wholesale Supplier
                    </div>
                  )}
                </div>
              </div>

              {/* ── Details Section ─────────────────────────── */}
              <div className="flex w-full flex-col gap-4 border-t border-border/50 p-4 md:w-7/12 md:border-l md:border-t-0 md:p-8 flex-1 min-h-0 overflow-y-auto">
                <div className="space-y-4">
                  
                  <div className="flex items-center gap-0.5 text-amber-500">
                    {[1,2,3,4,5].map(i => <Star key={i} className="h-4 w-4 fill-current" />)}
                    <span className="text-xs font-bold text-foreground ml-2">Top Rated</span>
                  </div>

                  {shop.location && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1.5 font-medium">
                      <MapPin className="h-4 w-4 text-primary/70 shrink-0" />
                      {shop.location}
                    </p>
                  )}

                  {shop.businessCategories && shop.businessCategories.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {shop.businessCategories.map(cat => (
                        <span key={cat} className="px-2.5 py-1 rounded-lg bg-secondary text-secondary-foreground text-[10px] md:text-xs font-bold uppercase tracking-wider">
                          {cat}
                        </span>
                      ))}
                    </div>
                  )}

                  {shop.description && (
                    <p className="text-sm font-medium leading-relaxed text-foreground/80">
                      {shop.description}
                    </p>
                  )}
                </div>

                <div className="mt-6 flex-1">
                  <h4 className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    {t("wholesale.topProducts") || "Top Products"}
                  </h4>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {loadingProducts ? (
                      Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="rounded-xl bg-muted/40 aspect-square animate-pulse" />
                      ))
                    ) : products.length > 0 ? (
                      products.map(p => (
                        <div key={p.id} className="group relative rounded-xl border border-border/50 bg-card overflow-hidden">
                          <div className="aspect-square bg-muted/20">
                            <img src={p.imageUrl || "/placeholder-product.jpg"} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                          </div>
                          <div className="p-2 bg-gradient-to-t from-background/90 to-background/20 absolute bottom-0 inset-x-0">
                            <p className="text-[10px] font-bold text-foreground truncate">{p.name}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-full py-4 text-center text-xs text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-border">
                        No products available for preview.
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-auto pt-6 border-t border-border/30">
                  <Button
                    onClick={handleVisitStore}
                    className="w-full h-12 md:h-14 rounded-xl text-sm md:text-base font-bold shadow-lg shadow-primary/20 transition-transform active:scale-[0.98] group"
                  >
                    {t("wholesale.visitStore")}
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>

              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
