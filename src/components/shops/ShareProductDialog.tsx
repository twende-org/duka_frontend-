import { useState, useRef, useEffect } from "react";
import html2canvas from "html2canvas";
import { Copy, Check, Share2, Download, Package, Loader2 } from "lucide-react";
import { BsWhatsapp, BsFacebook, BsTwitterX, BsInstagram, BsTiktok } from "react-icons/bs";
import { QRCodeCanvas } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import type { Product } from "@/types";

interface ShareProductDialogProps {
  shopName: string;
  shopId: string;
  product: Product;
  trigger?: React.ReactNode;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const BASE_URL = "https://duka.twendedigital.tech";

// ─── Promo Poster Component ──────────────────────────────────────────────
function PromoPoster({
  shopName,
  shopUrl,
  product,
  posterRef,
}: {
  shopName: string;
  shopUrl: string;
  product: Product;
  posterRef: React.RefObject<HTMLDivElement>;
}) {
  const displayImage = product.imageUrls?.[0] || product.imageUrl;

  return (
    <div
      ref={posterRef}
      style={{
        width: 480,
        height: 720, // Vertical poster perfect for WhatsApp Status
        background: "#ffffff",
        fontFamily: "'Plus Jakarta Sans', 'Inter', 'Segoe UI', Arial, sans-serif",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Background Image / Blur */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.8) 100%)",
          zIndex: 1,
        }}
      />
      {displayImage ? (
        <img
          src={displayImage}
          alt={product.name}
          crossOrigin="anonymous"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            zIndex: 0,
          }}
        />
      ) : (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            zIndex: 0,
          }}
        >
          <Package style={{ width: 80, height: 80, color: "rgba(255,255,255,0.5)" }} />
        </div>
      )}

      {/* Header Overlay */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          padding: "24px",
          zIndex: 2,
          background: "linear-gradient(180deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 100%)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 24,
              fontWeight: 900,
              color: "#fff",
              letterSpacing: "-0.03em",
              textShadow: "0 2px 4px rgba(0,0,0,0.3)",
            }}
          >
            {shopName}
          </h1>
          <p
            style={{
              margin: "4px 0 0",
              fontSize: 14,
              color: "rgba(255,255,255,0.9)",
              fontWeight: 600,
              textShadow: "0 1px 2px rgba(0,0,0,0.3)",
            }}
          >
            Twende Duka
          </p>
        </div>
      </div>

      {/* Bottom Info Section */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: "32px 24px",
          zIndex: 2,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
        }}
      >
        <div style={{ flex: 1, paddingRight: "16px" }}>
          <div
            style={{
              display: "inline-block",
              background: "#16a34a",
              color: "#fff",
              padding: "6px 12px",
              borderRadius: 8,
              fontSize: 20,
              fontWeight: 800,
              marginBottom: 12,
              boxShadow: "0 4px 12px rgba(22, 163, 74, 0.3)",
            }}
          >
            TZS {product.sellingPrice.toLocaleString()}
          </div>
          <h2
            style={{
              margin: 0,
              fontSize: 32,
              fontWeight: 800,
              color: "#fff",
              lineHeight: 1.2,
              textShadow: "0 2px 8px rgba(0,0,0,0.4)",
            }}
          >
            {product.name}
          </h2>
          <p
            style={{
              margin: "8px 0 0",
              fontSize: 12,
              color: "rgba(255,255,255,0.8)",
              fontWeight: 500,
            }}
          >
            {product.description?.substring(0, 100) || "Bidhaa nzuri kwa bei nafuu."}
          </p>
        </div>
        
        {/* QR Code */}
        <div
          style={{
            background: "#fff",
            padding: 8,
            borderRadius: 12,
            boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <QRCodeCanvas value={shopUrl} size={72} level="M" />
          <span style={{ fontSize: 9, fontWeight: 700, color: "#000", marginTop: 4 }}>
            SCAN TO BUY
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Main Dialog ──────────────────────────────────────────────────────────────
export default function ShareProductDialog({
  shopName,
  shopId,
  product,
  trigger,
  isOpen,
  onOpenChange,
}: ShareProductDialogProps) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(true);
  const [posterBlob, setPosterBlob] = useState<Blob | null>(null);
  const [posterDataUrl, setPosterDataUrl] = useState<string | null>(null);
  const [internalOpen, setInternalOpen] = useState(false);
  const posterRef = useRef<HTMLDivElement>(null);

  const open = isOpen !== undefined ? isOpen : internalOpen;
  const setOpen = onOpenChange !== undefined ? onOpenChange : setInternalOpen;

  const productUrl = `${BASE_URL}/maduka/${shopId}?productId=${product.id}`;
  const shareText = `Tazama ${product.name} kutoka ${shopName}! Bei: TZS ${product.sellingPrice.toLocaleString()}`;

  // ── Generate Image when dialog opens
  useEffect(() => {
    if (!open || posterDataUrl) return;

    let mounted = true;
    setGenerating(true);
    
    const generate = async () => {
      await new Promise((r) => setTimeout(r, 600));
      if (!mounted || !posterRef.current) {
        if (mounted) setGenerating(false);
        return;
      }
      
      const safetyTimeout = setTimeout(() => {
        if (mounted) setGenerating(false);
      }, 6000);

      try {
        const canvas = await html2canvas(posterRef.current, {
          useCORS: true,
          allowTaint: false,
          scale: 1,
          backgroundColor: "#ffffff",
          logging: false,
          width: 480,
          height: 720
        });
        
        const dataUrl = canvas.toDataURL("image/png");
        canvas.toBlob(
          (blob) => {
            clearTimeout(safetyTimeout);
            if (mounted) {
              if (blob) {
                setPosterBlob(blob);
                setPosterDataUrl(dataUrl);
              }
              setGenerating(false);
            }
          },
          "image/png",
          0.9
        );
      } catch (err) {
        clearTimeout(safetyTimeout);
        console.error("Failed to generate share image:", err);
        if (mounted) setGenerating(false);
      }
    };

    generate();
    return () => { mounted = false; };
  }, [open, product, posterDataUrl]);

  const downloadImage = (dataUrl: string) => {
    const a = document.createElement("a");
    a.download = `${product.name.replace(/\\s+/g, "-")}-promo.png`;
    a.href = dataUrl;
    a.click();
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(productUrl);
      setCopied(true);
      toast.success("Link imenakiliwa!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Imeshindikana kunakili link");
    }
  };

  const shareWhatsApp = () => {
    if (generating || !posterBlob || !posterDataUrl) return toast("Inaunda picha, tafadhali subiri...");
    const msg = `${shareText}\\n\\n${productUrl}`;
    try {
      if (navigator.canShare?.({ files: [new File([posterBlob], "promo.png", { type: "image/png" })] })) {
        navigator.share({
          title: product.name,
          text: msg,
          files: [new File([posterBlob], `promo.png`, { type: "image/png" })],
        });
      } else {
        downloadImage(posterDataUrl);
        toast.info("Picha imeshushwa — iunganishe kwenye WhatsApp Status yako!");
        setTimeout(() => {
          window.location.href = `https://wa.me/?text=${encodeURIComponent(msg)}`;
        }, 50);
      }
    } catch (err: any) {
      if (err?.name !== "AbortError") toast.error("Hitilafu ya kushiriki");
    }
  };

  const shareFacebook = () => {
    if (generating || !posterDataUrl) return toast("Inaunda picha, tafadhali subiri...");
    downloadImage(posterDataUrl);
    toast.info("Picha imeshushwa — iunganishe upande wa Facebook!");
    setTimeout(() => {
      window.location.href = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(productUrl)}`;
    }, 50);
  };

  const shareTwitter = () => {
    if (generating || !posterDataUrl) return toast("Inaunda picha, tafadhali subiri...");
    downloadImage(posterDataUrl);
    toast.info("Picha imeshushwa — iunganishe kwenye X!");
    setTimeout(() => {
      window.location.href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(productUrl)}`;
    }, 50);
  };

  const shareInstagram = () => {
    if (generating || !posterDataUrl) return toast("Inaunda picha, tafadhali subiri...");
    downloadImage(posterDataUrl);
    toast.info("Picha imeshushwa — ipakua kwenye Instagram Stories!");
  };

  const shareTikTok = () => {
    if (generating || !posterDataUrl) return toast("Inaunda picha, tafadhali subiri...");
    downloadImage(posterDataUrl);
    toast.info("Picha imeshushwa — iunganishe upande wa TikTok!");
    copyLink();
  };

  const nativeShare = () => {
    if (generating || !posterBlob || !posterDataUrl) return toast("Inaunda picha...");
    try {
      if (navigator.canShare?.({ files: [new File([posterBlob], "promo.png", { type: "image/png" })] })) {
        navigator.share({
          title: product.name,
          text: `${shareText}\\n\\n${productUrl}`,
          files: [new File([posterBlob], `promo.png`, { type: "image/png" })],
        });
      } else if (navigator.share) {
        navigator.share({ title: product.name, text: shareText, url: productUrl });
      }
    } catch (err: any) {
      if (err?.name !== "AbortError") toast.error("Hitilafu ya kushiriki");
    }
  };

  const platformBtns = [
    { label: "WhatsApp", icon: <BsWhatsapp className="h-5 w-5" />, bg: "#25D366", textColor: "#fff", onClick: shareWhatsApp },
    { label: "Facebook", icon: <BsFacebook className="h-5 w-5" />, bg: "#1877F2", textColor: "#fff", onClick: shareFacebook },
    { label: "X / Twitter", icon: <BsTwitterX className="h-5 w-5" />, bg: "#000", textColor: "#fff", onClick: shareTwitter },
    { label: "Instagram", icon: <BsInstagram className="h-5 w-5" />, bg: "linear-gradient(135deg, #f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%)", textColor: "#fff", onClick: shareInstagram },
    { label: "TikTok", icon: <BsTiktok className="h-5 w-5" />, bg: "#000", textColor: "#fff", onClick: shareTikTok },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>

      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <Share2 className="h-5 w-5 text-primary" />
            Promo ya {product.name}
          </DialogTitle>
        </DialogHeader>

        {/* ── Preview ──────────────────────────────────────────────── */}
        <div className="px-5 pb-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            📋 Promo Card Yako
          </p>
          <div className="rounded-xl border bg-muted/30 p-2 flex justify-center items-center min-h-[300px]">
            {generating ? (
              <div className="flex flex-col items-center gap-3 text-muted-foreground p-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="text-xs font-semibold">Inaandaa Poster...</span>
              </div>
            ) : posterDataUrl ? (
              <img 
                src={posterDataUrl} 
                alt="Promo Preview" 
                className="w-[200px] rounded-lg shadow-md border"
              />
            ) : (
              <div className="flex flex-col items-center gap-3 text-muted-foreground p-8 text-center italic">
                <p className="text-xs">Tumeshindwa kuunda poster, lakini unaweza bado kunakili link.</p>
                <Button variant="ghost" size="sm" onClick={() => window.location.reload()} className="text-[10px] h-7">Jaribu Tena</Button>
              </div>
            )}
          </div>
        </div>

        <div className="px-5 space-y-4 pb-5">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              📤 Shiriki Poster
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              {platformBtns.map((btn) => (
                <button
                  key={btn.label}
                  onClick={btn.onClick}
                  disabled={generating}
                  className="flex items-center gap-3 rounded-xl border p-3 text-sm font-semibold transition-all hover:scale-[1.02] hover:shadow-md active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-full shrink-0"
                    style={{ background: btn.bg, color: btn.textColor }}
                  >
                    {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : btn.icon}
                  </div>
                  <span className="text-foreground">{btn.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <Button variant="outline" className="gap-2 font-semibold" onClick={copyLink} disabled={generating}>
              {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              {copied ? "Imenakiliwa!" : "Nakili Link"}
            </Button>
            <Button className="gap-2 font-semibold bg-primary hover:bg-primary/90" onClick={() => posterDataUrl && downloadImage(posterDataUrl)} disabled={generating || !posterDataUrl}>
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Pakua Poster
            </Button>
          </div>

          {typeof navigator !== "undefined" && navigator.share && (
            <Button variant="outline" className="w-full gap-2 font-semibold border-primary/30 text-primary hover:bg-primary/5" onClick={nativeShare} disabled={generating}>
              <Share2 className="h-4 w-4" /> Shiriki kupitia App yoyote
            </Button>
          )}
        </div>
      </DialogContent>

      {/* ── Hidden Off-Screen Target ───────────────────── */}
      <div style={{ position: "fixed", left: "-9999px", top: "-9999px", pointerEvents: "none" }}>
        <PromoPoster shopName={shopName} shopUrl={productUrl} product={product} posterRef={posterRef as React.RefObject<HTMLDivElement>} />
      </div>
    </Dialog>
  );
}
