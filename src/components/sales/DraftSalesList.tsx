import { useState } from "react";
import { CheckCircle2, Trash2, Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatTZS } from "@/data/mockData";
import type { Sale } from "@/types";
import { useI18n } from "@/lib/i18n";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Props {
  drafts: Sale[];
  canConfirm: boolean;
  canDelete: boolean;
  onConfirm: (sale: Sale) => Promise<void>;
  onDelete: (sale: Sale) => Promise<void>;
}

export default function DraftSalesList({ drafts, canConfirm, canDelete, onConfirm, onDelete }: Props) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [draftToDelete, setDraftToDelete] = useState<Sale | null>(null);
  const { t } = useI18n();

  const handleConfirm = async (sale: Sale) => { setLoadingId(sale.id); try { await onConfirm(sale); } finally { setLoadingId(null); } };
  const handleDelete = async () => {
    if (!draftToDelete) return;
    setLoadingId(draftToDelete.id);
    try {
      await onDelete(draftToDelete);
      setDraftToDelete(null);
    } finally {
      setLoadingId(null);
    }
  };

  if (drafts.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
        <p className="text-muted-foreground">{t("sales.noDrafts")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Mobile View */}
      <div className="grid gap-4 sm:hidden">
        {drafts.map((s, idx) => (
          <div key={s.id} className="glass-card p-4 rounded-2xl border fade-in-up" style={{ animationDelay: `${idx * 50}ms` }}>
            <div className="flex justify-between items-start mb-2">
              <div className="space-y-1">
                <h3 className="font-bold text-foreground">{s.productName}</h3>
                <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 text-[10px] font-bold">Draft</Badge>
              </div>
              <span className="text-[10px] text-muted-foreground">{s.date}</span>
            </div>
            <div className="flex justify-between items-end">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">{t("sales.customer")}: {s.customerName || "—"}</p>
                <p className="text-[10px] uppercase font-bold text-muted-foreground/70 tracking-wider bg-muted/50 px-2 py-0.5 rounded-full inline-block">{s.paymentMethod}</p>
              </div>
              <div className="text-right space-y-2">
                <div>
                  <p className="text-[10px] text-muted-foreground">{s.quantity} pcs</p>
                  <p className="text-sm font-black text-primary">{formatTZS(s.totalPrice)}</p>
                </div>
                <div className="flex items-center justify-end gap-2">
                  {canDelete && (
                    <Button size="icon" variant="ghost" disabled={loadingId === s.id} onClick={() => setDraftToDelete(s)} className="h-8 w-8 text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                  {canConfirm && (
                    <Button size="sm" variant="default" disabled={loadingId === s.id} onClick={() => handleConfirm(s)} className="h-8 px-3 text-xs">
                      {loadingId === s.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <><CheckCircle2 className="h-3 w-3 mr-1" />{t("sales.confirm")}</>}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop View */}
      <div className="hidden sm:block stat-card overflow-x-auto border-primary/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground/70 uppercase text-[10px] font-black tracking-wider">
              <th className="pb-3 font-medium px-4">#</th>
              <th className="pb-3 font-medium">{t("sales.product")}</th>
              <th className="pb-3 font-medium hidden md:table-cell">{t("sales.customer")}</th>
              <th className="pb-3 font-medium text-right">{t("sales.quantity")}</th>
              <th className="pb-3 font-medium text-right">{t("sales.total")}</th>
              <th className="pb-3 font-medium px-4">{t("sales.payment")}</th>
              <th className="pb-3 font-medium">{t("sales.status")}</th>
              <th className="pb-3 font-medium text-right px-4">{t("products.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {drafts.map((s, i) => (
              <tr key={s.id} className="border-b last:border-0 hover:bg-primary/5 transition-colors group">
                <td className="py-4 px-4 text-muted-foreground font-mono text-[10px]">{String(i + 1).padStart(2, "0")}</td>
                <td className="py-4 font-bold text-foreground">{s.productName}</td>
                <td className="py-4 text-muted-foreground font-medium hidden md:table-cell">{s.customerName || "—"}</td>
                <td className="py-4 text-right font-medium">{s.quantity}</td>
                <td className="py-4 text-right font-black text-primary">{formatTZS(s.totalPrice)}</td>
                <td className="py-4 px-4">
                  <span className="inline-flex items-center rounded-full bg-muted/50 px-2.5 py-0.5 text-[10px] font-bold text-muted-foreground group-hover:bg-background transition-colors border border-transparent group-hover:border-border">
                    {s.paymentMethod}
                  </span>
                </td>
                <td className="py-4"><Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 text-[10px] font-bold">Draft</Badge></td>
                <td className="py-4 text-right px-4">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {canConfirm && (
                      <Button size="sm" variant="default" disabled={loadingId === s.id} onClick={() => handleConfirm(s)} className="h-7 text-[10px] font-black uppercase tracking-tighter">
                        {loadingId === s.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <><CheckCircle2 className="h-3 w-3 mr-1" />{t("sales.confirm")}</>}
                      </Button>
                    )}
                    {canDelete && (
                      <Button size="sm" variant="ghost" disabled={loadingId === s.id} onClick={() => setDraftToDelete(s)} className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AlertDialog open={!!draftToDelete} onOpenChange={(open) => !open && setDraftToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("common.areYouSure")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("common.deleteConfirmation")} {t("sales.draftsTab").toLowerCase()}: <span className="font-semibold text-foreground">{draftToDelete?.productName}</span>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loadingId === draftToDelete?.id}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => { e.preventDefault(); handleDelete(); }} 
              disabled={loadingId === draftToDelete?.id}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loadingId === draftToDelete?.id ? <Loader2 className="h-4 w-4 animate-spin" /> : t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}