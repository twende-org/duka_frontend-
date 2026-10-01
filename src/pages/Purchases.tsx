import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Truck, Plus, Search, CheckCircle, Clock, XCircle, ShoppingBag, PackageOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAppSelector } from "@/store/hooks";
import { useBuyerB2BOrders, useUpdateB2BOrderStatus, useGRNsForPO } from "@/hooks/useB2BOrders";
import { formatTZS } from "@/data/mockData";
import { toast } from "sonner";
import type { B2BPurchaseOrder } from "@/types";
import { useI18n } from "@/lib/i18n";
import PageHeader from "@/components/common/PageHeader";
import { PageLoader } from "@/components/common/Loader";
import { BuyerShipmentsList } from "@/components/purchases/BuyerShipmentsList";
import { TimelineHistory } from "@/components/purchases/TimelineHistory";
import { ProcurementDashboard } from "@/components/purchases/ProcurementDashboard";
import CreateInvoiceDialog from "@/components/purchases/CreateInvoiceDialog";
import { CreateShipmentDialog } from "@/components/b2b/CreateShipmentDialog";
import { CreatePurchaseOrderDialog } from "@/components/purchases/CreatePurchaseOrderDialog";

const CANCELLED_GROUP = ["cancelled", "rejected", "closed_short"];

export default function Purchases() {
  const currentShopId = useAppSelector((s) => s.shops.currentShopId);
  const currentShop = useAppSelector((s) => s.shops?.shops?.find(shop => shop.id === currentShopId));
  const { data: orders = [], isLoading } = useBuyerB2BOrders(currentShopId);
  const updateStatusMut = useUpdateB2BOrderStatus();
  const { t } = useI18n();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [createShipmentPO, setCreateShipmentPO] = useState<B2BPurchaseOrder | null>(null);
  const [createPOOpen, setCreatePOOpen] = useState(false);
  const [createInvoicePO, setCreateInvoicePO] = useState<B2BPurchaseOrder | null>(null);
  const { data: poGRNs, isLoading: isLoadingGRNs, isError: isErrorGRNs } = useGRNsForPO(createInvoicePO?.id);

  const matchesTab = (status: string, tab: string) => {
    if (tab === "all") return true;
    if (tab === "cancelled") return CANCELLED_GROUP.includes(status);
    return status === tab;
  };

  const searchedOrders = useMemo(() => {
    const q = search.toLowerCase();
    return orders
      .filter(o => o.id.toLowerCase().includes(q) || o.supplierName.toLowerCase().includes(q))
      .sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt as string).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt as string).getTime() : 0;
        return dateB - dateA;
      });
  }, [orders, search]);

  const filteredOrders = useMemo(
    () => searchedOrders.filter(o => matchesTab(o.status, statusFilter)),
    [searchedOrders, statusFilter]
  );

  const tabs = useMemo(() => {
    const defs: Array<[string, string]> = [
      ["all", t("purchases.allStatuses")],
      ["draft", t("purchases.statusDraft")],
      ["submitted", t("purchases.statusSubmitted")],
      ["supplier_reviewing", t("purchases.statusReviewing")],
      ["approved", t("purchases.statusApproved")],
      ["awaiting_shipment", t("purchases.statusAwaitingShipment")],
      ["partially_received", t("purchases.statusPartiallyReceived")],
      ["completed", t("purchases.statusCompleted")],
      ["cancelled", t("purchases.statusCancelled")],
    ];
    return defs.map(([value, label]) => ({
      value,
      label,
      count: searchedOrders.filter(o => matchesTab(o.status, value)).length,
    }));
  }, [searchedOrders, t]);

  const handleCancelDraft = async (order: B2BPurchaseOrder) => {
    try {
      await updateStatusMut.mutateAsync({ poId: order.id, status: "cancelled" });
      toast.success(t("purchases.cancelledSuccess"));
    } catch (err: any) {
      toast.error(err.message || t("purchases.cancelFailed"));
    }
  };

  const handleCloseShort = async (order: B2BPurchaseOrder) => {
    try {
      await updateStatusMut.mutateAsync({ poId: order.id, status: "closed_short", notes: "Closed Short manually by buyer." });
      toast.success(t("purchases.closedShortSuccess"));
    } catch (err: any) {
      toast.error(err.message || t("purchases.closeFailed"));
    }
  };

  const statusConfig = (status: string) => {
    switch (status) {
      case "draft": return { label: t("purchases.statusDraft"), color: "bg-muted text-muted-foreground border-border", icon: <Clock className="h-3 w-3" /> };
      case "submitted": return { label: t("purchases.statusSubmitted"), color: "bg-primary/10 text-primary border-primary/20", icon: <Truck className="h-3 w-3" /> };
      case "supplier_reviewing": return { label: t("purchases.statusReviewing"), color: "bg-amber-500/10 text-amber-600 border-amber-500/20", icon: <Clock className="h-3 w-3" /> };
      case "approved": return { label: t("purchases.statusApproved"), color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", icon: <CheckCircle className="h-3 w-3" /> };
      case "rejected": return { label: t("purchases.statusRejected"), color: "bg-destructive/10 text-destructive border-destructive/20", icon: <XCircle className="h-3 w-3" /> };
      case "cancelled": return { label: t("purchases.statusCancelled"), color: "bg-destructive/10 text-destructive border-destructive/20", icon: <XCircle className="h-3 w-3" /> };
      case "awaiting_shipment": return { label: t("purchases.statusAwaitingShipment"), color: "bg-blue-500/10 text-blue-600 border-blue-500/20", icon: <Truck className="h-3 w-3" /> };
      case "partially_received": return { label: t("purchases.statusPartiallyReceived"), color: "bg-blue-500/10 text-blue-600 border-blue-500/20", icon: <PackageOpen className="h-3 w-3" /> };
      case "completed": return { label: t("purchases.statusCompleted"), color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", icon: <CheckCircle className="h-3 w-3" /> };
      case "closed_short": return { label: t("purchases.statusClosedShort"), color: "bg-muted text-muted-foreground border-border", icon: <CheckCircle className="h-3 w-3" /> };
      default: return { label: status, color: "bg-muted text-muted-foreground border-border", icon: <Clock className="h-3 w-3" /> };
    }
  };

  if (!currentShopId) {
    return (
      <div className="text-center py-12">
        <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
        <p className="text-muted-foreground">{t("purchases.selectShopFirst")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title={t("purchases.workspaceTitle")}
        description={t("purchases.workspaceDesc")}
        actions={
          <Button onClick={() => setCreatePOOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            {t("purchases.newOrder")}
          </Button>
        }
      />

      <ProcurementDashboard orders={orders} />

      <Card className="shadow-sm">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("purchases.searchPlaceholder")}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 bg-muted/50 border-none focus-visible:ring-1"
              />
            </div>
          </div>

          <Tabs value={statusFilter} onValueChange={setStatusFilter}>
            <div className="-mx-1 mb-4 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <TabsList className="inline-flex w-max h-auto gap-1 bg-muted/50 p-1">
                {tabs.map(({ value, label, count }) => (
                  <TabsTrigger key={value} value={value} className="relative gap-2 whitespace-nowrap transition-all duration-200 data-[state=active]:shadow-sm">
                    <span>{label}</span>
                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
                      {count}
                    </span>
                    {statusFilter === value && (
                      <motion.span
                        layoutId="purchases-tab-underline"
                        className="absolute inset-x-2 -bottom-0.5 h-0.5 rounded-full bg-primary"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <TabsContent value={statusFilter} className="mt-0 outline-none">
              {isLoading ? (
                <PageLoader />
              ) : filteredOrders.length === 0 ? (
                <div className="text-center py-16 rounded-xl border border-dashed">
                  <Truck className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
                  <h3 className="text-lg font-semibold text-foreground">{t("purchases.noOrdersTitle")}</h3>
                  <p className="text-muted-foreground text-sm max-w-sm mx-auto mt-1">
                    {t("purchases.noOrdersDesc")}
                  </p>
                  <Button onClick={() => setCreatePOOpen(true)} className="mt-4 gap-2">
                    <Plus className="h-4 w-4" />
                    {t("purchases.newOrder")}
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4">
                  {filteredOrders.map((order, index) => {
                    const conf = statusConfig(order.status);
                    return (
                      <motion.div
                        key={order.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25, delay: Math.min(index * 0.04, 0.3) }}
                      >
                        <Card className="overflow-hidden shadow-sm transition-all duration-300 hover:shadow-md">
                          <CardContent className="p-0">
                            {/* Header */}
                            <div className="p-5 flex flex-col md:flex-row gap-3 md:gap-4 justify-between md:items-center border-b bg-muted/30">
                              <div className="min-w-0">
                                <div className="flex items-center gap-3 mb-1 flex-nowrap">
                                  <span className="font-bold text-lg text-primary tracking-tight whitespace-nowrap">
                                    PO-{order.id.slice(0, 6).toUpperCase()}
                                  </span>
                                  <span className={`px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 whitespace-nowrap shrink-0 ${conf.color}`}>
                                    {conf.icon} {conf.label}
                                  </span>
                                </div>
                                <p className="text-sm font-medium text-muted-foreground whitespace-nowrap truncate">
                                  {t("purchases.supplier")}
                                  <span className="text-foreground">{order.supplierName}</span>
                                </p>
                              </div>
                              <div className="text-left md:text-right shrink-0">
                                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1 whitespace-nowrap">
                                  {t("purchases.estimatedTotal")}
                                </p>
                                <p className="text-xl font-black text-foreground whitespace-nowrap">{formatTZS(order.totalAmount)}</p>
                              </div>
                            </div>

                            {/* Items */}
                            <div className="p-5">
                              <div className="grid gap-2 mb-4">
                                {order.items.map((item, idx) => (
                                  <div key={idx} className="flex justify-between items-center gap-3 text-sm p-2 rounded-lg border bg-muted/20">
                                    <div className="flex items-center gap-3 min-w-0">
                                      <span className="font-semibold text-foreground truncate">{item.productName}</span>
                                      <span className="text-xs text-muted-foreground px-2 py-0.5 bg-background rounded-md border whitespace-nowrap shrink-0">
                                        {t("purchases.expected")}{item.expectedQty}
                                      </span>
                                      {item.receivedQty !== undefined && (
                                        <span className={`text-xs px-2 py-0.5 rounded-md border whitespace-nowrap shrink-0 ${item.receivedQty >= item.expectedQty ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 border-amber-500/20'}`}>
                                          {t("purchases.received")}{item.receivedQty}
                                        </span>
                                      )}
                                    </div>
                                    <span className="font-medium text-foreground whitespace-nowrap">{formatTZS(item.subtotal)}</span>
                                  </div>
                                ))}
                              </div>

                              <div className="flex flex-wrap items-center justify-between gap-4 border-t pt-4">
                                <div className="text-xs text-muted-foreground flex items-center gap-2 whitespace-nowrap">
                                  <Clock className="w-4 h-4" />
                                  {t("purchases.created")}{order.createdAt ? new Date(order.createdAt as string).toLocaleDateString() : t("purchases.unknown")}
                                </div>

                                <div className="flex flex-nowrap gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                                  {["draft", "submitted"].includes(order.status) && (
                                    <Button variant="outline" size="sm" onClick={() => handleCancelDraft(order)} className="shrink-0 whitespace-nowrap text-destructive hover:bg-destructive/10">
                                      {t("purchases.cancelOrder")}
                                    </Button>
                                  )}
                                  {order.status === "partially_received" && (
                                    <Button variant="outline" size="sm" onClick={() => handleCloseShort(order)} className="shrink-0 whitespace-nowrap">
                                      {t("purchases.closeOrderShort")}
                                    </Button>
                                  )}
                                  {["partially_received", "completed", "closed_short"].includes(order.status) && (
                                    <Button 
                                      variant="outline" 
                                      size="sm" 
                                      onClick={() => setCreateInvoicePO(order)} 
                                      className="shrink-0 whitespace-nowrap"
                                      disabled={createInvoicePO?.id === order.id && isLoadingGRNs}
                                    >
                                      {createInvoicePO?.id === order.id 
                                        ? (isLoadingGRNs ? "Loading..." : isErrorGRNs ? "Error Loading" : t("purchases.recordInvoice"))
                                        : t("purchases.recordInvoice")}
                                    </Button>
                                  )}
                                  <Button size="sm" variant="secondary" onClick={() => toast.info(t("purchases.viewDetails") + ": Coming Soon")} className="shrink-0 whitespace-nowrap">
                                    {t("purchases.viewDetails")}
                                  </Button>
                                </div>
                              </div>
                            </div>

                            {/* Shipments & timeline */}
                            <div className="px-5 pb-5 space-y-4">
                              <BuyerShipmentsList order={order} currentShopId={currentShopId} />
                              <TimelineHistory events={order.timeline} />
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <CreatePurchaseOrderDialog
        isOpen={createPOOpen}
        onClose={() => setCreatePOOpen(false)}
        shopId={currentShopId}
      />

      {createShipmentPO && currentShop && (
        <CreateShipmentDialog
          order={createShipmentPO}
          isOpen={true}
          currentShopId={currentShop.id}
          onClose={() => setCreateShipmentPO(null)}
        />
      )}

      {createInvoicePO && poGRNs && (
        <CreateInvoiceDialog
          po={createInvoicePO}
          grns={poGRNs}
          onClose={() => setCreateInvoicePO(null)}
        />
      )}
    </div>
  );
}
