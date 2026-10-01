import React, { useState, useEffect } from "react";
import { ShoppingBag, Clock, CheckCircle, XCircle, ChevronDown, ChevronUp, Package, PackageOpen, Box, Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppSelector } from "@/store/hooks";
import { getCustomerOrders } from "@/lib/api/domains/portal";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { useI18n } from "@/lib/i18n";

interface OrderItem { productName: string; quantity: number; price: number; }
interface FulfillmentDetails {
  deliveryMethod?: "pickup" | "merchant" | "third_party";
  driverName?: string;
  driverPhone?: string;
  vehicleDetails?: string;
  trackingNumber?: string;
  deliveryNotes?: string;
}
interface Order {
  id: string; orderId: string; shopId: string; shopName?: string;
  createdAt: any; totalAmount: number;
  status: "pending" | "confirmed" | "picking" | "packed" | "ready_for_delivery" | "out_for_delivery" | "delivered" | "completed" | "cancelled" | "paid";
  items: OrderItem[];
  fulfillment?: FulfillmentDetails;
}

const STATUS: Record<string, { icon: React.ReactNode; label_sw: string; label_en: string; pill: string }> = {
  pending:            { icon: <Clock    className="h-3 w-3" />, label_sw: "Inasubiri",       label_en: "Pending",    pill: "bg-amber-100   text-amber-700   border-amber-200" },
  confirmed:          { icon: <CheckCircle className="h-3 w-3"/>,label_sw: "Imethibitishwa", label_en: "Confirmed",  pill: "bg-sky-100 text-sky-700 border-sky-200" },
  picking:            { icon: <PackageOpen className="h-3 w-3"/>,label_sw: "Inatayarishwa",  label_en: "Picking",    pill: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  packed:             { icon: <Box      className="h-3 w-3" />, label_sw: "Imefungashwa",    label_en: "Packed",     pill: "bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200" },
  ready_for_delivery: { icon: <Package  className="h-3 w-3" />, label_sw: "Tayari Kusafirishwa",label_en: "Ready",   pill: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  out_for_delivery:   { icon: <Truck    className="h-3 w-3" />, label_sw: "Ipo Njiani",      label_en: "Out for Delivery",pill: "bg-blue-100 text-blue-700 border-blue-200" },
  delivered:          { icon: <CheckCircle className="h-3 w-3"/>,label_sw:"Imewasilishwa",   label_en: "Delivered",  pill: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  completed:          { icon: <CheckCircle className="h-3 w-3"/>,label_sw:"Imekamilika",     label_en: "Completed",  pill: "bg-gray-200 text-gray-700 border-gray-300" },
  paid:               { icon: <CheckCircle className="h-3 w-3"/>,label_sw:"Imelipwa",        label_en: "Paid",       pill: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  cancelled:          { icon: <XCircle  className="h-3 w-3" />, label_sw: "Imeghairiwa",    label_en: "Cancelled",  pill: "bg-rose-100    text-rose-700    border-rose-200"  },
};

function Skeleton() {
  return (
    <div className="bg-card rounded-2xl border border-border/40 p-4 space-y-3 animate-pulse">
      <div className="flex justify-between items-start">
        <div className="space-y-2"><div className="h-3.5 w-28 bg-muted rounded-lg" /><div className="h-3 w-20 bg-muted/60 rounded-lg" /></div>
        <div className="h-6 w-20 bg-muted rounded-full" />
      </div>
      <div className="pt-3 border-t border-border flex justify-between items-center">
        <div className="h-3 w-16 bg-muted/50 rounded-lg" />
        <div className="h-5 w-24 bg-muted rounded-lg" />
      </div>
    </div>
  );
}

function OrderCard({ order, sw }: { order: Order; sw: boolean }) {
  const [open, setOpen] = useState(false);
  const cfg = STATUS[order.status] ?? STATUS.pending;
  const fmtDate = (ts: any) => {
    if (!ts) return "—";
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString("sw-TZ", { day: "numeric", month: "short", year: "numeric" });
  };

  return (
    <div className="bg-card rounded-2xl border border-border/50 overflow-hidden hover:border-primary/20 hover:shadow-md transition-all">
      <div className="p-4">
        {/* Top row */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <p className="text-sm font-bold text-foreground">#{(order.orderId || order.id).slice(0,10).toUpperCase()}</p>
            <p className="text-[11px] text-primary font-semibold mt-0.5">{order.shopName || "Smart Partner"}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{fmtDate(order.createdAt)}</p>
          </div>
          <span className={cn("inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border shrink-0", cfg.pill)}>
            {cfg.icon}
            {sw ? cfg.label_sw : cfg.label_en}
          </span>
        </div>

        {/* Delivery Timeline info for out for delivery */}
        {order.status === "out_for_delivery" && order.fulfillment && (
          <div className="mb-3 p-3 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-800/30">
            <div className="flex items-center gap-2 mb-2">
              <Truck className="h-4 w-4 text-blue-600" />
              <p className="text-xs font-bold text-blue-800 dark:text-blue-300">
                {sw ? "Mzigo Upo Njiani" : "Order is on the way"}
              </p>
            </div>
            {order.fulfillment.driverName && (
              <p className="text-xs text-blue-700/80 dark:text-blue-200/70">
                {sw ? "Dereva: " : "Driver: "}<span className="font-semibold">{order.fulfillment.driverName}</span>
                {order.fulfillment.driverPhone && ` (${order.fulfillment.driverPhone})`}
              </p>
            )}
            {order.fulfillment.trackingNumber && (
              <p className="text-[10px] text-blue-600/70 dark:text-blue-200/50 mt-1">
                {sw ? "Namba ya Kufuatilia: " : "Tracking: "}{order.fulfillment.trackingNumber}
              </p>
            )}
          </div>
        )}

        {/* Bottom row */}
        <div className="flex items-center justify-between pt-2.5 border-t border-border/50">
          <span className="text-[11px] text-muted-foreground">{order.items?.length ?? 0} {sw ? "bidhaa" : "items"}</span>
          <div className="flex items-center gap-2">
            <span className="text-base font-black text-foreground">{(order.totalAmount || 0).toLocaleString()} <span className="text-[10px] font-normal text-muted-foreground">TZS</span></span>
            <button onClick={() => setOpen(o => !o)}
              className="h-7 w-7 rounded-full bg-muted/60 hover:bg-muted flex items-center justify-center transition-colors shrink-0">
              {open ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
            </button>
          </div>
        </div>
      </div>

      {/* Expanded items */}
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden">
            <div className="px-4 pb-4 pt-1 bg-muted/20 border-t border-border/30 space-y-1.5">
              {(order.items ?? []).map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs py-1 border-b border-border/30 last:border-0">
                  <span className="text-muted-foreground"><span className="font-bold text-foreground">{item.quantity}×</span> {item.productName}</span>
                  <span className="font-bold text-foreground shrink-0 ml-2">{(item.price * item.quantity).toLocaleString()} TZS</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const TABS = [
  { key: "all",               sw: "Zote",            en: "All" },
  { key: "pending",           sw: "Zinasubiri",      en: "Pending" },
  { key: "processing",        sw: "Zinatayarishwa",  en: "Processing" }, // groups picking, packed
  { key: "out_for_delivery",  sw: "Safarini",        en: "Delivery" },
  { key: "completed",         sw: "Zimekamilika",    en: "Completed" }, // groups completed, delivered, paid
] as const;

export default function CustomerOrders() {
  const { lang } = useI18n();
  const sw = lang === "sw";
  const user = useAppSelector((s) => s.auth.user);
  const [tab, setTab] = useState<typeof TABS[number]["key"]>("all");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }
    let cancelled = false;
    const load = async () => {
      try {
        const rows = await getCustomerOrders(user.id);
        if (!cancelled) setOrders(rows as Order[]);
      } catch { toast.error(sw ? "Imeshindwa kupakia oda." : "Failed to load orders."); }
      finally { if (!cancelled) setLoading(false); }
    };
    void load();
    return () => { cancelled = true; };
  }, [user?.id]);

  const filtered = orders.filter(o => {
    if (tab === "all") return true;
    if (tab === "pending") return o.status === "pending" || o.status === "confirmed";
    if (tab === "processing") return o.status === "picking" || o.status === "packed" || o.status === "ready_for_delivery";
    if (tab === "completed") return o.status === "completed" || o.status === "delivered" || o.status === "paid";
    return o.status === tab;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-foreground">{sw ? "Oda Zangu" : "My Orders"}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{loading ? "..." : `${orders.length} ${sw ? "oda zote" : "total orders"}`}</p>
        </div>
      </div>

      {/* Tabs — scrollable on mobile */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
        {TABS.map((t) => {
          const cnt = t.key === "all" ? orders.length : orders.filter(o => {
            if (t.key === "pending") return o.status === "pending" || o.status === "confirmed";
            if (t.key === "processing") return o.status === "picking" || o.status === "packed" || o.status === "ready_for_delivery";
            if (t.key === "completed") return o.status === "completed" || o.status === "delivered" || o.status === "paid";
            return o.status === t.key;
          }).length;
          
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={cn("flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold whitespace-nowrap shrink-0 transition-all",
                tab === t.key ? "bg-primary text-white shadow-md shadow-primary/25" : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground")}>
              {sw ? t.sw : t.en}
              {!loading && cnt > 0 && (
                <span className={cn("h-4 min-w-4 px-1 rounded-full text-[9px] font-black flex items-center justify-center",
                  tab === t.key ? "bg-white/30 text-white" : "bg-muted-foreground/20 text-muted-foreground")}>{cnt}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Cards */}
      <div className="space-y-3 pb-8">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} />)
          : filtered.length > 0
            ? filtered.map(o => <OrderCard key={o.id} order={o} sw={sw} />)
            : (
              <div className="flex flex-col items-center justify-center py-14 text-center gap-3">
                <div className="h-14 w-14 rounded-3xl bg-muted flex items-center justify-center"><ShoppingBag className="h-6 w-6 text-muted-foreground" /></div>
                <div><p className="font-bold text-foreground text-sm">{sw ? "Hakuna Oda" : "No Orders"}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 max-w-[200px]">{sw ? tab === "all" ? "Bado hujafanya oda yoyote." : "Hakuna oda za aina hii." : tab === "all" ? "No orders yet. Start shopping!" : "No orders in this category."}</p></div>
                {tab === "all" && (
                  <Link to="/explore" className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-primary text-white text-xs font-bold shadow-md shadow-primary/25 active:scale-95 transition-all">
                    <ShoppingBag className="h-4 w-4" />{sw ? "Nunua Sasa" : "Shop Now"}
                  </Link>
                )}
              </div>
            )
        }
      </div>
    </div>
  );
}
