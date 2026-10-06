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
  Check,
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
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { adjustStock } from "@/store/inventorySlice";

interface ShareSoldOutDialogProps {
  shop: Shop;
  products: Product[];
  stockMap: Map<string, Stock>;
  trigger?: React.ReactNode;
}

type StickerStyle = "classic" | "ribbon" | "stamp" | "minimal";

const STICKER_STYLES: { id: StickerStyle; name: string; preview: string }[] = [
  { id: "classic", name: "Classic Badge", preview: "bg-white border-red-500 text-red-500" },
  { id: "ribbon", name: "Modern Sash", preview: "bg-gradient-to-r from-red-800 via-red-500 to-red-800 text-white rotate-[-12deg] shadow-sm" },
  { id: "stamp", name: "Premium Seal", preview: "bg-red-600 text-white rounded-full w-8 h-8 flex-col gap-0 border-2 border-white/30 shadow-inner" },
  { id: "minimal", name: "Minimal", preview: "bg-black/60 text-white" },
];

// ─── Image & Canvas Helpers ──────────────────────────────────────────────────

async function loadImg(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

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

async function composeSoldOutImage(
  url: string,
  productId: string,
  style: StickerStyle,
  lang: "sw" | "en"
): Promise<File | null> {
  const img = await loadImg(url);
  if (!img) return null;

  const canvas = buildCanvas(img);
  const ctx = canvas.getContext("2d")!;
  const w = canvas.width;
  const h = canvas.height;

  // Draw product image
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, w, h);

  const soldText = lang === "sw" ? "IMEUZWA" : "SOLD OUT";
  const thanksText = lang === "sw" ? "Asante kwa Wateja Wetu!" : "Thank you, Customers!";

  // Reusable rounded-rect path helper
  function rrect(rx: number, ry: number, rw: number, rh: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(rx + r, ry);
    ctx.lineTo(rx + rw - r, ry);
    ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + r);
    ctx.lineTo(rx + rw, ry + rh - r);
    ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - r, ry + rh);
    ctx.lineTo(rx + r, ry + rh);
    ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - r);
    ctx.lineTo(rx, ry + r);
    ctx.quadraticCurveTo(rx, ry, rx + r, ry);
    ctx.closePath();
  }

  ctx.save();

  if (style === "classic") {
    // ── Small pill badge anchored to bottom-right corner ──
    const bh = h * 0.072;          // badge height
    const bw = w * 0.30;           // badge width
    const margin = w * 0.03;
    const bx = w - bw - margin;
    const by = h - bh - margin;
    const br = bh / 2;             // full pill radius

    // Drop shadow
    ctx.shadowColor = "rgba(0,0,0,0.35)";
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 5;

    // White pill background
    ctx.fillStyle = "#ffffff";
    rrect(bx, by, bw, bh, br);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Red left accent cap
    ctx.fillStyle = "#ef4444";
    rrect(bx, by, bh * 1.1, bh, br);
    ctx.fill();

    // Checkmark in accent
    ctx.fillStyle = "#ffffff";
    ctx.font = `900 ${Math.round(bh * 0.44)}px 'Plus Jakarta Sans', Arial, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("\u2713", bx + bh * 0.55, by + bh * 0.52);

    // Sold text
    ctx.fillStyle = "#dc2626";
    ctx.font = `900 ${Math.round(bh * 0.32)}px 'Plus Jakarta Sans', Arial, sans-serif`;
    ctx.textAlign = "left";
    ctx.fillText(soldText, bx + bh * 1.28, by + bh * 0.52);

  } else if (style === "ribbon") {
    // ── High-End E-commerce Corner Ribbon ──
    const sashSize = Math.min(w, h) * 0.38;
    ctx.save();
    
    // Position at top-left
    ctx.rotate(-Math.PI / 4);
    
    // Sash shadow
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = 25;
    ctx.shadowOffsetY = 8;

    const sh = sashSize * 0.35;
    const sw = sashSize * 2.5;
    const sx = -sw / 2;
    const sy = sashSize * 0.15;

    // Gradient for 3D effect
    const rGrad = ctx.createLinearGradient(0, sy, 0, sy + sh);
    rGrad.addColorStop(0, "#991b1b");
    rGrad.addColorStop(0.3, "#ef4444");
    rGrad.addColorStop(0.7, "#dc2626");
    rGrad.addColorStop(1, "#7f1d1d");
    
    ctx.fillStyle = rGrad;
    ctx.fillRect(sx, sy, sw, sh);
    ctx.shadowBlur = 0;

    // Top/Bottom highlight lines
    ctx.strokeStyle = "rgba(255,255,255,0.4)";
    ctx.lineWidth = Math.max(1, w * 0.003);
    ctx.beginPath(); ctx.moveTo(sx, sy + 4); ctx.lineTo(sx + sw, sy + 4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sx, sy + sh - 4); ctx.lineTo(sx + sw, sy + sh - 4); ctx.stroke();

    // Text
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `black ${Math.round(sh * 0.55)}px 'Plus Jakarta Sans', Inter, Arial, sans-serif`;
    ctx.fillText(soldText, 0, sy + sh * 0.52);
    
    ctx.restore();

  } else if (style === "stamp") {
    // ── Modern 'Certified Sold' Seal ──
    const r = w * 0.16;
    const cx = w * 0.78;
    const cy = h * 0.22;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-Math.PI / 12);

    // Seal Outer Shadow
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = 20;
    ctx.shadowOffsetY = 10;

    // Scalloped Edge
    const pts = 48;
    ctx.beginPath();
    for (let i = 0; i <= pts * 2; i++) {
      const a = (Math.PI * i) / pts;
      const rad = i % 2 === 0 ? r : r * 0.94;
      ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
    }
    ctx.closePath();
    
    const sealG = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r);
    sealG.addColorStop(0, "#fca5a5");
    sealG.addColorStop(0.5, "#dc2626");
    sealG.addColorStop(1, "#7f1d1d");
    ctx.fillStyle = sealG;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Double White Rings
    ctx.strokeStyle = "rgba(255,255,255,0.6)";
    ctx.lineWidth = Math.max(2, w * 0.005);
    ctx.beginPath(); ctx.arc(0, 0, r * 0.88, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = Math.max(1, w * 0.002);
    ctx.beginPath(); ctx.arc(0, 0, r * 0.82, 0, Math.PI * 2); ctx.stroke();

    // Center Content
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    
    // Star
    ctx.font = `${Math.round(r * 0.3)}px 'Plus Jakarta Sans', Arial, sans-serif`;
    ctx.fillText("\u2605", 0, -r * 0.45);
    
    ctx.font = `900 ${Math.round(r * 0.42)}px 'Plus Jakarta Sans', Arial, sans-serif`;
    ctx.fillText("SOLD", 0, -r * 0.02);
    ctx.fillText("OUT", 0, r * 0.35);
    
    ctx.font = `800 ${Math.round(r * 0.16)}px 'Plus Jakarta Sans', Arial, sans-serif`;
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.fillText("VERIFIED", 0, r * 0.65);
    
    ctx.restore();

  } else if (style === "minimal") {
    // ── Slim gradient bar at bottom ──
    const barH = h * 0.11;
    const grad = ctx.createLinearGradient(0, h - barH * 2.4, 0, h);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(1, "rgba(0,0,0,0.88)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, h - barH * 2.4, w, barH * 2.4);

    const fs = Math.round(barH * 0.37);
    ctx.fillStyle = "#ffffff";
    ctx.font = `900 ${fs}px 'Plus Jakarta Sans', Arial, sans-serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText("\u2713 " + soldText, w * 0.04, h - barH * 0.75);
    ctx.font = `400 ${Math.round(fs * 0.62)}px 'Plus Jakarta Sans', Arial, sans-serif`;
    ctx.fillStyle = "rgba(255,255,255,0.62)";
    ctx.fillText(thanksText, w * 0.04, h - barH * 0.22);
  }

  ctx.restore();

  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => resolve(blob && blob.size > 0
        ? new File([blob], `sold-out-${productId}.jpg`, { type: "image/jpeg" })
        : null),
      "image/jpeg", 0.95
    );
  });
}

function formatPhoneForWa(phone?: string): string {
  if (!phone) return "";
  const digits = phone.replace(/[^0-9]/g, "");
  if (digits.startsWith("0")) return "255" + digits.slice(1);
  if (!digits.startsWith("255") && digits.length <= 9) return "255" + digits;
  return digits;
}

function openWhatsAppLink(phone: string, message: string) {
  const waPhone = formatPhoneForWa(phone);
  const encoded = encodeURIComponent(message);
  const deepLink = `whatsapp://send?phone=${waPhone}&text=${encoded}`;
  const webLink = `https://wa.me/${waPhone}?text=${encoded}`;

  const start = Date.now();
  window.location.href = deepLink;
  setTimeout(() => {
    if (Date.now() - start < 2000) {
      window.open(webLink, "_blank", "noopener,noreferrer");
    }
  }, 1500);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ShareSoldOutDialog({
  shop,
  products,
  stockMap,
  trigger,
}: ShareSoldOutDialogProps) {
  const { t } = useI18n();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState<StickerStyle>("classic");
  const [language, setLanguage] = useState<"sw" | "en">("sw");
  const [aiCaptions, setAiCaptions] = useState<Record<string, string>>({});
  const [loadingAi, setLoadingAi] = useState<Record<string, boolean>>({});
  const [isSharing, setIsSharing] = useState<Record<string, boolean>>({});
  const [isMarkingSold, setIsMarkingSold] = useState<Record<string, boolean>>({});

  const filteredProducts = products.filter((p) => {
    const stock = stockMap.get(p.id)?.quantity ?? 0;
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.category?.toLowerCase().includes(search.toLowerCase());
    return stock === 0 && matchesSearch;
  });

  const generateAiCaption = async (product: Product) => {
    setLoadingAi((prev) => ({ ...prev, [product.id]: true }));
    try {
      const prompt = `Wewe ni mtaalamu wa masoko ya kidijitali.
      Tengeneza tangazo la SHUKRANI kwa sababu bidhaa hii IMEUZWA (SOLD OUT) katika duka la ${shop.name}.
      
      Bidhaa: ${product.name}
      Bei iliyokuwa: TZS ${product.sellingPrice.toLocaleString()}
      
      SHERIA:
      1. Tumia lugha ya ${language === "sw" ? "KISWAHILI" : "KIINGEREZA"} pekee.
      2. Tumia lugha ya shukrani na bashasha. 🎉
      3. Waambie wateja wengine wasikate tamaa, bidhaa nyingine zinakuja.
      4. Usizidi maneno 30.
      5. USIWEKE LINK YOYOTE.
      6. Mwishoni andika: "${language === "sw" ? "Piga simu" : "Call"}: ${shop.phone || "Wasiliana nasi"}"`;

      const caption = await generateAICopy(prompt);
      setAiCaptions((prev) => ({ ...prev, [product.id]: caption.trim() }));
      toast.success("Tayari!");
    } catch {
      toast.error("Imeshindwa kutengeneza maelezo");
    } finally {
      setLoadingAi((prev) => ({ ...prev, [product.id]: false }));
    }
  };

  const shareProduct = async (product: Product) => {
    if (!product.imageUrl) {
        toast.error("Bidhaa haina picha");
        return;
    }
    setIsSharing((prev) => ({ ...prev, [product.id]: true }));
    
    const swCaption = `🎉 IMEUZWA! (SOLD OUT)\n\n${product.name}\n\nAsante sana kwa wateja wetu kwa kutuunga mkono. Tunaendelea kupata bidhaa mpya kila siku! 🛍️\n\n📞 Piga: ${shop.phone || shop.name}`;
    const enCaption = `🎉 SOLD OUT!\n\n${product.name}\n\nThank you so much to our customers for your support. We continue to receive new products every day! 🛍️\n\n📞 Call: ${shop.phone || shop.name}`;
    
    const baseCaption = aiCaptions[product.id] || (language === "sw" ? swCaption : enCaption);

    try {
      const compositeFile = await composeSoldOutImage(product.imageUrl, product.id, selectedStyle, language);

      if (compositeFile && navigator.canShare?.({ files: [compositeFile] })) {
        await navigator.share({ files: [compositeFile], text: baseCaption });
      } else if (compositeFile) {
        // Fallback: download + open wa
        const objUrl = URL.createObjectURL(compositeFile);
        const a = document.createElement("a");
        a.href = objUrl;
        a.download = `IMEUZWA-${product.name}.jpg`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(objUrl), 10000);
        
        openWhatsAppLink(shop.phone || "", baseCaption);
        toast.info("Picha imeshushwa. Iambatanishe WhatsApp!");
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        console.error(err);
        toast.error("Imeshindwa kushiriki");
      }
    } finally {
      setIsSharing((prev) => ({ ...prev, [product.id]: false }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm" className="gap-2 border-red-500/30 text-red-600 hover:bg-red-50">
            <Package className="h-4 w-4" />
            Tangaza Imeuzwa
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="p-0 border-none shadow-2xl rounded-[2rem] bg-background w-[calc(100%-1rem)] max-w-[650px] max-h-[92vh] flex flex-col overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 bg-red-500/10 border-b relative overflow-hidden flex-shrink-0 text-left items-start">
          <div className="relative z-10 pr-6">
            <DialogTitle className="text-xl font-black tracking-tight flex items-center gap-2 text-red-600">
              <Check className="h-5 w-5 animate-bounce" />
              {products.length === 1 ? `Tangaza "${products[0].name}" Imeuzwa` : "Tangaza Bidhaa Iliyouzwa"}
            </DialogTitle>
            <p className="text-[10px] font-black text-muted-foreground mt-1 uppercase tracking-[0.2em] opacity-60">
              {shop.name} • Sherehekea Mauzo na Wateja Wako
            </p>
          </div>
        </DialogHeader>

        {/* Language & Style Selector */}
        <div className="px-6 py-4 bg-muted/20 border-b flex-shrink-0 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
              LUGHA / LANGUAGE:
            </p>
            <div className="flex gap-2 bg-background/50 p-1 rounded-lg border">
              <button
                onClick={() => setLanguage("sw")}
                className={cn(
                  "px-3 py-1 rounded-md text-[10px] font-black transition-all",
                  language === "sw" ? "bg-primary text-white shadow-sm" : "hover:bg-muted"
                )}
              >
                SWAHILI
              </button>
              <button
                onClick={() => setLanguage("en")}
                className={cn(
                  "px-3 py-1 rounded-md text-[10px] font-black transition-all",
                  language === "en" ? "bg-primary text-white shadow-sm" : "hover:bg-muted"
                )}
              >
                ENGLISH
              </button>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-3">
              CHAGUA STYLE / CHOOSE STYLE:
            </p>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {STICKER_STYLES.map((style) => (
                <button
                  key={style.id}
                  onClick={() => setSelectedStyle(style.id)}
                  className={cn(
                    "flex-shrink-0 px-4 py-3 rounded-xl border-2 transition-all flex flex-col items-center gap-2 min-w-[100px]",
                    selectedStyle === style.id 
                      ? "border-red-500 bg-white shadow-md scale-105" 
                      : "border-border bg-card/50 hover:border-red-200"
                  )}
                >
                  <div className={cn("h-6 w-12 rounded flex items-center justify-center text-[8px] font-black uppercase", style.preview)}>
                    {language === "sw" ? "IMEUZWA" : "SOLD"}
                  </div>
                  <span className="text-[10px] font-bold whitespace-nowrap">{style.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Search - only show for multiple products */}
        {products.length > 1 && (
          <div className="px-6 py-3 bg-muted/10 border-b flex items-center gap-2 flex-shrink-0">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Tafuta bidhaa ziuzwa..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-10 rounded-xl border-none bg-background shadow-sm text-sm"
              />
            </div>
            <Badge variant="outline" className="h-10 px-3 rounded-xl border-red-200 font-black text-[10px] bg-red-50 text-red-600">
              {filteredProducts.length} Ziuzwa
            </Badge>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {products.length === 1 ? (
            // Direct sharing mode for a single product
            <div className="space-y-6">
                <div className="relative aspect-square max-w-[280px] mx-auto rounded-2xl overflow-hidden border-2 border-border/30 shadow-lg bg-muted">
                <ProfessionalImage
                  src={products[0].imageUrl || "/placeholder-product.jpg"}
                  alt={products[0].name}
                  className="h-full w-full object-cover"
                />

                {/* Classic: small pill badge — bottom-right */}
                {selectedStyle === "classic" && (
                  <div className="absolute bottom-2.5 right-2.5 pointer-events-none">
                    <div className="flex items-center overflow-hidden rounded-full shadow-lg bg-white" style={{boxShadow:"0 2px 8px rgba(0,0,0,0.25)"}}>
                      <div className="bg-red-500 px-2 py-1 flex items-center justify-center rounded-l-full">
                        <span className="text-white font-black text-[9px] leading-none">✓</span>
                      </div>
                      <span className="px-2 pr-3 text-red-600 font-black text-[9px] uppercase tracking-wide whitespace-nowrap">
                        {language === "sw" ? "Imeuzwa" : "Sold Out"}
                      </span>
                    </div>
                  </div>
                )}

                {/* Ribbon: premium corner sash */}
                {selectedStyle === "ribbon" && (
                  <div className="absolute top-0 left-0 w-[6rem] h-[6rem] overflow-hidden pointer-events-none">
                    <div className="absolute top-[20%] left-[-30%] w-[160%] bg-gradient-to-b from-red-400 via-red-600 to-red-800 text-white text-[8px] font-black text-center uppercase py-2 shadow-[0_4px_12px_rgba(0,0,0,0.5)] border-y border-white/20"
                      style={{transform: "rotate(-45deg)"}}>
                      {language === "sw" ? "IMEUZWA" : "SOLD OUT"}
                    </div>
                  </div>
                )}

                {/* Stamp: premium scalloped seal, top-right */}
                {selectedStyle === "stamp" && (
                  <div className="absolute top-4 right-4 pointer-events-none drop-shadow-2xl">
                    <div className="rounded-full w-16 h-16 flex items-center justify-center p-0.5 bg-gradient-to-br from-red-400 via-red-600 to-red-900 border-2 border-white/30"
                      style={{transform: "rotate(-12deg)", clipPath: "polygon(50% 0%, 61% 3%, 71% 7%, 81% 15%, 88% 24%, 93% 33%, 97% 43%, 100% 50%, 97% 57%, 93% 67%, 88% 76%, 81% 85%, 71% 93%, 61% 97%, 50% 100%, 39% 97%, 29% 93%, 19% 85%, 12% 76%, 7% 67%, 3% 57%, 0% 50%, 3% 43%, 7% 33%, 12% 24%, 19% 15%, 29% 7%, 39% 3%)"}}>
                      <div className="border-2 border-white/40 rounded-full w-full h-full flex flex-col items-center justify-center bg-transparent shadow-inner">
                        <span className="text-white font-bold leading-none mb-0.5" style={{fontSize:"7px"}}>★</span>
                        <span className="text-white font-black leading-none" style={{fontSize:"8px"}}>SOLD</span>
                        <span className="text-white font-black leading-none" style={{fontSize:"8px"}}>OUT</span>
                        <span className="text-white/80 font-bold leading-none mt-1" style={{fontSize:"5px"}}>CERTIFIED</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Minimal: slim gradient bar at bottom */}
                {selectedStyle === "minimal" && (
                  <div className="absolute bottom-0 inset-x-0 pointer-events-none"
                    style={{background:"linear-gradient(to top, rgba(0,0,0,0.82) 0%, transparent 100%)", padding:"1rem 0.75rem 0.5rem"}}>
                    <p className="text-white font-black uppercase tracking-wider" style={{fontSize:"10px"}}>
                      ✓ {language === "sw" ? "Imeuzwa" : "Sold Out"}
                    </p>
                    <p className="text-white/60 font-medium" style={{fontSize:"8px",marginTop:"2px"}}>
                      {language === "sw" ? "Asante kwa wateja wetu!" : "Thank you for your support!"}
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex flex-col gap-2">
                    <h4 className="text-lg font-black text-center">{products[0].name}</h4>
                    <Button
                        onClick={() => generateAiCaption(products[0])}
                        disabled={loadingAi[products[0].id]}
                        variant="secondary"
                        className="h-10 rounded-xl text-[10px] font-black uppercase tracking-widest gap-2 bg-red-50 text-red-600 hover:bg-red-100 border-none mx-auto"
                    >
                        {loadingAi[products[0].id] ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                        {aiCaptions[products[0].id] ? "Maelezo Mapya" : "Shukrani (AI)"}
                    </Button>
                </div>

                {aiCaptions[products[0].id] && (
                  <div className="bg-muted/30 rounded-xl p-4 border relative italic text-center">
                    <p className="text-xs font-medium text-foreground leading-relaxed whitespace-pre-line">
                      {aiCaptions[products[0].id]}
                    </p>
                  </div>
                )}

                <div className="flex flex-col gap-3">
                    {stockMap.get(products[0].id)?.quantity === 0 ? (
                      <Button
                        onClick={() => shareProduct(products[0])}
                        disabled={isSharing[products[0].id]}
                        className="w-full h-14 rounded-2xl bg-[#25D366] hover:bg-[#1ebe5d] text-white font-black text-sm uppercase tracking-widest gap-3 shadow-lg shadow-green-500/20"
                      >
                        {isSharing[products[0].id] ? <Loader2 className="h-5 w-5 animate-spin" /> : <BsWhatsapp className="h-6 w-6" />}
                        Finalize & Share to WhatsApp
                      </Button>
                    ) : (
                      <Button
                        onClick={async () => {
                          const product = products[0];
                          setIsMarkingSold(prev => ({ ...prev, [product.id]: true }));
                          try {
                            await dispatch(adjustStock({
                              shopId: shop.id,
                              productId: product.id,
                              productName: product.name,
                              type: "adjustment",
                              quantity: - (stockMap.get(product.id)?.quantity || 0),
                              reason: "Marked as sold out via announcement",
                              userId: user?.id || "",
                              userName: user?.displayName || "User",
                              date: new Date().toISOString()
                            })).unwrap();
                            toast.success(`"${product.name}" sasa imewekwa kuwa Imeuzwa!`);
                          } catch (err) {
                            toast.error("Imeshindwa kubadilisha stoki.");
                          } finally {
                            setIsMarkingSold(prev => ({ ...prev, [product.id]: false }));
                          }
                        }}
                        disabled={isMarkingSold[products[0].id]}
                        className="w-full h-14 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black text-sm uppercase tracking-widest gap-3 shadow-lg shadow-red-500/20"
                      >
                        {isMarkingSold[products[0].id] ? <Loader2 className="h-5 w-5 animate-spin" /> : <Package className="h-6 w-6" />}
                        Mark as Sold Out (Set Stock to 0)
                      </Button>
                    )}
                    <p className="text-[10px] text-center font-bold text-muted-foreground">
                        Picha itatengenezwa na sticker ya <span className="text-red-600">"{STICKER_STYLES.find(s => s.id === selectedStyle)?.name}"</span>
                    </p>
                </div>
              </div>
            </div>
          ) : (
            // Grid mode for multiple products
            <AnimatePresence mode="popLayout">
              {filteredProducts.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-12 text-center">
                  <Package className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm font-bold text-muted-foreground">Hakuna bidhaa ziuzwa zilizopatikana</p>
                </motion.div>
              ) : (
                filteredProducts.map((product, idx) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="group p-4 rounded-[1.5rem] border bg-card hover:border-red-200 shadow-sm transition-all"
                  >
                    <div className="flex items-start gap-4">
                      <div className="h-20 w-20 rounded-xl overflow-hidden bg-muted border flex-shrink-0">
                        <ProfessionalImage src={product.imageUrl || "/placeholder-product.jpg"} alt={product.name} className="h-full w-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-base font-black text-foreground truncate">{product.name}</h4>
                        <p className="text-lg font-black text-red-600">IMEUZWA</p>
                        <Button
                          onClick={() => generateAiCaption(product)}
                          disabled={loadingAi[product.id]}
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2.5 mt-2 rounded-lg text-[9px] font-black uppercase tracking-widest gap-2 bg-red-50 text-red-600 hover:bg-red-100"
                        >
                          {loadingAi[product.id] ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                          {aiCaptions[product.id] ? "Caption Mpya" : "Shukrani (AI)"}
                        </Button>
                      </div>
                    </div>

                    {aiCaptions[product.id] && (
                      <div className="mt-4 bg-muted/30 rounded-xl p-3 border relative">
                        <p className="text-xs font-medium text-foreground pr-8 leading-relaxed whitespace-pre-line italic">
                          {aiCaptions[product.id]}
                        </p>
                      </div>
                    )}

                    <div className="mt-4 pt-4 border-t flex items-center justify-between gap-3">
                      <p className="text-[10px] font-bold text-muted-foreground leading-tight max-w-[60%]">
                        Sticker ya <span className="text-red-600">"{STICKER_STYLES.find(s => s.id === selectedStyle)?.name}"</span> itawekwa kwenye picha.
                      </p>
                      <Button
                        onClick={() => shareProduct(product)}
                        disabled={isSharing[product.id]}
                        className="h-12 px-6 rounded-xl bg-[#25D366] hover:bg-[#1ebe5d] text-white font-black text-xs uppercase tracking-widest gap-2 shadow-lg shadow-green-500/20"
                      >
                        {isSharing[product.id] ? <Loader2 className="h-4 w-4 animate-spin" /> : <BsWhatsapp className="h-5 w-5" />}
                        Tuma
                      </Button>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          )}
        </div>

        <div className="px-6 py-4 border-t flex items-center justify-between bg-muted/5">
          <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-40">
            Twende Duka • Sold Out Generator
          </p>
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)} className="font-black text-[9px] uppercase h-8 border">
            Funga
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
