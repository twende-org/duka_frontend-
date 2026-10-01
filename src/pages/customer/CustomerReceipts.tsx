import React, { useState, useEffect } from "react";
import { Receipt, FileDown, Phone, AlertTriangle } from "lucide-react";
import { useAppSelector } from "@/store/hooks";
import { getCustomerReceipts } from "@/lib/api/domains/portal";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useI18n } from "@/lib/i18n";

interface ReceiptItem { productName: string; quantity: number; price: number; subtotal: number; }
interface CustomerReceipt { id: string; shopId: string; shopName: string; date: string; total: number; paymentMethod: string; itemsCount: number; items: ReceiptItem[]; }

const RECEIPT_CSS = `@page{margin:0;size:58mm 120mm}*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Courier New',monospace;font-size:10px;line-height:1.3;width:58mm;padding:3mm 2mm;color:#000;background:#fff}.sn{font-size:13px;font-weight:800;text-align:center;text-transform:uppercase}.sub{font-size:9px;text-align:center;color:#444;margin-top:1px}.div{border:none;border-top:1px dashed #000;margin:4px 0}.div2{border:none;border-top:2px solid #000;margin:4px 0}.lrow{display:flex;justify-content:space-between;font-size:9px}.hrow{display:flex;justify-content:space-between;font-size:9px;font-weight:700;border-bottom:1px solid #000;padding-bottom:2px;margin-bottom:2px}.irow{display:flex;justify-content:space-between;font-size:9.5px;padding:1px 0}.trow{display:flex;justify-content:space-between;font-size:12px;font-weight:900;padding:3px 0}.ft{text-align:center;font-size:8px;color:#555;margin-top:3px}.ftb{text-align:center;font-size:10px;font-weight:700;margin-top:2px}.rno{font-family:monospace;font-size:8px;text-align:center;color:#777;letter-spacing:1px}`;

const PAYMENT_PILL: Record<string, string> = {
  cash:     "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/40",
  mpesa:    "bg-green-100   text-green-700   border-green-200   dark:bg-green-900/20   dark:text-green-400   dark:border-green-800/40",
  tigopesa: "bg-blue-100    text-blue-700    border-blue-200    dark:bg-blue-900/20    dark:text-blue-400    dark:border-blue-800/40",
  airtel:   "bg-red-100     text-red-700     border-red-200     dark:bg-red-900/20     dark:text-red-400     dark:border-red-800/40",
};
const PAYMENT_LABEL: Record<string, string> = { cash: "Pesa Taslimu", mpesa: "M-Pesa", tigopesa: "Tigo Pesa", airtel: "Airtel Money" };

function Skeleton() {
  return (
    <div className="bg-card rounded-2xl border border-border/40 p-4 space-y-3 animate-pulse">
      <div className="flex justify-between"><div className="h-9 w-9 bg-muted rounded-xl" /><div className="h-3 w-20 bg-muted/60 rounded-lg" /></div>
      <div className="space-y-1.5"><div className="h-3.5 w-3/4 bg-muted rounded-lg" /><div className="h-3 w-1/2 bg-muted/60 rounded-lg" /></div>
      <div className="pt-3 border-t border-border flex justify-between items-end"><div className="h-5 w-24 bg-muted rounded-lg" /><div className="h-8 w-28 bg-muted rounded-xl" /></div>
    </div>
  );
}

export default function CustomerReceipts() {
  const { lang } = useI18n();
  const sw = lang === "sw";
  const user = useAppSelector((s) => s.auth.user);
  const [receipts, setReceipts] = useState<CustomerReceipt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }
    let cancelled = false;
    const load = async () => {
      try {
        const rows = await getCustomerReceipts(user.id);
        if (!cancelled) setReceipts(rows as CustomerReceipt[]);
      } catch (e: any) { toast.error(`${sw ? "Imeshindwa kupakia risiti" : "Failed to load receipts"}: ${e.message}`); }
      finally { if (!cancelled) setLoading(false); }
    };
    void load();
    return () => { cancelled = true; };
  }, [user?.id]);

  const print = (r: CustomerReceipt) => {
    toast.success(`${sw ? "Inaandaa risiti" : "Preparing receipt"} #${r.id.slice(0, 8)}…`);
    const w = window.open("", "_blank", "width=240,height=450");
    if (!w) { toast.error(sw ? "Ruhusu pop-ups kwenye kivinjari chako." : "Please allow pop-ups."); return; }
    const items = r.items?.length > 0 ? r.items : [{ productName: "Bidhaa Mbalimbali", quantity: 1, price: r.total, subtotal: r.total }];
    w.document.write(`<!DOCTYPE html><html><head><title>Risiti</title><style>${RECEIPT_CSS}</style></head><body onload="window.print();window.close();">
      <div class="sn">${r.shopName}</div><div class="sub">Asante kwa kutuchagua</div>
      <hr class="div"/><div class="lrow"><span>Tarehe:</span><span>${r.date}</span></div><div class="lrow"><span>Njia:</span><span>${r.paymentMethod}</span></div>
      <hr class="div"/><div class="hrow"><span>Bidhaa</span><span>Jumla</span></div>
      ${items.map(i => `<div class="irow"><span>${i.quantity}x ${i.productName.slice(0,14)}</span><span>${(i.subtotal||i.price*i.quantity).toLocaleString()}</span></div>`).join("")}
      <hr class="div2"/><div class="trow"><span>JUMLA KUU</span><span>${(r.total||0).toLocaleString()}</span></div>
      <hr class="div"/><div class="ftb">Asante na Karibu Tena!</div><div class="rno">Risiti#: ${r.id.slice(0,8).toUpperCase()}</div>
    </body></html>`);
    w.document.close();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-extrabold text-foreground">{sw ? "Risiti Zangu" : "My Receipts"}</h1>
        <p className="text-xs text-muted-foreground mt-0.5">{loading ? "..." : `${receipts.length} ${sw ? "risiti" : "receipts"}`}</p>
      </div>

      {/* Warning */}
      {!loading && receipts.length === 0 && (
        <div className="flex gap-3 p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200/60 dark:border-amber-800/40">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-800 dark:text-amber-300">{sw ? "Namba ya Simu Inahitajika" : "Phone Number Required"}</p>
            <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-1 leading-relaxed">
              {sw ? "Risiti zinaonekana tu ukisajilishwa namba yako ya simu. Hakikisha namba yako kwenye" : "Receipts appear when registered with your phone number. Verify your number in"}{" "}
              <Link to="/customer/profile" className="underline font-bold">{sw ? "Profaili yako" : "your Profile"}</Link>.
            </p>
          </div>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} />)
          : receipts.length > 0
            ? receipts.map((r, i) => {
                const pmKey = r.paymentMethod?.toLowerCase() ?? "";
                const pmPill = PAYMENT_PILL[pmKey] ?? "bg-muted text-muted-foreground border-border";
                const pmLabel = PAYMENT_LABEL[pmKey] ?? r.paymentMethod ?? "—";
                return (
                  <motion.div key={r.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                    className="bg-card rounded-2xl border border-border/50 p-4 flex flex-col gap-3 hover:border-primary/20 hover:shadow-md transition-all group">
                    {/* Top */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 group-hover:scale-105 transition-transform">
                        <Receipt className="h-5 w-5" />
                      </div>
                      <span className="text-[10px] font-mono font-bold text-muted-foreground">#{r.id.slice(0,8).toUpperCase()}</span>
                    </div>

                    {/* Shop & date */}
                    <div>
                      <p className="text-sm font-bold text-foreground leading-tight line-clamp-1">{r.shopName}</p>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                        <span>{r.date}</span>
                        <span className="h-0.5 w-0.5 rounded-full bg-muted-foreground" />
                        <span>{r.itemsCount} {sw ? "bidhaa" : "items"}</span>
                      </div>
                    </div>

                    {/* Bottom */}
                    <div className="pt-3 border-t border-border/40 space-y-2">
                      <div className="flex items-end justify-between gap-2">
                        <div>
                          <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">{sw ? "Jumla Kuu" : "Total"}</p>
                          <p className="text-xl font-black text-foreground leading-tight">{(r.total||0).toLocaleString()} <span className="text-[10px] font-normal text-muted-foreground">TZS</span></p>
                        </div>
                        <span className={`text-[9px] font-bold px-2 py-1 rounded-full border shrink-0 ${pmPill}`}>{pmLabel}</span>
                      </div>
                      <button onClick={() => print(r)}
                        className="w-full flex items-center justify-center gap-2 h-9 rounded-xl text-xs font-bold border border-border/60 text-muted-foreground hover:bg-primary hover:text-white hover:border-primary active:scale-95 transition-all">
                        <FileDown className="h-4 w-4" />
                        {sw ? "Chapisha Risiti" : "Print Receipt"}
                      </button>
                    </div>
                  </motion.div>
                );
              })
            : (
              <div className="col-span-full flex flex-col items-center justify-center py-14 text-center gap-3">
                <div className="h-14 w-14 rounded-3xl bg-muted flex items-center justify-center"><Receipt className="h-6 w-6 text-muted-foreground" /></div>
                <div><p className="font-bold text-sm text-foreground">{sw ? "Hakuna Risiti Bado" : "No Receipts Yet"}</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-[220px] leading-relaxed">{sw ? "Ukienda dukani, mwambie muuzaji akusajili namba yako ya simu." : "At the shop, ask the merchant to register your phone number."}</p></div>
                <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-muted text-xs font-bold text-muted-foreground">
                  <Phone className="h-3.5 w-3.5" />{sw ? "Namba ya simu inatakiwa" : "Phone number required"}
                </div>
              </div>
            )
        }
      </div>
    </div>
  );
}
