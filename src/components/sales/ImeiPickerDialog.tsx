import { useEffect, useMemo, useState } from "react";
import { Check, Hash, Loader2, ScanLine, Search, TriangleAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ProfessionalImage } from "@/components/common/ProfessionalImage";
import { BarcodeScanner } from "@/components/common/BarcodeScanner";
import { cn } from "@/lib/utils";
import { useProductSerials } from "@/hooks/useSerialItems";
import type { Product } from "@/types";
import { useI18n } from "@/lib/i18n";

interface Props {
  product: Product;
  required: number;
  /** IMEIs already attached to the cart line; the picker opens with them ticked. */
  selected: string[];
  open: boolean;
  onClose: () => void;
  onConfirm: (imeis: string[]) => void;
}

/**
 * The checkout step for IMEI-tracked products: the cashier scans a box barcode
 * or taps the exact devices leaving the counter. Only units the shop actually
 * holds are listed, so a double-sold device is caught before the backend does.
 */
export default function ImeiPickerDialog({ product, required, selected, open, onClose, onConfirm }: Props) {
  const { t } = useI18n();
  const [picked, setPicked] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [scanning, setScanning] = useState(false);
  const [unknownScan, setUnknownScan] = useState<string | null>(null);
  const [scanNonce, setScanNonce] = useState(0);

  const { data: serials = [], isLoading } = useProductSerials(open ? product.id : null, "in_stock");

  useEffect(() => {
    if (open) {
      setPicked(selected);
      setSearch("");
      setUnknownScan(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const onShelf = useMemo(() => new Set(serials.map((s) => s.imeiNumber)), [serials]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return serials;
    return serials.filter((s) => s.imeiNumber.toLowerCase().includes(q));
  }, [serials, search]);

  const toggle = (imei: string) => {
    setUnknownScan(null);
    setPicked((current) =>
      current.includes(imei) ? current.filter((v) => v !== imei) : [...current, imei]
    );
  };

  const handleScan = (payload: string) => {
    const imei = payload.trim();
    setScanNonce((n) => n + 1);
    if (!imei) return;
    if (onShelf.has(imei)) {
      setPicked((current) => (current.includes(imei) ? current : [...current, imei]));
      setUnknownScan(null);
    } else {
      setUnknownScan(imei);
    }
  };

  const complete = picked.length === required;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="h-[100dvh] max-h-[100dvh] w-[100vw] max-w-[100vw] overflow-hidden rounded-none bg-background p-0 grid-rows-[auto_minmax(0,1fr)_auto] sm:h-[92vh] sm:max-h-[92vh] sm:w-[520px] sm:max-w-[95vw] sm:rounded-3xl [&>button]:hidden">
        <DialogHeader className="border-b border-border/40 p-4 pr-2 sm:p-5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2.5">
              <ProfessionalImage src={product.imageUrls?.[0] || product.imageUrl} className="h-10 w-10 shrink-0 rounded-xl border border-border/50 bg-muted/30 object-cover" />
              <div className="min-w-0">
                <DialogTitle className="truncate text-base sm:text-lg">
                  {t("sales.imeiPickTitle").replace("{name}", product.name)}
                </DialogTitle>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {t("sales.imeiPickHint").replace("{n}", String(required))}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="rounded-full" onClick={onClose} aria-label={t("common.close")}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DialogHeader>

        <div className="min-h-0 overflow-y-auto p-4 sm:p-5">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("serials.searchPlaceholder")}
                className="h-10 rounded-xl bg-muted/50 pl-9 font-mono text-sm"
              />
            </div>
            <Button
              type="button"
              size="icon"
              className="h-10 w-10 shrink-0 rounded-xl"
              onClick={() => setScanning(true)}
              aria-label={t("serials.scan")}
            >
              <ScanLine className="h-4 w-4" />
            </Button>
          </div>

          {unknownScan && (
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-xs font-semibold text-destructive">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="min-w-0 break-words">
                {unknownScan} — {t("sales.imeiNotOnShelf")}
              </span>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> {t("serials.loading")}
            </div>
          ) : filtered.length === 0 ? (
            <div className="mt-3 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/50 py-14 text-center">
              <Hash className="mb-3 h-9 w-9 text-muted-foreground/30" />
              <p className="font-semibold text-muted-foreground">{t("serials.empty")}</p>
            </div>
          ) : (
            <div className="mt-3 space-y-1.5">
              {filtered.map((serial) => {
                const isPicked = picked.includes(serial.imeiNumber);
                return (
                  <button
                    key={serial.id}
                    type="button"
                    onClick={() => toggle(serial.imeiNumber)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-all active:scale-[0.99]",
                      isPicked
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border/60 bg-card hover:border-primary/40"
                    )}
                  >
                    <Hash className={cn("h-3.5 w-3.5 shrink-0", isPicked ? "text-primary" : "text-muted-foreground")} />
                    <span className="min-w-0 flex-1 truncate font-mono text-xs font-semibold">{serial.imeiNumber}</span>
                    <span
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                        isPicked ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background"
                      )}
                    >
                      {isPicked && <Check className="h-3 w-3" />}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t border-border/40 bg-background p-3 sm:p-4">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-12 rounded-xl px-4 text-xs font-black uppercase tracking-widest"
              onClick={() => setPicked([])}
              disabled={picked.length === 0}
            >
              {t("common.clear")}
            </Button>
            <Button
              type="button"
              className="h-12 flex-1 rounded-xl text-sm font-black tracking-wide"
              disabled={!complete}
              onClick={() => onConfirm(picked)}
            >
              {t("sales.imeiPickUse")
                .replace("{n}", String(picked.length))
                .replace("{m}", String(required))}
            </Button>
          </div>
        </div>

        {scanning && (
          <BarcodeScanner
            key={scanNonce}
            isOpen
            onClose={() => setScanning(false)}
            onResult={handleScan}
            title={t("serials.scanTitle")}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
