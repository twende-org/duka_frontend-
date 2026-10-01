import { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, Edit, Trash2, Truck, Mail, Phone, MapPin, Package, Globe, ChevronRight, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PageHeader from "@/components/common/PageHeader";
import { Loader } from "@/components/common/Loader";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAppSelector } from "@/store/hooks";
import { usePaginatedSuppliers, useCreateSupplier, useEditSupplier, useDeleteSupplier, useLinkedSupplierShops } from "@/hooks/useSuppliers";
import { enrichSupplierWithShop, mapShopToSupplierFields } from "@/lib/supplierMapping";

import { ErrorAlert } from "@/components/ErrorAlert";
import { toast } from "sonner";
import type { Supplier } from "@/types";
import { useUserRole } from "@/hooks/useUserRole";
import { useNavigate } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import Fuse from "fuse.js";

const defaultForm = { name: "", phone: "", email: "", address: "", products: "", notes: "", platformShopId: "" };

export default function Suppliers() {
  const user = useAppSelector((s) => s.auth.user);
  const { permissions } = useUserRole();
  const currentShopId = useAppSelector((s) => s.shops.currentShopId);
  const { t } = useI18n();
  const navigate = useNavigate();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: loading,
    error: suppliersError
  } = usePaginatedSuppliers(currentShopId, 20);

  const createSupplierMut = useCreateSupplier(currentShopId);
  const editSupplierMut = useEditSupplier(currentShopId);
  const deleteSupplierMut = useDeleteSupplier(currentShopId);

  const rawSuppliers = useMemo(() => {
    if (!data) return [];
    return data.pages.flatMap((page) => page.data);
  }, [data]);

  const linkedIds = useMemo(
    () => rawSuppliers.map((s) => s.platformShopId).filter(Boolean) as string[],
    [rawSuppliers]
  );
  const { data: linkedShops } = useLinkedSupplierShops(linkedIds);

  const suppliers = useMemo(
    () =>
      rawSuppliers.map((s) =>
        s.platformShopId ? enrichSupplierWithShop(s, linkedShops?.[s.platformShopId]) : s
      ),
    [rawSuppliers, linkedShops]
  );

  const [refreshingId, setRefreshingId] = useState<string | null>(null);

  // Self-heal: linked suppliers saved before shop details were copied get
  // backfilled once, so the record itself becomes complete.
  const healedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!linkedShops) return;
    rawSuppliers.forEach((s) => {
      if (!s.platformShopId || healedRef.current.has(s.id)) return;
      const shop = linkedShops[s.platformShopId];
      if (!shop) return;
      const mapped = mapShopToSupplierFields(shop);
      const patch: Partial<Supplier> = {};
      if (!s.phone?.trim() && mapped.phone) patch.phone = mapped.phone;
      if (!s.address?.trim() && mapped.address) patch.address = mapped.address;
      if (!s.products?.trim() && mapped.products) patch.products = mapped.products;
      if (!s.notes?.trim() && mapped.notes) patch.notes = mapped.notes;
      if (Object.keys(patch).length === 0) return;
      healedRef.current.add(s.id);
      editSupplierMut.mutate({ id: s.id, data: patch });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawSuppliers, linkedShops]);

  const hasMore = hasNextPage;



  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "with_products" | "empty">("all");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSup, setEditingSup] = useState<Supplier | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [supToDelete, setSupToDelete] = useState<Supplier | null>(null);

  const loadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  const searched = useMemo(() => {
    if (!search.trim()) return suppliers;
    const fuse = new Fuse(suppliers, {
      keys: [
        { name: 'name', weight: 1.0 },
        { name: 'phone', weight: 0.8 },
        { name: 'email', weight: 0.5 }
      ],
      threshold: 0.3,
      ignoreLocation: true,
      useExtendedSearch: true
    });
    return fuse.search(search).map(res => res.item);
  }, [suppliers, search]);

  const filtered = useMemo(() => {
    return searched.filter(s => {
      if (statusFilter === "with_products") return !!s.products;
      if (statusFilter === "empty") return !s.products;
      return true;
    });
  }, [searched, statusFilter]);

  const stats = useMemo(() => {
    let withProducts = 0, withContact = 0;
    suppliers.forEach(s => {
      if (s.products) withProducts++;
      if (s.email || s.phone) withContact++;
    });
    return { total: suppliers.length, withProducts, withContact };
  }, [suppliers]);

  const tabCounts = useMemo(() => ({
    all: searched.length,
    with_products: searched.filter(s => !!s.products).length,
    empty: searched.filter(s => !s.products).length,
  }), [searched]);

  const resetForm = () => setForm(defaultForm);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setProgress(30);
    try {
      setProgress(60);
      const supplierData = {
        name: form.name.trim(),
        phone: form.phone.trim() || "",
        email: form.email.trim() || "",
        address: form.address.trim() || "",
        products: form.products.trim() || "",
        notes: form.notes.trim() || "",
        ownerId: user!.id,
        shopId: currentShopId!,
        platformShopId: form.platformShopId.trim() || undefined,
      };
      if (editingSup) {
        await editSupplierMut.mutateAsync({ id: editingSup.id, data: supplierData });
        toast.success(t("suppliers.updated"));
      } else {
        await createSupplierMut.mutateAsync(supplierData);
        toast.success(t("suppliers.added"));
      }
      setProgress(100);
      setDialogOpen(false); setEditingSup(null); resetForm(); setProgress(0);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("products.failed"));
      setProgress(0);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (s: Supplier) => {
    setEditingSup(s);
    setForm({
      name: s.name || "",
      phone: s.phone || "",
      email: s.email || "",
      address: s.address || "",
      products: s.products || "",
      notes: s.notes || "",
      platformShopId: s.platformShopId || "",
    });
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!supToDelete) return;
    try {
      await deleteSupplierMut.mutateAsync(supToDelete.id);
      toast.success(t("suppliers.deleted"));
      setSupToDelete(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("products.failed"));
    }
  };

  /** Re-pull the linked shop's details and persist them onto the supplier record. */
  const handleRefreshLink = async (s: Supplier) => {
    if (!s.platformShopId) return;
    const shop = linkedShops?.[s.platformShopId];
    if (!shop) {
      toast.error("Duka la msambazaji halikupatikana.");
      return;
    }
    setRefreshingId(s.id);
    try {
      const mapped = mapShopToSupplierFields(shop);
      await editSupplierMut.mutateAsync({
        id: s.id,
        data: {
          name: mapped.name,
          phone: mapped.phone || s.phone || "",
          address: mapped.address,
          products: mapped.products,
          notes: mapped.notes,
          platformShopId: mapped.platformShopId,
        },
      });
      toast.success("Taarifa za msambazaji zimesasishwa.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("products.failed"));
    } finally {
      setRefreshingId(null);
    }
  };



  const filterTabs = [
    { value: "all" as const, label: t("suppliers.filter.all"), count: tabCounts.all },
    { value: "with_products" as const, label: t("suppliers.filter.withProducts"), count: tabCounts.with_products },
    { value: "empty" as const, label: t("suppliers.filter.empty"), count: tabCounts.empty },
  ];

  return (
    <div className="space-y-6 pb-12 fade-in-up">
      <ErrorAlert error={suppliersError?.message || null} onClear={() => {}} />

      <PageHeader
        title={t("suppliers.title")}
        description={t("suppliers.subtitle")}
        actions={
          <>
            <Button variant="outline" className="gap-2" onClick={() => navigate("/dashboard/discover-suppliers")}>
              <Globe className="h-4 w-4" /> Gundua Wasambazaji
            </Button>
            {permissions.canAddSupplier && (
              <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) { setEditingSup(null); resetForm(); setProgress(0); } }}>
                <DialogTrigger asChild>
                  <Button className="gap-2"><Plus className="h-4 w-4" />{t("suppliers.add")}</Button>
                </DialogTrigger>
                <DialogContent className="w-[95vw] max-w-lg">
                  <DialogHeader>
                    <DialogTitle>{editingSup ? t("suppliers.editTitle") : t("suppliers.addTitle")}</DialogTitle>
                  </DialogHeader>
                  {submitting && <Progress value={progress} className="h-1" />}
                  <form onSubmit={handleSubmit} className="space-y-3 mt-4">
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1 block">{t("suppliers.name")} *</label>
                      <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm font-medium text-foreground mb-1 block">{t("suppliers.phone")} *</label>
                        <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required placeholder="+255 7XX XXX XXX" />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-foreground mb-1 block">{t("suppliers.email")}</label>
                        <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@mfano.com" />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1 block">{t("suppliers.address")}</label>
                      <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1 block">{t("suppliers.platformShopId")}</label>
                      <Input value={form.platformShopId} onChange={(e) => setForm({ ...form, platformShopId: e.target.value })} placeholder={t("suppliers.platformShopIdPlaceholder")} />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1 block">{t("suppliers.products")}</label>
                      <Input value={form.products} onChange={(e) => setForm({ ...form, products: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1 block">{t("suppliers.notes")}</label>
                      <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                    </div>
                    <Button type="submit" className="w-full gap-2" disabled={submitting}>
                      {submitting ? <><Loader size={10} />{t("common.loading")}</> : (editingSup ? t("suppliers.update") : t("common.add"))}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </>
        }
      />

      {/* KPI Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("suppliers.stats.totalTitle")}</CardTitle>
            <Truck className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{stats.total}</div>
            <p className="text-xs text-muted-foreground">{t("suppliers.stats.totalSubtitle")}</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("suppliers.stats.withProductsTitle")}</CardTitle>
            <Package className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{stats.withProducts}</div>
            <p className="text-xs text-muted-foreground">{t("suppliers.stats.withProductsSubtitle")}</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("suppliers.stats.withContactTitle")}</CardTitle>
            <Phone className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{stats.withContact}</div>
            <p className="text-xs text-muted-foreground">{t("suppliers.stats.withContactSubtitle")}</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("suppliers.stats.resultsTitle")}</CardTitle>
            <Search className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{filtered.length}</div>
            <p className="text-xs text-muted-foreground">{t("suppliers.stats.resultsSubtitle")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search + filter pills */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("suppliers.searchPlaceholder")}
              className="pl-9 bg-muted/50 border-none focus-visible:ring-1"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

        </div>

        <div className="-mx-1 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="inline-flex w-max h-auto gap-1 rounded-md bg-muted/50 p-1">
            {filterTabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={cn(
                  "relative inline-flex items-center gap-2 whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all duration-200",
                  statusFilter === tab.value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span>{tab.label}</span>
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
                  {tab.count}
                </span>
                {statusFilter === tab.value && (
                  <motion.span
                    layoutId="suppliers-tab-underline"
                    className="absolute inset-x-2 -bottom-0.5 h-0.5 rounded-full bg-primary"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader size={14} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border bg-card px-4 py-12 text-center text-muted-foreground">
          <Truck className="mx-auto h-8 w-8 mb-3 opacity-20" />
          {t("suppliers.noSuppliers")}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Desktop table */}

              <div className="hidden md:block rounded-xl border bg-card overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1040px] text-left text-sm [&_th]:whitespace-nowrap [&_td]:whitespace-nowrap">
                    <thead className="sticky top-0 z-10 text-xs text-muted-foreground bg-muted/50 backdrop-blur uppercase">
                      <tr>
                        <th className="px-4 py-3 font-medium whitespace-nowrap">{t("suppliers.table.name")}</th>
                        <th className="px-4 py-3 font-medium whitespace-nowrap">{t("customers.phone")}</th>
                        <th className="px-4 py-3 font-medium whitespace-nowrap">{t("customers.email")}</th>
                        <th className="px-4 py-3 font-medium whitespace-nowrap">{t("suppliers.table.products")}</th>

                        <th className="px-4 py-3 font-medium text-right whitespace-nowrap">{t("suppliers.table.actions")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      <AnimatePresence initial={false} mode="popLayout">
                        {filtered.map((s, i) => (
                          <motion.tr
                            key={s.id}
                            layout
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            transition={{ duration: 0.28, delay: Math.min(i, 12) * 0.03, ease: [0.22, 1, 0.36, 1] }}
                            className="group relative whitespace-nowrap align-middle transition-colors duration-200 hover:bg-primary/5"
                          >
                            <td className="relative min-w-[300px] px-4 py-3 font-medium whitespace-nowrap">
                              <span className="absolute left-0 top-1/2 h-0 w-[3px] -translate-y-1/2 rounded-r-full bg-primary transition-all duration-300 group-hover:h-3/5" />
                              <div className="flex flex-nowrap items-center gap-3 transition-transform duration-200 group-hover:translate-x-1">
                                <div className="h-8 w-8 shrink-0 rounded-full bg-muted flex items-center justify-center text-xs font-semibold">
                                  {s.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex min-w-0 max-w-[360px] flex-nowrap items-center gap-2 overflow-hidden">
                                  <span className="max-w-[150px] shrink truncate">{s.name}</span>
                                  <span className="shrink-0 text-muted-foreground">·</span>
                                  <span className="max-w-[120px] shrink truncate text-xs text-muted-foreground">{s.address || "—"}</span>
                                  {s.platformShopId && (
                                    <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md border border-primary/20 bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                                      <Globe className="h-2.5 w-2.5 shrink-0" /> Mtandao
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="min-w-[180px] px-4 py-3 text-muted-foreground whitespace-nowrap">
                              <span className="block max-w-[180px] truncate">{s.phone || "—"}</span>
                            </td>
                            <td className="min-w-[200px] px-4 py-3 text-muted-foreground whitespace-nowrap">
                              <span className="block max-w-[200px] truncate">{s.email || "—"}</span>
                            </td>

                            <td className="min-w-[240px] px-4 py-3 text-muted-foreground whitespace-nowrap">
                              <span className="block max-w-[240px] truncate">{s.products || "—"}</span>
                            </td>
                            <td className="min-w-[180px] px-4 py-3 text-right whitespace-nowrap">
                              <div className="flex flex-nowrap items-center justify-end gap-2">
                                <div className="flex flex-nowrap items-center gap-2 opacity-60 transition-all duration-200 group-hover:opacity-100">
                                  {s.platformShopId && permissions.canEditSupplier && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleRefreshLink(s)}
                                      disabled={refreshingId === s.id}
                                      className="shrink-0"
                                      title="Sasisha taarifa kutoka kwenye duka"
                                    >
                                      <RefreshCw className={cn("h-4 w-4", refreshingId === s.id && "animate-spin")} />
                                    </Button>
                                  )}
                                  {permissions.canEditSupplier && (

                                    <Button size="sm" variant="outline" onClick={() => handleEdit(s)} className="gap-2 shrink-0 transition-transform duration-200 hover:-translate-y-0.5">
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  )}
                                  {permissions.canDeleteSupplier && (
                                    <Button size="sm" variant="ghost" onClick={() => setSupToDelete(s)} className="shrink-0 text-destructive hover:bg-destructive/10">
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-all duration-200 group-hover:translate-x-1 group-hover:text-foreground" />
                              </div>
                            </td>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile card list */}
              <div className="md:hidden space-y-3">
                <AnimatePresence initial={false} mode="popLayout">
                  {filtered.map((s, i) => (
                    <motion.div
                      key={s.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.28, delay: Math.min(i, 8) * 0.03, ease: [0.22, 1, 0.36, 1] }}
                      className="rounded-xl border bg-card p-4 shadow-sm active:scale-[0.99] transition-transform"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-semibold truncate flex items-center gap-2">
                            <span className="truncate">{s.name}</span>
                            {s.platformShopId && (
                              <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md border border-primary/20 bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                                <Globe className="h-2.5 w-2.5" /> Mtandao
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">{s.phone || s.email || "—"}</div>
                          <div className="text-xs text-muted-foreground truncate">{s.address || "—"}</div>
                        </div>
                      </div>
                      {s.products && <div className="mt-2 text-xs text-muted-foreground truncate">{s.products}</div>}
                      <div className="mt-3 flex flex-wrap gap-2">
                        {s.platformShopId && permissions.canEditSupplier && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRefreshLink(s)}
                            disabled={refreshingId === s.id}
                            className="flex-1 min-w-[110px] gap-2"
                          >
                            <RefreshCw className={cn("h-4 w-4", refreshingId === s.id && "animate-spin")} /> Sasisha
                          </Button>
                        )}
                        {permissions.canEditSupplier && (
                          <Button size="sm" variant="outline" onClick={() => handleEdit(s)} className="flex-1 min-w-[110px] gap-2">
                            <Edit className="h-4 w-4" /> {t("common.edit")}
                          </Button>
                        )}
                        {permissions.canDeleteSupplier && (
                          <Button size="sm" variant="ghost" onClick={() => setSupToDelete(s)} className="flex-1 min-w-[110px] gap-2 text-destructive hover:bg-destructive/10">
                            <Trash2 className="h-4 w-4" /> {t("common.delete")}
                          </Button>
                        )}
                      </div>

                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

          {/* Pagination: Load More */}
          {hasMore && (
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                onClick={loadMore}
                disabled={isFetchingNextPage}
                className="gap-2 w-full sm:w-auto"
              >
                {isFetchingNextPage ? (
                  <>
                    <Loader size={10} />
                    {t("suppliers.loadingMore")}
                  </>
                ) : (
                  t("suppliers.loadMore")
                )}
              </Button>
            </div>
          )}
        </div>
      )}

      <AlertDialog open={!!supToDelete} onOpenChange={(open) => !open && setSupToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("common.areYouSure")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("common.deleteConfirmation")} <span className="font-semibold text-foreground">{supToDelete?.name}</span>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
