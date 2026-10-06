import { useState } from "react";
import { generateAICopy } from "@/lib/api/domains/ai";
import {
  Package,
  Search,
  Copy,
  Sparkles,
  LayoutGrid,
  Loader2,
  Download,
} from "lucide-react";
import { BsWhatsapp } from "react-icons/bs";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ProfessionalImage } from "@/components/common/ProfessionalImage";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import type { Shop, Product, Stock } from "@/types";

interface ShareProductsFeedDialogProps {
  shop: Shop;
  products: Product[];
  stockMap: Map<string, Stock>;
  trigger?: React.ReactNode;
}

// ─── Image helpers ────────────────────────────────────────────────────────────

/**
 * Get a product image as a high-quality File object.
 *
 * Tries in order:
 *   1. fetch() — simplest, works if the server allows cross-origin requests
 *   2. Canvas with crossOrigin — works if the source host sends CORS headers
 *
 * On success: returns a File at ≥1080px, quality 1.0
 * On failure: returns null
 */
async function imageUrlToFile(url: string, productId: string): Promise<File | null> {
  // ── Method 1: Direct fetch (most reliable) ────────────────────────────────
  try {
    const res = await fetch(url, { credentials: "omit" });
    if (res.ok) {
      const blob = await res.blob();
      if (blob.size > 0) {
        // Re-draw on canvas to upscale if needed
        const upscaled = await upscaleBlobToFile(blob, productId);
        return upscaled || new File([blob], `bidhaa-${productId}.jpg`, { type: blob.type || "image/jpeg" });
      }
    }
  } catch (fetchErr) {
    console.warn("fetch() failed for image, trying canvas:", fetchErr);
  }

  // ── Method 2: Canvas with crossOrigin (CORS fallback) ─────────────────────
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = buildCanvas(img);
        const ctx = canvas.getContext("2d")!;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => resolve(blob && blob.size > 0
            ? new File([blob], `bidhaa-${productId}.jpg`, { type: "image/jpeg" })
            : null),
          "image/jpeg", 1.0
        );
      } catch {
        resolve(null); // Canvas tainted — CORS not supported by this server
      }
    };
    img.onerror = () => resolve(null);
    img.src = url; // No modification — keep the original URL intact
  });
}

/** Build a canvas from an img element, upscaling to at least 1080px */
function buildCanvas(img: HTMLImageElement): HTMLCanvasElement {
  const MIN = 1080;
  const w = img.naturalWidth || 800;
  const h = img.naturalHeight || 800;
  const scale = Math.max(w, h) < MIN ? MIN / Math.max(w, h) : 1;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  return canvas;
}

/** Upscale a blob via canvas — returns a high-quality JPEG File */
async function upscaleBlobToFile(blob: Blob, productId: string): Promise<File | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      try {
        const canvas = buildCanvas(img);
        const ctx = canvas.getContext("2d")!;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (b) => resolve(b && b.size > 0
            ? new File([b], `bidhaa-${productId}.jpg`, { type: "image/jpeg" })
            : null),
          "image/jpeg", 1.0
        );
      } catch { resolve(null); }
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
}


/** Auto-download an image File to the user's device */
function downloadFile(file: File) {
  const objUrl = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = objUrl;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(objUrl), 20_000);
}

/** Format phone to international format for wa.me (Tanzania: 0... → 255...) */
function formatPhoneForWa(phone?: string): string {
  if (!phone) return "";
  const digits = phone.replace(/[^0-9]/g, "");
  if (digits.startsWith("0")) return "255" + digits.slice(1);
  if (!digits.startsWith("255") && digits.length <= 9) return "255" + digits;
  return digits;
}

/**
 * Open WhatsApp with a pre-filled message.
 * Tries: 1) whatsapp:// app URI (opens WhatsApp desktop/mobile app)
 *        2) wa.me deep link (opens app on mobile, WhatsApp Web on desktop)
 */
function openWhatsAppLink(phone: string, message: string) {
  const waPhone = formatPhoneForWa(phone);
  const encoded = encodeURIComponent(message);
  // Try the deep link protocol first — opens WhatsApp app on both desktop and mobile
  // On mobile: always opens app. On desktop: opens app if WhatsApp Desktop is installed.
  const deepLink = `whatsapp://send?phone=${waPhone}&text=${encoded}`;
  const webLink = `https://wa.me/${waPhone}?text=${encoded}`;

  // Try to open the app protocol; if after 1.5s the page is still focused, the app
  // didn't open — fall back to the web link.
  const start = Date.now();
  window.location.href = deepLink;
  setTimeout(() => {
    // If the page blurred (app opened), don't open web link
    if (Date.now() - start < 2000) {
      window.open(webLink, "_blank", "noopener,noreferrer");
    }
  }, 1500);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ShareProductsFeedDialog({
  shop,
  products,
  stockMap,
  trigger,
}: ShareProductsFeedDialogProps) {
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [aiCaptions, setAiCaptions] = useState<Record<string, string>>({});
  const [loadingAi, setLoadingAi] = useState<Record<string, boolean>>({});
  const [isSharing, setIsSharing] = useState<Record<string, boolean>>({});
  const [isDownloading, setIsDownloading] = useState<Record<string, boolean>>({});
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null); // fullscreen image for manual save

  const filteredProducts = products.filter((p) => {
    const stock = stockMap.get(p.id)?.quantity ?? 0;
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.category?.toLowerCase().includes(search.toLowerCase());
    return stock > 0 && matchesSearch;
  });

  // ── AI caption generation ─────────────────────────────────────────────────
  const generateAiCaption = async (product: Product) => {
    setLoadingAi((prev) => ({ ...prev, [product.id]: true }));
    try {
      const conditionLabel =
        shop.productCondition === "secondhand"
          ? "MTUMBA (bidhaa ya pili, second hand) — KAMWE usiseme 'mpya' au 'brand new'"
          : shop.productCondition === "both"
          ? "Mpya NA Mtumba — eleza hali halisi ya bidhaa hii"
          : "MPYA (brand new) — KAMWE usiseme 'mtumba' au 'second hand'";

      const prompt = `Wewe ni mtaalamu wa masoko ya kidijitali.
      Tengeneza tangazo fupi la kuvutia kwa ajili ya bidhaa hii inayouzwa katika duka la ${shop.name}.
      
      Maelezo ya Bidhaa:
      - Jina: ${product.name}
      - Bei: TZS ${product.sellingPrice.toLocaleString()}
      - Jamii: ${product.category || "General"}
      - Hali ya Bidhaa: ${conditionLabel}
      
      SHERIA:
      1. Tumia KISWAHILI tu.
      2. Tumia lugha inayovutia wateja.
      3. Ongeza emoji.
      4. Usizidi maneno 35.
      5. USIWEKE LINK YOYOTE.
      6. LAZIMA ubainishe hali ya bidhaa (mpya au mtumba) kwa usahihi kamili.
      7. Mwishoni andika: "Piga simu sasa: ${shop.phone || "Wasiliana nasi"}"`;

      const caption = await generateAICopy(prompt);
      setAiCaptions((prev) => ({ ...prev, [product.id]: caption.trim() }));
      toast.success("Tayari!");
    } catch {
      toast.error("Imeshindwa kutengeneza maelezo");
    } finally {
      setLoadingAi((prev) => ({ ...prev, [product.id]: false }));
    }
  };

  // ── Copy caption text ─────────────────────────────────────────────────────
  const copyCaption = (product: Product) => {
    const caption = buildCaption(product);
    navigator.clipboard.writeText(caption);
    toast.success("Imenakiliwa!");
  };

  const buildCaption = (product: Product): string => {
    const base =
      aiCaptions[product.id] ||
      `🛍️ ${product.name} — TZS ${product.sellingPrice.toLocaleString()}\n📞 Piga simu: ${shop.phone || shop.name}`;
    // Only append phone if AI didn't already include it
    const needsPhone = shop.phone && !base.includes(shop.phone);
    return needsPhone ? `${base}\n\n📞 Piga simu: ${shop.phone}` : base;
  };

  // ── Download image only ────────────────────────────────────────────────────
  const downloadProductImage = async (product: Product) => {
    if (!product.imageUrl) { toast.error("Bidhaa hii haina picha."); return; }
    setIsDownloading((prev) => ({ ...prev, [product.id]: true }));

    const toastId = toast.loading("Inaandaa picha...");
    try {
      const file = await imageUrlToFile(product.imageUrl, product.id);
      toast.dismiss(toastId);

      if (file) {
        // Download worked — trigger browser save dialog
        downloadFile(file);
        toast.success(
          "✅ Picha imehifadhiwa!  Sasa nenda WhatsApp → + → Picha → iambatanishe → tuma",
          { duration: 8000 }
        );
      } else {
        // Both fetch and canvas failed — show image in fullscreen overlay for manual save
        // NEVER navigate away from the app (that causes the blank page)
        setPreviewImageUrl(product.imageUrl);
        toast.info(
          "📲 Bonyeza picha na kushikilia → chagua 'Hifadhi Picha' ili kuihifadhi.",
          { duration: 8000 }
        );
      }
    } catch {
      toast.dismiss(toastId);
      toast.error("Imeshindwa kupakua picha.");
    } finally {
      setIsDownloading((prev) => ({ ...prev, [product.id]: false }));
    }
  };

  // ── Main share logic ──────────────────────────────────────────────────────
  /**
   * HOW THIS WORKS:
   *
   * Goal: Image as photo + caption as separate text (standard WhatsApp format)
   * so recipients can read, react and reply to the caption independently.
   *
   * Path A — Mobile (Android Chrome / iOS Safari):
   *   navigator.share({ files: [imageFile], text: caption })
   *   → Phone's native share sheet opens
   *   → User taps WhatsApp
   *   → WhatsApp receives the image AND pre-fills the caption text field
   *   → User hits send → recipient sees: [photo] with caption below ✅
   *
   * Path B — Desktop (no native share support):
   *   → Image auto-downloads to computer
   *   → WhatsApp Web opens with caption pre-filled in text box
   *   → User attaches the downloaded image and sends
   */
  const shareProduct = async (product: Product) => {
    setIsSharing((prev) => ({ ...prev, [product.id]: true }));
    const caption = buildCaption(product);

    try {
      // Step 1: Get the product image as a File using canvas (CORS-safe)
      const imageFile = product.imageUrl
        ? await imageUrlToFile(product.imageUrl, product.id)
        : null;

      // Step 2a: Best path — native share with image + text
      // On Android Chrome / iOS Safari this sends image+caption to WhatsApp natively
      if (
        imageFile &&
        typeof navigator.share === "function" &&
        navigator.canShare?.({ files: [imageFile] })
      ) {
        await navigator.share({ files: [imageFile], text: caption });
        return;
      }

      // Step 2b: Image fetched but browser doesn’t support file sharing
      // — auto-download image so user can attach manually + open WhatsApp with caption
      if (imageFile) {
        downloadFile(imageFile);
        openWhatsAppLink(shop.phone || "", caption);
        toast.info(
          "📥 Picha imehifadhiwa kwenye kifaa chako.\nNenda WhatsApp → ambatanisha picha → tuma!",
          { duration: 9000 }
        );
        return;
      }

      // Step 2c: No image at all — open WhatsApp with caption only
      openWhatsAppLink(shop.phone || "", caption);
      toast.info("WhatsApp inafunguliwa na maelezo ya bidhaa.", { duration: 5000 });
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      // Any failure — fall back to WhatsApp link
      console.warn("Share failed:", err);
      openWhatsAppLink(shop.phone || "", caption);
    } finally {
      setIsSharing((prev) => ({ ...prev, [product.id]: false }));
    }
  };


  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm" className="gap-2">
            <LayoutGrid className="h-4 w-4" />
            Shiriki
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="p-0 gap-0 border-none shadow-2xl rounded-[1.25rem] sm:rounded-[2rem] bg-background w-[calc(100%-1rem)] max-w-[96vw] sm:max-w-[650px] max-h-[92vh] flex flex-col overflow-hidden fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">

        {/* Header */}
        <DialogHeader className="px-4 sm:px-6 pt-5 sm:pt-6 pb-3 sm:pb-4 bg-gradient-to-r from-primary/10 via-background to-background border-b relative overflow-hidden flex-shrink-0 text-left items-start">
          <div className="absolute -right-4 -top-4 opacity-5 pointer-events-none">
            <Sparkles className="h-20 sm:h-24 w-20 sm:w-24 text-primary" />
          </div>
          <div className="relative z-10 pr-6">
            <DialogTitle className="text-base sm:text-xl font-black tracking-tight flex items-center gap-2">
              <Sparkles className="h-4 sm:h-5 w-4 sm:w-5 text-primary animate-pulse flex-shrink-0" />
              Shiriki Picha + Maelezo
            </DialogTitle>
            <p className="text-[9px] sm:text-[10px] font-black text-muted-foreground mt-1 uppercase tracking-[0.2em] opacity-60">
              {shop.name} • Picha + Maandishi Tofauti kama WhatsApp ya Kawaida
            </p>
          </div>
        </DialogHeader>

        {/* Search */}
        <div className="px-4 sm:px-6 py-3 bg-muted/20 border-b flex items-center gap-2 flex-shrink-0">
          <div className="relative flex-1 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Tafuta bidhaa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 rounded-xl border-none bg-background shadow-sm focus-visible:ring-2 focus-visible:ring-primary/20 transition-all text-sm w-full"
            />
          </div>
          <Badge variant="outline" className="h-10 px-3 rounded-xl border-border/40 font-black text-[9px] uppercase tracking-widest bg-background flex-shrink-0">
            {filteredProducts.length}
          </Badge>
        </div>

        {/* Product list */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 custom-scrollbar space-y-4 min-h-0">
          <AnimatePresence mode="popLayout">
            {filteredProducts.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-12 text-center"
              >
                <Package className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm font-bold text-foreground">Hakuna bidhaa zilizo na stoki</p>
              </motion.div>
            ) : (
              filteredProducts.map((product, idx) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="group flex flex-col gap-3 p-3.5 sm:p-5 rounded-[1rem] sm:rounded-[1.75rem] border bg-card hover:border-primary/30 shadow-sm transition-all duration-300"
                >
                  {/* Product info row */}
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className="h-16 w-16 sm:h-28 sm:w-28 rounded-xl overflow-hidden bg-muted flex-shrink-0 border">
                      <ProfessionalImage
                        src={product.imageUrl || "/placeholder-product.jpg"}
                        alt={product.name}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm sm:text-lg font-black text-foreground truncate group-hover:text-primary transition-colors">
                        {product.name}
                      </h4>
                      <p className="text-base sm:text-xl font-black text-primary mt-0.5">
                        TZS {product.sellingPrice.toLocaleString()}
                      </p>
                      <Button
                        onClick={() => generateAiCaption(product)}
                        disabled={loadingAi[product.id]}
                        size="sm"
                        variant="secondary"
                        className="h-7 sm:h-8 px-2.5 mt-2 rounded-lg text-[8px] sm:text-[10px] font-black uppercase tracking-widest gap-2 bg-primary/5 text-primary hover:bg-primary/10 border-none shadow-none"
                      >
                        {loadingAi[product.id] ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Sparkles className="h-3 w-3" />
                        )}
                        {aiCaptions[product.id] ? "Maelezo Mapya" : "Caption (AI)"}
                      </Button>
                    </div>
                  </div>

                  {/* Caption preview box */}
                  {aiCaptions[product.id] && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="bg-primary/5 rounded-xl p-3 sm:p-4 border border-primary/10 relative"
                    >
                      <button
                        onClick={() => copyCaption(product)}
                        title="Nakili maelezo"
                        className="absolute top-2 right-2 h-7 w-7 rounded-lg bg-background flex items-center justify-center hover:bg-primary hover:text-white transition-all shadow-sm"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <p className="text-xs sm:text-sm font-medium text-foreground pr-8 leading-relaxed whitespace-pre-line">
                        {aiCaptions[product.id]}
                      </p>
                    </motion.div>
                  )}

                  {/* Action buttons */}
                  <div className="pt-3 border-t border-border/50 space-y-2">

                    {/* Step hint (always visible when product has image) */}
                    {product.imageUrl && (
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium bg-muted/40 rounded-lg px-3 py-2">
                        <span className="text-primary font-black">📋 Jinsi ya kutuma:</span>
                        <span>1) Pakua picha → 2) Fungua WhatsApp → 3) Ambatanisha + tuma</span>
                      </div>
                    )}

                    <div className="flex gap-2">
                      {/* Download image button — always available */}
                      {product.imageUrl && (
                        <Button
                          onClick={() => downloadProductImage(product)}
                          disabled={isDownloading[product.id] || isSharing[product.id]}
                          variant="outline"
                          className="h-12 sm:h-14 px-3 sm:px-4 rounded-xl sm:rounded-2xl border-2 border-primary/30 text-primary hover:bg-primary/5 font-black text-[9px] sm:text-[10px] uppercase tracking-widest gap-2 flex-shrink-0"
                          title="Pakua picha ya bidhaa"
                        >
                          {isDownloading[product.id] ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                          <span className="hidden sm:inline">Pakua Picha</span>
                        </Button>
                      )}

                      {/* WhatsApp share button */}
                      <Button
                        onClick={() => shareProduct(product)}
                        disabled={isSharing[product.id] || isDownloading[product.id]}
                        className="flex-1 h-12 sm:h-14 rounded-xl sm:rounded-2xl bg-[#25D366] hover:bg-[#1ebe5d] active:bg-[#17a850] text-white font-black text-xs sm:text-sm uppercase tracking-widest gap-3 shadow-lg shadow-green-500/20 transition-all"
                      >
                        {isSharing[product.id] ? (
                          <>
                            <Loader2 className="h-5 w-5 animate-spin" />
                            Inaandaa...
                          </>
                        ) : (
                          <>
                            <BsWhatsapp className="h-5 w-5" />
                            Tuma WhatsApp
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-4 bg-muted/10 border-t flex items-center justify-between flex-shrink-0">
          <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-60">
            AI Caption • Picha + Maandishi Tofauti
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setOpen(false)}
            className="font-black text-[9px] uppercase tracking-widest h-8 px-4 border"
          >
            Funga
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    {/* ── Fullscreen image overlay for manual save ──────────────────────────
        Shown when automatic download fails (CORS blocked).
        User can long-press the image on mobile to save it.
    ─────────────────────────────────────────────────────────────────────── */}
    {previewImageUrl && (
      <div
        className="fixed inset-0 z-[9999] bg-black/95 flex flex-col items-center justify-center"
        onClick={() => setPreviewImageUrl(null)}
      >
        {/* Instruction banner */}
        <div className="absolute top-0 inset-x-0 bg-primary px-4 py-3 text-center z-10">
          <p className="text-white font-black text-sm tracking-wide">
            📲 BONYEZA PICHA NA KUSHIKILIA → "Hifadhi Picha"
          </p>
          <p className="text-primary-foreground/80 text-xs mt-0.5">
            Kisha rudi WhatsApp na iambatanishe katika ujumbe wako
          </p>
        </div>

        {/* Full-size image — user long-presses here */}
        <img
          src={previewImageUrl}
          alt="Bidhaa"
          className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl mt-16"
          onClick={(e) => e.stopPropagation()} // don't close when tapping image
          onContextMenu={(e) => e.stopPropagation()} // allow browser context menu on image
        />

        {/* Close button */}
        <button
          onClick={() => setPreviewImageUrl(null)}
          className="absolute top-20 right-4 bg-white/10 hover:bg-white/20 text-white rounded-full w-10 h-10 flex items-center justify-center text-xl font-bold backdrop-blur-sm transition-all"
          aria-label="Funga"
        >
          ✕
        </button>

        <p className="mt-4 text-white/50 text-xs">
          Bonyeza nje ya picha kufunga
        </p>
      </div>
    )}
    </>
  );
}
