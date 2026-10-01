import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, Search, Loader2, Wallet, Trash2, Edit2, TrendingUp, Filter,
  Home, Zap, Droplets, Car, Users, Wrench, Package, Megaphone,
  Smartphone, Utensils, Building, Receipt, Shield, Sparkles,
  CreditCard, BookOpen, RefreshCw, User, X, Calendar, ChevronRight,
  DownloadCloud, Target, FileText, List
} from "lucide-react";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { ExpensesPDF } from "@/components/reports/ExpensesPDF";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { usePaginatedExpenses, useCreateExpense, useEditExpense, useDeleteExpense } from "@/hooks/useExpenses";
import { ErrorAlert } from "@/components/ErrorAlert";
import { formatTZS } from "@/data/mockData";
import { toast } from "sonner";
import { useUserRole } from "@/hooks/useUserRole";
import { useActivityLogger } from "@/hooks/useActivityLogger";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import PageHeader from "@/components/common/PageHeader";
import EmptyState from "@/components/common/EmptyState";

const EXPENSE_CATEGORIES = [
  "Kodi ya Duka", "Umeme", "Maji", "Usafiri", "Mishahara",
  "Matengenezo", "Vifungashio", "Matangazo", "Simu/Internet",
  "Chakula", "Kodi/Ushuru",
  "Huduma za Benki", "Bima", "Usafi", "Usalama",
  "Vifaa vya Ofisi", "Mkopo/Riba",
  "Nyingine",
];

const getCategoryIcon = (category: string) => {
  switch (category) {
    case "Kodi ya Duka": return { icon: <Home className="h-5 w-5" />, color: "bg-blue-500/10 text-blue-500", hex: "#3b82f6" };
    case "Umeme": return { icon: <Zap className="h-5 w-5" />, color: "bg-yellow-500/10 text-yellow-500", hex: "#eab308" };
    case "Maji": return { icon: <Droplets className="h-5 w-5" />, color: "bg-cyan-500/10 text-cyan-500", hex: "#06b6d4" };
    case "Usafiri": return { icon: <Car className="h-5 w-5" />, color: "bg-emerald-500/10 text-emerald-500", hex: "#10b981" };
    case "Mishahara": return { icon: <Users className="h-5 w-5" />, color: "bg-purple-500/10 text-purple-500", hex: "#a855f7" };
    case "Matengenezo": return { icon: <Wrench className="h-5 w-5" />, color: "bg-orange-500/10 text-orange-500", hex: "#f97316" };
    case "Vifungashio": return { icon: <Package className="h-5 w-5" />, color: "bg-amber-500/10 text-amber-500", hex: "#f59e0b" };
    case "Matangazo": return { icon: <Megaphone className="h-5 w-5" />, color: "bg-pink-500/10 text-pink-500", hex: "#ec4899" };
    case "Simu/Internet": return { icon: <Smartphone className="h-5 w-5" />, color: "bg-indigo-500/10 text-indigo-500", hex: "#6366f1" };
    case "Chakula": return { icon: <Utensils className="h-5 w-5" />, color: "bg-red-500/10 text-red-500", hex: "#ef4444" };
    case "Kodi/Ushuru": return { icon: <Building className="h-5 w-5" />, color: "bg-slate-500/10 text-slate-500", hex: "#64748b" };
    case "Huduma za Benki": return { icon: <CreditCard className="h-5 w-5" />, color: "bg-teal-500/10 text-teal-500", hex: "#14b8a6" };
    case "Bima": return { icon: <Shield className="h-5 w-5" />, color: "bg-sky-500/10 text-sky-500", hex: "#0ea5e9" };
    case "Usafi": return { icon: <Sparkles className="h-5 w-5" />, color: "bg-lime-500/10 text-lime-500", hex: "#84cc16" };
    case "Usalama": return { icon: <Shield className="h-5 w-5" />, color: "bg-rose-500/10 text-rose-500", hex: "#f43f5e" };
    case "Vifaa vya Ofisi": return { icon: <BookOpen className="h-5 w-5" />, color: "bg-violet-500/10 text-violet-500", hex: "#8b5cf6" };
    case "Mkopo/Riba": return { icon: <TrendingUp className="h-5 w-5" />, color: "bg-red-700/10 text-red-700", hex: "#b91c1c" };
    default: return { icon: <Receipt className="h-5 w-5" />, color: "bg-destructive/10 text-destructive", hex: "#ef4444" };
  }
};

const emptyForm = { category: "", description: "", amount: 0, date: new Date().toISOString().split("T")[0], paymentMethod: "Taslimu", reference: "", notes: "", paidTo: "", isRecurring: false };

export default function Expenses() {
  const dispatch = useAppDispatch();
  const currentShopId = useAppSelector((s) => s.shops.currentShopId);
  const currentBranchId = useAppSelector((s) => s.branches.currentBranchId);
  const shops = useAppSelector((s) => s.shops.shops);
  const currentShop = shops.find(s => s.id === currentShopId);
  const user = useAppSelector((s) => s.auth.user);
  const { permissions } = useUserRole();
  const { log: logActivity } = useActivityLogger();
  
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: loading,
    error: expensesError
  } = usePaginatedExpenses(currentShopId, 20, currentBranchId);
  
  const createExpenseMut = useCreateExpense(currentShopId);
  const editExpenseMut = useEditExpense(currentShopId);
  const deleteExpenseMut = useDeleteExpense(currentShopId);

  const expenses = useMemo(() => {
    if (!data) return [];
    return data.pages.flatMap((page) => page.data);
  }, [data]);
  
  const hasMore = hasNextPage;

  const { t } = useI18n();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [period, setPeriod] = useState<"all" | "today" | "week" | "month">("month");
  const [selectedExpense, setSelectedExpense] = useState<any>(null);
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [budgets, setBudgets] = useState<Record<string, number>>(() => {
    try { return JSON.parse(localStorage.getItem(`budgets_${currentShopId}`) || "{}"); } catch { return {}; }
  });
  const [budgetDraft, setBudgetDraft] = useState<Record<string, number>>({});
  
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [expenseToDelete, setExpenseToDelete] = useState<any>(null);

  const saveBudgets = (updated: Record<string, number>) => {
    setBudgets(updated);
    localStorage.setItem(`budgets_${currentShopId}`, JSON.stringify(updated));
    toast.success("Bajeti imehifadhiwa!");
    setBudgetOpen(false);
  };

  const exportCSV = () => {
    const headers = ["Tarehe", "Maelezo", "Kundi", "Lipa kwa", "Njia ya Malipo", "Rejea", "Kiasi (TZS)"];
    const rows = filtered.map(e => [
      e.date, `"${e.description}"`, e.category,
      (e as any).paidTo || "", e.paymentMethod,
      e.reference || "", e.amount,
    ]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `Matumizi_${currentShop?.name || "Duka"}_${new Date().toISOString().split("T")[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success("CSV imepakuliwa!");
  };

  const loadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  const periodFiltered = useMemo(() => {
    const now = new Date();
    return expenses.filter((e) => {
      if (period === "today") {
        return e.date === now.toISOString().split("T")[0];
      } else if (period === "week") {
        const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7);
        return new Date(e.date) >= weekAgo;
      } else if (period === "month") {
        return e.date.startsWith(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
      }
      return true;
    });
  }, [expenses, period]);

  const filtered = useMemo(() => periodFiltered.filter((e) => {
    const matchSearch = e.description.toLowerCase().includes(search.toLowerCase()) || e.category.toLowerCase().includes(search.toLowerCase());
    const matchCategory = filterCategory === "all" || e.category === filterCategory;
    return matchSearch && matchCategory;
  }), [periodFiltered, search, filterCategory]);

  const totalExpenses = useMemo(() => filtered.reduce((sum, e) => sum + e.amount, 0), [filtered]);




  const periodLabel = useMemo(() => {
    const now = new Date();
    if (period === "today") return `Leo · ${now.toLocaleDateString("sw", { day: "numeric", month: "long" })}`;
    if (period === "week") return "Wiki Hii";
    if (period === "month") return now.toLocaleDateString("sw", { month: "long", year: "numeric" });
    return "Matumizi Yote";
  }, [period]);

  const openEdit = (exp: typeof expenses[0]) => {
    setEditId(exp.id);
    setForm({ category: exp.category, description: exp.description, amount: exp.amount, date: exp.date, paymentMethod: exp.paymentMethod, reference: exp.reference || "", notes: exp.notes || "", paidTo: (exp as any).paidTo || "", isRecurring: (exp as any).isRecurring || false });
    setSelectedExpense(null);
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentShopId || !form.category || !form.description || form.amount <= 0) {
      toast.error(t("expenses.fillRequired"));
      return;
    }
    setSubmitting(true); setProgress(30);
    try {
      setProgress(60);
      if (editId) {
        await editExpenseMut.mutateAsync({ id: editId, data: { ...form, amount: +form.amount } });
        logActivity({ action: "expense_updated", category: "expense", details: `${form.description}` });
        toast.success(t("expenses.updated"));
      } else {
        const expenseData: any = {
          ...form,
          amount: +form.amount,
          shopId: currentShopId,
          category: form.category || "Nyingine",
          notes: form.notes?.trim() || "",
          reference: form.reference?.trim() || "",
          paidTo: form.paidTo?.trim() || "",
          isRecurring: form.isRecurring || false,
        };
        await createExpenseMut.mutateAsync(expenseData);
        logActivity({ action: "expense_created", category: "expense", details: `${form.description} - ${formatTZS(+form.amount)}` });
        toast.success(t("expenses.recorded"));
      }
      setProgress(100);
      setDialogOpen(false); setForm(emptyForm); setEditId(null); setProgress(0);
    } catch (err: any) {
      toast.error(err?.message || t("products.failed"));
    }
    setSubmitting(false);
  };

  const handleDelete = async () => {
    if (!expenseToDelete) return;
    try {
      await deleteExpenseMut.mutateAsync(expenseToDelete.id);
      logActivity({ action: "expense_deleted", category: "expense", details: `${expenseToDelete.description}` });
      toast.success(t("expenses.deleted"));
      setExpenseToDelete(null);
    } catch {
      toast.error(t("expenses.failedDelete"));
    }
  };

  return (
    <div>
      <ErrorAlert error={expensesError?.message || null} onClear={() => {}} />
      <PageHeader
        title={t("expenses.title")}
        description={t("expenses.subtitle")}
        actions={
          <>
          {/* CSV Export */}
          {filtered.length > 0 && (
            <Button variant="outline" onClick={exportCSV} className="gap-2">
              <FileText className="h-4 w-4" /> CSV
            </Button>
          )}

          {/* PDF Export */}
          {filtered.length > 0 && (
            <PDFDownloadLink
              document={<ExpensesPDF expenses={filtered} period={periodLabel} shopName={currentShop?.name || "Duka"} total={totalExpenses} generatedBy={user?.displayName || "Owner"} formatTZS={formatTZS} />}
              fileName={`Matumizi_${currentShop?.name || "Duka"}_${new Date().toISOString().split("T")[0]}.pdf`}
            >
              {({ loading: pdfLoading }) => (
                <Button variant="outline" disabled={pdfLoading} className="gap-2">
                  {pdfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <DownloadCloud className="h-4 w-4" />}
                  PDF
                </Button>
              )}
            </PDFDownloadLink>
          )}

          {/* Budget Settings */}
          <Button variant="outline" onClick={() => { setBudgetDraft({ ...budgets }); setBudgetOpen(true); }} className="gap-2" disabled={!currentShopId}>
            <Target className="h-4 w-4" /> Bajeti
          </Button>

          {/* Add Expense */}
          {permissions.canAddExpense && (
        <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) { setForm(emptyForm); setEditId(null); setProgress(0); } }}>
          <DialogTrigger asChild>
            <Button disabled={!currentShopId} className="gap-2">
              <Plus className="h-4 w-4" /> {t("expenses.newExpense")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editId ? t("expenses.editTitle") : t("expenses.addTitle")}</DialogTitle></DialogHeader>
            {submitting && <Progress value={progress} className="h-1.5" />}
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">{t("expenses.category")} *</label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue placeholder="..." /></SelectTrigger>
                    <SelectContent>
                      {EXPENSE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">{t("expenses.date")} *</label>
                  <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">{t("expenses.description")} *</label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">{t("expenses.amount")} *</label>
                  <Input type="number" min={1} value={form.amount || ""} onChange={(e) => setForm({ ...form, amount: +e.target.value })} required />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">{t("expenses.paymentMethod")}</label>
                  <Select value={form.paymentMethod} onValueChange={(v) => setForm({ ...form, paymentMethod: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Taslimu">Taslimu</SelectItem>
                      <SelectItem value="M-Pesa">M-Pesa</SelectItem>
                      <SelectItem value="Tigo Pesa">Tigo Pesa</SelectItem>
                      <SelectItem value="Benki">Benki</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">{t("expenses.paidToLabel") || "Lipa kwa (Paid To)"}</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input value={form.paidTo} onChange={(e) => setForm({ ...form, paidTo: e.target.value })} placeholder={t("expenses.paidToPlaceholder") || "Jina la mlipwa..."} className="pl-9" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">{t("expenses.reference")}</label>
                  <Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder={t("sales.optional")} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">{t("expenses.moreNotes")}</label>
                <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder={t("sales.optional")} />
              </div>
              <label className="flex items-center gap-3 p-3 rounded-2xl border border-border/50 bg-muted/20 cursor-pointer hover:bg-muted/40 transition-colors">
                <input
                  type="checkbox"
                  checked={form.isRecurring}
                  onChange={(e) => setForm({ ...form, isRecurring: e.target.checked })}
                  className="h-4 w-4 rounded accent-primary"
                />
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm font-bold text-foreground">{t("expenses.monthlyRecurring") || "Matumizi ya Kila Mwezi"}</p>
                    <p className="text-[10px] text-muted-foreground">{t("expenses.recurringDesc") || "Recurring — e.g. rent, salaries, internet"}</p>
                  </div>
                </div>
              </label>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t("common.loading")}</> : editId ? t("expenses.saveChanges") : t("expenses.record")}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
        )}
          </>
        }
      />

        {/* Budget Settings Dialog */}
        <Dialog open={budgetOpen} onOpenChange={setBudgetOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" /> Pangia Bajeti ya Mwezi
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto px-1 py-2 custom-scrollbar">
              <p className="text-sm text-muted-foreground">{t("expenses.budgetDesc") || "Weka kikomo cha matumizi kwa kila kundi. Matumizi yatakapokaribia au kuzidi bajeti, utaweza kuona kwenye ripoti."}</p>
              {EXPENSE_CATEGORIES.map(cat => {
                const { icon, color } = getCategoryIcon(cat);
                return (
                  <div key={cat} className="flex items-center gap-3 p-3 rounded-2xl bg-muted/20 border border-border/50">
                    <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0", color)}>{icon}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground mb-1">{cat}</p>
                      <Input
                        type="number"
                        min={0}
                        placeholder={t("expenses.amountPlaceholder") || "Kiasi (TZS)..."}
                        value={budgetDraft[cat] || ""}
                        onChange={(e) => setBudgetDraft({ ...budgetDraft, [cat]: +e.target.value })}
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t border-border/50">
              <Button variant="ghost" onClick={() => setBudgetOpen(false)}>{t("common.cancel") || "Ghairi"}</Button>
              <Button onClick={() => saveBudgets(budgetDraft)}>{t("expenses.saveBudget") || "Hifadhi Bajeti"}</Button>
            </div>
          </DialogContent>
        </Dialog>

      {currentShopId && !loading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="hover:-translate-y-1 hover:shadow-md transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t("expenses.totalExpenses") || "Jumla Matumizi"}</CardTitle>
              <Wallet className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums">
                -{formatTZS(totalExpenses)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{periodLabel}</p>
            </CardContent>
          </Card>
          <Card className="hover:-translate-y-1 hover:shadow-md transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t("expenses.recordCount") || "Idadi ya Rekodi"}</CardTitle>
              <Receipt className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums">{filtered.length}</div>
              <p className="text-xs text-muted-foreground mt-1">{t("expenses.forThisPeriod") || "Kwa kipindi hiki"}</p>
            </CardContent>
          </Card>
          <Card className="hover:-translate-y-1 hover:shadow-md transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t("expenses.averagePerRecord") || "Wastani kwa Rekodi"}</CardTitle>
              <TrendingUp className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums">
                {filtered.length > 0 ? formatTZS(Math.round(totalExpenses / filtered.length)) : "—"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{t("expenses.forThisPeriod") || "Kwa kipindi hiki"}</p>
            </CardContent>
          </Card>
          <Card className="hover:-translate-y-1 hover:shadow-md transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t("expenses.categoriesUsed") || "Makundi Yaliyotumika"}</CardTitle>
              <List className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums">
                {new Set(filtered.map(e => e.category)).size}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{t("expenses.different") || "Tofauti"}</p>
            </CardContent>
          </Card>
        </div>
      )}



      <div className="flex flex-col md:flex-row gap-4 mb-6 fade-in-up" style={{ animationDelay: "120ms" }}>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("expenses.searchPlaceholder") || "Tafuta matumizi..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-muted/50 border-none focus-visible:ring-1"
          />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-full md:w-[220px] bg-muted/50 border-none focus:ring-1">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder={t("expenses.categoryFilter") || "Kundi"} />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("expenses.allCategories") || "Makundi Yote"}</SelectItem>
            {EXPENSE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Tabs value={period} onValueChange={setPeriod as any} className="mb-6 fade-in-up" style={{ animationDelay: "130ms" }}>
        <div className="-mx-1 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <TabsList className="inline-flex w-max h-auto gap-1 bg-muted/50 p-1">
            {([
              ["all", t("expenses.periodAll") || "Zote"],
              ["today", t("expenses.periodToday") || "Leo"],
              ["week", t("expenses.periodWeek") || "Wiki Hii"],
              ["month", t("expenses.periodMonth") || "Mwezi Huu"],
            ] as const).map(([value, label]) => (
              <TabsTrigger key={value} value={value} className="relative gap-2 px-4 py-2 transition-all duration-200 data-[state=active]:shadow-sm">
                <span>{label}</span>
                {period === value && (
                  <motion.span
                    layoutId="expenses-tab-underline"
                    className="absolute inset-x-2 -bottom-0.5 h-0.5 rounded-full bg-primary"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </Tabs>

      {!currentShopId ? (
        <div className="glass-card rounded-3xl p-12 text-center border-primary/5 fade-in-up">
          <div className="h-20 w-20 rounded-3xl bg-primary/5 flex items-center justify-center mx-auto mb-6"><Wallet className="h-10 w-10 text-primary/30" /></div>
          <h3 className="text-lg font-black text-foreground mb-2">{t("expenses.noShopSelectedTitle") || "Hakuna Duka Lililochaguliwa"}</h3>
          <p className="text-muted-foreground text-sm">{t("expenses.addShopFirst")}</p>
        </div>
      ) : loading ? (
        <div className="space-y-3 max-w-5xl mx-auto">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="glass-card rounded-2xl p-5 animate-pulse flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-muted/50 shrink-0" />
              <div className="flex-1 space-y-2"><div className="h-4 bg-muted/50 rounded-full w-1/2" /><div className="h-3 bg-muted/30 rounded-full w-1/3" /></div>
              <div className="h-6 bg-muted/50 rounded-full w-24" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title={t("expenses.noExpensesTitle") || "Hakuna Matumizi"}
          description={period === "today" ? (t("expenses.noExpensesToday") || "Hakuna matumizi yaliyorekodiwa leo.") : period === "week" ? (t("expenses.noExpensesWeek") || "Hakuna matumizi wiki hii.") : period === "month" ? (t("expenses.noExpensesMonth") || "Hakuna matumizi mwezi huu.") : (t("expenses.noExpensesAll") || "Bado hujarekordi matumizi yoyote.")}
          action={
            permissions.canAddExpense && (
              <Button onClick={() => setDialogOpen(true)} className="rounded px-6">
                <Plus className="h-4 w-4 mr-2" /> Rekodi Matumizi ya Kwanza
              </Button>
            )
          }
        />
      ) : (
        <>
          <div className="hidden md:block rounded-xl border bg-card overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left [&_th]:whitespace-nowrap [&_td]:whitespace-nowrap">
                <thead className="sticky top-0 z-10 text-xs text-muted-foreground bg-muted/50 backdrop-blur uppercase">
                  <tr>
                    <th className="px-4 py-3 font-medium">{t("expenses.colDate") || "Tarehe"}</th>
                    <th className="px-4 py-3 font-medium">{t("expenses.colDescription") || "Maelezo"}</th>
                    <th className="px-4 py-3 font-medium">{t("expenses.colCategory") || "Kundi"}</th>
                    <th className="px-4 py-3 font-medium">{t("expenses.colPaidTo") || "Lipa kwa"}</th>
                    <th className="px-4 py-3 font-medium">{t("expenses.colPaymentMethod") || "Njia ya Malipo"}</th>
                    <th className="px-4 py-3 font-medium text-right">{t("expenses.colAmount") || "Kiasi"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <AnimatePresence initial={false} mode="popLayout">
                    {filtered.map((e, i) => {
                      const { icon, color, hex } = getCategoryIcon(e.category);
                      return (
                        <motion.tr
                          key={e.id}
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          transition={{ duration: 0.28, delay: Math.min(i, 12) * 0.03, ease: [0.22, 1, 0.36, 1] }}
                          onClick={() => setSelectedExpense(e)}
                          className="group relative cursor-pointer transition-colors duration-200 hover:bg-primary/5"
                        >
                          <td className="relative px-4 py-3">
                            <span className="absolute left-0 top-1/2 h-0 w-[3px] -translate-y-1/2 rounded-r-full bg-primary transition-all duration-300 group-hover:h-3/5" />
                            <span className="inline-block transition-transform duration-200 group-hover:translate-x-1 text-muted-foreground">
                              {e.date}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium max-w-[200px] truncate">{e.description}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: hex }} />
                              <span style={{ color: hex }} className="font-semibold text-xs uppercase tracking-wider">{e.category}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{(e as any).paidTo || "-"}</td>
                          <td className="px-4 py-3 text-muted-foreground">{e.paymentMethod}</td>
                          <td className="px-4 py-3 text-right font-semibold">
                            -{formatTZS(e.amount)}
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
                <tfoot className="bg-muted/30">
                  <tr>
                    <td colSpan={5} className="px-4 py-3 text-xs font-bold uppercase tracking-widest text-muted-foreground text-right">
                      {t("expenses.totalLabel") || "Jumla"} · {periodLabel}
                    </td>
                    <td className="px-4 py-3 text-right font-black text-destructive">
                      -{formatTZS(totalExpenses)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="md:hidden space-y-3">
            {filtered.map((e) => {
              const { icon, color, hex } = getCategoryIcon(e.category);
              return (
                <Card 
                  key={e.id} 
                  className="cursor-pointer hover:shadow-md transition-all active:scale-[0.98]" 
                  onClick={() => setSelectedExpense(e)}
                >
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={cn("h-10 w-10 rounded flex items-center justify-center shrink-0", color)}>{icon}</div>
                      <div className="min-w-0">
                        <p className="font-bold text-sm truncate">{e.description}</p>
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5">
                          <span>{e.date}</span>
                          <span>·</span>
                          <span style={{ color: hex }} className="font-bold">{e.category}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="font-bold text-destructive text-sm">-{formatTZS(e.amount)}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            
            <div className="rounded p-4 border border-destructive/10 bg-destructive/5 flex justify-between items-center mt-4">
              <span className="text-xs font-bold uppercase tracking-widest text-destructive">{t("expenses.totalLabel") || "Jumla"}</span>
              <span className="font-bold text-destructive text-sm">-{formatTZS(totalExpenses)}</span>
            </div>
          </div>

          {/* Load More */}
          {hasMore && (
            <div className="flex justify-center pt-6">
              <Button variant="outline" onClick={loadMore} disabled={loading}>
                {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t("common.loading") || "Inapakia..."}</> : "Onesha Zaidi"}
              </Button>
            </div>
          )}
        </>
      )}

      {/* ── Slide-out Detail Drawer ──────────────────────── */}
      {selectedExpense && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setSelectedExpense(null)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-md h-full bg-background border-l border-border/50 shadow-2xl overflow-y-auto flex flex-col animate-in slide-in-from-right duration-300"
            onClick={e => e.stopPropagation()}
          >
            {/* Drawer Header */}
            {(() => {
              const { icon, color, hex } = getCategoryIcon(selectedExpense.category);
              return (
                <>
                  <div className="p-6 border-b border-border/40 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center shadow-sm", color)}>{icon}</div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{selectedExpense.category}</p>
                        <h2 className="font-black text-foreground text-lg leading-tight">{selectedExpense.description}</h2>
                      </div>
                    </div>
                    <button onClick={() => setSelectedExpense(null)} className="rounded-xl p-2 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Amount Hero */}
                  <div className="p-6 border-b border-border/40 bg-destructive/5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{t("expenses.amountPaid") || "Kiasi Kilicholipwa"}</p>
                    <p className="text-4xl font-black tracking-tight" style={{ color: hex }}>-{formatTZS(selectedExpense.amount)}</p>
                  </div>

                  {/* Detail Fields */}
                  <div className="p-6 space-y-4 flex-1">
                    {[
                      { label: t("expenses.colDate") || "Tarehe", value: selectedExpense.date, icon: <Calendar className="h-4 w-4" /> },
                      { label: t("expenses.colPaymentMethod") || "Njia ya Malipo", value: selectedExpense.paymentMethod, icon: <Wallet className="h-4 w-4" /> },
                      selectedExpense.paidTo && { label: t("expenses.colPaidTo") || "Lipa kwa", value: selectedExpense.paidTo, icon: <User className="h-4 w-4" /> },
                      selectedExpense.reference && { label: t("expenses.colReference") || "Nambari ya Rejea", value: selectedExpense.reference, icon: <Receipt className="h-4 w-4" /> },
                      selectedExpense.notes && { label: t("expenses.colNotes") || "Maelezo Zaidi", value: selectedExpense.notes, icon: <BookOpen className="h-4 w-4" /> },
                    ].filter(Boolean).map((row: any) => (
                      <div key={row.label} className="flex items-start gap-3 p-3 rounded-2xl bg-muted/20">
                        <div className="h-8 w-8 rounded-xl bg-muted/50 flex items-center justify-center text-muted-foreground shrink-0">{row.icon}</div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{row.label}</p>
                          <p className="font-bold text-foreground text-sm mt-0.5">{row.value}</p>
                        </div>
                      </div>
                    ))}
                    {(selectedExpense as any).isRecurring && (
                      <div className="flex items-center gap-3 p-3 rounded-2xl bg-primary/5 border border-primary/10">
                        <RefreshCw className="h-4 w-4 text-primary" />
                        <p className="text-sm font-black text-primary">{t("expenses.monthlyRecurringFull") || "Matumizi ya Kila Mwezi (Recurring)"}</p>
                      </div>
                    )}
                  </div>

                  {/* Drawer Actions */}
                  <div className="p-6 border-t border-border/40 flex gap-3">
                    {permissions.canEditExpense && (
                      <Button className="flex-1 rounded-2xl" onClick={() => openEdit(selectedExpense)}>
                        <Edit2 className="h-4 w-4 mr-2" /> Hariri
                      </Button>
                    )}
                    {permissions.canDeleteExpense && (
                      <Button variant="destructive" className="flex-1 rounded-2xl" onClick={() => { setExpenseToDelete(selectedExpense); setSelectedExpense(null); }}>
                        <Trash2 className="h-4 w-4 mr-2" /> Futa
                      </Button>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      <AlertDialog open={!!expenseToDelete} onOpenChange={(open) => !open && setExpenseToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("common.areYouSure")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("common.deleteConfirmation")} <span className="font-semibold text-foreground">{expenseToDelete?.description}</span>?
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