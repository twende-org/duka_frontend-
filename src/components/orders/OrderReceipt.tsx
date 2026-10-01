import { useRef } from "react";
import { Printer, X, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { formatTZS } from "@/data/mockData";
import { useI18n } from "@/lib/i18n";
import type { Order } from "@/types";

interface Props {
  order: Order | null;
  shopName: string;
  open: boolean;
  onClose: () => void;
  documentType?: "quotation" | "proforma" | "invoice" | "receipt" | "delivery_note";
}

const RECEIPT_STYLES = `
  @page { margin: 0; size: 58mm auto; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Courier New', monospace; font-size: 10px; line-height: 1.3; width: 58mm; max-width: 58mm; padding: 3mm 2mm; color: #000; background: #fff; }
  .shop-name { font-size: 13px; font-weight: 800; text-align: center; text-transform: uppercase; }
  .subtitle { font-size: 9px; text-align: center; color: #444; margin-top: 1px; }
  .divider { border: none; border-top: 1px dashed #000; margin: 4px 0; }
  .divider-bold { border: none; border-top: 2px solid #000; margin: 4px 0; }
  .row { display: flex; justify-content: space-between; font-size: 9px; }
  .item-name { font-size: 9.5px; font-weight: 600; }
  .total-row { display: flex; justify-content: space-between; font-size: 12px; font-weight: 900; padding: 3px 0; }
  .footer { text-align: center; font-size: 10px; font-weight: 700; margin-top: 4px; }
  .powered { text-align: center; font-size: 8px; color: #777; margin-top: 2px; }
`;

const INVOICE_STYLES = `
  @page { margin: 15mm; size: A4; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 13px; line-height: 1.6; color: #1e293b; background: #fff; padding: 0; margin: 0; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; }
  .shop-name { font-size: 28px; font-weight: 900; text-transform: uppercase; color: #0f172a; letter-spacing: -0.02em; }
  .invoice-title { font-size: 24px; font-weight: 800; color: #f97316; text-transform: uppercase; letter-spacing: 0.05em; }
  .info-section { display: flex; justify-content: space-between; margin-bottom: 40px; }
  .info-block { width: 48%; }
  .info-block strong { color: #0f172a; display: inline-block; width: 90px; }
  table { width: 100%; border-collapse: separate; border-spacing: 0; margin-bottom: 40px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
  th { background: #f8fafc; padding: 12px 16px; text-align: left; font-weight: 700; color: #475569; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; border-bottom: 1px solid #e2e8f0; }
  td { padding: 14px 16px; border-bottom: 1px solid #f1f5f9; color: #334155; }
  tr:last-child td { border-bottom: none; }
  .text-right { text-align: right; }
  .summary-section { width: 40%; margin-left: auto; }
  .summary-row { display: flex; justify-content: space-between; padding: 8px 16px; color: #475569; }
  .summary-row.total { font-size: 18px; font-weight: 800; background: #f8fafc; padding: 16px; border-radius: 8px; color: #0f172a; margin-top: 8px; }
  .footer { margin-top: 60px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 24px; }
  .bank-details { margin-top: 40px; padding: 20px; background: #fff7ed; border: 1px solid #fdba74; border-radius: 8px; font-size: 12px; color: #c2410c; }
`;

export default function OrderReceipt({ order, shopName, open, onClose, documentType = "receipt" }: Props) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const { t } = useI18n();

  if (!order) return null;

  const receiptNo = order.id.slice(0, 8).toUpperCase();
  const now = new Date();
  const formattedDate = now.toLocaleDateString("sw-TZ", { day: "2-digit", month: "2-digit", year: "numeric" });
  const formattedTime = now.toLocaleTimeString("sw-TZ", { hour: "2-digit", minute: "2-digit" });

  const getCustomerTypeLabel = (type?: string) => {
    switch(type) {
      case "retail": return "Rejareja (Retail)";
      case "wholesale": return "Jumla (Wholesale)";
      case "corporate": return "Taasisi (Corporate)";
      default: return "Mteja wa Kawaida";
    }
  };
  const customerTypeLabel = getCustomerTypeLabel(order.customerType);

  const isA4 = documentType !== "receipt";
  
  const getDocTitle = () => {
    switch (documentType) {
      case "quotation": return "QUOTATION / DRAFT";
      case "proforma": return "PROFORMA INVOICE";
      case "invoice": return "TAX INVOICE";
      case "delivery_note": return "DELIVERY NOTE";
      default: return "RISITI";
    }
  };

  const handlePrint = () => {
    const content = receiptRef.current;
    if (!content) return;
    
    const printWindowOpts = isA4 ? "width=800,height=1000" : "width=240,height=600";
      
    const win = window.open("", "_blank", printWindowOpts);
    if (!win) return;
    
    const stylesToUse = isA4 ? INVOICE_STYLES : RECEIPT_STYLES;
    const title = getDocTitle();
    
    win.document.write(`<!DOCTYPE html><html><head><title>${title}</title><style>${stylesToUse}</style></head><body>${content.innerHTML}</body></html>`);
    win.document.close();
    
    setTimeout(() => win.print(), 250);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className={`border-none rounded-3xl p-0 shadow-[0_20px_50px_rgba(0,0,0,0.3)] bg-gradient-to-br from-slate-900 to-slate-800 ${isA4 ? "max-w-4xl" : "max-w-sm"} overflow-hidden`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/20 backdrop-blur-md">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-white">
            <FileText className="h-5 w-5 text-orange-400" />
            {isA4 ? "Document Preview" : t("orders.receipt")}
          </DialogTitle>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-white/70 hover:text-white hover:bg-white/10 rounded-full">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="bg-slate-950/50 p-6 max-h-[75vh] overflow-y-auto flex justify-center custom-scrollbar">
          <div
            ref={receiptRef}
            className="bg-white text-slate-900 shadow-2xl transition-all"
            style={isA4 ? {
              width: "100%", 
              maxWidth: "210mm",
              padding: "50px", 
              fontFamily: "'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif",
              minHeight: "297mm",
              borderRadius: "4px",
            } : {
              width: "58mm", 
              minHeight: "80mm", 
              padding: "3mm 2mm", 
              fontFamily: "'Courier New', monospace", 
              fontSize: "10px", 
              lineHeight: 1.3,
              borderRadius: "2px",
            }}
          >
          {isA4 ? (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "30px", borderBottom: "2px solid #e2e8f0", paddingBottom: "20px" }}>
                <div>
                  <div style={{ fontSize: "28px", fontWeight: 900, textTransform: "uppercase", color: "#0f172a", letterSpacing: "-0.02em" }}>{shopName}</div>
                  <div style={{ color: "#64748b", marginTop: "4px", fontSize: "12px", fontWeight: 500 }}>Professional Business Solutions</div>
                </div>
                <div style={{ fontSize: "24px", fontWeight: 800, color: "#f97316", textTransform: "uppercase", letterSpacing: "0.05em" }}>{getDocTitle()}</div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "40px" }}>
                <div style={{ width: "45%" }}>
                  <div style={{ marginBottom: "15px" }}>
                    <div style={{ fontWeight: 700, fontSize: "12px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>Billed To:</div>
                    {order.customerName ? (
                      <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "8px", border: "1px solid #f1f5f9" }}>
                        <div style={{ fontSize: "15px", fontWeight: 700, color: "#0f172a" }}>{order.customerName}</div>
                        <div style={{ color: "#f97316", fontSize: "12px", marginTop: "4px", fontWeight: 600 }}>{customerTypeLabel}</div>
                        {order.customerPhone && <div style={{ color: "#475569", marginTop: "4px", fontSize: "13px" }}>{order.customerPhone}</div>}
                      </div>
                    ) : (
                      <div style={{ color: "#475569", fontWeight: 500 }}>{customerTypeLabel}</div>
                    )}
                  </div>
                </div>
                
                <div style={{ width: "45%" }}>
                  <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "8px", border: "1px solid #f1f5f9" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                      <span style={{ color: "#64748b", fontSize: "12px", fontWeight: 500 }}>Document No:</span>
                      <strong style={{ fontFamily: "monospace", color: "#0f172a", fontSize: "13px" }}>DOC-{receiptNo}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                      <span style={{ color: "#64748b", fontSize: "12px", fontWeight: 500 }}>Date:</span>
                      <strong style={{ color: "#0f172a", fontSize: "13px" }}>{formattedDate}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                      <span style={{ color: "#64748b", fontSize: "12px", fontWeight: 500 }}>Time:</span>
                      <strong style={{ color: "#0f172a", fontSize: "13px" }}>{formattedTime}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: "12px", paddingTop: "12px", borderTop: "1px solid #e2e8f0" }}>
                      <span style={{ color: "#64748b", fontSize: "12px", fontWeight: 500 }}>Status:</span>
                      <strong style={{ color: "#c2410c", fontSize: "13px", padding: "2px 8px", background: "#fff7ed", borderRadius: "4px" }}>{order.status.toUpperCase()}</strong>
                    </div>
                  </div>
                </div>
              </div>

              <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, marginBottom: "40px", border: "1px solid #e2e8f0", borderRadius: "8px", overflow: "hidden" }}>
                <thead>
                  <tr>
                    <th style={{ background: "#f8fafc", padding: "12px 16px", textAlign: "left", fontWeight: 700, color: "#475569", textTransform: "uppercase", fontSize: "11px", letterSpacing: "0.05em", borderBottom: "1px solid #e2e8f0" }}>Description</th>
                    <th style={{ background: "#f8fafc", padding: "12px 16px", textAlign: "right", fontWeight: 700, color: "#475569", textTransform: "uppercase", fontSize: "11px", letterSpacing: "0.05em", borderBottom: "1px solid #e2e8f0" }}>Qty</th>
                    <th style={{ background: "#f8fafc", padding: "12px 16px", textAlign: "right", fontWeight: 700, color: "#475569", textTransform: "uppercase", fontSize: "11px", letterSpacing: "0.05em", borderBottom: "1px solid #e2e8f0" }}>Unit Price</th>
                    <th style={{ background: "#f8fafc", padding: "12px 16px", textAlign: "right", fontWeight: 700, color: "#475569", textTransform: "uppercase", fontSize: "11px", letterSpacing: "0.05em", borderBottom: "1px solid #e2e8f0" }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item, i) => (
                    <tr key={i}>
                      <td style={{ padding: "14px 16px", borderBottom: "1px solid #f1f5f9", color: "#334155" }}>
                        <strong style={{ display: "block", color: "#0f172a", fontSize: "13px" }}>{item.productName}</strong>
                      </td>
                      <td style={{ padding: "14px 16px", borderBottom: "1px solid #f1f5f9", color: "#334155", textAlign: "right" }}>{item.quantity}</td>
                      <td style={{ padding: "14px 16px", borderBottom: "1px solid #f1f5f9", color: "#334155", textAlign: "right" }}>{formatTZS(item.price)}</td>
                      <td style={{ padding: "14px 16px", borderBottom: "1px solid #f1f5f9", color: "#0f172a", textAlign: "right", fontWeight: 600 }}>{formatTZS(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ width: "45%" }}>
                  <div style={{ padding: "20px", background: "#fff7ed", border: "1px solid #fdba74", borderRadius: "8px", fontSize: "12px", color: "#c2410c" }}>
                    <strong style={{ display: "block", marginBottom: "8px", color: "#9a3412", fontSize: "13px" }}>Payment Details:</strong>
                    Please ensure all payments are made to <strong>{shopName}</strong>.<br/>
                    Thank you for your continued business!
                  </div>
                </div>

                <div style={{ width: "45%" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 16px", color: "#475569" }}>
                    <span>Subtotal:</span>
                    <span style={{ fontWeight: 500, color: "#0f172a" }}>{formatTZS(order.subtotal)}</span>
                  </div>
                  {order.tax > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 16px", color: "#475569" }}>
                      <span>Tax:</span>
                      <span style={{ fontWeight: 500, color: "#0f172a" }}>{formatTZS(order.tax)}</span>
                    </div>
                  )}
                  {order.discount > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 16px", color: "#ef4444" }}>
                      <span>Discount:</span>
                      <span style={{ fontWeight: 500 }}>-{formatTZS(order.discount)}</span>
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "16px", background: "#f8fafc", borderRadius: "8px", color: "#0f172a", fontSize: "18px", fontWeight: 800, marginTop: "8px" }}>
                    <span>GRAND TOTAL:</span>
                    <span>{formatTZS(order.totalAmount)}</span>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: "60px", textAlign: "center", fontSize: "11px", color: "#94a3b8", borderTop: "1px solid #e2e8f0", paddingTop: "24px" }}>
                Document Generated on {formattedDate} at {formattedTime} &bull; Powered by Twende Duka ERP
              </div>
            </div>
          ) : (
            /* ==============================================================
                                58MM RECEIPT LAYOUT 
               ============================================================== */
            <div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "13px", fontWeight: 800, textTransform: "uppercase" }}>{shopName}</div>
                <div style={{ fontSize: "9px", color: "#444", marginTop: "1px" }}>RISITI YA ORDER</div>
              </div>
              <hr style={{ border: "none", borderTop: "2px solid #000", margin: "4px 0" }} />

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px" }}>
                <span style={{ color: "#555" }}>Tarehe:</span>
                <span>{formattedDate} {formattedTime}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px" }}>
                <span style={{ color: "#555" }}>Nambari:</span>
                <span style={{ fontFamily: "monospace", letterSpacing: "1px" }}>{receiptNo}</span>
              </div>
              {order.customerName ? (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px" }}>
                  <span style={{ color: "#555" }}>Mteja:</span>
                  <div style={{ textAlign: "right" }}>
                    <div>{order.customerName}</div>
                    {order.customerType && order.customerType !== "walk-in" && (
                      <div style={{ fontSize: "8px", color: "#666" }}>{customerTypeLabel}</div>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px" }}>
                  <span style={{ color: "#555" }}>Mteja:</span>
                  <span>{customerTypeLabel}</span>
                </div>
              )}

              <hr style={{ border: "none", borderTop: "1px dashed #000", margin: "4px 0" }} />

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px", fontWeight: 700, borderBottom: "1px solid #000", paddingBottom: "2px", marginBottom: "2px" }}>
                <span>Bidhaa</span>
                <span>Jumla</span>
              </div>

              {order.items.map((item, i) => (
                <div key={i} style={{ padding: "2px 0" }}>
                  <div style={{ fontSize: "9.5px", fontWeight: 600 }}>{item.productName}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px", color: "#333" }}>
                    <span>{item.quantity} x {formatTZS(item.price)}</span>
                    <span style={{ fontWeight: 600 }}>{formatTZS(item.subtotal)}</span>
                  </div>
                </div>
              ))}

              <hr style={{ border: "none", borderTop: "1px dashed #000", margin: "4px 0" }} />

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px" }}>
                <span>Subtotal:</span>
                <span>{formatTZS(order.subtotal)}</span>
              </div>
              {order.tax > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px" }}>
                  <span>Tax:</span>
                  <span>{formatTZS(order.tax)}</span>
                </div>
              )}
              {order.discount > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px" }}>
                  <span>Discount:</span>
                  <span>-{formatTZS(order.discount)}</span>
                </div>
              )}

              <hr style={{ border: "none", borderTop: "2px solid #000", margin: "4px 0" }} />

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: 900, padding: "2px 0" }}>
                <span>JUMLA</span>
                <span>{formatTZS(order.totalAmount)}</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px", marginTop: "2px" }}>
                <span style={{ color: "#555" }}>Malipo:</span>
                <span>{order.paymentMethod || "—"}</span>
              </div>

              <hr style={{ border: "none", borderTop: "1px dashed #000", margin: "5px 0 3px" }} />
              <div style={{ textAlign: "center", fontSize: "10px", fontWeight: 700 }}>Asante kwa kununua!</div>
              <div style={{ textAlign: "center", fontSize: "8px", color: "#777", marginTop: "2px" }}>Powered by Twende Duka</div>
            </div>
          )}
          </div>
        </div>
        <div className="px-6 py-4 border-t border-white/10 bg-black/20 flex justify-end gap-3 backdrop-blur-md">
          <Button variant="ghost" onClick={onClose} className="rounded-full px-8 text-white hover:text-white hover:bg-white/10">Close</Button>
          <Button onClick={handlePrint} className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg hover:shadow-orange-500/25 transition-all rounded-full px-8 font-semibold">
            <Printer className="h-4 w-4 mr-2" />
            {isA4 ? "Print Document" : t("orders.receipt")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
