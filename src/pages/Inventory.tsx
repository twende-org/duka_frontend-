import React, { useState, useEffect, useMemo } from "react";
import { 
  Package, 
  Search, 
  History, 
  AlertTriangle, 
  Plus, 
  Minus,
  RefreshCcw,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  TrendingUp,
  Boxes,
  Edit,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  List,
  Loader2,
  Coins,
  Truck,
  PackagePlus,
  FileSpreadsheet,
  Download,
  Upload
} from "lucide-react";
import { motion } from "framer-motion";
import PageHeader from "@/components/common/PageHeader";
import { PageLoader, Loader } from "@/components/common/Loader";
import { useSearchParams, Link } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppSelector } from "@/store/hooks";
import { usePaginatedProducts } from "@/hooks/useProducts";
import { useInventory, useStockMovements, useAdjustStock, useUpdateMinStock } from "@/hooks/useInventory";
import { getCategoryName, normalizeCategories } from "@/lib/categories";
import { ErrorAlert } from "@/components/ErrorAlert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/lib/i18n";
import { getPermissions } from "@/lib/permissions";
import { useUserRole } from "@/hooks/useUserRole";
import { ScanToIntakeDialog } from "@/components/products/ScanToIntakeDialog";
import { ImportProductsDialog } from "@/components/products/ImportProductsDialog";
import { getProducts } from "@/lib/api/domains/products";
import { downloadProductsWorkbook } from "@/lib/excel/productsWorkbook";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { Product, StockMovement } from "@/types";
import Fuse from "fuse.js";
import { useAppDispatch } from "@/store/hooks";

export default function Inventory() {
  const { t } = useI18n();
  const { role } = useUserRole();
  const permissions = getPermissions(role);
  const dispatch = useAppDispatch();
  const [searchParams] = useSearchParams();
  
  const currentShopId = useAppSelector((s) => s.shops.currentShopId);
  const currentBranchId = useAppSelector((s) => s.branches.currentBranchId);
  const currentShop = useAppSelector((s) => s.shops.shops.find(shop => shop.id === currentShopId));
  const { data: paginatedData, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading: productsLoading, error: rqError } = usePaginatedProducts(currentShopId);
  const products = React.useMemo(() => paginatedData ? paginatedData.pages.flatMap(p => p.products) : [], [paginatedData]);
  const productsError = rqError ? rqError.message : null;
  const hasMore = hasNextPage;

  const { data: inventory = [], isLoading: inventoryLoading, error: inventoryErrorRq, refetch: refetchInventory } = useInventory(currentShopId, currentBranchId);
  const inventoryError = inventoryErrorRq ? inventoryErrorRq.message : null;
  const loading = inventoryLoading || productsLoading;

  const getProductInv = React.useCallback((pId: string) => {
    return inventory.find(i => i.productId === pId);
  }, [inventory]);

  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [stockStatusFilter, setStockStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("table");
  
  const [managingProduct, setManagingProduct] = useState<Product | null>(null);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [adjustmentQty, setAdjustmentQty] = useState<number | string>(0);
  const [adjustmentType, setAdjustmentType] = useState<"in" | "out">("in");
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [minStockLevel, setMinStockLevel] = useState<number | string>(5);
  const [showHistory, setShowHistory] = useState(false);

  const { data: movements = [] } = useStockMovements(currentShopId, managingProduct?.id || null);
  const adjustStockMutation = useAdjustStock(currentShopId);
  const updateMinStockMutation = useUpdateMinStock(currentShopId, currentBranchId);

  const [restockOpen, setRestockOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const onExportExcel = async () => {
    if (!currentShopId || exporting) return;
    setExporting(true);
    try {
      const all = await getProducts(currentShopId);
      if (all.length === 0) {
        toast.error(t("inventory.export.empty"));
        return;
      }
      await downloadProductsWorkbook(
        all.map((p) => ({
          name: p.name,
          barcode: p.barcode || "",
          sku: p.sku || "",
          category: p.category ? getCategoryName(p.category) || p.category : "",
          unit: p.unit || "",
          buyingPrice: p.buyingPrice ?? null,
          sellingPrice: p.sellingPrice ?? null,
          quantity: inventory.find((i) => i.productId === p.id)?.quantity ?? null,
        }))
      );
      toast.success(t("inventory.export.done"));
    } catch (err) {
      console.error("Inventory export failed:", err);
      toast.error(t("inventory.export.failed"));
    } finally {
      setExporting(false);
    }
  };


  const loadMore = () => {
    if (currentShopId && hasMore && !productsLoading && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  const categories = useMemo(() => {
    const productCatIds = products.flatMap(p => normalizeCategories(p)).filter(Boolean);
    const explicitCatIds = currentShop?.categories || [];
    const allCatIds = new Set([...productCatIds, ...explicitCatIds]);
    
    return Array.from(allCatIds).map(id => ({
      id,
      name: getCategoryName(id) || id
    })).sort((a, b) => a.name.localeCompare(b.name));
  }, [products, currentShop?.categories]);

  const filteredProducts = useMemo(() => {
    let result = products;

    if (searchQuery.trim()) {
      const fuse = new Fuse(result, {
        keys: [
          { name: 'name', weight: 1.0 },
          { name: 'sku', weight: 0.5 }
        ],
        threshold: 0.3,
        ignoreLocation: true,
        useExtendedSearch: true,
      });
      result = fuse.search(searchQuery).map(r => r.item);
    }

    return result.filter(p => {
      const inv = getProductInv(p.id);
      const stock = inv?.quantity ?? 0;
      const minStock = inv?.minStock ?? 5;

      const matchesCategory = selectedCategory === "all" || normalizeCategories(p).includes(selectedCategory);
      
      let matchesStatus = true;
      if (stockStatusFilter === "low") matchesStatus = stock <= minStock && stock > 0;
      else if (stockStatusFilter === "out") matchesStatus = stock <= 0;
      else if (stockStatusFilter === "ok") matchesStatus = stock > minStock;

      return matchesCategory && matchesStatus;
    });
  }, [products, inventory, searchQuery, selectedCategory, stockStatusFilter]);

  const stats = useMemo(() => {
    let low = 0, out = 0, value = 0, totalStock = 0;
    products.forEach(p => {
      const inv = getProductInv(p.id);
      const q = inv?.quantity || 0;
      const m = inv?.minStock || 5;
      if (q <= 0) out++; else if (q <= m) low++;
      value += q * (p.sellingPrice || 0);
      totalStock += q;
    });
    return { total: products.length, totalStock, low, out, value };
  }, [products, inventory]);

  const handleManageStock = (product: Product) => {
    const inv = getProductInv(product.id);
    setManagingProduct(product);
    setMinStockLevel(inv?.minStock ?? 5);
    setAdjustmentQty(0);
    setAdjustmentReason("");
    setAdjustmentType("in");
    setShowHistory(false);
    setIsManageModalOpen(true);
  };

  const onAdjust = async () => {
    if (!managingProduct || !currentShopId || Number(adjustmentQty) <= 0) return;
    try {
      await adjustStockMutation.mutateAsync({
        productId: managingProduct.id,
        productName: managingProduct.name,
        shopId: currentShopId,
        branchId: currentBranchId || "",
        type: adjustmentType,
        quantity: Number(adjustmentQty),
        reason: adjustmentReason || (adjustmentType === "in" ? "Restock" : "Adjustment"),
        userId: "system", 
        userName: "Mtumiaji",
      });
      setIsManageModalOpen(false);
      toast.success("Stock adjusted successfully");
    } catch (err: unknown) { 
      const error = err as Error;
      toast.error(error.message); 
    }
  };

  const onUpdateMinStock = async () => {
    if (!managingProduct || !currentShopId) return;
    try {
      await updateMinStockMutation.mutateAsync({ 
        productId: managingProduct.id, 
        minStock: Number(minStockLevel) 
      });
      toast.success(t("common.save"));
      setIsManageModalOpen(false);
    } catch (err) { toast.error(t("common.error")); }
  };

  const statusTabs = useMemo(() => {
    let low = 0, out = 0, ok = 0;
    products.forEach(p => {
      const inv = getProductInv(p.id);
      const q = inv?.quantity || 0;
      const m = inv?.minStock || 5;
      if (q <= 0) out++; else if (q <= m) low++; else ok++;
    });
    return [
      { id: "all", label: "Zote (All)", count: products.length, icon: Boxes },
      { id: "out", label: "Zilizoisha", count: out, icon: XCircle },
      { id: "low", label: "Pungufu", count: low, icon: AlertTriangle },
      { id: "ok", label: "Zipo (OK)", count: ok, icon: CheckCircle2 },
    ];
  }, [products, inventory]);

  return (
    <div className="space-y-6">
      <ErrorAlert error={productsError} onClear={() => {}} />
      <ErrorAlert error={inventoryError} onClear={() => {}} />

      <PageHeader
        title={t("inventory.title")}
        description={t("inventory.subtitle")}
        actions={
          <>
            {permissions.canAdjustInventory && (
              <Button onClick={() => setRestockOpen(true)} disabled={!currentShopId} className="rounded-lg">
                <PackagePlus className="h-4 w-4 mr-2" />
                {t("inventory.restock")}
              </Button>
            )}
            {permissions.canAdjustInventory && (
              <Button variant="outline" onClick={() => setImportOpen(true)} disabled={!currentShopId} className="rounded-lg">
                <Upload className="h-4 w-4 mr-2" />
                {t("inventory.importExcel")}
              </Button>
            )}
            <Button variant="outline" onClick={onExportExcel} disabled={!currentShopId || exporting} className="rounded-lg">
              <Download className={cn("h-4 w-4 mr-2", exporting && "animate-pulse")} />
              {t("inventory.exportExcel")}
            </Button>
            <Link to="/dashboard/transfers">
              <Button variant="outline" className="rounded-lg">
                <Truck className="h-4 w-4 mr-2" />
                {t("nav.transfers")}
              </Button>
            </Link>
            <Button variant="outline" onClick={() => currentShopId && refetchInventory()} disabled={loading} className="rounded-lg">
              <RefreshCcw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
              {t("inventory.refresh")}
            </Button>
          </>
        }
      />

      {/* KPI Dashboard */}
      {currentShopId && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t("inventory.kpi.totalProducts" as any) || "Bidhaa Zote"}</CardTitle>
              <Package className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">{t("inventory.kpi.productTypes" as any) || "Aina za bidhaa"}</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t("inventory.kpi.totalStock" as any) || "Jumla ya Stoo"}</CardTitle>
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalStock}</div>
              <p className="text-xs text-muted-foreground">{t("inventory.kpi.totalPieces" as any) || "Jumla ya vipande vyote"}</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t("inventory.kpi.lowStock" as any) || "Pungufu / Mwisho"}</CardTitle>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.out} <span className="text-xs font-medium text-muted-foreground">/{stats.low} low</span>
              </div>
              <p className="text-xs text-muted-foreground">{t("inventory.kpi.lowStockDesc" as any) || "Bidhaa zilizoisha au chache"}</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t("inventory.kpi.storeValue")}</CardTitle>
              <Coins className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">TZS {stats.value.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">{t("inventory.kpi.storeValueDesc")}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("inventory.searchPlaceholder")}
              className="pl-9 bg-muted/50 border-none focus-visible:ring-1"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[170px] border-dashed"><SelectValue placeholder={t("inventory.category")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("inventory.allCategories")}</SelectItem>
              {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center bg-muted/50 rounded-xl p-1 border border-border/40 shrink-0 shadow-sm">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setViewMode("grid")}
            className={cn(
              "h-9 w-9 rounded-lg transition-all",
              viewMode === "grid" ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setViewMode("table")}
            className={cn(
              "h-9 w-9 rounded-lg transition-all",
              viewMode === "table" ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Animated Status Tabs */}
      {currentShopId && (
        <div className="-mx-1 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="inline-flex w-max items-center gap-1 rounded-lg bg-muted/50 p-1">
            {statusTabs.map((tab) => {
              const isSelected = stockStatusFilter === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStockStatusFilter(tab.id)}
                  className={cn(
                    "relative flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-semibold transition-all duration-200",
                    isSelected ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{tab.label}</span>
                  <span className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                    isSelected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  )}>{tab.count}</span>
                  {isSelected && (
                    <motion.span
                      layoutId="inventory-status-underline"
                      className="absolute inset-x-2 -bottom-0.5 h-0.5 rounded-full bg-primary"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

     <div className="space-y-4">
        {loading && filteredProducts.length === 0 ? (
          <div className="rounded-xl border bg-card shadow-sm">
            <PageLoader label={t("common.loading") || "Inapakia"} />
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredProducts.length === 0 ? (
            <div className="col-span-full rounded-xl border bg-card text-center py-16 shadow-sm">
               <Package className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
               <p className="text-muted-foreground italic">{t("inventory.noProducts")}</p>
            </div>
          ) : filteredProducts.map((p, idx) => {
            const inv = getProductInv(p.id);
            const q = inv?.quantity || 0;
            const m = inv?.minStock || 5;
            return (
              <motion.div
                key={p.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, delay: Math.min(idx, 12) * 0.03, ease: [0.22, 1, 0.36, 1] }}
                className="rounded-xl border bg-card overflow-hidden shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md group flex flex-col"
              >
                <div className="relative aspect-[4/3] bg-muted overflow-hidden">
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground bg-muted/30">
                      <Package className="h-10 w-10 opacity-20 mb-2" />
                      <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">No Image</span>
                    </div>
                  )}
                  <div className="absolute top-3 right-3">
                   {q <= 0 ? (
                      <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-black bg-rose-500/10 text-rose-600 dark:text-rose-400 backdrop-blur">{t("inventory.statusOut")}</span>
                    ) : q <= m ? (
                      <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-black bg-amber-500/10 text-amber-600 dark:text-amber-400 backdrop-blur">{t("inventory.statusLow")}</span>
                    ) : (
                      <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-black bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 backdrop-blur">{t("inventory.statusInStock")}</span>
                    )}
                  </div>
                </div>

                <div className="p-4 flex flex-col flex-1">
                  <div className="mb-auto">
                    <h3 className="font-bold text-base text-foreground leading-tight mb-1">{p.name}</h3>
                    <p className="text-[11px] text-muted-foreground truncate">{normalizeCategories(p).map(getCategoryName).join(", ")}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-2 mb-3">
                        {p.sku && <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-md font-medium">SKU: {p.sku}</span>}
                        {p.storeLocation && <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-md font-medium">Shelve: {p.storeLocation}</span>}
                    </div>
                  </div>

                  <div className="flex justify-between items-end border-t pt-3 mt-auto">
                     <div className="text-left">
                        <p className="text-[10px] font-medium text-muted-foreground uppercase leading-none mb-1">Stock</p>
                        <p className={cn("text-2xl font-bold leading-none", q <= m ? "text-destructive" : "text-foreground")}>{q}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">Min: {m}</p>
                     </div>
                     {permissions.canAdjustInventory && (
                       <Button size="sm" variant="outline" onClick={() => handleManageStock(p)} className="rounded-lg">
                          <Boxes className="h-4 w-4 mr-1.5" /> {t("inventory.dhibiti")}
                       </Button>
                     )}
                  </div>
                </div>
              </motion.div>
            );
          })}
          </div>
        ) : (
          <>
          {/* Desktop table */}
          <div className="hidden md:block rounded-xl border bg-card overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
            <table className="w-full text-sm text-left [&_th]:whitespace-nowrap [&_td]:whitespace-nowrap">
              <thead className="sticky top-0 z-10 text-xs text-muted-foreground bg-muted/50 backdrop-blur uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">{t("inventory.product")}</th>
                  <th className="px-4 py-3 font-medium">{t("inventory.category")}</th>
                  <th className="px-4 py-3 font-medium text-right">{t("inventory.stock")}</th>
                  <th className="px-4 py-3 font-medium text-right">{t("inventory.minLevel")}</th>
                  <th className="px-4 py-3 font-medium text-center">{t("inventory.status")}</th>
                  <th className="px-4 py-3 font-medium text-right">{t("inventory.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredProducts.length === 0 ? (
                  <tr><td colSpan={6} className="py-20 text-center text-muted-foreground italic">{t("inventory.noProducts")}</td></tr>
                ) : filteredProducts.map((p, i) => {
                  const inv = getProductInv(p.id);
                  const q = inv?.quantity || 0;
                  const m = inv?.minStock || 5;
                  return (
                    <motion.tr
                      key={p.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.28, delay: Math.min(i, 12) * 0.03, ease: [0.22, 1, 0.36, 1] }}
                      className="group relative transition-colors duration-200 hover:bg-primary/5"
                    >
                      <td className="relative px-4 py-4">
                        <span className="absolute left-0 top-1/2 h-0 w-[3px] -translate-y-1/2 rounded-r-full bg-primary transition-all duration-300 group-hover:h-3/5" />
                        <div className="font-bold text-foreground transition-transform duration-200 group-hover:translate-x-1">{p.name}</div>
                        <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                          {p.sku && <span>SKU: {p.sku}</span>}
                          {p.storeLocation && <span>Side: {p.storeLocation}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-muted-foreground text-xs max-w-[150px] truncate">{normalizeCategories(p).map(getCategoryName).join(", ")}</td>
                      <td className="px-4 py-4 text-right font-bold">{q}</td>
                      <td className="px-4 py-4 text-right text-muted-foreground">{m}</td>
                      <td className="px-4 py-4 text-center">
                        <span className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-black whitespace-nowrap",
                          q <= 0 ? "bg-rose-500/10 text-rose-600 dark:text-rose-400" :
                          q <= m ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" :
                          "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                        )}>
                          {q <= 0 ? "OUT" : q <= m ? "LOW" : "OK"}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        {permissions.canAdjustInventory && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleManageStock(p)}
                            className="rounded-lg opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                          >
                            <Boxes className="h-4 w-4 mr-1.5" /> {t("inventory.dhibiti")}
                          </Button>
                        )}
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filteredProducts.length === 0 ? (
              <div className="rounded-xl border bg-card text-center py-16 shadow-sm">
                <Package className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground italic">{t("inventory.noProducts")}</p>
              </div>
            ) : filteredProducts.map((p, i) => {
              const inv = getProductInv(p.id);
              const q = inv?.quantity || 0;
              const m = inv?.minStock || 5;
              return (
                <motion.div
                  key={p.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.28, delay: Math.min(i, 10) * 0.03, ease: [0.22, 1, 0.36, 1] }}
                  className="rounded-xl border bg-card p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold text-foreground truncate">{p.name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{normalizeCategories(p).map(getCategoryName).join(", ")}</p>
                    </div>
                    <span className={cn(
                      "shrink-0 inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-black whitespace-nowrap",
                      q <= 0 ? "bg-rose-500/10 text-rose-600 dark:text-rose-400" :
                      q <= m ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" :
                      "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                    )}>
                      {q <= 0 ? "OUT" : q <= m ? "LOW" : "OK"}
                    </span>
                  </div>
                  <div className="flex items-end justify-between mt-3 pt-3 border-t">
                    <div>
                      <p className="text-[10px] uppercase text-muted-foreground">Stock</p>
                      <p className="text-xl font-bold leading-none">{q} <span className="text-[10px] font-normal text-muted-foreground">min {m}</span></p>
                    </div>
                    {permissions.canAdjustInventory && (
                      <Button size="sm" variant="outline" onClick={() => handleManageStock(p)} className="rounded-lg">
                        <Boxes className="h-4 w-4 mr-1.5" /> {t("inventory.dhibiti")}
                      </Button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
          </>
        )}

        {/* Pagination: Load More */}
        {hasMore && (
          <div className="flex justify-center pt-4 pb-8">
            <Button
              variant="outline"
              onClick={loadMore}
              disabled={productsLoading || isFetchingNextPage}
              className="rounded-lg w-full sm:w-auto"
            >
              {productsLoading || isFetchingNextPage ? (
                <>
                  <Loader size={8} className="mr-3 scale-75" />
                  Inapakia...
                </>
              ) : (
                "Onesha Zaidi"
              )}
            </Button>
          </div>
        )}
      </div>


      {/* Manage Modal */}
      <Dialog open={isManageModalOpen} onOpenChange={setIsManageModalOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("inventory.manageTitle")}: {managingProduct?.name}</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <Tabs defaultValue="adjustments" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="adjustments" className="text-xs">Marekebisho</TabsTrigger>
                <TabsTrigger value="settings" className="text-xs">Mipangilio</TabsTrigger>
                <TabsTrigger value="history" className="text-xs">Historia</TabsTrigger>
              </TabsList>
              
              <TabsContent value="adjustments" className="space-y-4">
                 <div className="p-4 text-center border rounded-xl bg-muted/30">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">{t("inventory.currentStock")}</p>
                    <p className="text-3xl font-black text-primary">{managingProduct ? (getProductInv(managingProduct.id)?.quantity || 0) : 0}</p>
                 </div>
                 <div className="space-y-4 border rounded-xl p-4 bg-muted/5">
                    <div className="flex gap-2">
                       <Button variant={adjustmentType === "in" ? "default" : "outline"} className="flex-1 h-9 text-xs" onClick={() => setAdjustmentType("in")}>{t("inventory.addStock")}</Button>
                       <Button variant={adjustmentType === "out" ? "destructive" : "outline"} className="flex-1 h-9 text-xs" onClick={() => setAdjustmentType("out")}>{t("inventory.reduceStock")}</Button>
                    </div>
                    <div className="space-y-3">
                       <div>
                          <Label className="text-[10px] font-bold uppercase mb-1 block">{t("inventory.quantity")} *</Label>
                          <Input type="number" value={adjustmentQty === 0 ? "" : adjustmentQty} onChange={(e) => setAdjustmentQty(e.target.value)} placeholder="0" />
                       </div>
                       <div>
                          <Label className="text-[10px] font-bold uppercase mb-1 block">{t("inventory.reason")}</Label>
                          <Input value={adjustmentReason} onChange={(e) => setAdjustmentReason(e.target.value)} placeholder={t("inventory.reasonPlaceholder")} />
                       </div>
                       <Button className="w-full" onClick={onAdjust} disabled={Number(adjustmentQty) <= 0}>{t("inventory.execute")}</Button>
                    </div>
                 </div>
              </TabsContent>

              <TabsContent value="settings">
                 <div className="p-6 text-center border rounded-xl bg-muted/5 space-y-4">
                    <p className="text-sm font-bold text-muted-foreground uppercase">{t("inventory.minStockLevelShort")}</p>
                    <p className="text-xs text-muted-foreground">Kiwango hiki kinatumika kutoa tahadhari wakati mzigo unapopungua stoo.</p>
                    <div className="flex items-center justify-center gap-2 mt-4">
                       <Input type="number" value={minStockLevel === 0 ? "" : minStockLevel} onChange={(e) => setMinStockLevel(e.target.value)} placeholder="0" className="h-12 w-24 text-center text-xl font-bold" />
                    </div>
                    <Button className="w-full mt-4" onClick={onUpdateMinStock}><Edit className="h-4 w-4 mr-2" /> Hifadhi Kiwango</Button>
                 </div>
              </TabsContent>

              <TabsContent value="history">
                  <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 border rounded-xl p-4 bg-muted/5">
                    {movements.length === 0 ? (
                      <div className="text-center py-8">
                         <History className="h-10 w-10 text-muted-foreground/20 mx-auto mb-2" />
                         <p className="text-xs text-muted-foreground italic">{t("inventory.noHistory")}</p>
                      </div>
                    ) : (
                      movements.slice().reverse().map((m) => (
                        <div key={m.id} className="text-[11px] border-b pb-3 last:border-0 border-dashed">
                          <div className="flex justify-between font-bold mb-1">
                            <span className={cn("text-sm", m.type === "in" ? "text-emerald-600" : "text-rose-500")}>
                               {m.type === "in" ? "+" : "-"}{m.quantity}
                            </span>
                            <span className="text-muted-foreground opacity-70">
                               {m.date ? format(new Date(typeof m.date === 'string' ? m.date : (m.date as { toDate?: () => Date }).toDate?.() || (m.date as string | number)), "dd/MM/yy HH:mm") : "Sasa"}
                            </span>
                          </div>
                          <div className="flex justify-between text-muted-foreground">
                             <span className="font-medium">{m.reason || (m.type === "sale" ? "Mauzo" : "Adjustment")}</span>
                             <span className="font-black uppercase tracking-tighter opacity-50">BY {m.userName || "System"}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>

      {permissions.canAdjustInventory && (
        <>
          <ScanToIntakeDialog isOpen={restockOpen} onClose={() => setRestockOpen(false)} shopId={currentShopId} />
          <ImportProductsDialog isOpen={importOpen} onClose={() => setImportOpen(false)} shopId={currentShopId} branchId={currentBranchId} />
        </>
      )}
    </div>
  );
}
