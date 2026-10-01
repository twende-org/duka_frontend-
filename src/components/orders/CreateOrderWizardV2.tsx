import { useState, useMemo, useRef, useEffect } from "react";
import { Plus, Minus, Trash2, Loader2, Search, Clock, LayoutGrid, Package, Save, CheckCircle, AlertCircle, ShoppingCart, User, FileText, Banknote, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatTZS } from "@/data/mockData";
import { toast } from "sonner";
import type { Product, Stock, Customer, Order, OrderItem } from "@/types";
import { useI18n } from "@/lib/i18n";
import { ProfessionalImage } from "@/components/common/ProfessionalImage";
import { useAppSelector } from "@/store/hooks";
import { getCustomers } from "@/lib/api/domains/customers";
import { useCartEngine } from "@/hooks/useCartEngine";
import type { CustomerType } from "@/services/PricingService";
import { PageLoader } from "@/components/common/Loader";


interface Props {
  products: Product[];
  inventory: Stock[];
  onSubmit: (orderData: Partial<Order>, options?: { payNow?: boolean }) => Promise<void>;
  onCancel: () => void;
}

export function CreateOrderWizardV2({ products, inventory, onSubmit, onCancel }: Props) {
  const { t } = useI18n();
  const currentShopId = useAppSelector((s) => s.shops.currentShopId);
  const user = useAppSelector((s) => s.auth.user);
  const [submitting, setSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 5;
  
  // Idempotency Key generated once per wizard session
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  // Cart Engine
  const { cart, cartTotal, estimatedProfit, customerType, setCustomerType, addToCart, removeFromCart, updateCartQty, updateCartDiscount } = useCartEngine(products, (id) => inventory.find(i => i.productId === id)?.quantity || 0);

  // Form Data
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("walk-in");
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split("T")[0]);
  const [requiredDeliveryDate, setRequiredDeliveryDate] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState<"pickup" | "merchant" | "third_party">("pickup");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [customerPoNumber, setCustomerPoNumber] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [internalNotes, setInternalNotes] = useState("");

  const [gridSearch, setGridSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "search">("grid");

  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers;
    const query = customerSearch.toLowerCase();
    return customers.filter(c => c.name.toLowerCase().includes(query) || (c.phone || "").includes(query));
  }, [customers, customerSearch]);

  const activeProducts = useMemo(() => products.filter(p => (p.status || "active") === "active"), [products]);

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
    if (currentShopId) {
      getCustomers(currentShopId).then(setCustomers).catch(console.error);
    }
  }, [currentShopId]);

  const selectedCustomerDetails = useMemo(() => {
    if (!selectedCustomerId || selectedCustomerId === "walk-in") return null;
    return customers.find(c => c.id === selectedCustomerId) || null;
  }, [selectedCustomerId, customers]);

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

  const handleNext = () => {
    if (currentStep === 1) {
      if (selectedCustomerId === "walk-in" && !customerName.trim()) {
        toast.error("Name is required for guest customers");
        return;
      }
    }
    if (currentStep === 3) {
      if (cart.length === 0) {
        toast.error("Please add products to the order");
        return;
      }
    }
    setCurrentStep(Math.min(currentStep + 1, totalSteps));
  };

  const handleBack = () => setCurrentStep(Math.max(currentStep - 1, 1));

  const submitOrder = async (actionStatus: Order["status"], approvalStatus: Order["approvalStatus"], payNow = false) => {
    setSubmitting(true);
    try {
      const orderData: Partial<Order> = {
        items: cart.map(c => ({
          productId: c.product.id,
          productName: c.product.name,
          quantity: c.quantity,
          price: c.lineTotal / c.quantity,
          subtotal: c.lineTotal,
        })),
        subtotal: cartTotal,
        tax: 0,
        discount: 0,
        totalAmount: cartTotal,
        profitEstimate: estimatedProfit,
        status: actionStatus,
        approvalStatus,
        paymentMethod,
        customerName,
        customerPhone,
        customerId: selectedCustomerId === "walk-in" ? null : selectedCustomerId,
        customerType,
        customerPoNumber,
        requiredDeliveryDate,
        notes,
        internalNotes,
        salespersonId: user?.id,
        createdAt: new Date().toISOString(),
        idempotencyKey,
        fulfillment: deliveryMethod !== "pickup" ? {
          deliveryMethod,
          deliveryNotes: deliveryAddress,
        } : { deliveryMethod: "pickup" }
      };

      await onSubmit(orderData, { payNow });
    } catch (err: any) {
      toast.error(err?.message || "Failed to save order");
    } finally {
      setSubmitting(false);
    }
  };

  // UI Renderers
  const renderStep1 = () => (
    <div className="space-y-4 fade-in-up">
      <div className="grid gap-2">
        <label className="text-sm font-semibold">{t("wizard.selectCustomer")}</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("wizard.searchCustomer")}
            value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} className="h-12 rounded-xl pl-10" />
        </div>
        <Select value={selectedCustomerId} onValueChange={handleCustomerChange}>
          <SelectTrigger className="h-12 rounded-xl mt-2"><SelectValue placeholder={t("wizard.selectPlaceholder")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="walk-in">{t("wizard.guestWalkIn")}</SelectItem>
            {filteredCustomers.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name} ({c.phone || t("wizard.noPhone")})</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-bold text-foreground">{t("wizard.name")}</label>
          <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder={t("wizard.requiredGuest")} className="h-12 rounded-xl" />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-bold text-foreground">{t("wizard.phone")}</label>
          <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder={t("wizard.optional")} className="h-12 rounded-xl" />
        </div>
      </div>

      {selectedCustomerDetails && (
        <div className="p-4 bg-muted/50 rounded-2xl border border-border space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold">{t("wizard.pricingTier")}:</span>
            <span className="text-sm font-bold uppercase text-primary">{customerType}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold">{t("wizard.creditLimit")}:</span>
            <span className="text-sm font-bold text-amber-600">{formatTZS(selectedCustomerDetails.commercialSettings?.creditLimit || 0)}</span>
          </div>
        </div>
      )}
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6 max-w-xl mx-auto py-8">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-bold text-foreground">{t("wizard.orderDate")}</label>
          <Input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} className="h-12 rounded-xl" />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-bold text-foreground">{t("wizard.requiredDeliveryDate")}</label>
          <Input type="date" value={requiredDeliveryDate} onChange={(e) => setRequiredDeliveryDate(e.target.value)} className="h-12 rounded-xl" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-bold text-foreground">{t("wizard.poNumber")}</label>
          <Input value={customerPoNumber} onChange={(e) => setCustomerPoNumber(e.target.value)} placeholder={t("wizard.optional")} className="h-12 rounded-xl" />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-bold text-foreground">{t("wizard.reference")}</label>
          <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder={t("wizard.optional")} className="h-12 rounded-xl" />
        </div>
      </div>

      <div className="grid gap-4 mt-6">
        <label className="text-sm font-semibold">{t("wizard.paymentDelivery")}</label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">{t("wizard.paymentMethod")}</label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Cash">{t("wizard.cash")}</SelectItem>
                <SelectItem value="Credit">{t("wizard.credit")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">{t("wizard.deliveryMethod")}</label>
            <Select value={deliveryMethod} onValueChange={(v: any) => setDeliveryMethod(v)}>
              <SelectTrigger className="h-12 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pickup">{t("wizard.pickup")}</SelectItem>
                <SelectItem value="merchant">{t("wizard.delivery")}</SelectItem>
                <SelectItem value="third_party">{t("wizard.thirdPartyDelivery")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {deliveryMethod !== "pickup" && (
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-foreground">{t("wizard.deliveryAddress")}</label>
            <Input value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} placeholder={t("wizard.addressPlaceholder")} className="h-12 rounded-xl" />
          </div>
        )}
        
        <div className="space-y-2 mt-2">
          <label className="text-xs text-muted-foreground">{t("wizard.notes")}</label>
          <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder={t("wizard.notesPlaceholder")} className="h-12 rounded-xl" />
        </div>
        
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">{t("wizard.internalNotes")}</label>
          <Input value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} placeholder={t("wizard.internalNotesPlaceholder")} className="h-12 rounded-xl" />
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-4 fade-in-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <label className="text-sm font-semibold">{t("wizard.selectProduct")}</label>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("wizard.searchProduct")}
              value={gridSearch} onChange={e => setGridSearch(e.target.value)} className="h-10 rounded-xl pl-9" />
          </div>
        </div>
      </div>
      
      <div className="flex h-[400px] w-full gap-4">
        {/* Product List */}
        <div className="flex-1 border border-border/60 rounded-2xl bg-card overflow-hidden flex flex-col">
          <div className="p-3 overflow-y-auto grid grid-cols-2 md:grid-cols-3 gap-3">
            {filteredProducts.map(p => (
              <button
                key={p.id}
                onClick={() => addToCart(p)}
                className="flex flex-col text-left p-2 rounded-xl border border-border hover:border-primary/50 transition-colors relative"
              >
                <div className="absolute top-3 right-3 bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm z-10">
                  {inventory.find(i => i.productId === p.id)?.quantity || 0} in stock
                </div>
                <ProfessionalImage src={p.imageUrls?.[0] || p.imageUrl} className="w-full aspect-square object-cover rounded-lg mb-2 bg-muted" />
                <span className="font-bold text-sm line-clamp-1">{p.name}</span>
                <span className="text-primary font-bold text-xs">{formatTZS(p.sellingPrice)}</span>
              </button>
            ))}
          </div>
        </div>
        {/* Cart */}
        <div className="w-[350px] border border-border/60 rounded-2xl bg-card flex flex-col overflow-hidden shrink-0">
          <div className="p-3 border-b border-border/40 bg-muted/30 font-bold">{t("wizard.currentOrder")}</div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {cart.map((item, idx) => (
              <div key={idx} className="flex flex-col gap-2 p-2 rounded-xl border border-border">
                <div className="flex justify-between items-start">
                  <span className="font-bold text-sm">{item.product.name}</span>
                  <button onClick={() => removeFromCart(idx)}><Trash2 className="h-4 w-4 text-destructive" /></button>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Input type="number" value={item.quantity} onChange={(e) => updateCartQty(idx, e.target.value)} className="w-16 h-8 text-center" />
                  </div>
                  <span className="font-bold text-primary">{formatTZS(item.lineTotal)}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 bg-muted/20 rounded-xl space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t("wizard.subtotal")}</span>
              <span className="font-medium">{formatTZS(cartTotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t("wizard.tax")}</span>
              <span className="font-medium">0</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t("wizard.discount")}</span>
              <span className="font-medium">0</span>
            </div>
            <div className="pt-2 border-t flex justify-between">
              <span className="font-bold">{t("cart.totalAmount")}</span>
              <span className="font-black text-primary">{formatTZS(cartTotal)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => {
    const isCreditExceeded = selectedCustomerDetails?.commercialSettings?.creditLimit 
      ? cartTotal > selectedCustomerDetails.commercialSettings.creditLimit 
      : false;

    return (
      <div className="space-y-6 max-w-2xl mx-auto py-8">
        <div className="bg-muted/30 p-6 rounded-2xl border border-border space-y-4">
          <h3 className="font-bold text-lg border-b pb-2">{t("wizard.orderSummary")}</h3>
          <div className="flex justify-between text-sm"><span>{t("wizard.customer")}:</span> <strong>{customerName || t("wizard.walkIn")}</strong></div>
          <div className="flex justify-between text-sm"><span>{t("wizard.orderDate")}:</span> <strong>{orderDate}</strong></div>
          <div className="flex justify-between text-sm"><span>{t("wizard.fulfillment")}:</span> <strong className="capitalize">{deliveryMethod}</strong></div>
          <div className="flex justify-between text-sm"><span>{t("wizard.items")}:</span> <strong>{cart.reduce((s,i) => s + (parseInt(i.quantity as any)||0), 0)} {t("wizard.units")}</strong></div>
          
          <div className="border-t pt-4 space-y-2">
             <div className="flex justify-between"><span>{t("wizard.subtotal")}:</span> <strong>{formatTZS(cartTotal)}</strong></div>
             <div className="flex justify-between"><span>{t("wizard.shipping")}:</span> <strong>{formatTZS(0)}</strong></div>
             <div className="flex justify-between font-black text-xl text-primary pt-2 border-t mt-2"><span>{t("cart.totalAmount")}:</span> <span>{formatTZS(cartTotal)}</span></div>
             {user?.capabilities?.canManageBusiness && (
               <div className="flex justify-between text-xs text-muted-foreground pt-1"><span>{t("wizard.estProfit")}:</span> <span>{formatTZS(estimatedProfit)}</span></div>
             )}
          </div>
        </div>

        {isCreditExceeded && (
          <div className="p-4 bg-red-50 text-red-600 rounded-2xl border border-red-200 flex gap-3">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p className="text-sm font-semibold">{t("wizard.creditExceeded")}</p>
          </div>
        )}
      </div>
    );
  };

  const renderStep5 = () => (
    <div className="space-y-6 max-w-xl mx-auto py-8 flex flex-col items-center justify-center min-h-[400px]">
      <CheckCircle className="h-16 w-16 text-emerald-500 mb-2" />
      <h2 className="text-2xl font-black text-center">{t("wizard.checkoutTitle")}</h2>
      <p className="text-center text-muted-foreground">{t("wizard.checkoutDesc")}</p>

      <div className="w-full p-4 rounded-2xl border border-border bg-card space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm font-semibold">{t("cart.totalAmount")}</span>
          <span className="text-2xl font-black text-primary">{formatTZS(cartTotal)}</span>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("wizard.paymentMethod")}</label>
          <Select value={paymentMethod} onValueChange={setPaymentMethod}>
            <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Cash">{t("wizard.payCash")}</SelectItem>
              <SelectItem value="Mpesa">M-Pesa</SelectItem>
              <SelectItem value="TigoPesa">Mixx by Yas (Tigo Pesa)</SelectItem>
              <SelectItem value="AirtelMoney">Airtel Money</SelectItem>
              <SelectItem value="Card">{t("wizard.payCard")}</SelectItem>
              <SelectItem value="Bank">{t("wizard.payBank")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button
        size="lg"
        className="h-16 w-full font-black text-base gap-2"
        disabled={submitting}
        onClick={() => submitOrder("pending", "approved", true)}
      >
        <Banknote className="h-5 w-5" />
        {t("wizard.chargeComplete")} • {formatTZS(cartTotal)}
      </Button>
      <p className="text-xs text-muted-foreground text-center -mt-3">{t("wizard.chargeCompleteHint")}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full pt-2 border-t">
        <Button size="lg" variant="outline" className="h-14 font-bold" disabled={submitting} onClick={() => submitOrder("draft", "pending_approval")}>
          {t("wizard.saveDraft")}
        </Button>
        <Button size="lg" variant="outline" className="h-14 font-bold" disabled={submitting} onClick={() => submitOrder("pending", "approved")}>
          {t("wizard.saveUnpaid")}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full w-full relative">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 p-4 border-b bg-card z-10 shrink-0">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            {t("wizard.createTitle")}
          </h2>
          <p className="text-sm text-muted-foreground">{t("wizard.createDesc")}</p>
        </div>
        <div className="flex items-center gap-2">
          {totalSteps > 1 && (
            <span className="text-sm font-semibold text-muted-foreground mr-4">Step {currentStep} of {totalSteps}</span>
          )}
          <Button variant="ghost" onClick={onCancel}>{t("common.cancel")}</Button>
          <Button variant="outline" disabled={currentStep === 1 || submitting} onClick={handleBack}>{t("common.back")}</Button>
          {currentStep < totalSteps ? (
            <Button disabled={submitting} onClick={handleNext}>{t("common.next")}</Button>
          ) : null}
        </div>
      </div>

      <Progress value={(currentStep / totalSteps) * 100} className="h-1 rounded-none bg-muted" />

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-muted/10 relative">
        {submitting && (
          <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-50 flex items-center justify-center">
            <PageLoader />
          </div>
        )}
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}
        {currentStep === 5 && renderStep5()}
      </div>
    </div>
  );
}
