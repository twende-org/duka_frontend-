import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, Plus } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useProducts, useCreateProduct } from "@/hooks/useProducts";
import {
  useCompleteStockTransfer,
  useMapTransferItems,
} from "@/hooks/useB2BTransfers";
import type { B2BTransfer, Product } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const NEW_PRODUCT = "__new__";

interface NewProductForm {
  name: string;
  buyingPrice: number;
  sellingPrice: number;
  unit: string;
}

/**
 * Map-before-receive: every incoming line must land on one of the receiver's
 * products (existing or freshly created) before the transfer is completed.
 */
export function ReceiveTransferDialog({
  transfer,
  shopId,
  isOpen,
  onClose,
}: {
  transfer: B2BTransfer | null;
  shopId: string;
  isOpen: boolean;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const { data: products = [] } = useProducts(shopId);
  const createProduct = useCreateProduct(shopId);
  const mapItems = useMapTransferItems(shopId);
  const complete = useCompleteStockTransfer(shopId);

  const [mappings, setMappings] = useState<Record<string, string | null>>({});
  const [newForItem, setNewForItem] = useState<string | null>(null);
  const [newForm, setNewForm] = useState<NewProductForm>({
    name: "",
    buyingPrice: 0,
    sellingPrice: 0,
    unit: "pcs",
  });

  useEffect(() => {
    if (!isOpen || !transfer) return;
    const initial: Record<string, string | null> = {};
    for (const item of transfer.items) {
      initial[item.id] = item.mappedProductId ?? item.suggestedProductId ?? null;
    }
    setMappings(initial);
    setNewForItem(null);
  }, [isOpen, transfer]);

  const productName = useMemo(() => {
    const byId = new Map(products.map((p) => [p.id, p.name]));
    return (id: string | null | undefined) => (id ? byId.get(id) ?? null : null);
  }, [products]);

  if (!transfer) return null;

  const allMapped = transfer.items.every(
    (item) => Boolean(mappings[item.id]) || Boolean(item.mappedProductId)
  );
  const busy = mapItems.isPending || complete.isPending || createProduct.isPending;

  const onPick = (itemId: string, value: string) => {
    setMappings((prev) => ({
      ...prev,
      [itemId]: value === NEW_PRODUCT ? null : value,
    }));
    if (value === NEW_PRODUCT) {
      const item = transfer.items.find((i) => i.id === itemId);
      setNewForItem(itemId);
      setNewForm({
        name: item?.productName ?? "",
        buyingPrice: item?.unitCost ?? 0,
        sellingPrice: 0,
        unit: item?.unit || "pcs",
      });
    } else {
      setNewForItem((prev) => (prev === itemId ? null : prev));
    }
  };

  const onCreateNew = async (itemId: string) => {
    if (!newForm.name.trim()) {
      toast.error(t("transfers.receiveNeedName"));
      return;
    }
    try {
      const createdId = await createProduct.mutateAsync({
        name: newForm.name.trim(),
        buyingPrice: newForm.buyingPrice,
        sellingPrice: newForm.sellingPrice,
        unit: newForm.unit.trim() || undefined,
        supplier: transfer.fromShopId,
        shopId,
      } as unknown as Omit<Product, "id">);
      setMappings((prev) => ({ ...prev, [itemId]: createdId }));
      setNewForItem(null);
      toast.success(t("products.added"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  const onReceive = async () => {
    if (!allMapped) {
      toast.error(t("transfers.receiveNeedMap"));
      return;
    }
    try {
      await mapItems.mutateAsync({
        transferId: transfer.id,
        mappings: transfer.items.map((item) => ({
          itemId: item.id,
          productId:
            mappings[item.id] ??
            item.mappedProductId ??
            null,
        })),
      });
      await complete.mutateAsync(transfer.id);
      toast.success(t("transfers.completedToast"));
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("transfers.receiveTitle")}</DialogTitle>
          <DialogDescription>{t("transfers.receiveDesc")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2 font-medium">{t("transfers.receiveColLine")}</th>
                  <th className="px-3 py-2 font-medium">{t("transfers.receiveColMap")}</th>
                </tr>
              </thead>
              <tbody>
                {transfer.items.map((item) => {
                  const selected = mappings[item.id] ?? item.mappedProductId ?? null;
                  return (
                    <tr key={item.id} className="border-b last:border-b-0">
                      <td className="px-3 py-2">
                        <div className="font-medium">{item.productName}</div>
                        <div className="text-xs text-muted-foreground">
                          {item.quantity} {item.unit}
                          {item.unitCost > 0 ? ` · ${item.unitCost}` : ""}
                          {item.sku ? ` · ${item.sku}` : ""}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Select
                            value={selected ?? ""}
                            onValueChange={(v) => onPick(item.id, v)}
                          >
                            <SelectTrigger className="min-w-[180px] flex-1">
                              <SelectValue placeholder={t("transfers.pickProduct")} />
                            </SelectTrigger>
                            <SelectContent>
                              {products.map((product) => (
                                <SelectItem key={product.id} value={product.id}>
                                  {product.name}
                                </SelectItem>
                              ))}
                              <SelectItem value={NEW_PRODUCT}>
                                {t("transfers.receiveNewOption")}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          {!selected &&
                            item.suggestedProductId &&
                            productName(item.suggestedProductId) && (
                              <Badge variant="outline" className="shrink-0 text-[10px]">
                                {t("transfers.receiveSuggested")}
                              </Badge>
                            )}
                        </div>
                        {newForItem === item.id && (
                          <div className="mt-2 space-y-2 rounded-lg border bg-muted/30 p-3">
                            <p className="text-xs font-medium">{t("transfers.receiveNewTitle")}</p>
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                              <div className="space-y-1">
                                <Label className="text-xs">{t("transfers.receiveNewName")}</Label>
                                <Input
                                  value={newForm.name}
                                  onChange={(e) =>
                                    setNewForm((prev) => ({ ...prev, name: e.target.value }))
                                  }
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">{t("transfers.receiveNewUnit")}</Label>
                                <Input
                                  value={newForm.unit}
                                  onChange={(e) =>
                                    setNewForm((prev) => ({ ...prev, unit: e.target.value }))
                                  }
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">{t("transfers.receiveNewBuy")}</Label>
                                <Input
                                  type="number"
                                  min={0}
                                  step="any"
                                  value={newForm.buyingPrice}
                                  onChange={(e) =>
                                    setNewForm((prev) => ({
                                      ...prev,
                                      buyingPrice: Number(e.target.value) || 0,
                                    }))
                                  }
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">{t("transfers.receiveNewSell")}</Label>
                                <Input
                                  type="number"
                                  min={0}
                                  step="any"
                                  value={newForm.sellingPrice}
                                  onChange={(e) =>
                                    setNewForm((prev) => ({
                                      ...prev,
                                      sellingPrice: Number(e.target.value) || 0,
                                    }))
                                  }
                                />
                              </div>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => onCreateNew(item.id)}
                              disabled={createProduct.isPending}
                            >
                              {createProduct.isPending ? (
                                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Plus className="mr-1 h-3.5 w-3.5" />
                              )}
                              {createProduct.isPending
                                ? t("transfers.receiveAdding")
                                : t("transfers.receiveAdd")}
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={busy}>
              {t("common.cancel")}
            </Button>
            <Button onClick={onReceive} disabled={!allMapped || busy}>
              {busy ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}
              {busy ? t("transfers.receiveReceiving") : t("transfers.receiveAction")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
