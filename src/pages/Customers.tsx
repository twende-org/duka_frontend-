import { useEffect, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Fuse from "fuse.js";
import { Plus, Search, Edit, Trash2, UserCheck, Phone, Mail, MapPin, ShoppingCart, Eye, Users, Hash, Receipt, CreditCard, User, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from "@/components/common/PageHeader";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAppSelector } from "@/store/hooks";
import { getCustomers, addCustomer, updateCustomer, deleteCustomer } from "@/lib/api/domains/customers";
import { getPendingBusinessApplications, approveBusinessApplication, rejectBusinessApplication } from "@/lib/api/domains/platformUsers";
import { formatTZS } from "@/data/mockData";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { useUserRole } from "@/hooks/useUserRole";
import { ErrorAlert } from "@/components/ErrorAlert";
import { useOrders } from "@/hooks/useOrders";
import type { Customer } from "@/types";
import { CustomerWizard } from "@/components/customers/CustomerWizard";
import { Loader } from "@/components/common/Loader";



export default function Customers() {
  const currentShopId = useAppSelector((s) => s.shops.currentShopId);
  const { permissions } = useUserRole();
  const { t } = useI18n();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [toDelete, setToDelete] = useState<Customer | null>(null);
  const [detailCustomer, setDetailCustomer] = useState<Customer | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const { data: allOrders = [] } = useOrders(currentShopId);

  // Wholesale Portal Applications state
  const [activeTab, setActiveTab] = useState<"crm" | "applications">("crm");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [applications, setApplications] = useState<any[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);

  const loadApplications = useCallback(async () => {
    setLoadingApps(true);
    try {
      const data = await getPendingBusinessApplications();
      setApplications(data);
    } catch (e) {
      console.error("Error loading business applications:", e);
    } finally {
      setLoadingApps(false);
    }
  }, []);

  const handleApprove = async (userId: string, company: string) => {
    try {
      await approveBusinessApplication(userId);
      toast.success(`Akaunti ya Jumla kwa ${company} imethibitishwa!`);
      loadApplications();
    } catch (e) {
      toast.error("Imeshindwa kuthibitisha ombi.");
    }
  };

  const handleReject = async (userId: string, company: string) => {
    try {
      await rejectBusinessApplication(userId);
      toast.error(`Ombi la Jumla kwa ${company} limekataliwa.`);
      loadApplications();
    } catch (e) {
      toast.error("Imeshindwa kukataa ombi.");
    }
  };

  const loadCustomers = useCallback(async () => {
    if (!currentShopId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getCustomers(currentShopId);
      setCustomers(data);
      
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : String(err));
    }
    setLoading(false);
  }, [currentShopId]);

  useEffect(() => { loadCustomers(); }, [loadCustomers]);

  const filtered = useMemo(() => {
    if (!search.trim()) return customers;
    const fuse = new Fuse(customers, {
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
  }, [customers, search]);

  function openEdit(c: Customer) {
    setEditing(c);
    setDialogOpen(true);
  }

  function resetForm() {
    setEditing(null);
  }

  async function handleWizardSubmit(data: any) {
    if (!currentShopId) return;
    try {
      const customerData: Omit<Customer, "id"> = {
        ...data,
        shopId: currentShopId,
      };
      if (editing) {
        await updateCustomer(editing.id, customerData);
        toast.success(t("customers.updated"));
      } else {
        await addCustomer(customerData);
        toast.success(t("customers.added"));
      }
      resetForm();
      setDialogOpen(false);
      loadCustomers();
    } catch (err: unknown) { 
      const error = err as Error;
      setError(error.message);
      toast.error(error.message); 
      throw error;
    }
  }

  async function handleDelete() {
    if (!toDelete) return;
    try {
      await deleteCustomer(toDelete.id);
      toast.success(t("customers.deleted"));
      setToDelete(null);
      loadCustomers();
    } catch (err: unknown) { 
      const error = err as Error;
      toast.error(error.message); 
    }
  }

  if (!currentShopId) {
    return (
      <div className="bg-muted/10 border-2 border-dashed border-border/50 rounded-2xl text-center py-16 px-6 max-w-lg mx-auto mt-10">
        <ErrorAlert error={error} onClear={() => setError(null)} />
        <div className="h-16 w-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
          <UserCheck className="h-8 w-8 text-muted-foreground/40" />
        </div>
        <h3 className="text-lg font-black mb-2 text-foreground">{t("products.addShopFirst")}</h3>
        <p className="text-sm font-medium text-muted-foreground">Select a shop from the sidebar to manage your customer database.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 fade-in-up">
      <ErrorAlert error={error} onClear={() => setError(null)} />

      <PageHeader
        title={t("nav.customers")}
        description={t("customers.subtitle")}
        actions={
          <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) resetForm(); setDialogOpen(o); }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                {t("customers.add")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl w-[95vw] h-[85vh] p-0 gap-0 overflow-hidden">
              <CustomerWizard
                initialData={editing}
                onSubmit={handleWizardSubmit}
                onCancel={() => { resetForm(); setDialogOpen(false); }}
                lang={t("customers.add") === "Add Customer" ? "en" : "sw"}
              />
            </DialogContent>
          </Dialog>
        }
      />

      {/* KPI Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("customers.totalCustomers")}</CardTitle>
            <Users className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{customers.length}</div>
            <p className="text-xs text-muted-foreground">{t("customers.registered") !== "customers.registered" ? t("customers.registered") : "Waliosajiliwa"}</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("customers.withPhone")}</CardTitle>
            <Phone className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{customers.filter(c => c.phone).length}</div>
            <p className="text-xs text-muted-foreground">{t("customers.contactable") !== "customers.contactable" ? t("customers.contactable") : "Wanaopatikana"}</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("customers.totalSpentAll")}</CardTitle>
            <CreditCard className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{formatTZS(customers.reduce((s, c) => s + (c.totalSpent || 0), 0))}</div>
            <p className="text-xs text-muted-foreground">{t("customers.salesValue") !== "customers.salesValue" ? t("customers.salesValue") : "Thamani ya mauzo"}</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("customers.totalPurchasesAll")}</CardTitle>
            <Receipt className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{customers.reduce((s, c) => s + (c.totalPurchases || 0), 0)}</div>
            <p className="text-xs text-muted-foreground">{t("customers.transactionsCount") !== "customers.transactionsCount" ? t("customers.transactionsCount") : "Miamala"}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search + Tabs */}
      <div className="space-y-4">
        {activeTab === "crm" && (
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("customers.searchPlaceholder")}
              className="pl-9 bg-muted/50 border-none focus-visible:ring-1"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        )}

        <div className="-mx-1 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="inline-flex w-max h-auto gap-1 rounded-md bg-muted/50 p-1">
            {([
              ["crm", "CRM Wateja", customers.length],
              ["applications", "Maombi ya Jumla", applications.length],
            ] as const).map(([value, label, count]) => (
              <button
                key={value}
                onClick={() => { setActiveTab(value as "crm" | "applications"); if (value === "applications") loadApplications(); }}
                className={`relative inline-flex items-center gap-2 whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all duration-200 ${activeTab === value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                <span>{label}</span>
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
                  {count}
                </span>
                {activeTab === value && (
                  <motion.span
                    layoutId="customers-tab-underline"
                    className="absolute inset-x-2 -bottom-0.5 h-0.5 rounded-full bg-primary"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>


      {/* Table */}
      {activeTab === "applications" ? (
        loadingApps ? (
          <div className="flex justify-center py-20">
            <Loader size={14} />
          </div>
        ) : applications.length === 0 ? (
          <div className="rounded-xl border bg-card px-4 py-12 text-center text-muted-foreground">
            <Users className="mx-auto h-8 w-8 mb-3 opacity-20" />
            Hakuna Maombi Mapya
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {applications.map((app, i) => (
              <motion.div
                key={app.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, delay: Math.min(i, 8) * 0.03, ease: [0.22, 1, 0.36, 1] }}
                className="rounded-xl border bg-card p-4 shadow-sm flex flex-col justify-between gap-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
              >
                <div>
                  <div className="flex justify-between items-start gap-2 border-b pb-3 mb-3">
                    <div className="min-w-0">
                      <h4 className="font-semibold text-sm truncate">{app.businessProfile.companyName}</h4>
                      <p className="text-xs text-muted-foreground">TIN: {app.businessProfile.tin}</p>
                    </div>
                    <span className="shrink-0 whitespace-nowrap rounded-md border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-500">PENDING</span>
                  </div>

                  <div className="space-y-1.5 text-xs text-muted-foreground">
                    <p className="text-foreground font-medium mb-1">Mwakilishi (Representative)</p>
                    <p className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> {app.displayName}</p>
                    <p className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> {app.email}</p>
                    <p className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> {app.phone || "N/A"}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-3 border-t">
                  <Button size="sm" onClick={() => handleApprove(app.id, app.businessProfile.companyName)} className="flex-1 min-w-[110px] gap-2 bg-orange-600 hover:bg-orange-700 text-white">Kubali</Button>
                  <Button size="sm" variant="ghost" onClick={() => handleReject(app.id, app.businessProfile.companyName)} className="flex-1 min-w-[110px] text-destructive hover:bg-destructive/10">Kataa</Button>
                </div>
              </motion.div>
            ))}
          </div>
        )
      ) : loading ? (
        <div className="flex justify-center py-20">
          <Loader size={14} />
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block rounded-xl border bg-card overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left [&_th]:whitespace-nowrap [&_td]:whitespace-nowrap">
                <thead className="sticky top-0 z-10 text-xs text-muted-foreground bg-muted/50 backdrop-blur uppercase">
                  <tr>
                    <th className="px-4 py-3 font-medium">{t("customers.name")}</th>
                    <th className="px-4 py-3 font-medium">{t("customers.phone")}</th>
                    <th className="px-4 py-3 font-medium">{t("customers.email")}</th>
                    <th className="px-4 py-3 font-medium text-right">Purchases</th>
                    <th className="px-4 py-3 font-medium text-right">{t("customers.totalSpentLabel")}</th>
                    <th className="px-4 py-3 font-medium text-right">{t("users.actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                          <Users className="mx-auto h-8 w-8 mb-3 opacity-20" />
                          {t("customers.noCustomers")}
                        </motion.div>
                      </td>
                    </tr>
                  ) : (
                    <AnimatePresence initial={false} mode="popLayout">
                      {filtered.map((c, i) => (
                        <motion.tr
                          key={c.id}
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          transition={{ duration: 0.28, delay: Math.min(i, 12) * 0.03, ease: [0.22, 1, 0.36, 1] }}
                          onClick={() => setDetailCustomer(c)}
                          className="group relative cursor-pointer transition-colors duration-200 hover:bg-primary/5"
                        >
                          <td className="relative px-4 py-3 font-medium">
                            <span className="absolute left-0 top-1/2 h-0 w-[3px] -translate-y-1/2 rounded-r-full bg-primary transition-all duration-300 group-hover:h-3/5" />
                            <div className="flex items-center gap-3 transition-transform duration-200 group-hover:translate-x-1">
                              <div className="h-8 w-8 shrink-0 rounded-full bg-muted flex items-center justify-center text-xs font-semibold">
                                {c.name.charAt(0).toUpperCase()}
                              </div>
                              <span>{c.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{c.phone || "—"}</td>
                          <td className="px-4 py-3 text-muted-foreground">{c.email || "—"}</td>
                          <td className="px-4 py-3 text-right tabular-nums">{c.totalPurchases || 0}</td>
                          <td className="px-4 py-3 text-right font-medium tabular-nums">{formatTZS(c.totalSpent || 0)}</td>
                          <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-2">
                              <div className="flex items-center gap-2 opacity-60 transition-all duration-200 group-hover:opacity-100">
                                <Button size="sm" variant="outline" onClick={() => setDetailCustomer(c)} className="gap-2 transition-transform duration-200 hover:-translate-y-0.5">
                                  <Eye className="h-4 w-4" />
                                  View
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => openEdit(c)} className="gap-2 transition-transform duration-200 hover:-translate-y-0.5">
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => setToDelete(c)} className="text-destructive hover:bg-destructive/10">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-all duration-200 group-hover:translate-x-1 group-hover:text-foreground" />
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

          {/* Mobile card list */}
          <div className="md:hidden space-y-3">
            {filtered.length === 0 ? (
              <div className="rounded-xl border bg-card px-4 py-12 text-center text-muted-foreground">
                <Users className="mx-auto h-8 w-8 mb-3 opacity-20" />
                {t("customers.noCustomers")}
              </div>
            ) : (
              <AnimatePresence initial={false} mode="popLayout">
                {filtered.map((c, i) => (
                  <motion.div
                    key={c.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.28, delay: Math.min(i, 8) * 0.03, ease: [0.22, 1, 0.36, 1] }}
                    onClick={() => setDetailCustomer(c)}
                    className="rounded-xl border bg-card p-4 shadow-sm active:scale-[0.99] transition-transform"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{c.name}</div>
                        <div className="text-xs text-muted-foreground truncate">{c.phone || c.email || "—"}</div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="font-semibold tabular-nums">{formatTZS(c.totalSpent || 0)}</div>
                        <div className="text-xs text-muted-foreground tabular-nums">{c.totalPurchases || 0} purchases</div>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
                      <Button size="sm" variant="outline" onClick={() => setDetailCustomer(c)} className="flex-1 min-w-[110px] gap-2">
                        <Eye className="h-4 w-4" />
                        View
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openEdit(c)} className="flex-1 min-w-[110px] gap-2">
                        <Edit className="h-4 w-4" />
                        Edit
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setToDelete(c)} className="flex-1 min-w-[110px] gap-2 text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </>
      )}


      {/* Detail Dialog */}
      <Dialog open={!!detailCustomer} onOpenChange={(o) => !o && setDetailCustomer(null)}>
        <DialogContent className="max-w-md rounded-3xl p-0 overflow-hidden border-border/50 shadow-2xl">
          {detailCustomer && (
            <>
              <div className="bg-muted/30 px-6 py-8 border-b border-border/50 flex flex-col items-center text-center">
                <div className="h-20 w-20 rounded-full bg-primary/10 border-4 border-background shadow-sm flex items-center justify-center text-primary text-3xl font-black mb-4">
                   {detailCustomer.name.charAt(0).toUpperCase()}
                </div>
                <DialogTitle className="text-2xl font-black tracking-tight text-foreground">{detailCustomer.name}</DialogTitle>
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mt-1">Customer Profile</p>
              </div>
              
              <div className="p-6 space-y-6 bg-card">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-primary/5 border border-primary/10 p-4 rounded-2xl text-center">
                    <p className="text-[10px] font-black text-primary/70 uppercase tracking-widest mb-1">{t("customers.totalPurchasesLabel")}</p>
                    <p className="text-3xl font-black text-primary">{detailCustomer.totalPurchases || 0}</p>
                  </div>
                  <div className="bg-emerald-500/5 border border-emerald-500/10 p-4 rounded-2xl text-center flex flex-col justify-center">
                    <p className="text-[10px] font-black text-emerald-600/70 dark:text-emerald-500/70 uppercase tracking-widest mb-1">{t("customers.totalSpentLabel")}</p>
                    <p className="text-lg font-black text-emerald-600 dark:text-emerald-500">{formatTZS(detailCustomer.totalSpent || 0)}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {detailCustomer.phone && (
                    <a href={`tel:${detailCustomer.phone}`} className="flex items-center gap-4 p-3.5 rounded-2xl bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors group">
                      <div className="h-10 w-10 rounded-xl bg-background border border-border/50 flex items-center justify-center text-foreground group-hover:scale-110 transition-transform shadow-sm"><Phone className="h-4 w-4" /></div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-0.5">Phone Number</p>
                        <p className="font-bold text-sm text-foreground">{detailCustomer.phone}</p>
                      </div>
                    </a>
                  )}
                  {detailCustomer.email && (
                    <a href={`mailto:${detailCustomer.email}`} className="flex items-center gap-4 p-3.5 rounded-2xl bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors group">
                      <div className="h-10 w-10 rounded-xl bg-background border border-border/50 flex items-center justify-center text-foreground group-hover:scale-110 transition-transform shadow-sm"><Mail className="h-4 w-4" /></div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-0.5">Email Address</p>
                        <p className="font-bold text-sm text-foreground">{detailCustomer.email}</p>
                      </div>
                    </a>
                  )}
                  {detailCustomer.address && (
                    <div className="flex items-center gap-4 p-3.5 rounded-2xl bg-muted/10 border border-border/50">
                      <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground"><MapPin className="h-4 w-4" /></div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-0.5">Address</p>
                        <p className="text-sm font-medium text-foreground">{detailCustomer.address}</p>
                      </div>
                    </div>
                  )}
                </div>

                {detailCustomer.notes && (
                  <div className="p-4 rounded-2xl bg-muted/30 border border-border/50">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1.5">{t("customers.notes")}</p>
                    <p className="text-sm text-foreground font-medium leading-relaxed">"{detailCustomer.notes}"</p>
                  </div>
                )}
                
                <div className="pt-4 border-t border-border/50">
                  <p className="text-[10px] font-black text-foreground uppercase tracking-widest mb-3 flex items-center justify-between">
                    <span>Recent Orders</span>
                    <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full">{allOrders.filter(o => o.customerId === detailCustomer.id).length}</span>
                  </p>
                  <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                    {allOrders.filter(o => o.customerId === detailCustomer.id).length > 0 ? (
                      allOrders
                        .filter(o => o.customerId === detailCustomer.id)
                        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                        .map(order => (
                          <div key={order.id} className="flex flex-col gap-1.5 p-3 rounded-2xl bg-muted/10 border border-border/50 hover:bg-muted/30 transition-colors">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="text-xs font-bold text-foreground">#{order.id.slice(0, 6).toUpperCase()}</p>
                                <p className="text-[10px] font-medium text-muted-foreground">{new Date(order.createdAt).toLocaleDateString()} {new Date(order.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                              </div>
                              <p className="text-sm font-black text-primary">{formatTZS(order.totalAmount)}</p>
                            </div>
                            <div className="flex justify-between items-center mt-1">
                              <p className="text-[10px] text-muted-foreground">{order.items.length} {order.items.length === 1 ? 'item' : 'items'}</p>
                              <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${order.status === 'paid' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-500' : 'bg-warning/10 text-warning'}`}>
                                {order.status}
                              </span>
                            </div>
                          </div>
                      ))
                    ) : (
                      <div className="text-center py-6 text-muted-foreground text-sm font-medium">
                        No orders found for this customer.
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2">
                   <Button variant="outline" className="w-full h-12 rounded-xl font-bold" onClick={() => setDetailCustomer(null)}>Close Profile</Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
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
            <AlertDialogAction onClick={(e) => { e.preventDefault(); handleDelete(); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
