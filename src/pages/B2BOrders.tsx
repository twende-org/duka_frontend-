import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Truck, CheckCircle, XCircle, Search, Clock, ShoppingBag, Inbox, HandCoins, PackageOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useAppSelector } from "@/store/hooks";
import { useSupplierB2BOrders, useUpdateB2BOrderStatus } from "@/hooks/useB2BOrders";
import { formatTZS } from "@/data/mockData";
import { toast } from "sonner";
import type { B2BPurchaseOrder } from "@/types";
import PageHeader from "@/components/common/PageHeader";
import { PageLoader } from "@/components/common/Loader";
import { CreateShipmentDialog } from "@/components/b2b/CreateShipmentDialog";
import { useI18n } from "@/lib/i18n";

export default function B2BOrders() {
  const { t } = useI18n();
  const currentShopId = useAppSelector((s) => s.shops.currentShopId);
  const { data: orders = [], isLoading } = useSupplierB2BOrders(currentShopId);
  const updateStatusMut = useUpdateB2BOrderStatus();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<B2BPurchaseOrder | null>(null);
  const [actionNotes, setActionNotes] = useState("");
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isShipmentOpen, setIsShipmentOpen] = useState(false);

  const searchedOrders = useMemo(() => {
    return orders.filter(o => {
      const q = search.toLowerCase();
      return o.id.toLowerCase().includes(q) || (o as any).buyerName?.toLowerCase().includes(q);
    }).sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt as string).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt as string).getTime() : 0;
      return dateB - dateA;
    });
  }, [orders, search]);

  const filteredOrders = useMemo(() => {
    if (statusFilter === "all") return searchedOrders;
    if (statusFilter === "closed") return searchedOrders.filter(o => ["rejected", "cancelled"].includes(o.status));
    return searchedOrders.filter(o => o.status === statusFilter);
  }, [searchedOrders, statusFilter]);

  const countFor = (value: string) => {
    if (value === "all") return searchedOrders.length;
    if (value === "closed") return searchedOrders.filter(o => ["rejected", "cancelled"].includes(o.status)).length;
    return searchedOrders.filter(o => o.status === value).length;
  };

  const tabs = useMemo(() => ([
    { value: "all", label: t("b2bOrders.allStatuses") },
    { value: "submitted", label: t("b2bOrders.newRequests") },
    { value: "supplier_reviewing", label: t("b2bOrders.underReview") },
    { value: "approved", label: t("b2bOrders.approved") },
    { value: "awaiting_shipment", label: t("b2bOrders.status.awaitingShipment") },
    { value: "closed", label: t("b2bOrders.rejected") },
  ].map(tab => ({ ...tab, count: countFor(tab.value) }))), [searchedOrders, t]);

  const metrics = useMemo(() => {
    let newRequests = 0;
    let reviewing = 0;
    let approved = 0;
    let openValue = 0;
    orders.forEach(o => {
      if (o.status === "submitted") newRequests++;
      if (o.status === "supplier_reviewing") reviewing++;
      if (["approved", "awaiting_shipment", "partially_received"].includes(o.status)) approved++;
      if (["submitted", "supplier_reviewing", "approved", "awaiting_shipment", "partially_received"].includes(o.status)) {
        openValue += o.totalAmount;
      }
    });
    return { newRequests, reviewing, approved, openValue };
  }, [orders]);

  const kpiCards = [
    { title: t("b2bOrders.newRequests"), value: String(metrics.newRequests), icon: Inbox, iconClass: "text-primary" },
    { title: t("b2bOrders.underReview"), value: String(metrics.reviewing), icon: Clock, iconClass: "text-amber-500" },
    { title: t("b2bOrders.approved"), value: String(metrics.approved), icon: PackageOpen, iconClass: "text-blue-500" },
    { title: t("b2bOrders.estimatedTotal"), value: formatTZS(metrics.openValue), icon: HandCoins, iconClass: "text-emerald-500" },
  ];

  const handleAction = async (status: B2BPurchaseOrder["status"]) => {
    if (!selectedOrder) return;
    try {
      await updateStatusMut.mutateAsync({
        poId: selectedOrder.id,
        status,
        notes: actionNotes.trim() || undefined
      });
      toast.success(t("b2bOrders.successMessage"));
      setIsReviewOpen(false);
      setSelectedOrder(null);
      setActionNotes("");
    } catch (err: any) {
      toast.error(err.message || t("b2bOrders.failedToUpdate"));
    }
  };

  const openReview = (order: B2BPurchaseOrder) => {
    setSelectedOrder(order);
    setActionNotes(order.notes || "");
    setIsReviewOpen(true);
  };

  const openShipment = (order: B2BPurchaseOrder) => {
    setSelectedOrder(order);
    setIsShipmentOpen(true);
  };

  const statusConfig = (status: string) => {
    switch (status) {
      case "draft": return { label: t("b2bOrders.status.draft"), color: "bg-muted text-muted-foreground border-border", icon: <Clock className="h-3 w-3" /> };
      case "submitted": return { label: t("b2bOrders.status.submitted"), color: "bg-primary/10 text-primary border-primary/20", icon: <Truck className="h-3 w-3" /> };
      case "supplier_reviewing": return { label: t("b2bOrders.status.supplierReviewing"), color: "bg-amber-500/10 text-amber-600 border-amber-500/20", icon: <Clock className="h-3 w-3" /> };
      case "approved": return { label: t("b2bOrders.status.approved"), color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", icon: <CheckCircle className="h-3 w-3" /> };
      case "rejected": return { label: t("b2bOrders.status.rejected"), color: "bg-destructive/10 text-destructive border-destructive/20", icon: <XCircle className="h-3 w-3" /> };
      case "cancelled": return { label: t("b2bOrders.status.cancelled"), color: "bg-destructive/10 text-destructive border-destructive/20", icon: <XCircle className="h-3 w-3" /> };
      case "awaiting_shipment": return { label: t("b2bOrders.status.awaitingShipment"), color: "bg-blue-500/10 text-blue-600 border-blue-500/20", icon: <Truck className="h-3 w-3" /> };
      case "partially_received": return { label: status.replace("_", " "), color: "bg-blue-500/10 text-blue-600 border-blue-500/20", icon: <PackageOpen className="h-3 w-3" /> };
      default: return { label: status, color: "bg-muted text-muted-foreground border-border", icon: <Clock className="h-3 w-3" /> };
    }
  };

  if (!currentShopId) {
    return (
      <div className="text-center py-12">
        <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
        <p className="text-muted-foreground">{t("b2bOrders.pleaseSelectShop")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title={t("b2bOrders.title")}
        description={t("b2bOrders.description")}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map(({ title, value, icon: Icon, iconClass }) => (
          <Card key={title} className="shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground truncate">{title}</CardTitle>
              <Icon className={`h-4 w-4 shrink-0 ${iconClass}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight truncate">{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("b2bOrders.searchPlaceholder")}
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
                        layoutId="b2b-orders-tab-underline"
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
                  <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
                  <h3 className="text-lg font-semibold text-foreground">{t("b2bOrders.noIncomingOrders")}</h3>
                  <p className="text-muted-foreground text-sm max-w-sm mx-auto mt-1">
                    {t("b2bOrders.noIncomingOrdersDesc")}
                  </p>
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
                            <div className="p-5 flex flex-col md:flex-row gap-4 justify-between md:items-center border-b border-border/50 bg-muted/20">
                              <div className="min-w-0">
                                <div className="flex items-center gap-3 mb-1 flex-nowrap">
                                  <span className="font-bold text-lg text-primary tracking-tight whitespace-nowrap">
                                    PO-{order.id.slice(0, 6).toUpperCase()}
                                  </span>
                                  <span className={`shrink-0 px-2.5 py-1 rounded-md border text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 whitespace-nowrap ${conf.color}`}>
                                    {conf.icon} {conf.label}
                                  </span>
                                </div>
                                <p className="text-sm font-medium text-muted-foreground truncate">
                                  {t("b2bOrders.buyerShopId")}: <span className="text-foreground">{order.buyerShopId}</span>
                                </p>
                              </div>
                              <div className="text-left md:text-right shrink-0">
                                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1 whitespace-nowrap">{t("b2bOrders.estimatedTotal")}</p>
                                <p className="text-xl font-bold text-foreground whitespace-nowrap tabular-nums">{formatTZS(order.totalAmount)}</p>
                              </div>
                            </div>

                            <div className="p-5 bg-card">
                              <div className="grid gap-2 mb-4">
                                {order.items.map((item, idx) => (
                                  <div key={idx} className="flex justify-between items-center gap-3 text-sm p-2 rounded-lg border border-border/40 bg-muted/10">
                                    <div className="flex items-center gap-3 min-w-0">
                                      <span className="font-semibold text-foreground truncate">{item.productName}</span>
                                      <span className="shrink-0 text-xs text-muted-foreground px-2 py-0.5 bg-background rounded-md border whitespace-nowrap">
                                        {t("b2bOrders.qty")}: {item.expectedQty}
                                      </span>
                                    </div>
                                    <span className="font-medium text-foreground whitespace-nowrap tabular-nums shrink-0">{formatTZS(item.subtotal)}</span>
                                  </div>
                                ))}
                              </div>

                              <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border/50 pt-4">
                                <div className="text-xs text-muted-foreground flex items-center gap-2 whitespace-nowrap">
                                  <Clock className="w-4 h-4 shrink-0" />
                                  {t("b2bOrders.requested")}: {order.createdAt ? new Date(order.createdAt as string).toLocaleDateString() : t("purchases.unknownDate")}
                                </div>

                                <div className="flex gap-2 flex-nowrap">
                                  {["submitted", "supplier_reviewing"].includes(order.status) && (
                                    <Button size="sm" onClick={() => openReview(order)} className="shrink-0 whitespace-nowrap shadow-sm">
                                      {t("b2bOrders.reviewOrder")}
                                    </Button>
                                  )}
                                  {["approved", "awaiting_shipment", "partially_received"].includes(order.status) && (
                                    <Button size="sm" variant="outline" onClick={() => openShipment(order)} className="shrink-0 whitespace-nowrap shadow-sm">
                                      {t("b2bOrders.createShipment")}
                                    </Button>
                                  )}
                                </div>
                              </div>
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

      {/* Review Dialog */}
      <Dialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
        <DialogContent className="w-[95vw] max-w-md">
          <DialogHeader>
            <DialogTitle>{t("b2bOrders.reviewPurchaseOrder")}</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
             <p className="text-sm text-muted-foreground">{t("b2bOrders.reviewDesc1")}{selectedOrder?.id?.slice(0,6).toUpperCase()}{t("b2bOrders.reviewDesc2")}</p>
             <div>
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1 block">{t("b2bOrders.supplierNotes")}</label>
                <Input
                   placeholder={t("b2bOrders.supplierNotesPlaceholder")}
                   value={actionNotes}
                   onChange={e => setActionNotes(e.target.value)}
                />
             </div>
          </div>
          <DialogFooter className="flex justify-between sm:justify-between w-full">
             <Button variant="outline" onClick={() => setIsReviewOpen(false)}>{t("b2bOrders.cancel")}</Button>
             <div className="flex gap-2 flex-nowrap">
               <Button variant="destructive" onClick={() => handleAction("rejected")}>{t("b2bOrders.reject")}</Button>
               <Button onClick={() => handleAction("approved")}>{t("b2bOrders.approvePO")}</Button>
             </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CreateShipmentDialog
        order={selectedOrder}
        isOpen={isShipmentOpen}
        onClose={() => setIsShipmentOpen(false)}
        currentShopId={currentShopId}
      />
    </div>
  );
}
