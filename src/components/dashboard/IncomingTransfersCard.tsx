import { useMemo, useState } from "react";
import { ArrowDownToLine, CheckCircle2, Loader2, Truck, XCircle } from "lucide-react";
import { useAppSelector } from "@/store/hooks";
import { useI18n } from "@/lib/i18n";
import { useB2BTransfers, useAcceptStockTransfer, useCancelStockTransfer } from "@/hooks/useB2BTransfers";
import { ReceiveTransferDialog } from "@/components/transfers/ReceiveTransferDialog";
import type { B2BTransfer } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export function IncomingTransfersCard({ shopId }: { shopId: string }) {
  const { t } = useI18n();
  const shops = useAppSelector((s) => s.shops.shops);
  const { data: transfers = [] } = useB2BTransfers(shopId, { direction: "incoming", status: "pending" });
  const decline = useCancelStockTransfer(shopId);
  const accept = useAcceptStockTransfer(shopId);
  const [receiving, setReceiving] = useState<B2BTransfer | null>(null);

  const groups = useMemo(() => {
    const bySender = new Map<string, typeof transfers>();
    for (const transfer of transfers) {
      const list = bySender.get(transfer.fromShopId) ?? [];
      list.push(transfer);
      bySender.set(transfer.fromShopId, list);
    }
    return Array.from(bySender.entries());
  }, [transfers]);

  if (transfers.length === 0) return null;

  const shopName = (id: string) => shops.find((s) => s.id === id)?.name || id.slice(0, 8);

  const onDecline = (id: string) => {
    decline.mutate(id, {
      onSuccess: () => toast.success(t("transfers.declinedToast")),
      onError: (err) => toast.error(err.message),
    });
  };

  const onAccept = (id: string) => {
    accept.mutate(id, {
      onSuccess: () => toast.success(t("transfers.acceptedToast")),
      onError: (err) => toast.error(err.message),
    });
  };

  return (
    <Card className="border-primary/30 fade-in-up">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <Truck className="h-4 w-4 text-primary" />
            {t("transfers.cardTitle")}
            <Badge className="ml-1">{transfers.length}</Badge>
          </CardTitle>
          <CardDescription>{t("transfers.cardDesc")}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {groups.map(([fromShopId, list]) => {
          const totalQty = list.reduce((sum, tr) => sum + tr.totalQuantity, 0);
          return (
            <div key={fromShopId} className="space-y-2 rounded-xl border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-sm font-medium">
                  <ArrowDownToLine className="h-4 w-4 text-muted-foreground" />
                  {t("transfers.from")} {shopName(fromShopId)}
                </span>
                <Badge variant="outline">
                  {list.length} {t("transfers.lines")} · {totalQty} {t("intake.items")}
                </Badge>
              </div>
              {list.map((transfer) => (
                <div
                  key={transfer.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/40 px-3 py-2"
                >
                  <div className="min-w-0 text-xs text-muted-foreground">
                    {transfer.source === "sale" && (
                      <Badge variant="secondary" className="mr-2 bg-primary/10 text-primary">
                        {t("transfers.posDelivery")}
                      </Badge>
                    )}
                    <span className="font-medium text-foreground">
                      {transfer.items.length} {t("transfers.lines")}
                    </span>
                    {" · "}
                    {transfer.totalQuantity} {t("intake.items")}
                    {transfer.reference ? ` · ${transfer.reference}` : ""}
                    {transfer.note ? ` · ${transfer.note}` : ""}
                  </div>
                  <div className="flex items-center gap-2">
                    {transfer.source === "sale" ? (
                      <>
                        <Button
                          size="sm"
                          className="h-7 px-3 text-xs"
                          onClick={() => onAccept(transfer.id)}
                          disabled={accept.isPending || decline.isPending}
                        >
                          {accept.isPending && accept.variables === transfer.id ? (
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          ) : (
                            <ArrowDownToLine className="mr-1 h-3 w-3" />
                          )}
                          {t("transfers.accept")}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-3 text-xs"
                          onClick={() => setReceiving(transfer)}
                          disabled={accept.isPending || decline.isPending}
                        >
                          {t("transfers.review")}
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        className="h-7 px-3 text-xs"
                        onClick={() => setReceiving(transfer)}
                        disabled={decline.isPending}
                      >
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        {t("transfers.confirm")}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-3 text-xs"
                      onClick={() => onDecline(transfer.id)}
                      disabled={decline.isPending}
                    >
                      {decline.isPending && decline.variables === transfer.id ? (
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      ) : (
                        <XCircle className="mr-1 h-3 w-3" />
                      )}
                      {t("transfers.decline")}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </CardContent>

      <ReceiveTransferDialog
        transfer={receiving}
        shopId={shopId}
        isOpen={receiving !== null}
        onClose={() => setReceiving(null)}
      />
    </Card>
  );
}
