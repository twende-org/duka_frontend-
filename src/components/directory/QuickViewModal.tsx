import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Store,
  ShoppingBag,
  ArrowRight,
  Minus,
  Plus,
  Star,
  Link2,
  Mail,
  Facebook,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { BsWhatsapp } from "react-icons/bs";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { ProfessionalImage } from "@/components/common/ProfessionalImage";
import { WishlistButton } from "@/components/common/WishlistButton";
import { Button } from "@/components/ui/button";
import { MarketplaceProductCard } from "./MarketplaceProductCard";
import type { Product, Shop } from "@/types";
import { trackEvent } from "@/lib/analytics";
import { useI18n } from "@/lib/i18n";
interface QuickViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  shop: Shop | null;
  crossSellItems: Array<{ product: Product; shop: Shop }>;
  onCrossSellClick: (item: { product: Product; shop: Shop }) => void;
}

export function QuickViewModal({
  isOpen,
  onClose,
  product,
  shop,
  crossSellItems,
  onCrossSellClick,
}: QuickViewModalProps) {
  const { t } = useI18n();
  const moq = Math.max(1, Number((product as any)?.moq) || 1);
  const [qty, setQty] = useState(moq);
  const [activeImage, setActiveImage] = useState<string | undefined>(undefined);

  const gallery = useMemo(() => {
    if (!product) return [] as string[];
    const extra = ((product as any).images || (product as any).gallery || []) as string[];
    return Array.from(new Set([product.imageUrl, ...extra].filter(Boolean))) as string[];
  }, [product]);

  useEffect(() => {
    setQty(moq);
    setActiveImage(product?.imageUrl);
  }, [product?.id, moq, product?.imageUrl]);

  if (!isOpen || !product || !shop) return null;

  const shopUrl = `https://duka.twendedigital.tech/shop/${shop.slug || shop.id}?productId=${product.id}`;
  const unitPrice = product.sellingPrice || 0;
  const subtotal = unitPrice * qty;

  const handleWhatsApp = () => {
    trackEvent("whatsapp_click", {
      shopId: shop.id,
      shopName: shop.name,
      productId: product.id,
      productName: product.name,
      source: "marketplace_quick_view",
    });

    let phoneNumber = shop.whatsappNumber || shop.phone || "";
    if (phoneNumber.startsWith("0")) phoneNumber = "255" + phoneNumber.substring(1);

    const message = t("qv.waMessage")
      .replace("{shop}", shop.name)
      .replace("{product}", product.name)
      .replace("{qty}", qty.toString())
      .replace("{price}", unitPrice.toLocaleString())
      .replace("{total}", subtotal.toLocaleString())
      .replace("{link}", shopUrl);
    window.open(`https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`, "_blank");
  };

  const handleAddToOrder = () => {
    window.dispatchEvent(new CustomEvent("add-to-cart", { detail: { product, quantity: qty } }));
    toast.success(`${product.name} × ${qty} ${t("qv.addedToOrder")}`);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shopUrl);
      toast.success(t("qv.linkCopied"));
    } catch {
      toast.error(t("qv.copyFailed"));
    }
  };

  const shareBtn = "flex h-9 w-9 items-center justify-center rounded-full border border-border/60 text-muted-foreground transition-colors hover:border-primary/50 hover:bg-primary/10 hover:text-primary";

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
            className="relative z-10 m-auto flex h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-border/60 bg-card shadow-2xl md:h-[88vh]"
          >
            <button
              onClick={onClose}
              className="absolute right-3 top-3 z-30 flex h-9 w-9 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm backdrop-blur transition-all duration-300 hover:bg-destructive/10 hover:text-destructive group"
            >
              <X className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
            </button>

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
              {/* ── Gallery ─────────────────────────── */}
              <div className="flex w-full shrink-0 flex-col gap-2 p-3 md:w-1/2 md:p-6 h-[40%] md:h-auto min-h-0">
                <div className="relative overflow-hidden rounded-2xl bg-muted/30 flex-1 min-h-0 flex items-center justify-center">
                  <ProfessionalImage
                    src={activeImage || product.imageUrl}
                    alt={product.name}
                    aspectRatio="square"
                    className="h-full w-full"
                    imageClassName="object-contain p-2 md:p-4"
                  />
                  <div className="absolute right-2 top-2 z-20 rounded-full bg-background/90 p-1.5 md:p-2 shadow-sm backdrop-blur">
                    <WishlistButton product={product} shop={shop} className="h-4 w-4 md:h-5 md:w-5" iconClassName="h-4 w-4 md:h-5 md:w-5" />
                  </div>
                </div>

                {gallery.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-1 shrink-0">
                    {gallery.map((img) => (
                      <button
                        key={img}
                        onClick={() => setActiveImage(img)}
                        className={`h-12 w-12 md:h-16 md:w-16 shrink-0 overflow-hidden rounded-xl border-2 transition-all ${
                          (activeImage || product.imageUrl) === img
                            ? "border-primary"
                            : "border-border/50 hover:border-primary/40"
                        }`}
                      >
                        <img src={img} alt="" className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Details ─────────────────────────── */}
              <div className="flex w-full flex-col gap-2 md:gap-4 border-t border-border/50 p-3 md:w-1/2 md:border-l md:border-t-0 md:p-6 flex-1 min-h-0 overflow-hidden">
                <div className="shrink-0 flex items-center justify-between mb-1">
                  <Link
                    to={`/shop/${shop.slug || shop.id}`}
                    className="group flex items-center gap-2 w-fit bg-gradient-to-r from-primary/10 to-transparent hover:from-primary/15 hover:to-primary/5 border border-primary/20 hover:border-primary/40 pr-3 pl-1.5 py-1.5 rounded-xl transition-all shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]"
                  >
                    <div className="bg-primary/10 group-hover:bg-primary/20 p-1.5 rounded-lg text-primary transition-colors">
                       <Store className="h-3 w-3 md:h-3.5 md:w-3.5" />
                    </div>
                    <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-primary/80 group-hover:text-primary truncate max-w-[140px] transition-colors">
                      {shop.name}
                    </span>
                  </Link>
                </div>

                <div className="space-y-1 md:space-y-2 shrink-0">
                  <h2 className="text-lg font-extrabold leading-tight tracking-tight text-foreground md:text-3xl line-clamp-1">
                    {product.name}
                  </h2>
                  <div className="flex items-center gap-1.5 text-[10px] md:text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-0.5 font-bold text-foreground">
                      <Star className="h-3 w-3 md:h-3.5 md:w-3.5 fill-amber-500 text-amber-500" />
                      {(product as any).rating ? (product as any).rating.toFixed(1) : "New"}
                    </span>
                    {typeof (product as any).reviewCount === "number" && (
                      <span>({(product as any).reviewCount})</span>
                    )}
                  </div>
                </div>

                <div className="border-y border-border/50 py-2 md:py-4 shrink-0 flex flex-wrap items-baseline gap-2">
                  <span className="text-xl font-black tracking-tight text-foreground md:text-3xl">
                    TZS {unitPrice.toLocaleString()}
                  </span>
                  <span className="text-[10px] md:text-xs font-semibold text-muted-foreground">{t("qv.unitMin")}{moq})</span>
                </div>

                {product.description && (
                  <div className="flex-1 min-h-0 overflow-hidden flex flex-col shrink min-h-[2rem]">
                    <h4 className="mb-1 text-[10px] md:text-[11px] font-bold uppercase tracking-widest text-muted-foreground shrink-0">
                      {t("qv.description")}
                    </h4>
                    <p className="line-clamp-2 md:line-clamp-4 text-xs md:text-sm font-medium leading-snug md:leading-relaxed text-foreground/80 overflow-hidden text-ellipsis">
                      {product.description}
                    </p>
                  </div>
                )}

                {/* Quantity */}
                <div className="flex flex-wrap items-center gap-3 shrink-0">
                  <div className="flex items-center rounded-[0.8rem] border border-border/80 bg-background p-1 shrink-0 shadow-sm transition-all focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/10">
                    <button
                      onClick={() => setQty((q) => Math.max(moq, q - 1))}
                      className="flex h-7 w-7 md:h-9 md:w-9 items-center justify-center rounded-md text-foreground hover:bg-muted hover:text-primary active:scale-95 transition-all"
                    >
                      <Minus className="h-3 w-3 md:h-4 md:w-4" />
                    </button>
                    <input
                      type="number"
                      value={qty || ""}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        setQty(isNaN(val) ? 0 : val);
                      }}
                      onBlur={() => {
                        if (qty < moq || isNaN(qty)) setQty(moq);
                      }}
                      className="w-10 md:w-12 text-center text-xs md:text-sm font-bold bg-transparent border-none outline-none focus:ring-0 p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none text-foreground"
                    />
                    <button
                      onClick={() => setQty((q) => (q || 0) + 1)}
                      className="flex h-7 w-7 md:h-9 md:w-9 items-center justify-center rounded-md text-foreground hover:bg-muted hover:text-primary active:scale-95 transition-all"
                    >
                      <Plus className="h-3 w-3 md:h-4 md:w-4" />
                    </button>
                  </div>
                  <div className="text-[11px] md:text-sm shrink-0 flex flex-col justify-center">
                    <span className="text-muted-foreground leading-none mb-0.5 text-[9px] md:text-[10px] uppercase tracking-wider font-bold">{t("qv.estTotal")}</span>
                    <span className="font-extrabold text-foreground leading-none">TZS {subtotal.toLocaleString()}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-row gap-2 mt-auto shrink-0 pt-1 md:pt-0">
                  <Button
                    onClick={handleAddToOrder}
                    className="h-10 md:h-12 flex-1 rounded-xl text-xs md:text-sm font-bold shadow-lg shadow-primary/20 transition-transform active:scale-[0.98]"
                  >
                    <ShoppingBag className="mr-1.5 h-3.5 w-3.5 md:h-4 md:w-4" /> {t("qv.add")}
                  </Button>
                  {(shop.whatsappNumber || shop.phone) && (
                    <Button
                      variant="outline"
                      onClick={handleWhatsApp}
                      className="h-10 md:h-12 flex-1 rounded-xl border-primary/40 text-xs md:text-sm font-bold text-primary hover:bg-primary/10 hover:text-primary transition-transform active:scale-[0.98]"
                    >
                      <BsWhatsapp className="mr-1.5 h-3.5 w-3.5 md:h-4 md:w-4" /> {t("qv.quote")}
                    </Button>
                  )}
                </div>

                {/* Share */}
                <div className="mt-1 md:mt-2 flex items-center gap-2 pt-2 border-t border-border/30 shrink-0">
                  <span className="text-[10px] md:text-xs font-bold text-muted-foreground">{t("qv.share")}</span>
                  <button onClick={handleWhatsApp} className={`${shareBtn} h-7 w-7 md:h-9 md:w-9`} title="WhatsApp">
                    <BsWhatsapp className="h-3 w-3 md:h-4 md:w-4" />
                  </button>
                  <a className={`${shareBtn} h-7 w-7 md:h-9 md:w-9`} title="Facebook" target="_blank" rel="noreferrer" href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shopUrl)}`}>
                    <Facebook className="h-3 w-3 md:h-4 md:w-4" />
                  </a>
                  <a className={`${shareBtn} h-7 w-7 md:h-9 md:w-9`} title="Email" href={`mailto:?subject=${encodeURIComponent(product.name)}&body=${encodeURIComponent(shopUrl)}`}>
                    <Mail className="h-3 w-3 md:h-4 md:w-4" />
                  </a>
                  <button onClick={copyLink} className={`${shareBtn} h-7 w-7 md:h-9 md:w-9`} title="Copy link">
                    <Link2 className="h-3 w-3 md:h-4 md:w-4" />
                  </button>
                </div>
                {/* Cross-sell */}
                {crossSellItems.length > 0 && (
                  <div className="shrink-0 border-t border-border/30 mt-1 md:mt-2 pt-2">
                    <div className="mb-1.5 flex items-center justify-between px-1">
                      <h4 className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        {t("qv.otherItems")} <span className="text-primary">{shop.name}</span>
                      </h4>
                      <Link
                        to={`/shop/${shop.slug || shop.id}`}
                        className="flex items-center gap-1 text-[9px] md:text-[10px] font-bold text-primary hover:underline"
                      >
                        {t("qv.visitStore")} <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                    <div className="no-scrollbar flex gap-2 md:gap-3 overflow-x-auto px-1 pb-1">
                      {crossSellItems.map((item, idx) => (
                        <button
                          key={idx}
                          onClick={() => onCrossSellClick(item)}
                          className="flex flex-col gap-1 w-14 md:w-16 shrink-0 group text-left transition-transform hover:scale-[1.02]"
                        >
                          <div className="w-14 h-14 md:w-16 md:h-16 rounded-xl overflow-hidden border border-border/50 group-hover:border-primary transition-colors bg-muted/30">
                            <img
                              src={item.product.imageUrl || "/placeholder-product.jpg"}
                              alt={item.product.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <span className="text-[9px] md:text-[10px] font-bold truncate text-foreground/80 group-hover:text-primary w-full">
                            TZS {item.product.sellingPrice?.toLocaleString()}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
