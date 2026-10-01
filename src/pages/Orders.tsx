import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ShoppingBag, Clock, CheckCircle, XCircle, Truck, Banknote, FileText, Plus, Printer, Package, ChevronRight, Globe, Smartphone, Building2, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useAppSelector } from "@/store/hooks";
import { useOrders, usePayOrder, useCancelOrder, useCreateOrder, useUpdateFulfillmentStatus } from "@/hooks/useOrders";
import { useSupplierB2BOrders, useUpdateB2BOrderStatus } from "@/hooks/useB2BOrders";
import { useProducts } from "@/hooks/useProducts";
import { useInventory } from "@/hooks/useInventory";
import { useSalesByDate } from "@/hooks/useSales";
import { useCustomerBalances } from "@/hooks/useCustomerAR";
import { formatTZS } from "@/data/mockData";
import { toast } from "sonner";
import PageHeader from "@/components/common/PageHeader";
import { CreateOrderWizardV2 } from "@/components/orders/CreateOrderWizardV2";
import OrderReceipt from "@/components/orders/OrderReceipt";
import { useI18n } from "@/lib/i18n";
import Fuse from "fuse.js";
import type { Order, B2BPurchaseOrder } from "@/types";

interface UnifiedOrder {
  id: string;
  customerName: string;
  customerType: string;
  source: "Online Store" | "Wholesale B2B" | "POS Sale" | "In-App Order" | "Wishlist Order";
  amount: number;
  status: string;
  date: Date;
  paymentMethod?: string;
  raw: Order | B2BPurchaseOrder | any; // Keep raw object for dialogs
}

export default function Orders() {
  const currentShopId = useAppSelector((s) => s.shops.currentShopId);
  const currentBranchId = useAppSelector((s) => s.branches.currentBranchId);
  const currentShop = useAppSelector((s) => s.shops.shops.find((shop) => shop.id === currentShopId));
  const user = useAppSelector((s) => s.auth.user);
  const { t } = useI18n();

  // 1. Fetch all data sources
  const todayStr = new Date().toISOString().split("T")[0];
  const { data: onlineOrders = [], isLoading: onlineLoading } = useOrders(currentShopId);
  const { data: b2bOrders = [], isLoading: b2bLoading } = useSupplierB2BOrders(currentShopId);
  const { data: todaySales = [], isLoading: salesLoading } = useSalesByDate(currentShopId, todayStr);
  const { data: customerBalances = [], isLoading: balancesLoading } = useCustomerBalances(currentShopId);
  const { data: products = [] } = useProducts(currentShopId || null);
  const { data: inventory = [] } = useInventory(currentShopId || null);

  // Mutations
  const payOrderMut = usePayOrder(currentShopId);
  const cancelOrderMut = useCancelOrder(currentShopId);
  const updateB2BStatusMut = useUpdateB2BOrderStatus();
  const createOrderMut = useCreateOrder(currentShopId);
  const processOrderMut = useUpdateFulfillmentStatus(currentShopId);

  // State
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<UnifiedOrder | null>(null);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("Cash");

  // 2. Unify Data
  const unifiedOrders = useMemo(() => {
    const list: UnifiedOrder[] = [];

    // Add Online Orders
    onlineOrders.forEach(o => {
      if (currentBranchId && o.branchId !== currentBranchId) return;
      list.push({
        id: o.id, // MUST be the app-visible id for mutations
        customerName: o.customerName || "Unknown",
        customerType: o.customerType || "retail",
        source: (o as any).source === "public_storefront" ? "Online Store"
          : (o as any).source === "wishlist" ? "Wishlist Order"
          : "In-App Order",
        amount: o.totalAmount,
        status: o.status,
        date: (o.createdAt && typeof (o.createdAt as any).toDate === "function") 
          ? (o.createdAt as any).toDate() 
          : new Date(o.createdAt as string || Date.now()),
        raw: o
      });
    });

    // Add B2B Orders
    b2bOrders.forEach(o => {
      if (currentBranchId && (o as any).branchId !== currentBranchId) return;
      list.push({
        id: o.id,
        customerName: (o as any).buyerName || o.buyerShopId,
        customerType: "wholesale",
        source: "Wholesale B2B",
        amount: o.totalAmount,
        status: o.status,
        date: (o.createdAt && typeof (o.createdAt as any).toDate === "function") 
          ? (o.createdAt as any).toDate() 
          : new Date(o.createdAt as string || Date.now()),
        raw: o
      });
    });

    return list.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [onlineOrders, b2bOrders, currentBranchId]);

  // 3. Filter Data
  const filteredOrders = useMemo(() => {
    let result = unifiedOrders;

    if (search.trim()) {
      const fuse = new Fuse(result, {
        keys: [
          { name: 'customerName', weight: 0.6 },
          { name: 'id', weight: 0.4 }
        ],
        threshold: 0.3,
        ignoreLocation: true,
        useExtendedSearch: true
      });
      result = fuse.search(search).map(res => res.item);
    }

    return result.filter(o => {
      let matchesTab = true;
      if (activeTab === "pending") {
        matchesTab = o.status === "pending" || o.status === "submitted" || o.status === "supplier_reviewing";
      } else if (activeTab === "processing") {
        matchesTab = o.status === "approved" || o.status === "awaiting_shipment";
      } else if (activeTab === "completed") {
        matchesTab = o.status === "paid" || o.status === "delivered";
      } else if (activeTab === "cancelled") {
        matchesTab = o.status === "cancelled" || o.status === "rejected";
      }

      return matchesTab;
    });
  }, [unifiedOrders, search, activeTab]);

  const tabCounts = useMemo(() => ({
    all: unifiedOrders.length,
    pending: unifiedOrders.filter(o => ["pending", "submitted", "supplier_reviewing"].includes(o.status)).length,
    processing: unifiedOrders.filter(o => ["approved", "awaiting_shipment"].includes(o.status)).length,
    completed: unifiedOrders.filter(o => ["paid", "delivered"].includes(o.status)).length,
    cancelled: unifiedOrders.filter(o => ["cancelled", "rejected"].includes(o.status)).length,
  }), [unifiedOrders]);

  // KPIs
  const totalSalesToday = todaySales.reduce((acc, s) => acc + (s.totalAmount || 0), 0);
  const pendingCount = unifiedOrders.filter(o => ["pending", "submitted"].includes(o.status)).length;
  const totalAR = customerBalances.reduce((acc, b) => acc + (b.outstandingBalance || 0), 0);
  const completedOrdersCount = unifiedOrders.filter(o => ["paid", "delivered"].includes(o.status)).length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
      case "submitted":
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">{t("orders.badgePending")}</Badge>;
      case "approved":
      case "awaiting_shipment":
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">{t("orders.badgeProcessing")}</Badge>;
      case "paid":
      case "delivered":
        return <Badge variant="outline" className="bg-orange-100 text-orange-800">{t("orders.badgeCompleted")}</Badge>;
      case "cancelled":
      case "rejected":
        return <Badge variant="outline" className="bg-red-100 text-red-800">{t("orders.badgeCancelled")}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getSourceBadge = (source: UnifiedOrder["source"]) => {
    const configs: Record<UnifiedOrder["source"], { icon: React.ReactNode; label: string; color: string }> = {
      "Online Store": { icon: <Globe className="h-3 w-3" />, label: "Online", color: "bg-blue-100 text-blue-700 border-blue-200" },
      "In-App Order": { icon: <Smartphone className="h-3 w-3" />, label: "In-App", color: "bg-orange-100 text-orange-700 border-orange-200" },
      "Wishlist Order": { icon: <Heart className="h-3 w-3" />, label: "Wishlist", color: "bg-rose-100 text-rose-700 border-rose-200" },
      "Wholesale B2B": { icon: <Building2 className="h-3 w-3" />, label: "B2B", color: "bg-purple-100 text-purple-700 border-purple-200" },
      "POS Sale": { icon: <Banknote className="h-3 w-3" />, label: "POS", color: "bg-green-100 text-green-700 border-green-200" },
    };
    const cfg = configs[source] || { icon: <Package className="h-3 w-3" />, label: source, color: "bg-muted text-muted-foreground" };
    return (
      <Badge
        variant="outline"
        className={`inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ${cfg.color}`}
        title={source}
      >
        {cfg.icon}
        {cfg.label}
      </Badge>
    );
  };

  const handleApproveB2B = async (id: string) => {
    try {
      await updateB2BStatusMut.mutateAsync({ poId: id, status: "approved" });
      toast.success("Order approved");
      setSelectedOrder(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to approve");
    }
  };

  const handlePayOnlineOrder = async () => {
    if (!selectedOrder) return;
    try {
      await payOrderMut.mutateAsync({ orderId: selectedOrder.id, paymentMethod });
      toast.success("Order marked as paid");
      setIsPaymentModalOpen(false);
      setSelectedOrder(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to record payment");
    }
  };

  const handleProcessOrder = async (orderId: string) => {
    try {
      // In this app, "confirmed" moves it to processing
      await processOrderMut.mutateAsync({ orderId, status: "confirmed" });
      toast.success("Order is now processing");
      setSelectedOrder(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to process order");
    }
  };

  const handleCreateOrder = async (orderData: Partial<Order>, options?: { payNow?: boolean }) => {
    const newOrder: Omit<Order, "id"> = {
      shopId: currentShopId!,
      branchId: currentBranchId || "",
      items: orderData.items || [],
      subtotal: orderData.subtotal || 0,
      tax: orderData.tax || 0,
      discount: orderData.discount || 0,
      totalAmount: orderData.totalAmount || 0,
      status: orderData.status || "pending",
      approvalStatus: orderData.approvalStatus || "approved",
      paymentMethod: orderData.paymentMethod || "Cash",
      customerName: orderData.customerName,
      customerPhone: orderData.customerPhone,
      customerId: orderData.customerId,
      customerType: orderData.customerType,
      customerPoNumber: orderData.customerPoNumber,
      requiredDeliveryDate: orderData.requiredDeliveryDate,
      salespersonId: orderData.salespersonId,
      internalNotes: orderData.internalNotes,
      notes: orderData.notes,
      profitEstimate: orderData.profitEstimate,
      createdAt: orderData.createdAt || new Date().toISOString(),
      createdBy: user?.id,
      createdByName: user?.displayName,
      fulfillment: orderData.fulfillment || { deliveryMethod: "pickup" },
      source: "in_app",
      idempotencyKey: orderData.idempotencyKey,
    };

    const created = await createOrderMut.mutateAsync(newOrder);
    setIsWizardOpen(false);

    if (options?.payNow) {
      try {
        await payOrderMut.mutateAsync({
          orderId: created.id,
          paymentMethod: newOrder.paymentMethod || "Cash",
        });
        toast.success(t("orders.paidSuccess"));
        // Straight to the receipt, like a normal counter sale
        setSelectedOrder({
          id: created.id,
          customerName: created.customerName || "Walk-in",
          customerType: created.customerType || "retail",
          source: "In-App Order",
          amount: created.totalAmount,
          status: "paid",
          date: new Date(),
          raw: { ...created, status: "paid" },
        });
        setIsReceiptOpen(true);
      } catch (err: any) {
        toast.error(err.message || "Payment failed — order saved as unpaid. Check stock levels.");
      }
    } else {
      toast.success("Order saved");
    }
  };

  if (!currentShopId) {
    return (
      <div className="text-center py-12">
        <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
        <p className="text-muted-foreground">{t("orders.selectShopFirst")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 fade-in-up">
      <PageHeader
        title={t("orders.workspaceTitle")}
        description={t("orders.workspaceDesc")}
        actions={
          <Button onClick={() => setIsWizardOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            {t("orders.newOrder")}
          </Button>
        }
      />

      {/* KPI Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("orders.salesToday")}</CardTitle>
            <Banknote className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatTZS(totalSalesToday)}</div>
            <p className="text-xs text-muted-foreground">{todaySales.length} {t("orders.transactionsToday")}</p>
          </CardContent>
        </Card>
        
        <Card className="shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("orders.pendingOrders")}</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
            <p className="text-xs text-muted-foreground">{t("orders.awaitingReview")}</p>
          </CardContent>
        </Card>
        
        <Card className="shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("orders.accountsReceivable")}</CardTitle>
            <FileText className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatTZS(totalAR)}</div>
            <p className="text-xs text-muted-foreground">{t("orders.outstandingDebt")}</p>
          </CardContent>
        </Card>
        
        <Card className="shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("orders.completedFulfillment")}</CardTitle>
            <CheckCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedOrdersCount}</div>
            <p className="text-xs text-muted-foreground">{t("orders.historicallyFulfilled")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Unified Inbox */}
      <Card className="shadow-sm">

        <CardHeader>
          <CardTitle>{t("orders.inbox")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("common.search")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-muted/50 border-none focus-visible:ring-1"
              />
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="-mx-1 mb-4 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <TabsList className="inline-flex w-max h-auto gap-1 bg-muted/50 p-1">

              {([
                ["all", t("orders.all"), tabCounts.all],
                ["pending", t("orders.pending"), tabCounts.pending],
                ["processing", t("orders.processing"), tabCounts.processing],
                ["completed", t("orders.completed"), tabCounts.completed],
                ["cancelled", t("orders.cancelled"), tabCounts.cancelled],
              ] as const).map(([value, label, count]) => (
                <TabsTrigger key={value} value={value} className="relative gap-2 transition-all duration-200 data-[state=active]:shadow-sm">
                  <span>{label}</span>
                  <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
                    {count}
                  </span>
                  {activeTab === value && (
                    <motion.span
                      layoutId="orders-tab-underline"
                      className="absolute inset-x-2 -bottom-0.5 h-0.5 rounded-full bg-primary"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
            </div>

            
            <TabsContent value={activeTab} className="mt-0 outline-none">
              <div className="hidden md:block rounded-xl border bg-card overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left [&_th]:whitespace-nowrap [&_td]:whitespace-nowrap">
                    <thead className="sticky top-0 z-10 text-xs text-muted-foreground bg-muted/50 backdrop-blur uppercase">
                      <tr>
                        <th className="px-4 py-3 font-medium whitespace-nowrap">{t("orders.orderId")}</th>
                        <th className="px-4 py-3 font-medium min-w-[180px] whitespace-nowrap">{t("orders.customer")}</th>
                        <th className="px-4 py-3 font-medium w-[110px] whitespace-nowrap">{t("orders.source")}</th>
                        <th className="px-4 py-3 font-medium whitespace-nowrap">{t("reports.date")}</th>
                        <th className="px-4 py-3 font-medium text-right whitespace-nowrap">{t("orders.amount")}</th>
                        <th className="px-4 py-3 font-medium text-center whitespace-nowrap">{t("orders.status")}</th>
                        <th className="px-4 py-3 font-medium text-right whitespace-nowrap">{t("orders.action")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredOrders.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                            <motion.div
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.3 }}
                            >
                              <ShoppingBag className="mx-auto h-8 w-8 mb-3 opacity-20" />
                              {t("orders.noOrders")}
                            </motion.div>
                          </td>
                        </tr>
                      ) : (
                        <AnimatePresence initial={false} mode="popLayout">
                        {filteredOrders.map((order, i) => (
                          <motion.tr
                            key={order.id}
                            layout
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            transition={{ duration: 0.28, delay: Math.min(i, 12) * 0.03, ease: [0.22, 1, 0.36, 1] }}
                            onClick={() => setSelectedOrder(order)}
                            className="group relative cursor-pointer transition-colors duration-200 hover:bg-primary/5"
                          >
                            <td className="relative px-4 py-3 font-medium whitespace-nowrap">
                              <span className="absolute left-0 top-1/2 h-0 w-[3px] -translate-y-1/2 rounded-r-full bg-primary transition-all duration-300 group-hover:h-3/5" />
                              <span className="inline-block transition-transform duration-200 group-hover:translate-x-1 truncate max-w-[120px]">
                                #{order.id.slice(-6).toUpperCase()}
                              </span>
                            </td>
                            <td className="px-4 py-3 min-w-[220px] whitespace-nowrap">
                              <div className="flex min-w-0 items-center gap-2 whitespace-nowrap">
                                <span className="max-w-[180px] truncate font-medium" title={order.customerName}>
                                  {order.customerName}
                                </span>
                                <span className="shrink-0 text-xs capitalize text-muted-foreground">
                                  {order.customerType}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              {getSourceBadge(order.source)}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                              {order.date.toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3 text-right font-medium tabular-nums whitespace-nowrap">
                              {formatTZS(order.amount)}
                            </td>
                            <td className="px-4 py-3 text-center whitespace-nowrap">
                              {getStatusBadge(order.status)}
                            </td>
                            <td className="px-4 py-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-end gap-2 flex-nowrap">
                                  <div className="flex items-center gap-2 opacity-60 transition-all duration-200 group-hover:opacity-100 flex-nowrap">
                                  <Button size="sm" variant="outline" onClick={() => setSelectedOrder(order)} className="gap-2 transition-transform duration-200 hover:-translate-y-0.5 shrink-0">
                                    <FileText className="h-4 w-4 shrink-0" />
                                    {t("orders.view")}
                                  </Button>
                                  
                                  {order.status === "pending" && order.source !== "Wholesale B2B" && !order.paymentMethod?.toLowerCase().includes("credit") && (
                                    <Button size="sm" onClick={() => { setSelectedOrder(order); setIsPaymentModalOpen(true); }} className="bg-orange-600 hover:bg-orange-700 text-white gap-2 transition-transform duration-200 hover:-translate-y-0.5 shrink-0">
                                      <Banknote className="h-4 w-4 shrink-0" />
                                      {t("orders.collectPayment")}
                                    </Button>
                                  )}
                                  
                                  {order.status === "pending" && order.source === "Wholesale B2B" && (
                                    <Button size="sm" onClick={() => handleApproveB2B(order.id)} className="bg-orange-600 hover:bg-orange-700 text-white gap-2 transition-transform duration-200 hover:-translate-y-0.5 shrink-0">
                                      <CheckCircle className="h-4 w-4 shrink-0" />
                                      {t("orders.approvePo")}
                                    </Button>
                                  )}
                                  
                                  {(order.status === "processing" || order.status === "completed") && (
                                    <Button size="sm" variant="outline" onClick={() => { setIsReceiptOpen(true); setSelectedOrder(order); }} className="gap-2 transition-transform duration-200 hover:-translate-y-0.5 shrink-0">
                                      <Printer className="h-4 w-4 shrink-0" />
                                      {t("orders.printDoc")}
                                    </Button>
                                  )}
                                  
                                  {(order.status === "pending" || order.status === "processing") && (
                                    <Button size="sm" variant="ghost" onClick={() => cancelOrderMut.mutate(order.id)} className="text-destructive hover:bg-destructive/10 shrink-0">
                                      {t("orders.cancelOrder")}
                                    </Button>
                                  )}
                                  </div>
                                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-all duration-200 group-hover:translate-x-1 group-hover:text-foreground" />
                                </div>
                            </td>
                          </motion.tr>
                        ))}
                        </AnimatePresence>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile card list */}
              <div className="md:hidden space-y-3">
                {filteredOrders.length === 0 ? (
                  <div className="rounded-xl border bg-card px-4 py-12 text-center text-muted-foreground">
                    <ShoppingBag className="mx-auto h-8 w-8 mb-3 opacity-20" />
                    {t("orders.noOrders")}
                  </div>
                ) : (
                  <AnimatePresence initial={false} mode="popLayout">
                    {filteredOrders.map((order, i) => (
                      <motion.div
                        key={order.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.28, delay: Math.min(i, 8) * 0.03, ease: [0.22, 1, 0.36, 1] }}
                        onClick={() => setSelectedOrder(order)}
                        className="rounded-xl border bg-card p-4 shadow-sm active:scale-[0.99] transition-transform"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-semibold">#{order.id.slice(-6).toUpperCase()}</div>
                            <div className="truncate text-sm">{order.customerName}</div>
                            <div className="text-xs capitalize text-muted-foreground">{order.customerType}</div>
                          </div>
                          <div className="shrink-0 text-right">
                            <div className="font-semibold tabular-nums">{formatTZS(order.amount)}</div>
                            <div className="mt-1">{getStatusBadge(order.status)}</div>
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          {getSourceBadge(order.source)}
                          <span>{order.date.toLocaleDateString()}</span>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
                          <Button size="sm" variant="outline" onClick={() => setSelectedOrder(order)} className="flex-1 min-w-[110px] gap-2">
                            <FileText className="h-4 w-4" />
                            {t("orders.view")}
                          </Button>

                          {order.status === "pending" && order.source !== "Wholesale B2B" && !order.paymentMethod?.toLowerCase().includes("credit") && (
                            <Button size="sm" onClick={() => { setSelectedOrder(order); setIsPaymentModalOpen(true); }} className="flex-1 min-w-[110px] gap-2 bg-orange-600 hover:bg-orange-700 text-white">
                              <Banknote className="h-4 w-4" />
                              {t("orders.collectPayment")}
                            </Button>
                          )}

                          {order.status === "pending" && order.source === "Wholesale B2B" && (
                            <Button size="sm" onClick={() => handleApproveB2B(order.id)} className="flex-1 min-w-[110px] gap-2 bg-orange-600 hover:bg-orange-700 text-white">
                              <CheckCircle className="h-4 w-4" />
                              {t("orders.approvePo")}
                            </Button>
                          )}

                          {(order.status === "processing" || order.status === "completed") && (
                            <Button size="sm" variant="outline" onClick={() => { setIsReceiptOpen(true); setSelectedOrder(order); }} className="flex-1 min-w-[110px] gap-2">
                              <Printer className="h-4 w-4" />
                              {t("orders.printDoc")}
                            </Button>
                          )}

                          {(order.status === "pending" || order.status === "processing") && (
                            <Button size="sm" variant="ghost" onClick={() => cancelOrderMut.mutate(order.id)} className="flex-1 min-w-[110px] text-destructive hover:bg-destructive/10">
                              {t("orders.cancelOrder")}
                            </Button>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Order Lifecycle UI (Dialog) */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto">
          {selectedOrder && (
            <>
              <DialogHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <DialogTitle className="text-xl">
                      Order #{selectedOrder.raw.orderId || selectedOrder.id.slice(-6).toUpperCase()}
                    </DialogTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedOrder.source} • {selectedOrder.date.toLocaleString()}
                    </p>
                  </div>
                  {getStatusBadge(selectedOrder.status)}
                </div>
              </DialogHeader>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 my-4 p-4 bg-muted/30 rounded-xl">
                <div>
                  <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">{t("orders.customerDetails")}</h4>
                  <p className="font-medium text-base">{selectedOrder.customerName}</p>
                  <p className="text-sm text-muted-foreground capitalize">{selectedOrder.customerType}</p>
                  
                  {selectedOrder.raw.customerPhone && (
                    <div className="mt-2 text-sm flex items-center gap-2">
                      <span className="text-muted-foreground">Phone:</span>
                      <a href={`tel:${selectedOrder.raw.customerPhone}`} className="text-blue-600 hover:underline">
                        {selectedOrder.raw.customerPhone}
                      </a>
                    </div>
                  )}
                  {selectedOrder.raw.customerAddress && (
                    <div className="mt-1 text-sm text-muted-foreground">
                      <span className="font-medium">Address:</span> {selectedOrder.raw.customerAddress}
                    </div>
                  )}
                  {selectedOrder.raw.notes && (
                    <div className="mt-2 text-sm bg-yellow-50/50 p-2 rounded-md border border-yellow-100 text-yellow-800">
                      <span className="font-semibold block text-xs uppercase mb-1">Notes:</span>
                      {selectedOrder.raw.notes}
                    </div>
                  )}
                </div>
                <div className="sm:text-right flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">{t("orders.financials")}</h4>
                    <p className="font-medium text-2xl text-primary">{formatTZS(selectedOrder.amount)}</p>
                  </div>
                  {selectedOrder.raw.paymentMethod && (
                    <div className="mt-4 text-sm bg-blue-50/50 p-2 rounded-md border border-blue-100 inline-block ml-auto text-blue-800 text-left w-full max-w-[200px]">
                      <span className="font-semibold block text-xs uppercase mb-1 text-muted-foreground">Requested Payment</span>
                      {selectedOrder.raw.paymentMethod}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3">{t("orders.orderItems")}</h4>
                <div className="border rounded-xl divide-y">
                  {(selectedOrder.raw.items || []).map((item: any, i: number) => (
                    <div key={i} className="flex justify-between p-3 text-sm">
                      <div className="flex gap-3">
                        <Badge variant="outline">{item.quantity}x</Badge>
                        <span>{item.productName}</span>
                      </div>
                      <span className="font-medium">{formatTZS(item.subtotal || (item.quantity * item.price))}</span>
                    </div>
                  ))}
                </div>
              </div>

              <DialogFooter className="mt-6 flex flex-col-reverse sm:flex-row gap-2 [&>*]:w-full sm:[&>*]:w-auto">
                <Button variant="outline" onClick={() => setSelectedOrder(null)}>{t("common.cancel")}</Button>
                
                {selectedOrder.source === "Wholesale B2B" && selectedOrder.status === "submitted" && (
                  <Button onClick={() => handleApproveB2B(selectedOrder.id)}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {t("orders.approveB2B")}
                  </Button>
                )}
                {selectedOrder.source !== "Wholesale B2B" && selectedOrder.status === "pending" && (
                  <>
                    <Button variant="default" onClick={() => handleProcessOrder(selectedOrder.id)}>
                      <Package className="h-4 w-4 mr-2" />
                      Process Order
                    </Button>
                    {!selectedOrder.paymentMethod?.toLowerCase().includes("credit") && (
                      <Button variant="outline" onClick={() => setIsPaymentModalOpen(true)}>
                        <Banknote className="h-4 w-4 mr-2" />
                        {t("orders.collectPayment")}
                      </Button>
                    )}
                  </>
                )}

                {selectedOrder.source !== "Wholesale B2B" && (selectedOrder.status === "approved" || selectedOrder.status === "awaiting_shipment") && !selectedOrder.paymentMethod?.toLowerCase().includes("credit") && (
                  <Button variant="default" onClick={() => setIsPaymentModalOpen(true)} className="bg-green-600 hover:bg-green-700">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Complete Order & Pay
                  </Button>
                )}

                <Button variant="secondary" onClick={() => setIsReceiptOpen(true)}>
                  <Printer className="h-4 w-4 mr-2" />
                  {t("orders.printDocument")}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isWizardOpen} onOpenChange={setIsWizardOpen}>
        <DialogContent className="max-w-[1000px] w-[96vw] h-[92vh] sm:h-[90vh] p-0 flex flex-col gap-0 overflow-hidden">
          <DialogHeader className="p-4 border-b">
            <DialogTitle>{t("orders.createOrderWizardTitle")}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden relative">
            <CreateOrderWizardV2 
              products={products}
              inventory={inventory}
              onSubmit={handleCreateOrder}
              onCancel={() => setIsWizardOpen(false)}
            />
          </div>
        </DialogContent>
      </Dialog>

      <OrderReceipt
        open={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        order={selectedOrder?.raw as Order}
        shopName={currentShop?.name || "Twende Duka"}
        documentType={
          selectedOrder?.status === "draft" ? "quotation" :
          selectedOrder?.status === "completed" || selectedOrder?.status === "paid" ? "invoice" :
          selectedOrder?.status === "out_for_delivery" ? "delivery_note" :
          "proforma"
        }
      />

      {/* Collect Payment Dialog */}
      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent className="max-w-md w-[95vw]">
          <DialogHeader>
            <DialogTitle>Collect Payment</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <label className="block text-sm font-medium mb-2">Payment Method Received</label>
            <select
              className="w-full border rounded-md p-2 bg-background"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              <option value="Cash">Cash</option>
              <option value="Mobile Money (M-Pesa/Tigo Pesa)">Mobile Money (M-Pesa/Tigo Pesa)</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Credit / Debt">Credit / Debt (On Account)</option>
            </select>
            <p className="text-xs text-muted-foreground mt-2">
              Recording this payment will mark the order as paid and officially deduct stock.
            </p>
          </div>
          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 [&>*]:w-full sm:[&>*]:w-auto">
            <Button variant="outline" onClick={() => setIsPaymentModalOpen(false)}>Cancel</Button>
            <Button onClick={handlePayOnlineOrder} className="bg-orange-600 hover:bg-orange-700 text-white">
              Confirm Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
