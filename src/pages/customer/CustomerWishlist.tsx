import React, { useState, useEffect } from "react";
import { Heart, Trash2, Store, ShoppingCart, ExternalLink } from "lucide-react";
import { hasApiSession } from "@/lib/api";
import { getWishlistItems, removeWishlistItem, WishlistItem } from "@/lib/services/wishlistService";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useI18n } from "@/lib/i18n";
import { WishlistCheckoutModal } from "@/components/customer/WishlistCheckoutModal";

function Skeleton() {
  return (
    <div className="bg-card rounded-2xl border border-border/40 p-4 space-y-3 animate-pulse">
      <div className="flex justify-between"><div className="h-5 w-24 bg-muted rounded-full" /><div className="h-8 w-8 bg-muted rounded-xl" /></div>
      <div className="h-4 w-3/4 bg-muted rounded-lg" />
      <div className="pt-3 border-t border-border flex justify-between items-end"><div className="h-5 w-20 bg-muted rounded-lg" /><div className="h-9 w-24 bg-muted rounded-xl" /></div>
    </div>
  );
}

export default function CustomerWishlist() {
  const { lang } = useI18n();
  const sw = lang === "sw";
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  
  // Checkout Modal State
  const [checkoutShopId, setCheckoutShopId] = useState<string | null>(null);

  useEffect(() => {
    // The wishlist service switches between the API and localStorage on the JWT
    // session, so "guest" is simply "no stored token pair".
    let cancelled = false;
    const load = async () => {
      setIsGuest(!hasApiSession());
      try {
        const rows = await getWishlistItems();
        if (!cancelled) setItems(rows);
      }
      catch {
        if (!cancelled) toast.error(sw ? "Imeshindwa kupakia wishlist." : "Failed to load wishlist.");
      }
      finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  const remove = async (productId: string, name: string) => {
    setRemoving(productId);
    try {
      await removeWishlistItem(productId);
      setItems(p => p.filter(i => i.productId !== productId));
      toast.success(`"${name}" ${sw ? "imeondolewa kwenye wishlist." : "removed from wishlist."}`);
    } catch { 
      toast.error(sw ? "Imeshindwa kuondoa bidhaa." : "Failed to remove item."); 
    }
    finally { setRemoving(null); }
  };

  const handleCheckoutSuccess = (purchasedProductIds: string[]) => {
    setItems(p => p.filter(i => !purchasedProductIds.includes(i.productId)));
  };

  const groupedItems = items.reduce((acc, item) => {
    if (!acc[item.shopId]) {
      acc[item.shopId] = {
        shopName: item.shopName || "Unknown Shop",
        items: []
      };
    }
    acc[item.shopId].items.push(item);
    return acc;
  }, {} as Record<string, { shopName: string, items: WishlistItem[] }>);

  const selectedShopGroup = checkoutShopId ? groupedItems[checkoutShopId] : null;

  return (
    <div className="space-y-4">
      {isGuest && items.length > 0 && (
        <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4 justify-between">
          <div>
            <h3 className="text-sm font-bold text-primary">{sw ? "Akaunti ya Wageni" : "Guest Wishlist"}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {sw ? "Ingia kwenye akaunti ili kuhifadhi bidhaa hizi moja kwa moja." : "Log in or create an account to save these items permanently across all your devices."}
            </p>
          </div>
          <Link to="/explore" className="shrink-0 bg-primary text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-primary/90 transition-colors">
            {sw ? "Ingia / Jisajili" : "Login / Signup"}
          </Link>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-rose-500 fill-rose-500 shrink-0" />
          <div>
            <h1 className="text-xl font-extrabold text-foreground">{sw ? "Wishlist Yangu" : "My Wishlist"}</h1>
            <p className="text-xs text-muted-foreground">{loading ? "..." : `${items.length} ${sw ? "bidhaa" : "items"}`}</p>
          </div>
        </div>
        <Link to="/explore"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-white text-xs font-bold shadow-md shadow-primary/25 active:scale-95 transition-all">
          <ShoppingCart className="h-3.5 w-3.5" />
          {sw ? "Ongeza Bidhaa" : "Add More"}
        </Link>
      </div>

      {/* Grouped Content */}
      <div className="space-y-8">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} />)}
          </div>
        ) : items.length > 0 ? (
          Object.entries(groupedItems).map(([shopId, group]) => (
            <div key={shopId} className="bg-card rounded-3xl border border-border/50 overflow-hidden shadow-sm">
              <div className="bg-muted/30 p-4 border-b border-border/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center">
                    <Store className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-bold text-lg text-foreground leading-tight">{group.shopName}</h2>
                    <p className="text-xs text-muted-foreground">{group.items.length} {sw ? "bidhaa" : "items"} saved</p>
                  </div>
                </div>
                <button 
                  onClick={() => setCheckoutShopId(shopId)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-bold shadow-md shadow-primary/20 hover:bg-primary/90 active:scale-95 transition-all"
                >
                  <ShoppingCart className="h-4 w-4" />
                  {sw ? "Nunua Zote Hapa" : `Checkout from ${group.shopName}`}
                </button>
              </div>
              
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <AnimatePresence initial={false}>
                  {group.items.map((item, i) => (
                    <motion.div key={item.id}
                      initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.94, height: 0, marginBottom: 0 }}
                      transition={{ delay: i * 0.04, duration: 0.2 }}
                      className="bg-background rounded-2xl border border-border/50 p-4 flex flex-col gap-3 hover:border-primary/20 hover:shadow-md transition-all group">

                      {/* Remove Button */}
                      <div className="flex items-center justify-between gap-2">
                        <Link to={`/explore?shop=${item.shopId}`} className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1">
                          View in Shop <ExternalLink className="w-3 h-3" />
                        </Link>
                        <button onClick={() => remove(item.productId, item.name)}
                          disabled={removing === item.productId}
                          className="h-8 w-8 rounded-xl hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-900/20 text-muted-foreground flex items-center justify-center shrink-0 transition-colors active:scale-90">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Product name */}
                      <p className="text-sm font-bold text-foreground line-clamp-2 leading-snug flex-1">{item.name}</p>

                      {/* Price */}
                      <div className="pt-2.5 border-t border-border/40">
                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">{sw ? "Bei" : "Price"}</p>
                        <p className="text-lg font-black text-foreground leading-tight">
                          {(item.price || 0).toLocaleString()} <span className="text-[10px] font-normal text-muted-foreground">TZS</span>
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-14 text-center gap-3 bg-card rounded-3xl border border-border/50">
            <div className="relative">
              <div className="h-14 w-14 rounded-3xl bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center">
                <Heart className="h-6 w-6 text-rose-400" />
              </div>
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center text-[10px] font-black text-rose-500">0</span>
            </div>
            <div><p className="font-bold text-sm text-foreground">{sw ? "Wishlist Yako Iko Tupu" : "Your Wishlist is Empty"}</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">{sw ? "Bofya ❤️ kwenye bidhaa yoyote ili kuihifadhi hapa." : "Tap ❤️ on any product to save it here."}</p></div>
            <Link to="/explore"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-primary text-white text-xs font-bold shadow-md shadow-primary/25 active:scale-95 transition-all">
              <ShoppingCart className="h-4 w-4" />{sw ? "Tafuta Bidhaa" : "Browse Products"}
            </Link>
          </div>
        )}
      </div>

      {selectedShopGroup && (
        <WishlistCheckoutModal
          isOpen={!!checkoutShopId}
          onClose={() => setCheckoutShopId(null)}
          shopId={checkoutShopId!}
          shopName={selectedShopGroup.shopName}
          items={selectedShopGroup.items}
          onSuccess={handleCheckoutSuccess}
        />
      )}
    </div>
  );
}

