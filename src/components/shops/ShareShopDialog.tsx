import { useState, useRef, useEffect } from "react";
import html2canvas from "html2canvas";
import { Copy, Check, Share2, Download, MapPin, Phone, Store, Package, Loader2 } from "lucide-react";
import { BsWhatsapp, BsFacebook, BsTwitterX, BsInstagram, BsTiktok } from "react-icons/bs";
import { QRCodeCanvas } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import type { Product, Stock } from "@/types";

interface ShareShopDialogProps {
  shopName: string;
  shopId: string;
  shopDescription?: string;
  shopPhone?: string;
  shopLocation?: string;
  shopImageUrl?: string;
  products?: Product[];
  stockMap?: Map<string, Stock>;
  trigger?: React.ReactNode;
}

const BASE_URL = "https://duka.twendedigital.tech";

// ─── Catalog renderer (the visual that gets captured) ─────────────────────────
function CatalogCard({
  product,
  stock,
}: {
  product: Product;
  stock: number;
}) {
  const displayImage = product.imageUrls?.[0] || product.imageUrl;
  const isSoldOut = stock === 0;

  return (
    <div
      style={{
        borderRadius: 12,
        border: "1px solid #e2e8f0",
        overflow: "hidden",
        background: "#fff",
        boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
      }}
    >
      {/* Product Image */}
      <div
        style={{
          width: "100%",
          paddingTop: "100%",
          position: "relative",
          background: "linear-gradient(135deg, #f0f4ff 0%, #e8f0fe 100%)",
          overflow: "hidden",
        }}
      >
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
              filter: isSoldOut ? "grayscale(60%)" : "none",
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
            }}
          >
            <Package
              style={{ width: 28, height: 28, color: "rgba(255,255,255,0.7)" }}
            />
          </div>
        )}
        {isSoldOut && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.45)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                background: "#ef4444",
                color: "#fff",
                fontSize: 9,
                fontWeight: 800,
                padding: "2px 8px",
                borderRadius: 99,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}
            >
              Sold Out
            </span>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div style={{ padding: "8px 8px 10px", height: 60, display: "flex", flexDirection: "column" }}>
        <p
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: "#1a202c",
            margin: 0,
            lineHeight: 1.2,
            height: 24, // Two lines height approximately
            overflow: "hidden",
            wordBreak: "break-word",
          }}
        >
          {product.name.length > 32 
            ? product.name.substring(0, 29) + "..." 
            : product.name}
        </p>
        <div style={{ marginTop: "auto" }}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 800,
              margin: 0,
              letterSpacing: "-0.02em",
              color: "#16a34a" // Success color / primary
            }}
          >
            TZS {product.sellingPrice.toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── The capture target: the full catalog poster ──────────────────────────────
function CatalogPoster({
  shopName,
  shopLocation,
  shopPhone,
  shopUrl,
  products,
  stockMap,
  catalogRef,
}: {
  shopName: string;
  shopLocation?: string;
  shopPhone?: string;
  shopUrl: string;
  products: Product[];
  stockMap: Map<string, Stock>;
  catalogRef: React.RefObject<HTMLDivElement>;
}) {
  const displayProducts = products.slice(0, 12);
  const cols = displayProducts.length <= 6 ? 3 : 4;

  return (
    <div
      ref={catalogRef}
      style={{
        width: 480, // Increased width
        background: "#ffffff",
        fontFamily: "'Plus Jakarta Sans', 'Inter', 'Segoe UI', Arial, sans-serif",
        borderRadius: 20,
        overflow: "hidden",
        boxShadow: "0 4px 24px rgba(0,0,0,0.10)",
      }}
    >
      {/* Header */}
      <div className="bg-primary" style={{ padding: "20px 20px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "rgba(255,255,255,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Store style={{ width: 24, height: 24, color: "#fff" }} />
          </div>
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: 20,
                fontWeight: 800,
                color: "#fff",
                letterSpacing: "-0.03em",
                lineHeight: 1.2,
                wordBreak: "break-word",
              }}
            >
              {shopName}
            </h1>
            <p
              style={{
                margin: "2px 0 0",
                fontSize: 11,
                color: "rgba(255,255,255,0.75)",
                fontWeight: 500,
              }}
            >
              Twende Duka · Biashara Yako Online
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          {shopLocation && (
            <span
              style={{
                fontSize: 11,
                color: "rgba(255,255,255,0.85)",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <MapPin style={{ width: 11, height: 11 }} /> {shopLocation}
            </span>
          )}
          {shopPhone && (
            <span
              style={{
                fontSize: 11,
                color: "rgba(255,255,255,0.85)",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <Phone style={{ width: 11, height: 11 }} /> {shopPhone}
            </span>
          )}
        </div>
      </div>

      {/* Products Grid */}
      <div style={{ padding: "16px 16px 12px" }}>
        <p
          style={{
            margin: "0 0 10px",
            fontSize: 11,
            fontWeight: 700,
            color: "#94a3b8",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          🛍️ Bidhaa Zinazopatikana ({products.length})
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gap: 8,
          }}
        >
          {displayProducts.map((product) => (
            <CatalogCard
              key={product.id}
              product={product}
              stock={stockMap.get(product.id)?.quantity ?? 0}
            />
          ))}
          {products.length === 0 && (
            <div
              style={{
                gridColumn: `1 / -1`,
                padding: "24px 0",
                textAlign: "center",
                color: "#94a3b8",
                fontSize: 13,
              }}
            >
              Hakuna bidhaa bado
            </div>
          )}
        </div>
        {products.length > 12 && (
          <p
            style={{
              textAlign: "center",
              margin: "10px 0 0",
              fontSize: 11,
              color: "#94a3b8",
              fontWeight: 600,
            }}
          >
            +{products.length - 12} bidhaa zaidi...
          </p>
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          background: "linear-gradient(135deg, #f8faff 0%, #f0f4ff 100%)",
          borderTop: "1px solid #e2e8f0",
          padding: "14px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div>
          <p style={{ margin: 0, fontSize: 10, color: "#94a3b8", fontWeight: 600 }}>
            Scan QR au tembelea:
          </p>
          <p
            style={{
              margin: "3px 0 0",
              fontSize: 10,
              fontWeight: 700,
              wordBreak: "break-all",
            }}
            className="text-primary"
          >
            {shopUrl}
          </p>
          <p style={{ margin: "4px 0 0", fontSize: 9, color: "#cbd5e1" }}>
            Powered by Twende Digital
          </p>
        </div>
        <div style={{ flexShrink: 0 }}>
          <QRCodeCanvas
            value={shopUrl}
            size={64}
            level="M"
            marginSize={1}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Main Dialog ──────────────────────────────────────────────────────────────
export default function ShareShopDialog({
  shopName,
  shopId,
  shopDescription,
  shopPhone,
  shopLocation,
  products = [],
  stockMap = new Map(),
  trigger,
}: ShareShopDialogProps) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(true);
  const [catalogBlob, setCatalogBlob] = useState<Blob | null>(null);
  const [catalogDataUrl, setCatalogDataUrl] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const catalogRef = useRef<HTMLDivElement>(null);

  const shopUrl = `${BASE_URL}/maduka/${shopId}`;
  const shareText = shopDescription
    ? `${shopName} — ${shopDescription}`
    : `Tazama bidhaa za ${shopName} kwenye Twende Duka! 🛍️`;

  // ── Generate Image when dialog opens ──────────────────────────────────────────
  useEffect(() => {
    if (!open || catalogDataUrl) return;

    let mounted = true;
    setGenerating(true);
    
    const generate = async () => {
      // Small timeout to ensure DOM builds the hidden visual element
      await new Promise((r) => setTimeout(r, 600));
      if (!mounted || !catalogRef.current) {
        if (mounted) setGenerating(false);
        return;
      }
      
      const safetyTimeout = setTimeout(() => {
        if (mounted) setGenerating(false);
      }, 6000);

      try {
        const canvas = await html2canvas(catalogRef.current, {
          useCORS: true,
          allowTaint: false,
          scale: 1,
          backgroundColor: "#ffffff",
          logging: false,
          width: 480, // Match the new poster width
          height: catalogRef.current.offsetHeight
        });
        
        const dataUrl = canvas.toDataURL("image/png");
        canvas.toBlob(
          (blob) => {
            clearTimeout(safetyTimeout);
            if (mounted) {
              if (blob) {
                setCatalogBlob(blob);
                setCatalogDataUrl(dataUrl);
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
  }, [open, shopId, products, catalogDataUrl]);

  // ── Download catalog image helper ────────────────────────────────────────────
  const downloadImage = (dataUrl: string) => {
    const a = document.createElement("a");
    a.download = `${shopName.replace(/\s+/g, "-")}-catalog.png`;
    a.href = dataUrl;
    a.click();
  };

  // ── Copy link ────────────────────────────────────────────────────────────────
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shopUrl);
      setCopied(true);
      toast.success("Link imenakiliwa!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.createElement("input");
      input.value = shopUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      toast.success("Link imenakiliwa!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // ── WhatsApp share ────────────────────────────────────────────────────────────
  const shareWhatsApp = () => {
    if (generating || !catalogBlob || !catalogDataUrl) {
      toast("Inaunda picha, tafadhali subiri kidogo...");
      return;
    }
    const msg = `${shareText}\n\n${shopUrl}`;
    try {
      if (navigator.canShare?.({ files: [new File([catalogBlob], "catalog.png", { type: "image/png" })] })) {
        navigator.share({
          title: shopName,
          text: msg,
          files: [new File([catalogBlob], `${shopName}-catalog.png`, { type: "image/png" })],
        });
      } else {
        downloadImage(catalogDataUrl);
        toast.info("Picha imeshushwa — iunganishe kwenye WhatsApp!");
        setTimeout(() => {
          window.location.href = `https://wa.me/?text=${encodeURIComponent(msg)}`;
        }, 50);
      }
    } catch (err: any) {
      if (err?.name !== "AbortError") toast.error("Hitilafu ya kushiriki");
    }
  };

  // ── Facebook share ────────────────────────────────────────────────────────────
  const shareFacebook = () => {
    if (generating || !catalogDataUrl) {
      toast("Inaunda picha, tafadhali subiri kidogo...");
      return;
    }
    try {
      downloadImage(catalogDataUrl);
      toast.info("Picha imeshushwa — iunganishe upande wa Facebook!");
      setTimeout(() => {
        window.location.href = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shopUrl)}`;
      }, 50);
    } catch {
      toast.error("Hitilafu ya kushiriki");
    }
  };

  // ── X (Twitter) share ─────────────────────────────────────────────────────────
  const shareTwitter = () => {
    if (generating || !catalogDataUrl) {
      toast("Inaunda picha, tafadhali subiri kidogo...");
      return;
    }
    try {
      downloadImage(catalogDataUrl);
      toast.info("Picha imeshushwa — iunganishe kwenye X!");
      setTimeout(() => {
        window.location.href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shopUrl)}`;
      }, 50);
    } catch {
      toast.error("Hitilafu ya kushiriki");
    }
  };

  // ── Instagram share ───────────────────────────────────────────────────────────
  const shareInstagram = () => {
    if (generating || !catalogBlob || !catalogDataUrl) {
      toast("Inaunda picha, tafadhali subiri kidogo...");
      return;
    }
    try {
      if (navigator.canShare?.({ files: [new File([catalogBlob], "catalog.png", { type: "image/png" })] })) {
        navigator.share({
          title: shopName,
          files: [new File([catalogBlob], `${shopName}-catalog.png`, { type: "image/png" })],
        });
      } else {
        downloadImage(catalogDataUrl);
        toast.info("Picha imeshushwa — ipakua kwenye Instagram Stories!");
      }
    } catch (err: any) {
      if (err?.name !== "AbortError") toast.error("Hitilafu ya kushiriki");
    }
  };

  // ── Native OS share ───────────────────────────────────────────────────────────
  const nativeShare = () => {
    if (generating || !catalogBlob || !catalogDataUrl) {
      toast("Inaunda picha, tafadhali subiri kidogo...");
      return;
    }
    try {
      if (navigator.canShare?.({ files: [new File([catalogBlob], "c.png", { type: "image/png" })] })) {
        navigator.share({
          title: shopName,
          text: `${shareText}\n\n${shopUrl}`,
          files: [new File([catalogBlob], `${shopName}-catalog.png`, { type: "image/png" })],
        });
      } else if (navigator.share) {
        downloadImage(catalogDataUrl);
        navigator.share({ title: shopName, text: shareText, url: shopUrl });
      } else {
        downloadImage(catalogDataUrl);
        toast.info("Picha imepakuliwa!");
      }
    } catch (err: any) {
      if (err?.name !== "AbortError") toast.error("Hitilafu ya kushiriki");
    }
  };

  // ── Download catalog ──────────────────────────────────────────────────────────
  const downloadCatalog = () => {
    if (generating || !catalogDataUrl) {
      toast("Inaunda picha, tafadhali subiri kidogo...");
      return;
    }
    try {
      downloadImage(catalogDataUrl);
      toast.success("Catalog imeshushwa kwa mafanikio! 🎉");
    } catch {
      toast.error("Hitilafu ya kushushwa");
    }
  };

  // ── TikTok share ────────────────────────────────────────────────────────────
  const shareTikTok = () => {
    if (generating || !catalogDataUrl) {
      toast("Inaunda picha, tafadhali subiri kidogo...");
      return;
    }
    try {
      downloadImage(catalogDataUrl);
      toast.info("Picha imeshushwa — iunganishe upande wa TikTok!");
      copyLink(); // Also copy link for convenience
    } catch {
      toast.error("Hitilafu ya kushiriki");
    }
  };

  const platformBtns = [
    {
      label: "WhatsApp",
      icon: <BsWhatsapp className="h-5 w-5" />,
      bg: "#25D366",
      textColor: "#fff",
      onClick: shareWhatsApp,
    },
    {
      label: "Facebook",
      icon: <BsFacebook className="h-5 w-5" />,
      bg: "#1877F2",
      textColor: "#fff",
      onClick: shareFacebook,
    },
    {
      label: "X / Twitter",
      icon: <BsTwitterX className="h-5 w-5" />,
      bg: "#000",
      textColor: "#fff",
      onClick: shareTwitter,
    },
    {
      label: "Instagram",
      icon: <BsInstagram className="h-5 w-5" />,
      bg: "linear-gradient(135deg, #f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%)",
      textColor: "#fff",
      onClick: shareInstagram,
    },
    {
      label: "TikTok",
      icon: <BsTiktok className="h-5 w-5" />,
      bg: "#000",
      textColor: "#fff",
      onClick: shareTikTok,
    },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm" className="gap-2">
            <Share2 className="h-4 w-4" />
            {t("share.share") || "Shiriki"}
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <Share2 className="h-5 w-5 text-primary" />
            Shiriki Bidhaa za {shopName}
          </DialogTitle>
        </DialogHeader>

        {/* ── Catalog preview ──────────────────────────────────────────────── */}
        <div className="px-5 pb-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            📋 Preview ya Catalog (Itakayoshirikiwa)
          </p>
          <div className="rounded-xl border bg-muted/30 p-2 flex justify-center items-center min-h-[250px]">
            {generating ? (
              <div className="flex flex-col items-center gap-3 text-muted-foreground p-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="text-xs font-semibold">Inaandaa picha...</span>
              </div>
            ) : catalogDataUrl ? (
              <img 
                src={catalogDataUrl} 
                alt="Catalog Preview" 
                className="w-full max-w-[340px] rounded-lg shadow-sm border"
              />
            ) : (
              <div className="flex flex-col items-center gap-3 text-muted-foreground p-8 text-center italic">
                <p className="text-xs">
                  Tumeshindwa kuunda picha ya catalog, lakini unaweza bado kunakili link kuisambaza.
                </p>
                <Button variant="ghost" size="sm" onClick={() => window.location.reload()} className="text-[10px] h-7">Jaribu Tena</Button>
              </div>
            )}
          </div>
          {products.length === 0 && !generating && (
            <p className="text-center text-xs text-muted-foreground mt-2">
              ⚠️ Ongeza bidhaa ili catalog ionekane vizuri zaidi
            </p>
          )}
        </div>

        <div className="px-5 space-y-4 pb-5">
          {/* ── Platform share buttons ────────────────────────────────────── */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              📤 Shiriki kupitia (picha itashirikishwa moja kwa moja)
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
                    {generating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      btn.icon
                    )}
                  </div>
                  <span className="text-foreground">{btn.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Action buttons row ────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-2.5">
            <Button
              variant="outline"
              className="gap-2 font-semibold"
              onClick={copyLink}
              disabled={generating}
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              {copied ? "Imenakiliwa!" : "Nakili Link"}
            </Button>

            <Button
              className="gap-2 font-semibold bg-primary hover:bg-primary/90"
              onClick={downloadCatalog}
              disabled={generating}
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {generating ? "Inaunda..." : "Pakua Catalog"}
            </Button>
          </div>

          {/* ── Native share (if supported) ───────────────────────────────── */}
          {typeof navigator !== "undefined" && navigator.share && (
            <Button
              variant="outline"
              className="w-full gap-2 font-semibold border-primary/30 text-primary hover:bg-primary/5"
              onClick={nativeShare}
              disabled={generating}
            >
              <Share2 className="h-4 w-4" />
              Shiriki kupitia App yoyote (+ picha)
            </Button>
          )}

          {/* ── Info note ─────────────────────────────────────────────────── */}
          <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
            💡 Ukibonyeza kitufe cha platform, picha ya catalog itashushwa moja kwa moja
            na kiungo kitafunguka — iunganishe picha kwenye ujumbe wako.
          </p>
        </div>
      </DialogContent>

      {/* ── Hidden Off-Screen Target for html2canvas ───────────────────── */}
      <div style={{ position: "fixed", left: "-9999px", top: "-9999px", pointerEvents: "none" }}>
        <CatalogPoster
          shopName={shopName}
          shopLocation={shopLocation}
          shopPhone={shopPhone}
          shopUrl={shopUrl}
          products={products}
          stockMap={stockMap}
          catalogRef={catalogRef as React.RefObject<HTMLDivElement>}
        />
      </div>
    </Dialog>
  );
}
