import { useState } from "react";
import { TriangleAlert, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import ImeiNumbersField from "./ImeiNumbersField";
import type { StagedSelection } from "./TapToAddCatalogDialog";
import { useI18n } from "@/lib/i18n";

interface Props {
  open: boolean;
  lines: StagedSelection[];
  submitting: boolean;
  onClose: () => void;
  onUpdate: (id: string, patch: Partial<StagedSelection>) => void;
  onRemove: (id: string) => void;
  /** Returns the batch outcome so the sheet can show the atomic-batch error. */
  onSubmit: () => Promise<{ ok: boolean; count?: number; message?: string }>;
}

/**
 * The staging drawer of the tap-to-add picker: prices, quantities and box IMEIs
 * for everything selected, submitted as one atomic batch.
 */
export default function CatalogStagingSheet({ open, lines, submitting, onClose, onUpdate, onRemove, onSubmit }: Props) {
  const { t } = useI18n();
  const [error, setError] = useState<string | null>(null);

  const totalUnits = lines.reduce((sum, line) => {
    const qty = line.master.requiresImei
      ? (line.quantity.trim() === "" ? line.imeis.length : Number(line.quantity) || 0)
      : Number(line.quantity) || 0;
    return sum + qty;
  }, 0);

  /** A scanned unit is a unit of stock: an explicit count must agree with it. */
  const quantityMismatches = lines.filter((line) => {
    if (!line.master.requiresImei || line.imeis.length === 0) return false;
    if (line.quantity.trim() === "") return false;
    return (Number(line.quantity) || 0) !== line.imeis.length;
  });

  const invalid = lines.length === 0 || quantityMismatches.length > 0;

  const handleSubmit = async () => {
    if (invalid || submitting) return;
    setError(null);
    const result = await onSubmit();
    if (!result.ok) {
      setError(result.message || t("products.failed"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="h-[100dvh] max-h-[100dvh] w-[100vw] max-w-[100vw] overflow-hidden rounded-none bg-background/95 p-4 backdrop-blur-sm grid-rows-[auto_minmax(0,1fr)_auto] sm:h-[95vh] sm:max-h-[95vh] sm:w-[720px] sm:max-w-[95vw] sm:rounded-3xl sm:p-6">
        <DialogHeader className="flex flex-row items-start justify-between pr-8 border-b pb-4">
          <div>
            <DialogTitle className="text-xl sm:text-2xl">{t("catalog.reviewTitle")}</DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">{t("catalog.reviewHint")}</p>
          </div>
        </DialogHeader>

        <div className="min-h-0 space-y-4 overflow-y-auto">
          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm font-semibold text-destructive">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="min-w-0 break-words">{error}</span>
            </div>
          )}

          {quantityMismatches.length > 0 && (
            <div className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm font-semibold text-destructive">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                {quantityMismatches
                  .map((line) => `${line.master.name}: ${t("catalog.imeiHint")}`)
                  .join(" ")}
              </span>
            </div>
          )}

          {lines.map((line) => (
            <div key={line.master.id} className="rounded-2xl border border-border/60 bg-card/50 p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h4 className="truncate text-sm font-bold">{line.master.name}</h4>
                  <p className="truncate text-xs font-semibold text-muted-foreground">
                    {[line.master.brand, line.master.categoryName].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(line.master.id)}
                  aria-label={`${t("catalog.remove")} ${line.master.name}`}
                  className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                <label className="space-y-1">
                  <span className="block text-xs font-bold text-muted-foreground">
                    {t("products.buyingPriceShort")}
                  </span>
                  <Input
                    type="number"
                    min={0}
                    value={line.buyingPrice}
                    onChange={(e) => onUpdate(line.master.id, { buyingPrice: e.target.value })}
                    placeholder="0"
                    className="h-11 rounded-xl bg-background text-sm"
                  />
                </label>
                <label className="space-y-1">
                  <span className="block text-xs font-bold text-muted-foreground">
                    {t("products.sellingPriceShort")}
                  </span>
                  <Input
                    type="number"
                    min={0}
                    value={line.sellingPrice}
                    onChange={(e) => onUpdate(line.master.id, { sellingPrice: e.target.value })}
                    placeholder="0"
                    className="h-11 rounded-xl bg-background text-sm"
                  />
                </label>
                <label className="space-y-1">
                  <span className="block text-xs font-bold text-muted-foreground">
                    {t("sales.quantity")}
                  </span>
                  <Input
                    type="number"
                    min={0}
                    value={line.quantity}
                    onChange={(e) => onUpdate(line.master.id, { quantity: e.target.value })}
                    placeholder={line.master.requiresImei && line.imeis.length > 0 ? String(line.imeis.length) : "0"}
                    className="h-11 rounded-xl bg-background text-sm"
                  />
                </label>
              </div>

              {!line.master.requiresImei && line.master.alreadyAdded && (
                <p className="mt-2 text-xs font-medium text-muted-foreground">{t("catalog.priceNote")}</p>
              )}

              {line.master.requiresImei && (
                <div className="mt-3 border-t border-border/40 pt-3">
                  <ImeiNumbersField
                    value={line.imeis}
                    onChange={(imeis) => onUpdate(line.master.id, { imeis })}
                    required={line.quantity.trim() === "" ? undefined : Number(line.quantity) || 0}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="border-t border-border/40 pt-4">
          <Button
            className="h-12 w-full rounded-xl text-sm font-black tracking-wide"
            disabled={invalid || submitting}
            onClick={handleSubmit}
          >
            <span className="flex w-full items-center justify-between px-2">
              <span>{submitting ? t("catalog.submitting") : t("catalog.submit").replace("{n}", String(lines.length))}</span>
              <span className="rounded-lg bg-white/20 px-2.5 py-0.5 font-black">{totalUnits}</span>
            </span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
