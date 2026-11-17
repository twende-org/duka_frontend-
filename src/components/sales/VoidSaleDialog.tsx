import { useState } from "react";
import { Loader2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useVoidSale } from "@/hooks/useSales";
import type { Sale } from "@/types";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";

interface Props {
  shopId: string | null;
  sale: Sale | null;
  open: boolean;
  onClose: () => void;
}

const MAX_REASON = 200;

/**
 * The confirmation a completed sale demands before it is taken back: stock and
 * devices return to the shelf and today's books reverse. Owner/manager only —
 * the backend rejects anyone else, the button is simply hidden for attendants.
 */
export default function VoidSaleDialog({ shopId, sale, open, onClose }: Props) {
  const { t } = useI18n();
  const [reason, setReason] = useState("");
  const voidSale = useVoidSale(shopId || undefined);

  const close = () => {
    onClose();
    setReason("");
  };

  const handleConfirm = async () => {
    if (!sale || voidSale.isPending) return;
    try {
      await voidSale.mutateAsync({ saleId: sale.id, reason: reason.trim() || undefined });
      toast.success(t("sales.voidedSuccess"));
      close();
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? `${t("sales.voidFailed")} ${error.message}` : t("sales.voidFailed")
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) close(); }}>
      <DialogContent className="w-[95vw] sm:max-w-md rounded-3xl p-5 [&>button]:hidden">
        <DialogHeader className="space-y-2 text-left">
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <TriangleAlert className="h-5 w-5" />
            {t("sales.voidTitle")}
          </DialogTitle>
          <p className="text-sm font-medium text-muted-foreground">{t("sales.voidDesc")}</p>
        </DialogHeader>

        {sale && (
          <div className="mt-1 rounded-xl border border-border/60 bg-muted/30 p-3 text-sm">
            <div className="flex justify-between font-bold"><span className="truncate">{sale.productName}</span><span>{sale.quantity} pcs</span></div>
            <div className="mt-1 flex justify-between text-xs text-muted-foreground"><span>{sale.date}</span><span className="font-bold">{sale.paymentMethod}</span></div>
          </div>
        )}

        <div className="mt-3 space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            {t("sales.voidReason")}
          </label>
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={MAX_REASON}
            placeholder={t("sales.optional")}
            className="h-11 rounded-xl bg-card text-sm"
          />
        </div>

        <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row">
          <Button variant="outline" className="h-11 flex-1 rounded-xl font-bold" onClick={close} disabled={voidSale.isPending}>
            {t("common.cancel")}
          </Button>
          <Button
            variant="destructive"
            className="h-11 flex-1 rounded-xl font-black"
            onClick={handleConfirm}
            disabled={voidSale.isPending}
          >
            {voidSale.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t("sales.voidConfirm")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
