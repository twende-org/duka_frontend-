import { useState, useMemo, useRef, useEffect } from "react";
import { Plus, Minus, Trash2, Loader2, Percent, LayoutGrid, Search, Clock, ShoppingCart, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { formatTZS } from "@/data/mockData";
import { toast } from "sonner";
import type { Product, Stock, Customer } from "@/types";
import { useI18n } from "@/lib/i18n";
import { ProfessionalImage } from "@/components/common/ProfessionalImage";
import { useAppSelector } from "@/store/hooks";
import { getCustomers } from "@/lib/api/domains/customers";
import { type CustomerType, PricingService } from "@/services/PricingService";
import { PaymentService } from "@/services/PaymentService";

export interface CartItem {
  product: Product;
  quantity: number;
  discount: number;
  lineTotal: number;
}

interface Props {
  products: Product[];
  inventory: Stock[];
  onSubmit: (
    cart: CartItem[],
    paymentMethod: string,
    customerName: string,
    customerPhone: string,
    notes: string,
    asDraft: boolean,
    customerId?: string,
    buyerShopId?: string
  ) => Promise<void>;
  canSaveDraft: boolean;
  currentBranchId?: string | null;
}

const RECENT_PRODUCTS_KEY = "twendeduka_recent_products";
const MAX_RECENT = 8;

function getRecentProductIds(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_PRODUCTS_KEY) || "[]");
  } catch { return []; }
}

function addToRecent(productId: string) {
  const recent = getRecentProductIds().filter(id => id !== productId);
  recent.unshift(productId);
  localStorage.setItem(RECENT_PRODUCTS_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
}

export default function SaleCart({ products, inventory, onSubmit, canSaveDraft, currentBranchId }: Props) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState("Taslimu");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [viewMode, setViewMode] = useState<"grid" | "search">("grid");
  const [gridSearch, setGridSearch] = useState("");
  const [showRecent] = useState(true);
  const gridSearchRef = useRef<HTMLInputElement>(null);
  const { t } = useI18n();

  const currentShopId = useAppSelector((s) => s.shops.currentShopId);
  const shops = useAppSelector((s) => s.shops.shops);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerType, setCustomerType] = useState<CustomerType>("walk-in");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [buyerShopId, setBuyerShopId] = useState("");

  const otherShops = useMemo(
    () => shops.filter((s) => s.id !== currentShopId),
    [shops, currentShopId]
  );

  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers;
    const query = customerSearch.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        (c.phone || "").includes(query)
    );
  }, [customers, customerSearch]);

  const activeProducts = useMemo(() => products.filter(p => {
    if ((p.status || "active") !== "active") return false;
    if (p.branchId && p.branchId !== currentBranchId) return false;
    const hasStockRecord = inventory.some(i => i.productId === p.id);
    return hasStockRecord;
  }), [products, currentBranchId, inventory]);
  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + item.lineTotal, 0), [cart]);

  const getProductStock = (id: string) => inventory.find(i => i.productId === id)?.quantity || 0;

  const [recentIds, setRecentIds] = useState<string[]>([]);

  useEffect(() => {
    setRecentIds(getRecentProductIds());
  }, []);

  useEffect(() => {
    if (currentShopId) {
      getCustomers(currentShopId).then(setCustomers).catch(console.error);
    }
  }, [currentShopId]);

  useEffect(() => {
    const updated = cart.map(item => {
      const unitPrice = PricingService.getInstance().calculatePrice(item.product, item.quantity, customerType);
      const disc = item.discount || 0;
      return {
        ...item,
        lineTotal: Math.round(unitPrice * (1 - disc / 100) * item.quantity)
      };
    });
    setCart(updated);
  }, [customerType]);

  const selectedCustomerDetails = useMemo(() => {
    if (!selectedCustomerId) return null;
    return customers.find(c => c.id === selectedCustomerId) || null;
  }, [selectedCustomerId, customers]);

  const recentProducts = useMemo(() => {
    return recentIds
      .map(id => activeProducts.find(p => p.id === id))
      .filter(Boolean) as Product[];
  }, [recentIds, activeProducts]);

  const filteredProducts = useMemo(() => {
    if (!gridSearch.trim()) return activeProducts;
    const q = gridSearch.toLowerCase();
    return activeProducts.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.barcode?.toLowerCase() || "").includes(q) ||
      (p.sku?.toLowerCase() || "").includes(q) ||
      (p.category?.toLowerCase() || "").includes(q)
    );
  }, [activeProducts, gridSearch]);

  useEffect(() => {
    if (viewMode === "grid" && gridSearchRef.current) {
      gridSearchRef.current.focus();
    }
  }, [viewMode]);

  const quickAddToCart = (p: Product, qty: number = 1) => {
    const stock = getProductStock(p.id);
    const existingIdx = cart.findIndex(c => c.product.id === p.id);
    const currentCartQty = existingIdx >= 0 ? cart[existingIdx].quantity : 0;
    if (currentCartQty + qty > stock) {
      toast.error(`${t("sales.stockInsufficient")} ${t("sales.remaining")}: ${stock - currentCartQty}`);
      return;
    }
    addToRecent(p.id);
    setRecentIds(getRecentProductIds());

    const unitPrice = PricingService.getInstance().calculatePrice(p, qty, customerType);

    if (existingIdx >= 0) {
      const updated = [...cart];
      const newQty = updated[existingIdx].quantity + qty;
      const disc = updated[existingIdx].discount || 0;
      updated[existingIdx] = { ...updated[existingIdx], quantity: newQty, lineTotal: Math.round(unitPrice * (1 - disc / 100) * newQty) };
      setCart(updated);
    } else {
      setCart([...cart, { product: p, quantity: qty, discount: 0, lineTotal: Math.round(unitPrice * qty) }]);
    }
    toast.success(`${p.name} ✓`, { duration: 600 });
  };

  const removeFromCart = (idx: number) => setCart(cart.filter((_, i) => i !== idx));

  const updateCartQty = (idx: number, newQty: any) => {
    if (newQty === "") {
      const updated = [...cart];
      updated[idx] = { ...cart[idx], quantity: "" as any, lineTotal: 0 };
      setCart(updated);
      return;
    }
    
    const parsed = parseInt(newQty);
    if (isNaN(parsed) || parsed < 1) return;
    
    const item = cart[idx];
    const stock = getProductStock(item.product.id);
    if (parsed > stock) { toast.error(`${t("sales.stockInsufficient")} Max: ${stock}`); return; }
    
    const unitPrice = PricingService.getInstance().calculatePrice(item.product, parsed, customerType);
    const disc = parseInt(item.discount as any) || 0;
    const updated = [...cart];
    updated[idx] = { ...item, quantity: parsed, lineTotal: Math.round(unitPrice * (1 - disc / 100) * parsed) };
    setCart(updated);
  };

  const updateCartDiscount = (idx: number, disc: any) => {
    if (disc === "") {
      const updated = [...cart];
      const item = cart[idx];
      const unitPrice = PricingService.getInstance().calculatePrice(item.product, parseInt(item.quantity as any) || 0, customerType);
      updated[idx] = { ...item, discount: "" as any, lineTotal: Math.round(unitPrice * (parseInt(item.quantity as any) || 0)) };
      setCart(updated);
      return;
    }
    
    const parsed = parseInt(disc);
    if (isNaN(parsed)) return;
    
    const clamped = Math.max(0, Math.min(100, parsed));
    const item = cart[idx];
    const unitPrice = PricingService.getInstance().calculatePrice(item.product, parseInt(item.quantity as any) || 0, customerType);
    const updated = [...cart];
    updated[idx] = { ...item, discount: clamped, lineTotal: Math.round(unitPrice * (1 - clamped / 100) * (parseInt(item.quantity as any) || 0)) };
    setCart(updated);
  };

  const resetForm = () => {
    setCart([]);
    setPaymentMethod("Taslimu");
    setCustomerName("");
    setCustomerPhone("");
    setNotes("");
    setProgress(0);
    setGridSearch("");
    setCustomerType("walk-in");
    setSelectedCustomerId("");
    setCustomerSearch("");
    setBuyerShopId("");
  };

  const handleSubmit = async (asDraft: boolean) => {
    const validCart = cart.filter(c => parseInt(c.quantity as any) > 0);
    if (validCart.length === 0) {
      toast.error("Cart is empty or invalid");
      return;
    }

    if (paymentMethod === "Mkopo") {
      if (!selectedCustomerDetails) {
        toast.error("Please select a registered customer for credit sales");
        return;
      }
      const settings = selectedCustomerDetails.commercialSettings;
      if (!settings?.creditEnabled) {
        toast.error("Credit is not enabled for this customer");
        return;
      }
      if (settings.creditLimit > 0 && cartTotal > settings.creditLimit) {
        toast.error(`Credit limit exceeded. Maximum allowed: ${formatTZS(settings.creditLimit)}`);
        return;
      }
    }

    const validation = PaymentService.getInstance().processPayments(cartTotal, [
      { method: paymentMethod as any, amount: cartTotal }
    ]);
    if (!validation.success) {
      toast.error(validation.error || "Payment validation failed");
      return;
    }

    setSubmitting(true); setProgress(30);
    try {
      await onSubmit(validCart, paymentMethod, customerName, customerPhone, notes, asDraft, selectedCustomerId, buyerShopId || undefined);
      setProgress(100);
      setTimeout(() => resetForm(), 300);
    } catch (err: any) { 
      toast.error(err?.message || t("sales.failedRecord")); 
      setProgress(0);
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleSubmit(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cart, paymentMethod, customerName, customerPhone, notes, customerType, buyerShopId]);

  const handleCustomerChange = (id: string) => {
    setSelectedCustomerId(id);
    if (id === "walk-in") {
      setCustomerName("");
      setCustomerPhone("");
      setCustomerType("walk-in");
      return;
    }
    const target = customers.find(c => c.id === id);
    if (target) {
      setCustomerName(target.name);
      setCustomerPhone(target.phone || "");
      const tier = target.commercialSettings?.priceTier || target.customerType || "retail";
      setCustomerType(tier.toLowerCase() as CustomerType);
    }
  };

  const renderProductCard = (p: Product, isRecent = false) => {
    const stock = getProductStock(p.id);
    const inCart = cart.find(c => c.product.id === p.id);
    return (
      <button
        key={`${isRecent ? "r-" : ""}${p.id}`}
        type="button"
        onClick={() => quickAddToCart(p)}
        disabled={stock === 0}
        className={`group relative flex flex-col text-left rounded-2xl border-2 border-border/40 bg-card overflow-hidden transition-all hover:shadow-xl hover:shadow-primary/5 hover:border-primary/40 active:scale-95 ${stock === 0 ? "opacity-40 grayscale cursor-not-allowed" : ""}`}
      >
        <div className="relative aspect-square w-full overflow-hidden bg-muted">
          <ProfessionalImage
            src={p.imageUrls?.[0] || p.imageUrl}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
          {inCart && (
            <div className="absolute top-1 right-1 h-6 w-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold shadow-sm">
              {inCart.quantity}
            </div>
          )}
          {stock === 0 && (
            <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
              <span className="bg-destructive text-destructive-foreground px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Ni zero</span>
            </div>
          )}
          {isRecent && (
            <div className="absolute top-1 left-1">
              <Clock className="h-3.5 w-3.5 text-primary drop-shadow-md" />
            </div>
          )}
        </div>
        <div className="p-3 bg-background flex flex-col gap-1 z-10 border-t border-border/40">
          <h3 className="font-bold text-xs sm:text-sm line-clamp-1 group-hover:text-primary transition-colors">{p.name}</h3>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <span className="text-primary font-black text-xs sm:text-sm tracking-tight">{formatTZS(p.sellingPrice)}</span>
            <span className={`text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-full ${stock < 5 ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}`}>
              {stock} stoo
            </span>
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="flex flex-col lg:flex-row h-full w-full relative">
      {submitting && <Progress value={progress} className="h-1.5 absolute top-0 left-0 right-0 z-50 rounded-none" />}
      
      {/* LEFT: PRODUCTS SECTION */}
      <div className="flex-1 flex flex-col min-h-0 bg-background">
        {/* Header / Search */}
        <div className="p-4 sm:p-5 pb-3 shrink-0 z-10 bg-background/95 backdrop-blur-md sticky top-0 border-b border-border/40">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                ref={gridSearchRef}
                placeholder={t("sales.searchPlaceholder")}
                value={gridSearch}
                onChange={(e) => setGridSearch(e.target.value)}
                className="pl-10 h-12 rounded-xl bg-muted/50 border-border/50 text-base font-medium shadow-inner focus-visible:ring-primary/30"
              />
            </div>
            <div className="flex items-center bg-muted/50 border border-border/50 rounded-xl p-1 h-12 shadow-inner shrink-0">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded-lg transition-all ${viewMode === "grid" ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                <LayoutGrid className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("search")}
                className={`p-2 rounded-lg transition-all ${viewMode === "search" ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Search className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Product Grid (Scrollable) */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-5">
          {viewMode === "search" ? (
            <div className="flex flex-wrap items-end gap-2 p-4 border-2 border-dashed border-border/50 rounded-2xl bg-muted/10">
              <div className="flex-1 min-w-[200px]">
                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-2 block">{t("sales.product")}</label>
                <Select onValueChange={(id) => {
                  const p = products.find(x => x.id === id);
                  if (p) quickAddToCart(p);
                }}>
                  <SelectTrigger className="h-14 rounded-xl font-bold bg-card"><SelectValue placeholder={t("sales.selectProduct")} /></SelectTrigger>
                  <SelectContent>
                    {filteredProducts.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        <div className="flex items-center gap-3 py-1">
                          <ProfessionalImage src={p.imageUrls?.[0] || p.imageUrl} className="h-8 w-8 rounded-lg border shadow-sm object-cover" />
                          <div className="flex flex-col">
                            <span className="font-bold">{p.name}</span>
                            <span className="text-[10px] text-muted-foreground font-semibold uppercase">{t("products.stock")}: {getProductStock(p.id)}</span>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <div className="space-y-4 pb-20 lg:pb-4">
              {recentProducts.length > 0 && showRecent && !gridSearch && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="h-4 w-4 text-primary" />
                    <span className="text-xs font-black text-foreground uppercase tracking-widest">
                      {t("sales.recentProducts")}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {recentProducts.slice(0, 4).map(p => renderProductCard(p, true))}
                  </div>
                </div>
              )}

              <div>
                 {!gridSearch && <div className="flex items-center gap-2 mb-3">
                    <LayoutGrid className="h-4 w-4 text-primary" />
                    <span className="text-xs font-black text-foreground uppercase tracking-widest">
                      All Products
                    </span>
                  </div>}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {filteredProducts.length === 0 ? (
                    <div className="col-span-full text-center py-12 bg-muted/10 border-2 border-dashed border-border/50 rounded-2xl">
                      <p className="text-muted-foreground font-bold">{t("products.noProducts")}</p>
                    </div>
                  ) : (
                    filteredProducts.map(p => renderProductCard(p))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: CART & CHECKOUT SECTION */}
      <div className="w-full lg:w-[450px] xl:w-[500px] shrink-0 flex flex-col bg-muted/10 border-t lg:border-t-0 lg:border-l border-border/40 relative max-h-[50vh] lg:max-h-none h-full">
        {/* Scrollable Cart Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-5 space-y-6">
          
          {/* Cart Items List */}
          {cart.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground flex flex-col items-center justify-center h-full">
              <div className="h-20 w-20 bg-muted/30 rounded-full flex items-center justify-center mb-4">
                <ShoppingCart className="h-10 w-10 text-muted-foreground/30" />
              </div>
              <p className="font-black text-lg text-foreground mb-1">Cart is empty</p>
              <p className="text-sm font-medium">Add products to start a sale.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map((item, idx) => {
                const disc = (item.discount as any) === "" ? "" : (item.discount || 0);
                return (
                  <div key={idx} className="rounded-2xl border border-border/60 bg-background p-3.5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                    <div className="flex items-start gap-3">
                      <ProfessionalImage src={item.product.imageUrls?.[0] || item.product.imageUrl} className="h-14 w-14 rounded-xl border border-border/50 shrink-0 bg-muted/30 object-cover" />
                      <div className="flex-1 min-w-0 pt-0.5">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-bold text-sm sm:text-base text-foreground line-clamp-1 leading-tight">{item.product.name}</h4>
                          <button type="button" onClick={() => removeFromCart(idx)} className="rounded-full p-1.5 -mr-1.5 -mt-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0 transition-colors">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <p className="text-xs font-bold text-primary/70">{formatTZS(PricingService.getInstance().calculatePrice(item.product, item.quantity, customerType))} / {item.product.unit || "pcs"}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-end justify-between mt-3 pt-3 border-t border-border/40">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Quantity</label>
                        <div className="flex items-center gap-1 bg-muted/50 rounded-xl p-1 border border-border/40 w-fit">
                          <button type="button" onClick={() => updateCartQty(idx, (parseInt(item.quantity as any) || 0) - 1)} className="rounded-lg h-7 w-7 flex items-center justify-center bg-background border border-border/50 shadow-sm active:scale-95 transition-transform"><Minus className="h-3 w-3 text-foreground" /></button>
                          <Input
                            type="number"
                            min={1}
                            max={getProductStock(item.product.id)}
                            value={item.quantity}
                            onChange={(e) => updateCartQty(idx, e.target.value)}
                            className="w-10 h-7 text-center text-sm font-black border-0 bg-transparent focus-visible:ring-0 px-0"
                          />
                          <button type="button" onClick={() => updateCartQty(idx, (parseInt(item.quantity as any) || 0) + 1)} className="rounded-lg h-7 w-7 flex items-center justify-center bg-background border border-border/50 shadow-sm active:scale-95 transition-transform"><Plus className="h-3 w-3 text-foreground" /></button>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end gap-1.5">
                        <div className="flex items-center gap-1 bg-muted/30 rounded-lg px-2 py-0.5 border border-border/40 hover:border-primary/30 transition-colors">
                          <Percent className="h-3 w-3 text-muted-foreground" />
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={disc === 0 ? "" : disc}
                            onChange={(e) => updateCartDiscount(idx, e.target.value)}
                            className="w-8 h-5 text-[10px] font-bold text-center border-0 bg-transparent focus-visible:ring-0 px-0 text-foreground"
                            placeholder="0"
                          />
                        </div>
                        <span className="font-black text-base sm:text-lg text-primary tracking-tight leading-none mt-1">
                          {formatTZS(item.lineTotal)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div className="flex items-center justify-between rounded-2xl bg-primary/5 border border-primary/20 p-4 shadow-inner mt-4">
                <span className="text-xs sm:text-sm font-black uppercase tracking-widest text-primary/70">{t("sales.grandTotal")}</span>
                <span className="text-xl sm:text-2xl font-black tracking-tight text-primary">{formatTZS(cartTotal)}</span>
              </div>
            </div>
          )}

          {/* Checkout Info Form */}
          <div className={`bg-background border border-border/60 rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm transition-opacity duration-300 ${cart.length === 0 ? "opacity-50 pointer-events-none" : "opacity-100"}`}>
            
            {/* Customer Identification Layer */}
            <div className="grid grid-cols-1 gap-4 border-b border-border/40 pb-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Select Customer
                  </label>
                  {customerType !== "walk-in" && (
                    <Badge variant="outline" className="text-[9px] uppercase tracking-widest bg-primary/10 text-primary border-primary/20">
                      Tier: {customerType}
                    </Badge>
                  )}
                </div>
                
                {/* Real-time search field */}
                <Input
                  type="text"
                  placeholder="Search name/phone..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="h-10 rounded-xl bg-card border-border/60 shadow-xs text-xs font-semibold"
                />

                <Select value={selectedCustomerId || "walk-in"} onValueChange={handleCustomerChange}>
                  <SelectTrigger className="h-12 rounded-xl bg-card border-border/60 shadow-sm font-bold text-sm">
                    <SelectValue placeholder="Chagua Mteja (Select customer)..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="walk-in">Walk-in Customer (Default)</SelectItem>
                    {filteredCustomers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} ({c.phone || "No phone"})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Deliver to another business: stages a pending manifest on the buyer's shop */}
            {otherShops.length > 0 && (
              <div className="space-y-1.5 border-b border-border/40 pb-4">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  {t("sales.deliverToBusiness")}
                </label>
                <Select value={buyerShopId || "none"} onValueChange={(v) => setBuyerShopId(v === "none" ? "" : v)}>
                  <SelectTrigger className="h-12 rounded-xl bg-card border-border/60 shadow-sm font-bold text-sm">
                    <SelectValue placeholder={t("sales.deliverToBusinessPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("sales.deliverToBusinessNone")}</SelectItem>
                    {otherShops.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] font-medium text-muted-foreground">{t("sales.deliverToBusinessHint")}</p>
              </div>
            )}

            {/* Selected Customer Loyalty / Credit Details */}
            {selectedCustomerDetails && (
              <div className="p-3.5 rounded-xl border border-primary/20 bg-primary/5 space-y-2 text-xs text-foreground">
                <p className="font-bold flex items-center gap-1 text-primary"><UserCheck className="h-4 w-4" /> Customer Profile Loaded</p>
                <div className="grid grid-cols-3 gap-2 text-[10px] font-semibold text-muted-foreground">
                  <div>
                    <span className="block text-[9px] uppercase tracking-wider">Purchases</span>
                    <strong className="text-foreground text-xs">{selectedCustomerDetails.totalPurchases || 0}x</strong>
                  </div>
                  <div>
                    <span className="block text-[9px] uppercase tracking-wider">Spent</span>
                    <strong className="text-foreground text-xs">{formatTZS(selectedCustomerDetails.totalSpent || 0)}</strong>
                  </div>
                  <div>
                    <span className="block text-[9px] uppercase tracking-wider">Credit</span>
                    <strong className="text-destructive text-xs">{formatTZS(0)} TZS</strong>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                 {t("sales.paymentMethod")} <span className="text-destructive text-lg leading-none">*</span>
              </label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="h-12 rounded-xl bg-card border-border/60 shadow-sm font-bold text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Taslimu">Taslimu</SelectItem>
                  <SelectItem value="M-Pesa">M-Pesa</SelectItem>
                  <SelectItem value="Tigo Pesa">Tigo Pesa</SelectItem>
                  <SelectItem value="Airtel Money">Airtel Money</SelectItem>
                  <SelectItem value="Benki">Benki</SelectItem>
                  <SelectItem value="Mkopo">Mkopo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t("sales.customerName")}</label>
                <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder={t("sales.optional")} className="h-12 rounded-xl bg-card border-border/60 shadow-sm font-medium text-sm" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t("sales.customerPhone")}</label>
                <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder={t("sales.optional")} className="h-12 rounded-xl bg-card border-border/60 shadow-sm font-medium text-sm" />
              </div>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t("sales.notes")}</label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t("sales.optional")} className="h-12 rounded-xl bg-card border-border/60 shadow-sm font-medium text-sm" />
            </div>
          </div>
        </div>

        {/* Sticky Action Footer for Right Side */}
        <div className="shrink-0 p-4 lg:p-5 bg-background border-t border-border/60 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] sticky bottom-0 z-40">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              type="button"
              onClick={() => handleSubmit(false)} 
              className="w-full sm:flex-1 h-14 sm:h-16 rounded-2xl text-sm sm:text-base font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] transition-transform" 
              size="lg" 
              disabled={cart.length === 0 || submitting}
            >
              {submitting ? (
                <><Loader2 className="h-6 w-6 mr-3 animate-spin" />{t("common.loading")}</>
              ) : (
                <div className="flex items-center justify-between w-full px-2">
                  <span className="flex items-center gap-2"><ShoppingCart className="h-5 w-5" /> {t("sales.recordSale")}</span>
                  <span className="bg-white/20 px-3 py-1 rounded-lg font-black tracking-tight">{formatTZS(cartTotal)}</span>
                </div>
              )}
            </Button>
            {canSaveDraft && (
              <Button 
                type="button"
                onClick={() => handleSubmit(true)} 
                variant="outline" 
                size="lg" 
                className="w-full sm:w-auto h-12 sm:h-16 rounded-2xl text-xs font-black uppercase tracking-widest border-2 hover:bg-muted shrink-0" 
                disabled={cart.length === 0 || submitting}
              >
                {t("sales.saveDraft")}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
