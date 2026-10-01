import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, PackageOpen, Box, Truck, CheckCircle, Package, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppSelector } from "@/store/hooks";
import { useOrders, useUpdateFulfillmentStatus } from "@/hooks/useOrders";
import { useI18n } from "@/lib/i18n";
import PageHeader from "@/components/common/PageHeader";
import { toast } from "sonner";
import PickingDialog from "@/components/fulfillment/PickingDialog";
import PackingDialog from "@/components/fulfillment/PackingDialog";
import DeliveryDialog from "@/components/fulfillment/DeliveryDialog";
import type { Order, FulfillmentDetails, OrderItem } from "@/types";

export default function Fulfillment() {
  const currentShopId = useAppSelector((s) => s.shops.currentShopId);
  const { lang } = useI18n();
  const sw = lang === "sw";

  const { data: orders = [], isLoading } = useOrders(currentShopId);
  const updateStatusMut = useUpdateFulfillmentStatus(currentShopId);

  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("new");

  // Dialog states
  const [pickingOrder, setPickingOrder] = useState<Order | null>(null);
  const [packingOrder, setPackingOrder] = useState<Order | null>(null);
  const [deliveryOrder, setDeliveryOrder] = useState<Order | null>(null);

  // Exclude cancelled and B2B orders for standard fulfillment flow
  const fulfillmentOrders = useMemo(() => {
    return orders
      .filter(o => o.status !== "cancelled")
      .sort((a, b) => {
        const d1 = typeof (a.createdAt as any)?.toDate === "function" ? (a.createdAt as any).toDate() : new Date(a.createdAt as string || Date.now());
        const d2 = typeof (b.createdAt as any)?.toDate === "function" ? (b.createdAt as any).toDate() : new Date(b.createdAt as string || Date.now());
        return d2.getTime() - d1.getTime();
      });
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return fulfillmentOrders.filter(o => {
      const q = search.toLowerCase();
      const matchesSearch = o.id.toLowerCase().includes(q) || (o.customerName || "").toLowerCase().includes(q);

      let matchesTab = true;
      if (activeTab === "new") {
        matchesTab = o.status === "draft" || o.status === "pending" || o.status === "confirmed" || o.status === "paid";
      } else if (activeTab === "picking") {
        matchesTab = o.status === "allocated" || o.status === "picking";
      } else if (activeTab === "packing") {
        matchesTab = o.status === "packed" || o.status === "ready_for_delivery";
      } else if (activeTab === "delivery") {
        matchesTab = o.status === "out_for_delivery" || o.status === "in_transit" || o.status === "delivered";
      } else if (activeTab === "completed") {
        matchesTab = o.status === "completed";
      }

      return matchesSearch && matchesTab;
    });
  }, [fulfillmentOrders, search, activeTab]);

  const counts = useMemo(() => {
    return {
      new: fulfillmentOrders.filter(o => ["draft", "pending", "confirmed", "paid"].includes(o.status)).length,
      picking: fulfillmentOrders.filter(o => ["allocated", "picking"].includes(o.status)).length,
      packing: fulfillmentOrders.filter(o => ["packed", "ready_for_delivery"].includes(o.status)).length,
      delivery: fulfillmentOrders.filter(o => ["out_for_delivery", "in_transit", "delivered"].includes(o.status)).length,
      completed: fulfillmentOrders.filter(o => o.status === "completed").length,
    };
  }, [fulfillmentOrders]);

  const handleUpdateStatus = (orderId: string, status: Order["status"], fulfillmentData?: Partial<FulfillmentDetails>, items?: OrderItem[]) => {
    updateStatusMut.mutate({ orderId, status, fulfillmentData, items }, {
      onSuccess: () => {
        toast.success(sw ? "Hali ya oda imesasishwa!" : "Order status updated!");
        setPickingOrder(null);
        setPackingOrder(null);
        setDeliveryOrder(null);
      },
      onError: (err: any) => {
        toast.error(err.message || "Failed to update order");
      }
    });
  };

  // Canonical fulfillment pipeline
  const PIPELINE: Order["status"][] = [
    "draft", "pending", "confirmed", "allocated", "picking", "packed",
    "ready_for_delivery", "out_for_delivery", "in_transit", "delivered", "completed",
  ];

  const stageLabel = (status: string) => {
    const map: Record<string, [string, string]> = {
      draft: ["Nukuu (Draft)", "Quotation (Draft)"],
      pending: ["Oda Imeundwa", "Order Created"],
      paid: ["Imelipwa", "Paid"],
      confirmed: ["Imethibitishwa", "Confirmed"],
      allocated: ["Stoo Imehakikiwa", "Inventory Checked"],
      picking: ["Kuchukua (Picking)", "Picking"],
      packed: ["Imefungashwa", "Packed"],
      ready_for_delivery: ["Tayari Kutumwa", "Ready for Dispatch"],
      out_for_delivery: ["Imetumwa", "Dispatched"],
      in_transit: ["Safarini", "In Transit"],
      delivered: ["Imefikishwa", "Delivered"],
      completed: ["Imekamilika", "Completed"],
      cancelled: ["Imeghairiwa", "Cancelled"],
    };
    const entry = map[status];
    return entry ? (sw ? entry[0] : entry[1]) : status;
  };

  const getStatusBadge = (status: string) => (
    <Badge
      variant="outline"
      className="rounded-md whitespace-nowrap border-border bg-muted/60 text-foreground/80 font-medium"
    >
      {stageLabel(status)}
    </Badge>
  );

  const StageTrail = ({ status }: { status: Order["status"] }) => {
    const idx = PIPELINE.indexOf(status === "paid" ? "pending" : status);
    if (idx < 0) return null;
    return (
      <div className="flex flex-wrap items-center gap-1 mt-2">
        {PIPELINE.map((s, i) => (
          <span
            key={s}
            title={stageLabel(s)}
            className={`h-1.5 rounded-full transition-all ${i <= idx ? "bg-primary" : "bg-muted"} ${i === idx ? "w-8" : "w-4"}`}
          />
        ))}
        <span className="text-[10px] font-bold text-muted-foreground ml-2">
          {sw ? "Hatua" : "Step"} {idx + 1}/{PIPELINE.length}
        </span>
      </div>
    );
  };

  const renderActions = (order: Order, fullWidth = false) => {
    const cls = fullWidth ? "flex-1 min-w-[130px] gap-2" : "w-full md:w-auto gap-2";
    return (
      <>
        {(order.status === "draft" || order.status === "pending" || order.status === "paid") && (
          <Button size="sm" onClick={() => handleUpdateStatus(order.id, "confirmed")} className={cls}>
            <CheckCircle className="h-4 w-4" />
            {sw ? "Thibitisha Oda" : "Confirm Order"}
          </Button>
        )}

        {order.status === "confirmed" && (
          <Button size="sm" onClick={() => handleUpdateStatus(order.id, "allocated")} className={cls}>
            <Package className="h-4 w-4" />
            {sw ? "Hakiki Stoo" : "Check Inventory"}
          </Button>
        )}

        {order.status === "allocated" && (
          <Button size="sm" onClick={() => handleUpdateStatus(order.id, "picking")} className={cls}>
            <PackageOpen className="h-4 w-4" />
            {sw ? "Anza Picking" : "Start Picking"}
          </Button>
        )}

        {order.status === "picking" && (
          <Button size="sm" onClick={() => setPickingOrder(order)} className={cls}>
            <CheckCircle className="h-4 w-4" />
            {sw ? "Thibitisha Picking" : "Confirm Picked"}
          </Button>
        )}

        {order.status === "packed" && (
          <Button size="sm" onClick={() => setPackingOrder(order)} className={cls}>
            <Box className="h-4 w-4" />
            {sw ? "Fungasha Oda" : "Pack Order"}
          </Button>
        )}

        {order.status === "ready_for_delivery" && (
          <Button size="sm" onClick={() => setDeliveryOrder(order)} className={cls}>
            <Truck className="h-4 w-4" />
            {sw ? "Tuma Mzigo" : "Dispatch Order"}
          </Button>
        )}

        {order.status === "out_for_delivery" && (
          <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(order.id, "in_transit")} className={cls}>
            <Truck className="h-4 w-4" />
            {sw ? "Safarini" : "Mark In Transit"}
          </Button>
        )}

        {order.status === "in_transit" && (
          <Button size="sm" onClick={() => handleUpdateStatus(order.id, "delivered")} className={cls}>
            <CheckCircle className="h-4 w-4" />
            {sw ? "Imefikishwa" : "Mark Delivered"}
          </Button>
        )}

        {order.status === "delivered" && (
          <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(order.id, "completed")} className={cls}>
            <CheckCircle className="h-4 w-4" />
            {sw ? "Funga Oda" : "Close Order"}
          </Button>
        )}
      </>
    );
  };

  return (
    <div className="space-y-6 fade-in-up pb-12">
      <PageHeader
        title={sw ? "Mchakato wa Oda (Fulfillment)" : "Order Fulfillment"}
        description={sw ? "Simamia oda kuanzia kupokea hadi kufikisha kwa mteja" : "Manage orders from confirmation to delivery"}
      />

      {/* KPI Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{sw ? "Mpya / Zilizothibitishwa" : "New / Confirmed"}</CardTitle>
            <AlertCircle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts.new}</div>
            <p className="text-xs text-muted-foreground">{sw ? "Zinasubiri kuanzishwa" : "Awaiting processing"}</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{sw ? "Zinachukuliwa" : "In Picking"}</CardTitle>
            <PackageOpen className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts.picking}</div>
            <p className="text-xs text-muted-foreground">{sw ? "Stoo imehakikiwa" : "Inventory checked"}</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{sw ? "Zilizofungashwa" : "Packed & Ready"}</CardTitle>
            <Box className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts.packing}</div>
            <p className="text-xs text-muted-foreground">{sw ? "Tayari kutumwa" : "Ready for dispatch"}</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{sw ? "Safarini / Delivery" : "Out for Delivery"}</CardTitle>
            <Truck className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts.delivery}</div>
            <p className="text-xs text-muted-foreground">{sw ? "Zinaelekea kwa mteja" : "On the way to customers"}</p>
          </CardContent>
        </Card>
      </div>

      {/* Fulfillment queue */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>{sw ? "Foleni ya Oda" : "Fulfillment Queue"}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={sw ? "Tafuta namba ya oda..." : "Search order ID or customer..."}
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
                  ["new", sw ? "Oda Mpya" : "New Orders", counts.new],
                  ["picking", "Picking", counts.picking],
                  ["packing", "Packing", counts.packing],
                  ["delivery", sw ? "Usafirishaji" : "Delivery", counts.delivery],
                  ["completed", sw ? "Zilizokamilika" : "Completed", counts.completed],
                ] as const).map(([value, label, count]) => (
                  <TabsTrigger key={value} value={value} className="relative gap-2 transition-all duration-200 data-[state=active]:shadow-sm">
                    <span>{label}</span>
                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
                      {count}
                    </span>
                    {activeTab === value && (
                      <motion.span
                        layoutId="fulfillment-tab-underline"
                        className="absolute inset-x-2 -bottom-0.5 h-0.5 rounded-full bg-primary"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <TabsContent value={activeTab} className="mt-0 outline-none">
              {isLoading ? (
                <div className="rounded-xl border bg-card px-4 py-12 text-center text-muted-foreground">
                  {sw ? "Inapakia..." : "Loading..."}
                </div>
              ) : filteredOrders.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="rounded-xl border bg-card px-4 py-12 text-center text-muted-foreground"
                >
                  <Package className="mx-auto h-8 w-8 mb-3 opacity-20" />
                  {sw ? "Hakuna oda kwenye kundi hili." : "No orders found in this category."}
                </motion.div>
              ) : (
                <div className="space-y-3">
                  <AnimatePresence initial={false} mode="popLayout">
                    {filteredOrders.map((order, i) => (
                      <motion.div
                        key={order.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.28, delay: Math.min(i, 8) * 0.03, ease: [0.22, 1, 0.36, 1] }}
                        className="rounded-xl border bg-card p-4 shadow-sm transition-colors hover:bg-muted/30"
                      >
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <span className="font-semibold text-sm">#{order.id.slice(-6).toUpperCase()}</span>
                              {getStatusBadge(order.status)}
                            </div>
                            <p className="text-sm font-medium text-foreground truncate">{order.customerName || "Customer"}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                              {order.items.length} {sw ? "bidhaa" : "items"} • {order.items.map(i2 => i2.productName).join(", ")}
                            </p>
                            <StageTrail status={order.status} />
                          </div>

                          <div className="flex flex-wrap items-center gap-2 shrink-0">
                            {renderActions(order, true)}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <PickingDialog
        open={!!pickingOrder}
        onOpenChange={(open) => !open && setPickingOrder(null)}
        order={pickingOrder}
        onConfirm={(items) => {
          if (pickingOrder) handleUpdateStatus(pickingOrder.id, "packed", {}, items);
        }}
      />

      <PackingDialog
        open={!!packingOrder}
        onOpenChange={(open) => !open && setPackingOrder(null)}
        order={packingOrder}
        onConfirm={(data) => {
          if (packingOrder) handleUpdateStatus(packingOrder.id, "ready_for_delivery", data);
        }}
      />

      <DeliveryDialog
        open={!!deliveryOrder}
        onOpenChange={(open) => !open && setDeliveryOrder(null)}
        order={deliveryOrder}
        onConfirm={(data) => {
          if (deliveryOrder) handleUpdateStatus(deliveryOrder.id, "out_for_delivery", data);
        }}
      />
    </div>
  );
}
