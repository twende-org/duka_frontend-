import React, { useState } from "react";
import { X, ShoppingCart, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { hasApiSession } from "@/lib/api";
import { fetchMeOnApi } from "@/lib/api/domains/auth";
import { getShopBySlugOrId, placeWishlistOrder } from "@/lib/api/domains/storefront";
import { useAppSelector } from "@/store/hooks";
import type { WishlistItem } from "@/lib/services/wishlistService";
import { removeWishlistItems } from "@/lib/services/wishlistService";
import { useI18n } from "@/lib/i18n";
import { FileText } from "lucide-react";

// Helper for Proforma Invoice Printing
const generateProformaHTML = (
  orderId: string, 
  shopName: string, 
  items: any[], 
  total: number, 
  customerDetails: any,
  bizProfile?: any
) => {
  const d = new Date().toLocaleDateString();
  return `
    <html>
      <head>
        <title>Proforma Invoice - ${orderId}</title>
        <style>
          body { font-family: 'Inter', sans-serif; padding: 40px; color: #111; max-width: 800px; margin: 0 auto; }
          .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
          .header h1 { margin: 0; font-size: 28px; text-transform: uppercase; }
          .meta { display: flex; justify-content: space-between; margin-bottom: 40px; }
          .meta-box { border: 1px solid #ddd; padding: 15px; border-radius: 8px; width: 45%; }
          .meta-box h3 { margin-top: 0; color: #555; font-size: 14px; text-transform: uppercase; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          th, td { padding: 12px; border-bottom: 1px solid #ddd; text-align: left; }
          th { background: #f9f9f9; font-weight: bold; }
          .right { text-align: right; }
          .total-row { font-weight: bold; font-size: 18px; }
          .footer { text-align: center; font-size: 12px; color: #777; margin-top: 50px; border-top: 1px solid #eee; padding-top: 20px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>PROFORMA INVOICE</h1>
          <p>Invoice #: ${orderId} | Date: ${d}</p>
        </div>
        
        <div class="meta">
          <div class="meta-box">
            <h3>From (Seller)</h3>
            <strong>${shopName}</strong><br/>
            (Via Twende Duka Platform)
          </div>
          <div class="meta-box">
            <h3>To (Buyer)</h3>
            <strong>${bizProfile?.companyName || customerDetails.name}</strong><br/>
            ${customerDetails.phone ? `Phone: ${customerDetails.phone}<br/>` : ''}
            ${bizProfile?.tin ? `TIN: ${bizProfile.tin}<br/>` : ''}
            ${bizProfile?.vrn ? `VRN: ${bizProfile.vrn}<br/>` : ''}
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Item Description</th>
              <th class="right">Qty</th>
              <th class="right">Unit Price (TZS)</th>
              <th class="right">Subtotal (TZS)</th>
            </tr>
          </thead>
          <tbody>
            ${items.map(i => `
              <tr>
                <td>${i.productName} ${i.appliedWholesale ? '<small>(Wholesale)</small>' : ''}</td>
                <td class="right">${i.quantity}</td>
                <td class="right">${i.price.toLocaleString()}</td>
                <td class="right">${i.subtotal.toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr class="total-row">
              <td colspan="3" class="right">TOTAL DUE:</td>
              <td class="right">TZS ${total.toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>
        
        <div class="footer">
          This is a Proforma Invoice and is not a demand for payment.<br/>
          Valid for 30 days from date of issue.
        </div>
        <script>window.onload = function() { window.print(); }</script>
      </body>
    </html>
  `;
};

interface WishlistCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  shopId: string;
  shopName: string;
  items: WishlistItem[];
  onSuccess: (purchasedProductIds: string[]) => void;
}

export function WishlistCheckoutModal({ isOpen, onClose, shopId, shopName, items, onSuccess }: WishlistCheckoutModalProps) {
  const { lang } = useI18n();
  const sw = lang === "sw";
  const user = useAppSelector((s) => s.auth.user);
  
  const [quantities, setQuantities] = useState<Record<string, number>>(
    items.reduce((acc, item) => ({ ...acc, [item.productId]: 1 }), {})
  );
  
  const [customerDetails, setCustomerDetails] = useState({
    name: user?.displayName || "",
    phone: user?.phone || "",
    address: "",
    notes: ""
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleQuantityChange = (productId: string, delta: number) => {
    setQuantities(prev => {
      const current = prev[productId] || 1;
      const next = current + delta;
      if (next < 1) return prev;
      return { ...prev, [productId]: next };
    });
  };

  const getItemPrice = (item: WishlistItem, qty: number) => {
    if (item.moq && item.wholesalePrice && qty >= item.moq) {
      return item.wholesalePrice;
    }
    return item.price;
  };

  const totalAmount = items.reduce((sum, item) => {
    const qty = quantities[item.productId] || 1;
    return sum + (getItemPrice(item, qty) * qty);
  }, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!customerDetails.name.trim() || !customerDetails.phone.trim()) {
      toast.error(sw ? "Tafadhali jaza Jina na Namba ya Simu" : "Please fill in your Name and Phone Number");
      return;
    }

    setIsSubmitting(true);
    
    try {
      // 1. Fetch shop details to get WhatsApp number
      const shop = await getShopBySlugOrId(shopId);
      if (!shop) {
        toast.error("Shop not found.");
        setIsSubmitting(false);
        return;
      }
      
      const phoneNum = shop.whatsappNumber || shop.phone;
      
      if (!phoneNum) {
        toast.error("This shop does not have a contact number configured.");
        setIsSubmitting(false);
        return;
      }

      // 2. Generate Order ID & place the order; the server re-prices every line
      //    from the product rows, so the WhatsApp figures come off the response.
      const orderIdStr = `ORD-${Math.floor(100000 + Math.random() * 900000)}`;

      const order = await placeWishlistOrder(shopId, {
        orderId: orderIdStr,
        customerName: customerDetails.name,
        customerPhone: customerDetails.phone,
        customerAddress: customerDetails.address || "",
        notes: customerDetails.notes || "",
        paymentMethod: "Cash / WhatsApp",
        customerType: "retail",
        items: items.map(item => ({
          productId: item.productId,
          productName: item.name,
          quantity: quantities[item.productId] || 1,
          price: getItemPrice(item, quantities[item.productId] || 1),
        })),
      });

      // 3. Format WhatsApp Message
      const phone = phoneNum.replace(/[^0-9]/g, "");
      const formattedPhone = phone.startsWith("0") ? "255" + phone.slice(1) : phone;
      
      let message = `Hello ${shopName},\n\nI have placed an order from my Wishlist.\n*Order ID: ${order.orderId}*\n\n*Order Items:*\n`;
      order.items.forEach((item, index) => {
        message += `${index + 1}. ${item.productName} - Qty ${item.quantity} (TZS ${item.subtotal.toLocaleString()})\n`;
      });

      message += `\n*Total: TZS ${order.totalAmount.toLocaleString()}*\n`;

      message += `\n*Customer Details:*\n`;
      message += `Name: ${customerDetails.name || "N/A"}\n`;
      message += `Address: ${customerDetails.address || "N/A"}\n`;
      if (customerDetails.phone) message += `Phone: ${customerDetails.phone}\n`;
      if (customerDetails.notes) message += `Notes: ${customerDetails.notes}\n`;
      
      message += `\nPlease confirm availability and payment details.`;

      // 4. Cleanup and Redirect
      const productIds = items.map(i => i.productId);
      await removeWishlistItems(productIds);
      
      toast.success(sw ? "Oda imetumwa kikamilifu!" : "Order placed successfully!");
      onSuccess(productIds);
      onClose();
      
      window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`, "_blank");
      
    } catch (err) {
      console.error("Wishlist checkout error:", err);
      toast.error(sw ? "Imeshindwa kutuma oda." : "Failed to place order.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrintProforma = async () => {
    if (!customerDetails.name.trim()) {
      toast.error(sw ? "Tafadhali jaza Jina Kamili" : "Please fill in your Full Name first");
      return;
    }

    // Try to get user's business profile if they are logged in
    let bizProfile = null;
    if (hasApiSession()) {
      try {
        bizProfile = (await fetchMeOnApi()).businessProfile ?? null;
      } catch (e) {
        console.error("Error fetching biz profile:", e);
      }
    }

    const orderIdStr = `PRF-${Math.floor(100000 + Math.random() * 900000)}`;
    const orderItems = items.map(item => {
      const qty = quantities[item.productId] || 1;
      const currentPrice = getItemPrice(item, qty);
      const appliedWholesale = item.wholesalePrice ? currentPrice === item.wholesalePrice : false;
      return { productName: item.name, quantity: qty, price: currentPrice, subtotal: currentPrice * qty, appliedWholesale };
    });

    const html = generateProformaHTML(orderIdStr, shopName, orderItems, totalAmount, customerDetails, bizProfile);
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            onClick={onClose}
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }} 
            animate={{ opacity: 1, scale: 1, y: 0 }} 
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-card w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-border/50 max-h-[90vh] flex flex-col"
          >
            <div className="p-6 pb-4 border-b border-border/50 flex items-center justify-between sticky top-0 bg-card z-10">
              <div>
                <h2 className="text-xl font-bold">{sw ? "Kamilisha Oda" : "Checkout Order"}</h2>
                <p className="text-sm text-muted-foreground">{sw ? "Kutoka kwa:" : "From:"} <span className="font-semibold text-primary">{shopName}</span></p>
              </div>
              <button type="button" onClick={onClose} className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
              <div className="space-y-6">
                
                {/* Order Items Summary */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">{sw ? "Bidhaa Zako" : "Your Items"}</h3>
                  <div className="space-y-3 bg-muted/30 rounded-2xl p-4 border border-border/50">
                    {items.map(item => {
                      const qty = quantities[item.productId] || 1;
                      const currentPrice = getItemPrice(item, qty);
                      const isWholesale = item.wholesalePrice && currentPrice === item.wholesalePrice;
                      
                      return (
                      <div key={item.productId} className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">{item.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-xs text-primary font-bold">TZS {currentPrice.toLocaleString()}</p>
                            {isWholesale && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 whitespace-nowrap">
                                {sw ? "Bei ya Jumla" : "Wholesale Applied"}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 bg-background rounded-full border border-border/50 p-1">
                          <button 
                            type="button"
                            onClick={() => handleQuantityChange(item.productId, -1)}
                            className="h-7 w-7 flex items-center justify-center rounded-full bg-muted hover:bg-muted-foreground/20 text-foreground transition-colors"
                          >-</button>
                          <span className="text-sm font-bold min-w-[20px] text-center">{quantities[item.productId] || 1}</span>
                          <button 
                            type="button"
                            onClick={() => handleQuantityChange(item.productId, 1)}
                            className="h-7 w-7 flex items-center justify-center rounded-full bg-muted hover:bg-muted-foreground/20 text-foreground transition-colors"
                          >+</button>
                        </div>
                      </div>
                    )})}
                  </div>
                </div>

                {/* Customer Details Form */}
                <form id="wishlist-checkout-form" onSubmit={handleSubmit} className="space-y-4">
                  <h3 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground mt-4">{sw ? "Taarifa Zako" : "Your Details"}</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>{sw ? "Jina Kamili" : "Full Name"} *</Label>
                      <Input 
                        required 
                        value={customerDetails.name} 
                        onChange={e => setCustomerDetails(p => ({ ...p, name: e.target.value }))} 
                        placeholder={sw ? "Weka jina" : "Enter name"} 
                        className="rounded-xl"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>{sw ? "Namba ya Simu" : "Phone Number"} *</Label>
                      <Input 
                        required 
                        value={customerDetails.phone} 
                        onChange={e => setCustomerDetails(p => ({ ...p, phone: e.target.value }))} 
                        placeholder="07xx xxx xxx" 
                        className="rounded-xl"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-1.5">
                    <Label>{sw ? "Mahali pa Kupeleka" : "Delivery Address"}</Label>
                    <Input 
                      value={customerDetails.address} 
                      onChange={e => setCustomerDetails(p => ({ ...p, address: e.target.value }))} 
                      placeholder={sw ? "Mf. Sinza, Dar es Salaam" : "E.g. Masaki, Dar es Salaam"} 
                      className="rounded-xl"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>{sw ? "Maelezo ya Ziada (Hiari)" : "Additional Notes (Optional)"}</Label>
                    <Textarea 
                      value={customerDetails.notes} 
                      onChange={e => setCustomerDetails(p => ({ ...p, notes: e.target.value }))} 
                      placeholder={sw ? "Maelekezo ya kufikisha mzigo..." : "Any special instructions..."} 
                      className="rounded-xl resize-none h-20"
                    />
                  </div>
                </form>
              </div>
            </div>

            <div className="p-6 border-t border-border/50 bg-muted/10 sticky bottom-0 z-10">
              <div className="flex items-center justify-between mb-4">
                <span className="font-semibold text-muted-foreground">Total Amount</span>
                <span className="text-xl font-black text-primary">TZS {totalAmount.toLocaleString()}</span>
              </div>
              <div className="flex flex-col gap-3">
                <Button 
                  type="submit"
                  form="wishlist-checkout-form"
                  disabled={isSubmitting}
                  className="w-full h-14 rounded-2xl text-lg font-bold shadow-lg shadow-primary/20 bg-primary text-white hover:bg-primary/90 transition-all"
                >
                  {isSubmitting ? (
                    <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Processing...</>
                  ) : (
                    <><ShoppingCart className="w-5 h-5 mr-2" /> Send Order via WhatsApp</>
                  )}
                </Button>

                <Button 
                  type="button"
                  variant="outline"
                  onClick={handlePrintProforma}
                  disabled={isSubmitting}
                  className="w-full h-12 rounded-2xl font-bold border-2"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  {sw ? "Tengeneza Proforma Invoice" : "Generate Proforma Invoice"}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
