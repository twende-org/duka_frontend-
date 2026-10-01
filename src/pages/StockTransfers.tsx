import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Send, Trash2, Truck } from "lucide-react";
import { format } from "date-fns";
import PageHeader from "@/components/common/PageHeader";
import { useAppSelector } from "@/store/hooks";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useProducts } from "@/hooks/useProducts";
import { useInventory } from "@/hooks/useInventory";
import {
  useB2BTransfers,
  useCancelStockTransfer,
  useCreateStockTransfer,
} from "@/hooks/useB2BTransfers";
import { ReceiveTransferDialog } from "@/components/transfers/ReceiveTransferDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import type { B2BTransfer } from "@/types";

type Direction = "incoming" | "outgoing";

interface DraftItem {
  productId: string;
  quantity: number;
  unitCost: number;
}

const STATUS_TONE: Record<B2BTransfer["status"], string> = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200",
  completed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200",
  cancelled: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};

const STATUS_KEY: Record<B2BTransfer["status"], "transfers.statusPending" | "transfers.statusCompleted" | "transfers.statusCancelled"> = {
  pending: "transfers.statusPending",
  completed: "transfers.statusCompleted",
  cancelled: "transfers.statusCancelled",
};

function shortDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : format(date, "MMM d HH:mm");
}

export default function StockTransfers() {
  const { t } = useI18n();
  const shopId = useAppSelector((s) => s.shops.currentShopId);
  const shops = useAppSelector((s) => s.shops.shops);
  const branches = useAppSelector((s) => s.branches.branches);
  const currentBranchId = useAppSelector((s) => s.branches.currentBranchId);

  const [tab, setTab] = useState<Direction>("incoming");
  const { data: transfers = [], isLoading } = useB2BTransfers(shopId, { direction: tab });
  const cancel = useCancelStockTransfer(shopId);
  const create = useCreateStockTransfer(shopId);
  const { data: products = [] } = useProducts(shopId);
  const { data: inventory = [] } = useInventory(shopId, null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [receiving, setReceiving] = useState<B2BTransfer | null>(null);
  const [fromBranchId, setFromBranchId] = useState("");
  const [toShopId, setToShopId] = useState("");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [items, setItems] = useState<DraftItem[]>([]);

  const shopBranches = useMemo(
    () => branches.filter((b) => b.shopId === shopId),
    [branches, shopId]
  );
  const otherShops = useMemo(
    () => shops.filter((s) => s.id !== shopId),
    [shops, shopId]
  );

  useEffect(() => {
    if (dialogOpen) {
      setFromBranchId(currentBranchId || "");
      setToShopId("");
      setReference("");
      setNote("");
      setItems([{ productId: "", quantity: 1, unitCost: 0 }]);
    }
  }, [dialogOpen, currentBranchId]);

  const stockOf = (productId: string) => {
    const rows = inventory.filter((i) => i.productId === productId);
    if (fromBranchId) {
      const branchRow = rows.find((i) => i.branchId === fromBranchId);
      if (branchRow) return branchRow.quantity;
    }
    return rows.reduce((sum, i) => sum + i.quantity, 0);
  };

  const updateItem = (index: number, patch: Partial<DraftItem>) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const onPickProduct = (index: number, productId: string) => {
    const product = products.find((p) => p.id === productId);
    updateItem(index, {
      productId,
      unitCost: product ? product.buyingPrice : 0,
    });
  };

  const onSubmit = () => {
    if (!shopId) return;
    if (!toShopId || !fromBranchId) {
      toast.error(t("transfers.needTarget"));
      return;
    }
    const clean = items.filter((i) => i.productId && i.quantity > 0);
    if (clean.length === 0) {
      toast.error(t("transfers.needItems"));
      return;
    }
    create.mutate(
      {
        fromShopId: shopId,
        toShopId,
        fromBranchId,
        reference: reference.trim() || undefined,
        note: note.trim() || undefined,
        items: clean.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          unitCost: i.unitCost > 0 ? i.unitCost : undefined,
        })),
      },
      {
        onSuccess: () => {
          setDialogOpen(false);
          toast.success(t("transfers.sentToast"));
        },
        onError: (err) => toast.error(err.message),
      }
    );
  };

  if (!shopId) {
    return (
      <div className="space-y-6">
        <PageHeader title={t("transfers.title")} description={t("transfers.subtitle")} />
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {t("transfers.noShop")}
          </CardContent>
        </Card>
      </div>
    );
  }

  const partnerOf = (transfer: B2BTransfer) =>
    tab === "incoming" ? transfer.fromShopId : transfer.toShopId;
  const shopName = (id: string) => shops.find((s) => s.id === id)?.name || id.slice(0, 8);

  const onCancel = (id: string) => {
    cancel.mutate(id, {
      onSuccess: () => toast.success(t("transfers.cancelledToast")),
      onError: (err) => toast.error(err.message),
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("transfers.title")}
        description={t("transfers.subtitle")}
        actions={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t("transfers.new")}
          </Button>
        }
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as Direction)}>
        <TabsList>
          <TabsTrigger value="incoming">{t("transfers.incoming")}</TabsTrigger>
          <TabsTrigger value="outgoing">{t("transfers.outgoing")}</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("transfers.loading")}
            </div>
          ) : transfers.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <Truck className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{t("transfers.noTransfers")}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("transfers.colDate")}</TableHead>
                    <TableHead>{t("transfers.colPartner")}</TableHead>
                    <TableHead>{t("transfers.colRef")}</TableHead>
                    <TableHead>{t("transfers.colLines")}</TableHead>
                    <TableHead>{t("transfers.colQty")}</TableHead>
                    <TableHead>{t("transfers.colStatus")}</TableHead>
                    <TableHead className="text-right">{t("transfers.colActions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transfers.map((transfer) => {
                    const canReceive = tab === "incoming" && transfer.status === "pending";
                    const canCancel = transfer.status === "pending";
                    return (
                      <TableRow key={transfer.id}>
                        <TableCell className="whitespace-nowrap text-xs">
                          {shortDate(transfer.createdAt)}
                        </TableCell>
                        <TableCell className="text-sm font-medium">
                          {shopName(partnerOf(transfer))}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {transfer.reference || "—"}
                        </TableCell>
                        <TableCell className="text-sm">{transfer.items.length}</TableCell>
                        <TableCell className="text-sm">{transfer.totalQuantity}</TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              "inline-block rounded-full px-2 py-0.5 text-xs font-medium",
                              STATUS_TONE[transfer.status]
                            )}
                          >
                            {t(STATUS_KEY[transfer.status])}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {canReceive && (
                              <>
                                <Button
                                  size="sm"
                                  className="h-7 px-3 text-xs"
                                  onClick={() => setReceiving(transfer)}
                                  disabled={cancel.isPending}
                                >
                                  {t("transfers.confirm")}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-3 text-xs"
                                  onClick={() => onCancel(transfer.id)}
                                  disabled={cancel.isPending}
                                >
                                  {t("transfers.decline")}
                                </Button>
                              </>
                            )}
                            {tab === "outgoing" && canCancel && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-3 text-xs"
                                onClick={() => onCancel(transfer.id)}
                                disabled={cancel.isPending}
                              >
                                {t("transfers.cancelAction")}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("transfers.newTitle")}</DialogTitle>
            <DialogDescription>{t("transfers.newDesc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {otherShops.length === 0 ? (
              <p className="rounded-lg bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                {t("transfers.needShop")}
              </p>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>{t("transfers.fromShop")}</Label>
                    <Input value={shopName(shopId)} disabled />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("transfers.fromBranch")}</Label>
                    <Select value={fromBranchId} onValueChange={setFromBranchId}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("transfers.pickBranch")} />
                      </SelectTrigger>
                      <SelectContent>
                        {(shopBranches.length > 0
                          ? shopBranches
                          : branches.filter((b) => b.id === currentBranchId)
                        ).map((branch) => (
                          <SelectItem key={branch.id} value={branch.id}>
                            {branch.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("transfers.toShop")}</Label>
                    <Select value={toShopId} onValueChange={setToShopId}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("transfers.pickShop")} />
                      </SelectTrigger>
                      <SelectContent>
                        {otherShops.map((shop) => (
                          <SelectItem key={shop.id} value={shop.id}>
                            {shop.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="transfer-ref">{t("transfers.reference")}</Label>
                    <Input
                      id="transfer-ref"
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{t("transfers.itemsTitle")}</Label>
                  {items.map((item, index) => (
                    <div key={index} className="flex flex-wrap items-center gap-2">
                      <Select
                        value={item.productId}
                        onValueChange={(v) => onPickProduct(index, v)}
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
                        </SelectContent>
                      </Select>
                      <span className="text-xs text-muted-foreground">
                        {t("transfers.stock")}: {item.productId ? stockOf(item.productId) : "—"}
                      </span>
                      <Input
                        type="number"
                        min={1}
                        className="w-20"
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(index, { quantity: Number(e.target.value) || 0 })
                        }
                      />
                      <Input
                        type="number"
                        min={0}
                        step="any"
                        className="w-28"
                        value={item.unitCost}
                        onChange={(e) =>
                          updateItem(index, { unitCost: Number(e.target.value) || 0 })
                        }
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-red-600"
                        onClick={() =>
                          setItems((prev) => prev.filter((_, i) => i !== index))
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setItems((prev) => [
                        ...prev,
                        { productId: "", quantity: 1, unitCost: 0 },
                      ])
                    }
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    {t("transfers.addItem")}
                  </Button>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="transfer-note">{t("transfers.note")}</Label>
                  <Input id="transfer-note" value={note} onChange={(e) => setNote(e.target.value)} />
                </div>

                <div className="flex items-center justify-end gap-2">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    {t("common.cancel")}
                  </Button>
                  <Button onClick={onSubmit} disabled={create.isPending}>
                    {create.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="mr-2 h-4 w-4" />
                    )}
                    {t("transfers.submit")}
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ReceiveTransferDialog
        transfer={receiving}
        shopId={shopId}
        isOpen={receiving !== null}
        onClose={() => setReceiving(null)}
      />
    </div>
  );
}
