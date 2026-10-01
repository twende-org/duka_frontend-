import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, ShoppingCart, Search, Wallet, Smartphone, Banknote, CreditCard, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useProducts } from "@/hooks/useProducts";
import { useSalesByDate, useCreateSale, useCreateDraftSale, useConfirmDraftSale, useDeleteDraftSale } from "@/hooks/useSales";
import { getCustomers, addCustomer } from "@/lib/api/domains/customers";
import { fetchActiveShift, openNewShift, closeActiveShift } from "@/store/shiftsSlice";
import { ErrorAlert } from "@/components/ErrorAlert";
import { useInventory } from "@/hooks/useInventory";
import { formatTZS } from "@/data/mockData";
import { toast } from "sonner";
import { useUserRole } from "@/hooks/useUserRole";
import { useActivityLogger } from "@/hooks/useActivityLogger";
import PageHeader from "@/components/common/PageHeader";
import SaleCart, { type CartItem } from "@/components/sales/SaleCart";
import Fuse from "fuse.js";
import DraftSalesList from "@/components/sales/DraftSalesList";
import SaleReceipt from "@/components/sales/SaleReceipt";
import { useI18n } from "@/lib/i18n";
import type { Sale } from "@/types";
import { PageLoader } from "@/components/common/Loader";

export default function Sales() {
  const dispatch = useAppDispatch();
  const currentShopId = useAppSelector((s) => s.shops.currentShopId);
  const currentBranchId = useAppSelector((s) => s.branches.currentBranchId);
  const shops = useAppSelector((s) => s.shops.shops);
  const { permissions } = useUserRole();
  const { log: logActivity } = useActivityLogger();
  const user = useAppSelector((s) => s.auth.user);
  
  const todayStr = new Date().toISOString().split("T")[0];
  const { data: sales = [], isLoading: salesLoading, error: salesError } = useSalesByDate(currentShopId, todayStr, currentBranchId);
  const createSaleMut = useCreateSale(currentShopId);
  const createDraftMut = useCreateDraftSale(currentShopId);
  const confirmDraftMut = useConfirmDraftSale(currentShopId);
  const deleteDraftMut = useDeleteDraftSale(currentShopId);

  const completedSales = useMemo(() => sales.filter(s => s.status !== "draft"), [sales]);
  const draftSales = useMemo(() => sales.filter(s => s.status === "draft"), [sales]);
  
  const [lastCompletedSale, setLastCompletedSale] = useState<Sale | null>(null);
  
  const { data: products = [] } = useProducts(currentShopId);
  const { data: inventory = [] } = useInventory(currentShopId, currentBranchId);
  const { activeShift, loading: shiftLoading } = useAppSelector((s) => s.shifts);
  const { t } = useI18n();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [openShiftDialog, setOpenShiftDialog] = useState(false);
  const [closeShiftDialog, setCloseShiftDialog] = useState(false);
  const [openingCash, setOpeningCash] = useState("");
  const [actualClosingCash, setActualClosingCash] = useState("");
  const [cashLeftForNextDay, setCashLeftForNextDay] = useState("");
  const [cashSubmittedToOwner, setCashSubmittedToOwner] = useState("");
  const [search, setSearch] = useState("");
  const [filterPayment, setFilterPayment] = useState("all");
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("completed");

  const currentShop = shops.find(s => s.id === currentShopId);

  useEffect(() => {
    if (currentShopId) {
      dispatch(fetchActiveShift(currentShopId));
    }
  }, [currentShopId, dispatch]);

  useEffect(() => {
    if (lastCompletedSale) setReceiptOpen(true);
  }, [lastCompletedSale]);

  const handleCartSubmit = async (
    cart: CartItem[], paymentMethod: string,
    customerName: string, customerPhone: string, notes: string,
    asDraft: boolean, customerId?: string, buyerShopId?: string
  ) => {
    if (!currentShopId) return;

    try {
      const totalPrice = cart.reduce((sum, item) => sum + item.lineTotal, 0);
      const totalProfit = cart.reduce((sum, item) => {
        const bp = item.product.buyingPrice || 0;
        // Profit = lineTotal - (buyingPrice * quantity)
        return sum + (item.lineTotal - (bp * item.quantity));
      }, 0);

      // --- Deduplicate or Auto-Create Customer Profile ---
      let finalCustomerId = customerId;
      if (!finalCustomerId && customerName.trim()) {
        const customersList = await getCustomers(currentShopId);
        const match = customersList.find((c) => {
          const ph = customerPhone.trim();
          const nm = customerName.trim().toLowerCase();
          return (ph && c.phone === ph) || (!ph && c.name.toLowerCase() === nm);
        });

        if (match) {
          finalCustomerId = match.id;
        } else {
          finalCustomerId = await addCustomer({
            name: customerName.trim(),
            phone: customerPhone.trim() || "",
            email: "",
            address: "",
            notes: "Created automatically via POS checkout",
            shopId: currentShopId,
          });
        }
      }

      const saleData: Omit<Sale, "id"> = {
        productId: cart[0].product.id,
        productName: cart.length > 1 ? `${cart[0].product.name} +${cart.length - 1}` : cart[0].product.name,
        quantity: cart.reduce((sum, item) => sum + item.quantity, 0),
        totalPrice,
        paymentMethod,
        date: new Date().toISOString().split("T")[0],
        shopId: currentShopId,
        branchId: currentBranchId || "",
        shopName: currentShop?.name || "",
        items: cart.map(item => ({
          productId: item.product.id,
          productName: item.product.name,
          quantity: item.quantity,
          price: item.product.sellingPrice,
          subtotal: item.lineTotal
        }))
      };

      if (finalCustomerId) saleData.customerId = finalCustomerId;
      if (buyerShopId) saleData.buyerShopId = buyerShopId;
      if (customerName) saleData.customerName = customerName;
      if (customerPhone) saleData.customerPhone = customerPhone;
      if (notes) saleData.notes = notes;
      if (user?.id) saleData.createdBy = user.id;
      if (user?.displayName) saleData.createdByName = user.displayName;

      if (asDraft) {
        await createDraftMut.mutateAsync(saleData);
      } else {
        if (activeShift) {
          saleData.shiftId = activeShift.id;
        }
        const createdSale = await createSaleMut.mutateAsync({ ...saleData, profit: totalProfit });
        setLastCompletedSale(createdSale);
      }

      logActivity({
        action: asDraft ? "draft_created" : "sale_recorded",
        category: "sale",
        details: `${cart.length} items — ${formatTZS(totalPrice)}`,
        metadata: { itemCount: cart.length, totalPrice, paymentMethod, isDraft: asDraft },
      });

      toast.success(asDraft ? t("sales.draftsSaved") : `${t("sales.title")} ${t("sales.recorded")}`);
      setDialogOpen(false);
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || t("sales.failedRecord"));
    }
  };

  const handleConfirmDraft = async (sale: Sale) => {
    try {
      const confirmed = await confirmDraftMut.mutateAsync(sale);
      setLastCompletedSale(confirmed);
      toast.success(`${sale.productName} ${t("sales.confirmed")}`);
      logActivity({ action: "draft_confirmed", category: "sale", details: `Draft: ${sale.productName} x${sale.quantity} — ${formatTZS(sale.totalPrice)}`, metadata: { saleId: sale.id, productName: sale.productName } });
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || t("sales.failedConfirm"));
    }
  };

  const handleDeleteDraft = async (sale: Sale) => {
    try {
      await deleteDraftMut.mutateAsync({ date: sale.date, saleId: sale.id });
      toast.success(t("sales.draftDeleted"));
      logActivity({ action: "draft_deleted", category: "sale", details: `Draft: ${sale.productName}`, metadata: { saleId: sale.id } });
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || t("sales.failedDelete"));
    }
  };

  const closeReceipt = () => { setReceiptOpen(false); setLastCompletedSale(null); };

  const handleOpenShift = async () => {
    if (!currentShopId || !user) return;
    try {
      await dispatch(openNewShift({
        shopId: currentShopId,
        status: "OPEN",
        openedBy: user.id,
        openedByName: user.displayName || "Attendant",
        openedAt: new Date().toISOString(),
        openingCash: parseFloat(openingCash) || 0,
      })).unwrap();
      toast.success("Register Opened");
      setOpenShiftDialog(false);
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || "Failed to open shift");
    }
  };

  const handleCloseShift = async () => {
    if (!currentShopId || !user || !activeShift) return;
    try {
      await dispatch(closeActiveShift({
        shopId: currentShopId,
        shiftId: activeShift.id,
        closingData: {
          closedBy: user.id,
          closedByName: user.displayName || "Attendant",
          actualClosingCash: parseFloat(actualClosingCash) || 0,
          cashLeftForNextDay: parseFloat(cashLeftForNextDay) || 0,
          cashSubmittedToOwner: parseFloat(cashSubmittedToOwner) || 0,
        }
      })).unwrap();
      toast.success("Register Closed Successfully");
      setCloseShiftDialog(false);
      setActualClosingCash("");
      setCashLeftForNextDay("");
      setCashSubmittedToOwner("");
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || "Failed to close shift");
    }
  };

  const filtered = useMemo(() => {
    let result = completedSales;

    if (search.trim()) {
      const fuse = new Fuse(result, {
        keys: [
          { name: 'productName', weight: 1.0 },
          { name: 'customerName', weight: 0.8 },
          { name: 'customerPhone', weight: 0.5 },
          { name: 'notes', weight: 0.3 }
        ],
        threshold: 0.3,
        ignoreLocation: true,
        useExtendedSearch: true
      });
      result = fuse.search(search).map(res => res.item);
    }

    return result.filter(s => filterPayment === "all" || s.paymentMethod === filterPayment);
  }, [completedSales, search, filterPayment]);

  const totalRevenue = filtered.reduce((sum, s) => sum + s.totalPrice, 0);
  
  // Real-time Shift Calculations based on today's completed sales
  const shiftCashSales = completedSales.filter(s => s.paymentMethod === "Taslimu").reduce((sum, s) => sum + s.totalPrice, 0);
  const shiftDigitalSales = completedSales.filter(s => ["M-Pesa", "Tigo Pesa", "Airtel Money", "Benki"].includes(s.paymentMethod)).reduce((sum, s) => sum + s.totalPrice, 0);
  const shiftDebtSales = completedSales.filter(s => s.paymentMethod === "Mkopo").reduce((sum, s) => sum + s.totalPrice, 0);


  return (
    <div className="space-y-6 pb-12 fade-in-up">
      <ErrorAlert error={salesError?.message || null} onClear={() => {}} />
      <PageHeader
        title={t("sales.title")}
        description={t("sales.subtitle")}
        actions={
          <>
        
        {/* SHIFT CONTROLS */}
        {currentShopId && (
          <div className="flex gap-2">
            {!activeShift ? (
              <Dialog open={openShiftDialog} onOpenChange={setOpenShiftDialog}>
                <DialogTrigger asChild>
                  <Button className="w-full sm:w-auto bg-primary text-white"><ShoppingCart className="h-4 w-4 mr-2" /> Open Register</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Open Register for Today</DialogTitle></DialogHeader>
                  <div className="space-y-6 pt-4">
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Opening Cash (TZS)</label>
                      <Input type="number" value={openingCash} onChange={(e) => setOpeningCash(e.target.value)} placeholder="0" className="h-14 rounded-xl text-lg font-bold" />
                    </div>
                    <Button onClick={handleOpenShift} className="w-full h-14 rounded-xl font-black text-sm">Open Register</Button>
                  </div>
                </DialogContent>
              </Dialog>
            ) : (
              <Dialog open={closeShiftDialog} onOpenChange={setCloseShiftDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full sm:w-auto border-destructive text-destructive hover:bg-destructive/10">Close Register</Button>
                </DialogTrigger>
                <DialogContent className="max-w-md w-[95vw] rounded-[2rem]">
                  <DialogHeader className="mb-2"><DialogTitle className="text-xl font-black">End of Day Reconciliation</DialogTitle></DialogHeader>
                  <div className="space-y-5">
                    {/* The Tally Section */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl space-y-1 text-center">
                         <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-500">Digital Totals</p>
                         <p className="text-sm font-black text-blue-600 dark:text-blue-500">{formatTZS(shiftDigitalSales)}</p>
                         <p className="text-[8px] font-bold text-muted-foreground">M-Pesa, Tigo, etc.</p>
                      </div>
                      <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl space-y-1 text-center">
                         <p className="text-[10px] font-black uppercase tracking-widest text-rose-600 dark:text-rose-500">Debt Issued</p>
                         <p className="text-sm font-black text-rose-600 dark:text-rose-500">{formatTZS(shiftDebtSales)}</p>
                         <p className="text-[8px] font-bold text-muted-foreground">To collect later</p>
                      </div>
                    </div>

                    <div className="p-5 rounded-2xl bg-emerald-500/5 border-2 border-emerald-500/20 text-sm font-medium space-y-3 relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-3 opacity-10 pointer-events-none"><Banknote className="h-20 w-20 text-emerald-500" /></div>
                      <p className="flex justify-between text-muted-foreground relative z-10">Morning Float: <span className="text-foreground font-bold">{formatTZS(activeShift.openingCash)}</span></p>
                      <p className="flex justify-between text-muted-foreground relative z-10">Cash Sales: <span className="text-emerald-600 dark:text-emerald-500 font-bold">+{formatTZS(shiftCashSales)}</span></p>
                      <p className="flex justify-between text-muted-foreground relative z-10">Cash Expenses: <span className="text-rose-600 dark:text-rose-500 font-bold">-{formatTZS(activeShift.cashExpensesTotal || 0)}</span></p>
                      <div className="h-px bg-emerald-500/20 my-3 relative z-10" />
                      <div className="flex justify-between items-center relative z-10">
                        <span className="font-black text-emerald-700 dark:text-emerald-400">EXPECTED IN DRAWER</span>
                        <span className="font-black text-emerald-600 dark:text-emerald-400 text-xl">{formatTZS(activeShift.openingCash + shiftCashSales - (activeShift.cashExpensesTotal || 0))}</span>
                      </div>
                    </div>

                    <div className="space-y-4 pt-2 border-t border-border/40">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Actual Cash Counted (TZS)</label>
                        <Input type="number" value={actualClosingCash} onChange={(e) => setActualClosingCash(e.target.value)} placeholder="Count physical cash" className="h-12 rounded-xl border-emerald-500/30 focus-visible:ring-emerald-500/30" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Float for Tomorrow</label>
                          <Input type="number" value={cashLeftForNextDay} onChange={(e) => setCashLeftForNextDay(e.target.value)} placeholder="0" className="h-12 rounded-xl bg-card" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Cash to Owner</label>
                          <Input type="number" value={cashSubmittedToOwner} onChange={(e) => setCashSubmittedToOwner(e.target.value)} placeholder="0" className="h-12 rounded-xl bg-card" />
                        </div>
                      </div>
                      <Button onClick={handleCloseShift} className="w-full h-14 rounded-xl font-black text-sm mt-4 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl shadow-emerald-500/20">Finalize & Close Register</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        )}

        {permissions.canAddSale && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button disabled={!currentShopId || !activeShift} className="w-full sm:w-auto"><Plus className="h-4 w-4 mr-2" />{t("sales.newSale")}</Button>
            </DialogTrigger>
            <DialogContent className="max-w-7xl w-[100vw] h-[100dvh] sm:w-[95vw] sm:h-[90vh] p-0 overflow-hidden rounded-none sm:rounded-[2rem] flex flex-col bg-background/95 backdrop-blur-xl border-none shadow-2xl sm:border sm:border-border/50">
              <DialogHeader className="p-4 sm:p-5 border-b border-border/40 bg-background/80 backdrop-blur-md flex-shrink-0 z-20">
                <DialogTitle className="text-xl font-black flex items-center gap-2"><ShoppingCart className="h-5 w-5 text-primary" /> {t("sales.recordTitle")}</DialogTitle>
              </DialogHeader>
              <div className="flex-1 min-h-0 relative bg-muted/10">
                <SaleCart products={products} inventory={inventory} onSubmit={handleCartSubmit} canSaveDraft={permissions.canAddSale} currentBranchId={currentBranchId} />
              </div>
            </DialogContent>
          </Dialog>
        )}
          </>
        }
      />

      {/* KPI Dashboard */}
      {activeShift && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t("sales.kpi.cash" as any) || "Physical Cash"}</CardTitle>
              <Banknote className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatTZS(shiftCashSales + activeShift.openingCash)}</div>
              <p className="text-xs text-muted-foreground">{t("sales.kpi.cashDesc" as any) || "Cash on Hand"}</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t("sales.kpi.digital" as any) || "Mobile / Digital"}</CardTitle>
              <Smartphone className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatTZS(shiftDigitalSales)}</div>
              <p className="text-xs text-muted-foreground">{t("sales.kpi.digitalDesc" as any) || "Mpesa, Bank, etc"}</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t("sales.kpi.debt" as any) || "Debt Issued (Mkopo)"}</CardTitle>
              <CreditCard className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatTZS(shiftDebtSales)}</div>
              <p className="text-xs text-muted-foreground">{t("sales.kpi.debtDesc" as any) || "To be collected"}</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t("sales.kpi.revenue" as any) || "Total Revenue"}</CardTitle>
              <Wallet className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatTZS(totalRevenue)}</div>
              <p className="text-xs text-muted-foreground">{filtered.length} {t("sales.totalSales")}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {!currentShopId ? (
        <div className="text-center py-12">
          <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">{t("sales.addShopFirst")}</p>
        </div>
      ) : salesLoading || shiftLoading ? (
        <PageLoader label={t("common.loading") || "Inapakia"} />
      ) : !activeShift ? (
        <Card className="shadow-sm">
          <CardContent className="flex flex-col items-center text-center py-16">
            <ShoppingCart className="h-10 w-10 text-muted-foreground mb-4 opacity-40" />
            <h3 className="text-xl font-bold mb-2">Register is Closed</h3>
            <p className="text-sm text-muted-foreground max-w-sm mb-6">Start your day by opening the register to securely track all cash and digital transactions.</p>
            <Button onClick={() => setOpenShiftDialog(true)} className="gap-2">
              <ShoppingCart className="h-4 w-4" /> Open Register
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>{t("sales.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("sales.searchPlaceholder")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 bg-muted/50 border-none focus-visible:ring-1"
                />
              </div>
              <Select value={filterPayment} onValueChange={setFilterPayment}>
                <SelectTrigger className="w-full md:w-[180px] bg-muted/50 border-none focus:ring-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("sales.allPayments")}</SelectItem>
                  <SelectItem value="Taslimu">Taslimu</SelectItem>
                  <SelectItem value="M-Pesa">M-Pesa</SelectItem>
                  <SelectItem value="Tigo Pesa">Tigo Pesa</SelectItem>
                  <SelectItem value="Airtel Money">Airtel Money</SelectItem>
                  <SelectItem value="Benki">Benki</SelectItem>
                  <SelectItem value="Mkopo">Mkopo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="-mx-1 mb-4 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <TabsList className="inline-flex w-max h-auto gap-1 bg-muted/50 p-1">
                  {([
                    ["completed", t("sales.completedTab"), completedSales.length],
                    ["drafts", t("sales.draftsTab"), draftSales.length],
                  ] as const).map(([value, label, count]) => (
                    <TabsTrigger key={value} value={value} className="relative gap-2 transition-all duration-200 data-[state=active]:shadow-sm">
                      <span>{label}</span>
                      <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
                        {count}
                      </span>
                      {activeTab === value && (
                        <motion.span
                          layoutId="sales-tab-underline"
                          className="absolute inset-x-2 -bottom-0.5 h-0.5 rounded-full bg-primary"
                          transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        />
                      )}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              <TabsContent value="completed" className="mt-0 outline-none">
                {/* Desktop table */}
                <div className="hidden md:block rounded-xl border bg-card overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left [&_th]:whitespace-nowrap [&_td]:whitespace-nowrap">
                      <thead className="sticky top-0 z-10 text-xs text-muted-foreground bg-muted/50 backdrop-blur uppercase">
                        <tr>
                          <th className="px-4 py-3 font-medium w-[60px]">#</th>
                          <th className="px-4 py-3 font-medium">{t("sales.product")}</th>
                          <th className="px-4 py-3 font-medium">{t("sales.customer")}</th>
                          <th className="px-4 py-3 font-medium text-right">{t("sales.quantity")}</th>
                          <th className="px-4 py-3 font-medium text-right">{t("sales.total")}</th>
                          <th className="px-4 py-3 font-medium text-center w-[120px]">{t("sales.payment")}</th>
                          <th className="px-4 py-3 font-medium">{t("sales.date")}</th>
                          <th className="px-4 py-3 font-medium text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {filtered.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                                <ShoppingCart className="mx-auto h-8 w-8 mb-3 opacity-20" />
                                {t("sales.noSales")}
                              </motion.div>
                            </td>
                          </tr>
                        ) : (
                          <AnimatePresence initial={false} mode="popLayout">
                            {filtered.map((s, i) => (
                              <motion.tr
                                key={s.id}
                                layout
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -6 }}
                                transition={{ duration: 0.28, delay: Math.min(i, 12) * 0.03, ease: [0.22, 1, 0.36, 1] }}
                                className="group relative transition-colors duration-200 hover:bg-primary/5"
                              >
                                <td className="relative px-4 py-3 font-medium tabular-nums text-muted-foreground">
                                  <span className="absolute left-0 top-1/2 h-0 w-[3px] -translate-y-1/2 rounded-r-full bg-primary transition-all duration-300 group-hover:h-3/5" />
                                  <span className="inline-block transition-transform duration-200 group-hover:translate-x-1">
                                    {String(i + 1).padStart(2, "0")}
                                  </span>
                                </td>
                                <td className="px-4 py-3 font-medium">{s.productName}</td>
                                <td className="px-4 py-3 text-muted-foreground">{s.customerName || "—"}</td>
                                <td className="px-4 py-3 text-right tabular-nums">{s.quantity}</td>
                                <td className="px-4 py-3 text-right font-medium tabular-nums">{formatTZS(s.totalPrice)}</td>
                                <td className="px-4 py-3 text-center">
                                  <Badge variant="secondary" className="rounded-md whitespace-nowrap font-medium">{s.paymentMethod}</Badge>
                                </td>
                                <td className="px-4 py-3 text-muted-foreground">{s.date}</td>
                                <td className="px-4 py-3 text-right">
                                  <div className="flex items-center justify-end gap-2 opacity-60 transition-all duration-200 group-hover:opacity-100">
                                    <Button size="sm" variant="outline" onClick={() => setLastCompletedSale(s)} className="gap-2 transition-transform duration-200 hover:-translate-y-0.5">
                                      <Printer className="h-4 w-4" />
                                      Receipt
                                    </Button>
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

                {/* Mobile cards */}
                <div className="grid gap-3 md:hidden">
                  {filtered.length === 0 ? (
                    <div className="rounded-xl border border-dashed py-12 text-center text-muted-foreground">
                      <ShoppingCart className="mx-auto h-8 w-8 mb-3 opacity-20" />
                      {t("sales.noSales")}
                    </div>
                  ) : filtered.map((s, i) => (
                    <motion.div
                      key={s.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.28, delay: Math.min(i, 12) * 0.03, ease: [0.22, 1, 0.36, 1] }}
                      className="rounded-xl border bg-card p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{s.productName}</p>
                          <p className="text-xs text-muted-foreground truncate">{s.customerName || "—"}</p>
                        </div>
                        <Badge variant="secondary" className="rounded-md whitespace-nowrap">{s.paymentMethod}</Badge>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <div className="text-xs text-muted-foreground">{s.quantity} pcs · {s.date}</div>
                        <div className="font-semibold tabular-nums">{formatTZS(s.totalPrice)}</div>
                      </div>
                      <div className="mt-3 flex justify-end border-t pt-3">
                        <Button size="sm" variant="outline" className="gap-2" onClick={() => setLastCompletedSale(s)}>
                          <Printer className="h-4 w-4" /> Receipt
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="drafts" className="mt-0 outline-none">
                <DraftSalesList drafts={draftSales} canConfirm={permissions.canConfirmDraft} canDelete={permissions.canDeleteDraft} onConfirm={handleConfirmDraft} onDelete={handleDeleteDraft} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}


      <SaleReceipt sale={lastCompletedSale} shopName={currentShop?.name || "Duka"} open={receiptOpen} onClose={closeReceipt} />
    </div>
  );
}