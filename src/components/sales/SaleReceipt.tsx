import { useRef, useState } from "react";
import { X, Printer, MessageCircle, Send, CheckCircle2, Sparkles, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { formatTZS } from "@/data/mockData";
import { openWhatsApp, shareWhatsApp, buildReceiptMessage, buildOrderNotification } from "@/lib/whatsapp";
import { useI18n } from "@/lib/i18n";
import type { Sale } from "@/types";

interface Props {
  sale: Sale | null;
  shopName: string;
  open: boolean;
  onClose: () => void;
}

const RECEIPT_STYLES = `
  @page { margin: 0; size: 58mm 120mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Courier New', monospace;
    font-size: 10px;
    line-height: 1.3;
    width: 58mm;
    max-width: 58mm;
    padding: 3mm 2mm;
    color: #000;
    background: #fff;
  }
  .shop-name { font-size: 13px; font-weight: 800; text-align: center; text-transform: uppercase; letter-spacing: 0.5px; }
  .subtitle { font-size: 9px; text-align: center; color: #444; margin-top: 1px; }
  .divider { border: none; border-top: 1px dashed #000; margin: 4px 0; }
  .divider-double { border: none; border-top: 2px solid #000; margin: 4px 0; }
  .label-row { display: flex; justify-content: space-between; font-size: 9px; }
  .label-row .label { color: #555; }
  .header-row { display: flex; justify-content: space-between; font-size: 9px; font-weight: 700; border-bottom: 1px solid #000; padding-bottom: 2px; margin-bottom: 2px; }
  .item-row { display: flex; justify-content: space-between; font-size: 9.5px; padding: 1px 0; }
  .total-row { display: flex; justify-content: space-between; font-size: 12px; font-weight: 900; padding: 3px 0; }
  .payment-row { display: flex; justify-content: space-between; font-size: 9px; }
  .footer { text-align: center; font-size: 8px; color: #555; margin-top: 3px; }
  .footer-thanks { text-align: center; font-size: 10px; font-weight: 700; margin-top: 2px; }
  .receipt-no { font-family: monospace; font-size: 8px; text-align: center; color: #777; letter-spacing: 1px; }
  .qr-placeholder { text-align: center; margin-top: 6px; font-size: 7px; border: 1px dashed #000; padding: 4px; }
`;

export default function SaleReceipt({ sale, shopName, open, onClose }: Props) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const { t } = useI18n();
  const [waPhone, setWaPhone] = useState("");
  const [showPhoneInput, setShowPhoneInput] = useState(false);

  if (!sale) return null;

  const receiptNo = sale.id.slice(0, 8).toUpperCase();
  const dateObj = new Date(sale.date);
  const formattedDate = dateObj.toLocaleDateString("sw-TZ", { day: "2-digit", month: "2-digit", year: "numeric" });
  const formattedTime = new Date().toLocaleTimeString("sw-TZ", { hour: "2-digit", minute: "2-digit" });
  const unitPrice = sale.quantity > 0 ? sale.totalPrice / sale.quantity : sale.totalPrice;

  const handlePrint = () => {
    const content = receiptRef.current;
    if (!content) return;
    const win = window.open("", "_blank", "width=240,height=450");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>Risiti</title><style>${RECEIPT_STYLES}</style></head><body>${content.innerHTML}</body></html>`);
    win.document.close();
    win.print();
  };

  const handleShareWhatsApp = () => {
    const msg = buildReceiptMessage(sale, shopName);
    if (sale.customerPhone) {
      openWhatsApp(sale.customerPhone, msg);
    } else {
      shareWhatsApp(msg);
    }
  };

  const handleSendToPhone = () => {
    if (!waPhone.trim()) return;
    const msg = buildReceiptMessage(sale, shopName);
    openWhatsApp(waPhone, msg);
    setWaPhone("");
    setShowPhoneInput(false);
  };

  const handleNotifyCustomer = () => {
    if (!sale.customerPhone) return;
    const msg = buildOrderNotification(sale, shopName);
    openWhatsApp(sale.customerPhone, msg);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      {/* Enhanced responsive width w-[95vw] sm:max-w-md and rounded corner scaling */}
      <DialogContent className="w-[95vw] sm:max-w-md p-0 overflow-hidden rounded-[1.75rem] sm:rounded-[2.5rem] border border-white/20 bg-background/95 backdrop-blur-3xl shadow-2xl transition-all duration-300 [&>button]:hidden">
        
        {/* Banner with modern dark mode styling & micro-animations */}
        <div className="relative p-5 sm:p-6 pb-4 bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border-b border-border/30 flex items-center justify-between">
          <div className="space-y-1">
            <span className="flex items-center gap-1.5 text-[10px] sm:text-xs font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-500 animate-pulse" /> Sale Confirmed
            </span>
            <h3 className="text-base sm:text-lg font-black text-foreground flex items-center gap-2">
              <Receipt className="h-4.5 w-4.5 sm:h-5 sm:w-5 text-primary" /> Receipt Invoice
            </h3>
          </div>
          
          {/* Custom Close Button */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7 sm:h-8 sm:w-8 rounded-full border border-border/50 bg-background/50 hover:bg-destructive/15 hover:text-destructive hover:border-destructive/30 transition-all duration-200 flex items-center justify-center shrink-0 z-50 shadow-sm" 
            onClick={onClose}
          >
            <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </Button>
          <div className="absolute top-0 right-1/4 h-24 w-24 bg-primary/5 rounded-full blur-xl pointer-events-none" />
        </div>

        {/* Outer Receipt Card wrapping with physical sheet design */}
        <div className="p-4 sm:p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
          
          <div className="relative mx-auto w-[62mm] transition-transform duration-300 hover:scale-[1.01]">
            
            {/* Paper Jagged Top Border */}
            <div className="h-2 w-full bg-[linear-gradient(45deg,transparent_33.333%,#fff_33.333%,#fff_66.667%,transparent_66.667%),linear-gradient(-45deg,transparent_33.333%,#fff_33.333%,#fff_66.667%,transparent_66.667%)] bg-[size:6px_12px] bg-repeat-x drop-shadow-[0_-2px_1px_rgba(0,0,0,0.02)]" />
            
            {/* Printable Area */}
            <div
              ref={receiptRef}
              className="bg-white text-black p-4 shadow-xl border-x border-dashed border-gray-200"
              style={{ width: "62mm", fontFamily: "'Courier New', monospace", fontSize: "10px", lineHeight: 1.3 }}
            >
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "13px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px", color: "#111" }}>
                  {shopName}
                </div>
                <div style={{ fontSize: "9px", color: "#666", marginTop: "1px", fontWeight: "bold" }}>RISITI YA MAUZO</div>
              </div>
              <hr style={{ border: "none", borderTop: "2px solid #111", margin: "6px 0" }} />
              
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px" }}>
                  <span style={{ color: "#666" }}>Tarehe:</span>
                  <span style={{ fontWeight: 600 }}>{formattedDate} {formattedTime}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px" }}>
                  <span style={{ color: "#666" }}>Nambari:</span>
                  <span style={{ fontFamily: "monospace", fontWeight: "bold", letterSpacing: "0.5px" }}>{receiptNo}</span>
                </div>
                {sale.customerName && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px" }}>
                    <span style={{ color: "#666" }}>Mteja:</span>
                    <span style={{ fontWeight: 600 }}>{sale.customerName}</span>
                  </div>
                )}
              </div>
              
              <hr style={{ border: "none", borderTop: "1px dashed #111", margin: "6px 0" }} />
              
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px", fontWeight: 700, borderBottom: "1px solid #111", paddingBottom: "2px", marginBottom: "3px" }}>
                <span>Bidhaa</span>
                <span>Jumla</span>
              </div>
              
              <div style={{ padding: "2px 0" }}>
                <div style={{ fontSize: "9.5px", fontWeight: 700, color: "#111" }}>{sale.productName}</div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px", color: "#444", marginTop: "1px" }}>
                  <span>{sale.quantity} x {formatTZS(unitPrice)}</span>
                  <span style={{ fontWeight: 700 }}>{formatTZS(sale.totalPrice)}</span>
                </div>
              </div>
              
              <hr style={{ border: "none", borderTop: "2px solid #111", margin: "6px 0" }} />
              
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: 900, padding: "2px 0", color: "#000" }}>
                <span>JUMLA</span>
                <span>{formatTZS(sale.totalPrice)}</span>
              </div>
              
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px", marginTop: "2px" }}>
                <span style={{ color: "#666" }}>Njia ya Malipo:</span>
                <span style={{ fontWeight: 700 }}>{sale.paymentMethod}</span>
              </div>
              
              <hr style={{ border: "none", borderTop: "1px dashed #111", margin: "6px 0 4px" }} />
              
              <div style={{ textAlign: "center", fontSize: "10px", fontWeight: 800, color: "#111" }}>Asante kwa kununua!</div>
              <div style={{ textAlign: "center", fontSize: "8px", color: "#777", marginTop: "2px" }}>
                Powered by Twende Duka
              </div>
              
              {/* QR Code and digital store scanner preview */}
              <div style={{ marginTop: "8px", border: "1px dashed #aaa", padding: "5px", borderRadius: "4px", textAlign: "center" }}>
                <span style={{ fontWeight: 700, fontSize: "7px", display: "block", color: "#333" }}>DIGITAL RECEIPT & WEB STORE</span>
                {/* SVG Mini QR Code */}
                <svg width="36" height="36" viewBox="0 0 29 29" style={{ margin: "4px auto 2px", display: "block" }}>
                  <path fill="#000" d="M0 0h7v7H0zm1 1v5h5V1zm10 0h7v7h-7zm1 1v5h5V2zm10 0h7v7h-7zm1 1v5h5V3zm-22 9h7v7H0zm1 1v5h5v-5zm15 1h2v2h-2zm-3 2h2v2h-2zm6 0h2v2h-2zm-9 3h2v2h-2zm6 0h2v2h-2z" />
                </svg>
                <span style={{ fontSize: "6px", fontFamily: "monospace", color: "#555" }}>dld.twendeduka.com/{receiptNo}</span>
              </div>
            </div>

            {/* Paper Jagged Bottom Border */}
            <div className="h-2 w-full bg-[linear-gradient(45deg,transparent_33.333%,#fff_33.333%,#fff_66.667%,transparent_66.667%),linear-gradient(-45deg,transparent_33.333%,#fff_33.333%,#fff_66.667%,transparent_66.667%)] bg-[size:6px_12px] bg-repeat-x drop-shadow-[0_2px_1px_rgba(0,0,0,0.02)]" />
          </div>

          {/* Action buttons panel - fully responsive grids */}
          <div className="space-y-3.5 pt-4 border-t border-border/40">
            <Button
              onClick={handlePrint}
              className="w-full h-12 rounded-2xl font-black text-sm bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-lg shadow-primary/10 hover:scale-[1.01] transition-transform flex items-center justify-center gap-2"
            >
              <Printer className="h-4.5 w-4.5 animate-pulse" /> Print Thermal Receipt
            </Button>

            {sale.customerPhone ? (
              // Stacks on small screens (grid-cols-1) and grid-cols-2 on tablet/desktop
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Button
                  onClick={handleShareWhatsApp}
                  className="h-12 rounded-2xl font-black text-xs bg-[#25D366] hover:bg-[#22c35e] text-white shadow-md shadow-[#25D366]/10 transition-all flex items-center justify-center gap-1.5 border-none"
                >
                  <MessageCircle className="h-4.5 w-4.5" />
                  Send to Customer
                </Button>
                <Button
                  onClick={handleNotifyCustomer}
                  variant="outline"
                  className="h-12 rounded-2xl font-black text-xs border border-border/60 hover:bg-muted/30 transition-all flex items-center justify-center gap-1.5"
                >
                  <Send className="h-4 w-4" /> Notify Status
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <Button
                  onClick={handleShareWhatsApp}
                  className="w-full h-12 rounded-2xl font-black text-xs bg-[#25D366] hover:bg-[#22c35e] text-white shadow-md shadow-[#25D366]/10 transition-all flex items-center justify-center gap-2 border-none"
                >
                  <MessageCircle className="h-4.5 w-4.5" />
                  Share via WhatsApp
                </Button>

                {!showPhoneInput ? (
                  <button
                    onClick={() => setShowPhoneInput(true)}
                    className="w-full py-2 text-center text-xs font-bold text-primary hover:underline transition-all flex items-center justify-center gap-1.5"
                  >
                    <MessageCircle className="h-3.5 w-3.5" /> Send to another phone number
                  </button>
                ) : (
                  <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/50 space-y-2 animate-fade-in">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block">Customer WhatsApp Number</label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Input
                        value={waPhone}
                        onChange={(e) => setWaPhone(e.target.value)}
                        placeholder="e.g. 0712345678"
                        className="text-xs h-10 rounded-xl bg-background border-border/60 focus-visible:ring-primary/20"
                      />
                      <Button onClick={handleSendToPhone} className="h-10 rounded-xl px-4 bg-[#25D366] hover:bg-[#22c35e] text-white shrink-0 font-bold text-xs flex items-center justify-center gap-1">
                        Send <Send className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <div className="text-center pt-2">
              <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1 font-semibold">
                <Sparkles className="h-3.5 w-3.5 text-yellow-500" /> WhatsApp updates sent using Twende Duka API
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
