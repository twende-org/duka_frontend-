import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, Edit, Trash2, GitBranch, MapPin, Phone, ArrowRightLeft, Package, Check, X as XIcon, Clock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import PageHeader from "@/components/common/PageHeader";
import { useAppSelector } from "@/store/hooks";
import { useUserRole } from "@/hooks/useUserRole";
import {
  addBranch, addStockTransfer, cancelStockTransfer, completeStockTransfer, deleteBranch,
  getBranches, getStockTransfers, updateBranch,
} from "@/lib/api/domains/shops";
import { getProducts } from "@/lib/api/domains/products";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { Branch, StockTransfer, Product } from "@/types";
import BranchSetupWizard from "@/components/branches/BranchSetupWizard";
import { Loader } from "@/components/common/Loader";


const defaultBranchForm = { name: "", location: "", phone: "" };
const defaultTransferForm = { fromBranchId: "", toBranchId: "", productId: "", quantity: 1, notes: "" };

export default function Branches() {
  const currentShopId = useAppSelector((s) => s.shops.currentShopId);
  const user = useAppSelector((s) => s.auth.user);
  const { permissions } = useUserRole();
  const { t } = useI18n();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"branches" | "transfers">("branches");

  // Branch form
  const [branchDialogOpen, setBranchDialogOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [branchForm, setBranchForm] = useState(defaultBranchForm);
  const [submitting, setSubmitting] = useState(false);
  const [toDelete, setToDelete] = useState<Branch | null>(null);

  // Transfer form
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [transferForm, setTransferForm] = useState(defaultTransferForm);

  async function loadData() {
    if (!currentShopId) return;
    setLoading(true);
    try {
      const [b, tr, p] = await Promise.all([
        getBranches(currentShopId),
        getStockTransfers(currentShopId),
        getProducts(currentShopId),
      ]);
      setBranches(b);
      setTransfers(tr);
      setProducts(p);
    } catch (err) { console.error(err); }
    setLoading(false);
  }

  useEffect(() => { loadData(); }, [currentShopId]);

  const filteredBranches = branches.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    (b.location || "").toLowerCase().includes(search.toLowerCase())
  );

  function openEditBranch(b: Branch) {
    setEditingBranch(b);
    setBranchForm({ name: b.name, location: b.location || "", phone: b.phone || "" });
    setBranchDialogOpen(true);
  }

  async function handleBranchSubmit(data: Partial<Branch>) {
    if (!data.name?.trim() || !currentShopId) return;
    setSubmitting(true);
    try {
      if (editingBranch) {
        await updateBranch(editingBranch.id, data);
        toast.success(t("branches.updated"));
      } else {
        await addBranch({ ...data, shopId: currentShopId } as Omit<Branch, "id">);
        toast.success(t("branches.added"));
      }
      setBranchForm(defaultBranchForm);
      setEditingBranch(null);
      setBranchDialogOpen(false);
      loadData();
    } catch (err: any) { toast.error(err.message); }
    setSubmitting(false);
  }

  async function handleDeleteBranch() {
    if (!toDelete) return;
    try {
      await deleteBranch(toDelete.id);
      toast.success(t("branches.deleted"));
      setToDelete(null);
      loadData();
    } catch (err: any) { toast.error(err.message); }
  }

  async function handleTransferSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentShopId || !user) return;
    if (!transferForm.fromBranchId || !transferForm.toBranchId || !transferForm.productId) return;
    if (transferForm.fromBranchId === transferForm.toBranchId) {
      toast.error(t("branches.sameBranchError"));
      return;
    }
    setSubmitting(true);
    try {
      const product = products.find(p => p.id === transferForm.productId);
      await addStockTransfer({
        shopId: currentShopId,
        fromBranchId: transferForm.fromBranchId,
        toBranchId: transferForm.toBranchId,
        productId: transferForm.productId,
        productName: product?.name || "",
        quantity: transferForm.quantity,
        notes: transferForm.notes,
        status: "pending",
        createdBy: user.id,
        createdByName: user.displayName,
      });
      toast.success(t("branches.transferCreated"));
      setTransferForm(defaultTransferForm);
      setTransferDialogOpen(false);
      loadData();
    } catch (err: any) { toast.error(err.message); }
    setSubmitting(false);
  }

  async function handleCompleteTransfer(id: string) {
    try {
      await completeStockTransfer(id);
      toast.success(t("branches.transferCompleted"));
      loadData();
    } catch (err: any) { toast.error(err.message); }
  }

  async function handleCancelTransfer(id: string) {
    try {
      await cancelStockTransfer(id);
      toast.success(t("branches.transferCancelled"));
      loadData();
    } catch (err: any) { toast.error(err.message); }
  }

  const getBranchName = (id: string) => branches.find(b => b.id === id)?.name || id;

  const pendingTransfers = transfers.filter(tr => tr.status === "pending").length;
  const completedTransfers = transfers.filter(tr => tr.status === "completed").length;
  const activeBranches = branches.filter(b => b.isActive !== false).length;

  const statusBadge = (status: string) =>
    cn(
      "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium whitespace-nowrap border",
      status === "completed"
        ? "bg-primary/10 text-primary border-primary/20"
        : status === "pending"
        ? "bg-muted text-muted-foreground border-transparent"
        : "bg-destructive/10 text-destructive border-destructive/20"
    );

  if (!currentShopId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <GitBranch className="h-12 w-12 text-muted-foreground mb-3" />
        <p className="text-muted-foreground">{t("products.addShopFirst")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("nav.branches")}
        description={t("branches.subtitle")}
        actions={
          <div className="flex gap-2">
            {permissions.canManageShops && (
              <Dialog open={branchDialogOpen} onOpenChange={(o) => { if (!o) { setBranchForm(defaultBranchForm); setEditingBranch(null); } setBranchDialogOpen(o); }}>
                <DialogTrigger asChild>
                  <Button className="gap-2"><Plus className="h-4 w-4" />{t("branches.add")}</Button>
                </DialogTrigger>
                <BranchSetupWizard
                  initialData={editingBranch || branchForm}
                  onSubmit={handleBranchSubmit}
                  onCancel={() => setBranchDialogOpen(false)}
                />
              </Dialog>
            )}
            {branches.length >= 2 && (
              <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2"><ArrowRightLeft className="h-4 w-4" />{t("branches.newTransfer")}</Button>
                </DialogTrigger>
                <DialogContent className="max-w-md w-[95vw]">
                  <DialogHeader>
                    <DialogTitle>{t("branches.newTransferTitle")}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleTransferSubmit} className="space-y-4 pt-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-foreground mb-1.5 block">{t("branches.fromBranch")} *</label>
                        <Select value={transferForm.fromBranchId} onValueChange={(v) => setTransferForm({ ...transferForm, fromBranchId: v })}>
                          <SelectTrigger className="bg-muted/50"><SelectValue placeholder={t("branches.selectBranch")} /></SelectTrigger>
                          <SelectContent>
                            {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-foreground mb-1.5 block">{t("branches.toBranch")} *</label>
                        <Select value={transferForm.toBranchId} onValueChange={(v) => setTransferForm({ ...transferForm, toBranchId: v })}>
                          <SelectTrigger className="bg-muted/50"><SelectValue placeholder={t("branches.selectBranch")} /></SelectTrigger>
                          <SelectContent>
                            {branches.filter(b => b.id !== transferForm.fromBranchId).map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1.5 block">{t("branches.product")} *</label>
                      <Select value={transferForm.productId} onValueChange={(v) => setTransferForm({ ...transferForm, productId: v })}>
                        <SelectTrigger className="bg-muted/50"><SelectValue placeholder={t("sales.selectProduct")} /></SelectTrigger>
                        <SelectContent>
                          {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1.5 block">{t("sales.quantity")} *</label>
                      <Input type="number" min={1} value={transferForm.quantity} onChange={(e) => setTransferForm({ ...transferForm, quantity: Number(e.target.value) })} className="bg-muted/50" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1.5 block">{t("customers.notes")}</label>
                      <Textarea value={transferForm.notes} onChange={(e) => setTransferForm({ ...transferForm, notes: e.target.value })} rows={2} className="bg-muted/50" />
                    </div>
                    <div className="flex gap-2 justify-end pt-2">
                      <Button type="button" variant="outline" onClick={() => setTransferDialogOpen(false)}>{t("common.cancel")}</Button>
                      <Button type="submit" disabled={submitting}>{submitting ? t("common.loading") : t("branches.createTransfer")}</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        }
      />

      {/* KPI Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("branches.branchesTab")}</CardTitle>
            <GitBranch className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{branches.length}</div>
            <p className="text-xs text-muted-foreground">Matawi yote</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("branches.active")}</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{activeBranches}</div>
            <p className="text-xs text-muted-foreground">Yanayofanya kazi</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("branches.pending")}</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{pendingTransfers}</div>
            <p className="text-xs text-muted-foreground">{t("branches.transfersTab")}</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("branches.completed")}</CardTitle>
            <ArrowRightLeft className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{completedTransfers}</div>
            <p className="text-xs text-muted-foreground">{t("branches.transfersTab")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search + Tabs */}
      <div className="space-y-4">
        {activeTab === "branches" && (
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("branches.searchPlaceholder")}
              className="pl-9 bg-muted/50 border-none focus-visible:ring-1"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        )}

        <div className="-mx-1 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="inline-flex w-max h-auto gap-1 rounded-md bg-muted/50 p-1">
            {([
              ["branches", t("branches.branchesTab"), branches.length],
              ["transfers", t("branches.transfersTab"), transfers.length],
            ] as const).map(([value, label, count]) => (
              <button
                key={value}
                onClick={() => setActiveTab(value as "branches" | "transfers")}
                className={`relative inline-flex items-center gap-2 whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all duration-200 ${activeTab === value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                <span>{label}</span>
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">{count}</span>
                {activeTab === value && (
                  <motion.span
                    layoutId="branches-tab-underline"
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
          <Loader size={24} />
        </div>
      ) : activeTab === "branches" ? (
        filteredBranches.length === 0 ? (
          <div className="rounded-xl border bg-card px-4 py-12 text-center text-muted-foreground">
            <GitBranch className="mx-auto h-8 w-8 mb-3 opacity-20" />
            {t("branches.noBranches")}
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block rounded-xl border bg-card overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left [&_th]:whitespace-nowrap [&_td]:whitespace-nowrap">
                  <thead className="sticky top-0 z-10 text-xs text-muted-foreground bg-muted/50 backdrop-blur uppercase">
                    <tr>
                      <th className="px-4 py-3 font-medium min-w-[220px]">{t("branches.branchesTab")}</th>
                      <th className="px-4 py-3 font-medium min-w-[220px]">{t("shops.location")}</th>
                      <th className="px-4 py-3 font-medium min-w-[150px]">{t("shops.phone")}</th>
                      <th className="px-4 py-3 font-medium">{t("admin.status")}</th>
                      <th className="px-4 py-3 font-medium text-right">{t("users.actions")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <AnimatePresence initial={false} mode="popLayout">
                      {filteredBranches.map((branch, i) => (
                        <motion.tr
                          key={branch.id}
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          transition={{ duration: 0.28, delay: Math.min(i, 12) * 0.03, ease: [0.22, 1, 0.36, 1] }}
                          className="group relative transition-colors duration-200 hover:bg-primary/5"
                        >
                          <td className="relative px-4 py-3 font-medium">
                            <span className="absolute left-0 top-1/2 h-0 w-[3px] -translate-y-1/2 rounded-r-full bg-primary transition-all duration-300 group-hover:h-3/5" />
                            <div className="flex items-center gap-3 transition-transform duration-200 group-hover:translate-x-1">
                              <div className="h-8 w-8 shrink-0 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                                <GitBranch className="h-4 w-4" />
                              </div>
                              <span className="truncate max-w-[180px]">{branch.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            <span className="flex items-center gap-1.5 truncate max-w-[220px]">
                              <MapPin className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">{branch.location || "—"}</span>
                            </span>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                              <Phone className="h-3.5 w-3.5 shrink-0" />
                              {branch.phone || "—"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={statusBadge(branch.isActive !== false ? "completed" : "pending")}>
                              {branch.isActive !== false ? t("branches.active") : t("branches.inactive")}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {permissions.canManageShops && (
                              <div className="flex items-center justify-end gap-2 opacity-60 transition-all duration-200 group-hover:opacity-100">
                                <Button size="sm" variant="outline" onClick={() => openEditBranch(branch)} className="gap-2 transition-transform duration-200 hover:-translate-y-0.5">
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => setToDelete(branch)} className="text-destructive hover:bg-destructive/10">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile cards */}
            <div className="grid gap-3 md:hidden">
              {filteredBranches.map((branch, i) => (
                <motion.div
                  key={branch.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.28, delay: Math.min(i, 8) * 0.03, ease: [0.22, 1, 0.36, 1] }}
                  className="rounded-xl border bg-card p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{branch.name}</p>
                      {branch.location && <p className="text-xs text-muted-foreground truncate">{branch.location}</p>}
                      {branch.phone && <p className="text-xs text-muted-foreground">{branch.phone}</p>}
                    </div>
                    <span className={statusBadge(branch.isActive !== false ? "completed" : "pending")}>
                      {branch.isActive !== false ? t("branches.active") : t("branches.inactive")}
                    </span>
                  </div>
                  {permissions.canManageShops && (
                    <div className="mt-3 pt-3 border-t flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1 gap-2" onClick={() => openEditBranch(branch)}>
                        <Edit className="h-4 w-4" />{t("common.edit")}
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => setToDelete(branch)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </>
        )
      ) : transfers.length === 0 ? (
        <div className="rounded-xl border bg-card px-4 py-12 text-center text-muted-foreground">
          <ArrowRightLeft className="mx-auto h-8 w-8 mb-3 opacity-20" />
          {t("branches.noTransfers")}
        </div>
      ) : (
        <>
          {/* Desktop transfers table */}
          <div className="hidden md:block rounded-xl border bg-card overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left [&_th]:whitespace-nowrap [&_td]:whitespace-nowrap">
                <thead className="sticky top-0 z-10 text-xs text-muted-foreground bg-muted/50 backdrop-blur uppercase">
                  <tr>
                    <th className="px-4 py-3 font-medium min-w-[220px]">{t("branches.product")}</th>
                    <th className="px-4 py-3 font-medium min-w-[160px]">{t("branches.fromBranch")}</th>
                    <th className="px-4 py-3 font-medium min-w-[160px]">{t("branches.toBranch")}</th>
                    <th className="px-4 py-3 font-medium text-right">{t("sales.quantity")}</th>
                    <th className="px-4 py-3 font-medium">{t("admin.status")}</th>
                    <th className="px-4 py-3 font-medium text-right">{t("users.actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <AnimatePresence initial={false} mode="popLayout">
                    {transfers.map((tr, i) => (
                      <motion.tr
                        key={tr.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.28, delay: Math.min(i, 12) * 0.03, ease: [0.22, 1, 0.36, 1] }}
                        className="group relative transition-colors duration-200 hover:bg-primary/5"
                      >
                        <td className="relative px-4 py-3 font-medium">
                          <span className="absolute left-0 top-1/2 h-0 w-[3px] -translate-y-1/2 rounded-r-full bg-primary transition-all duration-300 group-hover:h-3/5" />
                          <div className="flex items-center gap-3 transition-transform duration-200 group-hover:translate-x-1">
                            <div className="h-8 w-8 shrink-0 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                              <Package className="h-4 w-4" />
                            </div>
                            <span className="truncate max-w-[180px]">{tr.productName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground truncate max-w-[180px]">{getBranchName(tr.fromBranchId)}</td>
                        <td className="px-4 py-3 text-muted-foreground truncate max-w-[180px]">{getBranchName(tr.toBranchId)}</td>
                        <td className="px-4 py-3 text-right tabular-nums font-medium">{tr.quantity}</td>
                        <td className="px-4 py-3">
                          <span className={statusBadge(tr.status)}>
                            {tr.status === "completed" ? t("branches.completed") : tr.status === "pending" ? t("branches.pending") : t("branches.cancelled")}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {tr.status === "pending" && (
                            <div className="flex items-center justify-end gap-2 opacity-60 transition-all duration-200 group-hover:opacity-100">
                              <Button size="sm" variant="outline" onClick={() => handleCompleteTransfer(tr.id)} className="gap-2 transition-transform duration-200 hover:-translate-y-0.5">
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleCancelTransfer(tr.id)} className="text-destructive hover:bg-destructive/10">
                                <XIcon className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile transfers */}
          <div className="grid gap-3 md:hidden">
            {transfers.map((tr, i) => (
              <motion.div
                key={tr.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, delay: Math.min(i, 8) * 0.03, ease: [0.22, 1, 0.36, 1] }}
                className="rounded-xl border bg-card p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{tr.productName}</p>
                    <p className="text-xs text-muted-foreground">Qty: {tr.quantity}</p>
                  </div>
                  <span className={statusBadge(tr.status)}>{tr.status}</span>
                </div>
                <div className="mt-3 pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
                  <span className="truncate">{getBranchName(tr.fromBranchId)}</span>
                  <ArrowRightLeft className="h-3.5 w-3.5 mx-2 shrink-0 opacity-50" />
                  <span className="truncate">{getBranchName(tr.toBranchId)}</span>
                </div>
                {tr.status === "pending" && (
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1 gap-2" onClick={() => handleCompleteTransfer(tr.id)}>
                      <Check className="h-4 w-4" />{t("branches.complete")}
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => handleCancelTransfer(tr.id)}>
                      <XIcon className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </>
      )}

      {/* Delete Branch Confirm */}
      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("common.areYouSure")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("common.deleteConfirmation")} <strong>{toDelete?.name}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); handleDeleteBranch(); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
